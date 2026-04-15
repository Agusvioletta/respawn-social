'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── ICE servers públicos (Google STUN) ────────────────────────────────────────
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

export type CallState = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended'
export type CallType  = 'audio' | 'video'

interface UseWebRTCOptions {
  userId: string
  peerId: string
  onIncomingCall?: (from: string, type: CallType) => void
}

export function useWebRTC({ userId, peerId, onIncomingCall }: UseWebRTCOptions) {
  const [callState,      setCallState]      = useState<CallState>('idle')
  const [callType,       setCallType]       = useState<CallType>('audio')
  const [isMuted,        setIsMuted]        = useState(false)
  const [isCameraOff,    setIsCameraOff]    = useState(false)
  const [isScreenSharing,setIsScreenSharing]= useState(false)
  const [callDuration,   setCallDuration]   = useState(0)

  const pcRef           = useRef<RTCPeerConnection | null>(null)
  const localStreamRef  = useRef<MediaStream | null>(null)
  const localVideoRef   = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef  = useRef<HTMLVideoElement | null>(null)
  const channelRef      = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const durationTimer   = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingOffer    = useRef<RTCSessionDescriptionInit | null>(null)

  const channelId = [userId, peerId].sort().join('_')

  // ── Signaling channel ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !peerId) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any).channel(`webrtc:${channelId}`)

    channel
      .on('broadcast', { event: 'call-offer' }, ({ payload }: { payload: { from: string; offer: RTCSessionDescriptionInit; callType: CallType } }) => {
        if (payload.from !== peerId) return
        pendingOffer.current = payload.offer
        setCallType(payload.callType)
        setCallState('ringing')
        onIncomingCall?.(payload.from, payload.callType)
      })
      .on('broadcast', { event: 'call-answer' }, ({ payload }: { payload: { from: string; answer: RTCSessionDescriptionInit } }) => {
        if (payload.from !== peerId) return
        pcRef.current?.setRemoteDescription(new RTCSessionDescription(payload.answer))
          .then(() => { setCallState('connected'); startTimer() })
          .catch(console.error)
      })
      .on('broadcast', { event: 'ice-candidate' }, ({ payload }: { payload: { from: string; candidate: RTCIceCandidateInit } }) => {
        if (payload.from !== peerId) return
        pcRef.current?.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {})
      })
      .on('broadcast', { event: 'call-end' }, ({ payload }: { payload: { from: string } }) => {
        if (payload.from !== peerId) return
        _cleanupCall(false)
      })
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, peerId])

  // ── Timer ───────────────────────────────────────────────────────────────────
  function startTimer() {
    setCallDuration(0)
    durationTimer.current = setInterval(() => setCallDuration(d => d + 1), 1000)
  }

  // ── Create PeerConnection ───────────────────────────────────────────────────
  function createPC() {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        channelRef.current?.send({
          type: 'broadcast', event: 'ice-candidate',
          payload: { from: userId, candidate: candidate.toJSON() },
        })
      }
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected')  { setCallState('connected'); startTimer() }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') _cleanupCall(false)
    }

    return pc
  }

  // ── Start a call ────────────────────────────────────────────────────────────
  const startCall = useCallback(async (type: CallType) => {
    try {
      setCallType(type)
      setCallState('calling')

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
      localStreamRef.current = stream
      if (localVideoRef.current && type === 'video') localVideoRef.current.srcObject = stream

      const pc = createPC()
      pcRef.current = pc
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      channelRef.current?.send({
        type: 'broadcast', event: 'call-offer',
        payload: { from: userId, offer, callType: type },
      })
    } catch (e) {
      console.error('[WebRTC] startCall error:', e)
      setCallState('idle')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // ── Accept incoming call ────────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!pendingOffer.current) return
    try {
      setCallState('connecting')

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' })
      localStreamRef.current = stream
      if (localVideoRef.current && callType === 'video') localVideoRef.current.srcObject = stream

      const pc = createPC()
      pcRef.current = pc
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer.current))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      channelRef.current?.send({
        type: 'broadcast', event: 'call-answer',
        payload: { from: userId, answer },
      })
    } catch (e) {
      console.error('[WebRTC] acceptCall error:', e)
      setCallState('idle')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, callType])

  // ── End call ────────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast', event: 'call-end',
      payload: { from: userId },
    })
    _cleanupCall(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  function _cleanupCall(notify: boolean) {
    if (!notify) { /* already sent end signal */ }
    if (durationTimer.current) { clearInterval(durationTimer.current); durationTimer.current = null }
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    pendingOffer.current = null
    setCallState('ended')
    setIsMuted(false)
    setIsCameraOff(false)
    setIsScreenSharing(false)
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

  // ── Format call duration ────────────────────────────────────────────────────
  function formatDuration(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return {
    callState, callType, isMuted, isCameraOff, isScreenSharing,
    callDuration: formatDuration(callDuration),
    localVideoRef, remoteVideoRef,
    startCall, acceptCall, endCall, toggleMute, toggleCamera, toggleScreenShare,
  }
}
