'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── ICE servers ───────────────────────────────────────────────────────────────
// STUN: descubrir IP pública cuando ambos están detrás de NAT cone
// TURN: relay de tráfico cuando el NAT es simétrico (caso más común en producción)
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Open Relay TURN gratuito (metered.ca) — cubre NAT simétrico
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

export type CallState = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended'
export type CallType  = 'audio' | 'video'

interface UseWebRTCOptions {
  userId: string
  peerId: string
  onIncomingCall?: (from: string, type: CallType) => void
}

export function useWebRTC({ userId, peerId, onIncomingCall }: UseWebRTCOptions) {
  const [callState,       setCallState]       = useState<CallState>('idle')
  const [callType,        setCallType]        = useState<CallType>('audio')
  const [isMuted,         setIsMuted]         = useState(false)
  const [isCameraOff,     setIsCameraOff]     = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [callDuration,    setCallDuration]    = useState(0)

  const pcRef          = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const localVideoRef  = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const channelRef     = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const durationTimer  = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingOffer   = useRef<RTCSessionDescriptionInit | null>(null)

  const channelId = [userId, peerId].sort().join('_')

  // ── Signaling channel ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !peerId) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any).channel(`webrtc:${channelId}`)

    channel
      .on('broadcast', { event: 'call-offer' }, ({ payload }: {
        payload: { from: string; offer: RTCSessionDescriptionInit; callType: CallType }
      }) => {
        if (payload.from !== peerId) return
        pendingOffer.current = payload.offer
        setCallType(payload.callType)
        setCallState('ringing')
        onIncomingCall?.(payload.from, payload.callType)
      })
      .on('broadcast', { event: 'call-answer' }, ({ payload }: {
        payload: { from: string; answer: RTCSessionDescriptionInit }
      }) => {
        if (payload.from !== peerId) return
        const pc = pcRef.current
        if (!pc) return
        // El SDP answer ya contiene todos los candidates (complete ICE gathering)
        pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
          .catch(console.error)
      })
      .on('broadcast', { event: 'call-end' }, ({ payload }: { payload: { from: string } }) => {
        if (payload.from !== peerId) return
        _cleanupCall()
      })
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, peerId])

  // ── Esperar que termine el ICE gathering ─────────────────────────────────────
  // En vez de trickle ICE (enviar candidates uno por uno via broadcast, con
  // problemas de timing), esperamos a que el SDP local contenga TODOS los
  // candidates antes de enviarlo. Más simple y robusto con Supabase Realtime.
  function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 5000): Promise<void> {
    return new Promise(resolve => {
      if (pc.iceGatheringState === 'complete') { resolve(); return }
      const timer = setTimeout(resolve, timeoutMs)   // fallback: no bloquear si tarda mucho
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') { clearTimeout(timer); resolve() }
      }
    })
  }

  // ── Timer ───────────────────────────────────────────────────────────────────
  function startTimer() {
    if (durationTimer.current) return
    setCallDuration(0)
    durationTimer.current = setInterval(() => setCallDuration(d => d + 1), 1000)
  }

  // ── Create PeerConnection ───────────────────────────────────────────────────
  function createPC() {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      if (state === 'connected')                           { setCallState('connected'); startTimer() }
      if (state === 'disconnected' || state === 'failed') { _cleanupCall() }
    }

    return pc
  }

  // ── Start a call ────────────────────────────────────────────────────────────
  const startCall = useCallback(async (type: CallType) => {
    try {
      setCallType(type)
      setCallState('calling')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      })
      localStreamRef.current = stream
      if (localVideoRef.current && type === 'video') localVideoRef.current.srcObject = stream

      const pc = createPC()
      pcRef.current = pc
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Esperar ICE gathering completo para que el SDP contenga todos los candidates
      await waitForIceGathering(pc)

      channelRef.current?.send({
        type: 'broadcast', event: 'call-offer',
        payload: { from: userId, offer: pc.localDescription!, callType: type },
      })
    } catch (e) {
      console.error('[WebRTC] startCall error:', e)
      _cleanupCall()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // ── Accept incoming call ────────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!pendingOffer.current) return
    try {
      setCallState('connecting')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      })
      localStreamRef.current = stream
      if (localVideoRef.current && callType === 'video') localVideoRef.current.srcObject = stream

      const pc = createPC()
      pcRef.current = pc
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer.current))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      // Esperar ICE gathering completo antes de enviar el answer
      await waitForIceGathering(pc)

      channelRef.current?.send({
        type: 'broadcast', event: 'call-answer',
        payload: { from: userId, answer: pc.localDescription! },
      })
    } catch (e) {
      console.error('[WebRTC] acceptCall error:', e)
      _cleanupCall()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, callType])

  // ── End call ────────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast', event: 'call-end',
      payload: { from: userId },
    })
    _cleanupCall()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  function _cleanupCall() {
    if (durationTimer.current) { clearInterval(durationTimer.current); durationTimer.current = null }
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    pendingOffer.current = null
    setCallState('ended')
    setIsMuted(false); setIsCameraOff(false); setIsScreenSharing(false)
    setTimeout(() => setCallState('idle'), 800)
  }

  // ── Toggle mute ─────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setIsMuted(!track.enabled)
  }, [])

  // ── Toggle camera ───────────────────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setIsCameraOff(!track.enabled)
  }, [])

  // ── Screen share ────────────────────────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current
    if (!pc || !localStreamRef.current) return
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        const screenTrack  = screenStream.getVideoTracks()[0]
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) await sender.replaceTrack(screenTrack)
        else pc.addTrack(screenTrack, screenStream)
        screenTrack.onended = () => setIsScreenSharing(false)
        setIsScreenSharing(true)
      } else {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true })
        const cameraTrack  = cameraStream.getVideoTracks()[0]
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) await sender.replaceTrack(cameraTrack)
        setIsScreenSharing(false)
      }
    } catch (e) { console.error('[WebRTC] screenShare error:', e) }
  }, [isScreenSharing])

  const formatDuration = (secs: number) =>
    `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`

  return {
    callState, callType, isMuted, isCameraOff, isScreenSharing,
    callDuration: formatDuration(callDuration),
    localVideoRef, remoteVideoRef,
    startCall, acceptCall, endCall, toggleMute, toggleCamera, toggleScreenShare,
  }
}
