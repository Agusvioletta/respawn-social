'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useWebRTC, type CallType } from '@/hooks/useWebRTC'

// ── CSS Animations ────────────────────────────────────────────────────────────
const animations = `
@keyframes radar-ring {
  0% { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(2.2); opacity: 0; }
}
@keyframes waveform-bar {
  0%, 100% { height: 4px; }
  50% { height: 20px; }
}
@keyframes neon-pulse {
  0%, 100% { box-shadow: 0 0 8px var(--cyan), 0 0 24px rgba(0,255,247,0.2); }
  50% { box-shadow: 0 0 16px var(--cyan), 0 0 48px rgba(0,255,247,0.4); }
}
@keyframes float-up {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-60px) scale(1.4); opacity: 0; }
}
@keyframes scan-line {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(400%); }
}
@keyframes typing-dot {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}
@keyframes slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
`

// ── Types ─────────────────────────────────────────────────────────────────────
interface OtherProfile {
  id: string
  username: string
  avatar: string | null
  bio: string | null
  now_playing?: string | null
  photo_url?: string | null
  max_level?: number
  status?: string | null
  banner_preset?: string | null
}
interface Message {
  id: number
  from_id: string
  to_id: string
  content: string
  created_at: string
  type?: 'text' | 'audio' | 'image'
  audio_url?: string | null
  image_url?: string | null
  challenge_game?: string | null
}
interface FloatingReaction { id: number; emoji: string; x: number }
type MsgGroup = { sender: string; msgs: Message[]; date: string }

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) }
function fmtDate(iso: string) {
  const d = new Date(iso); const now = new Date()
  const y = new Date(now); y.setDate(y.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return 'Hoy'
  if (d.toDateString() === y.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const params  = useParams()
  const router  = useRouter()
  const otherId = params.userId as string
  const user    = useAuthStore((s) => s.user)
  const supabase = createClient()

  const [otherProfile,     setOtherProfile]     = useState<OtherProfile | null>(null)
  const [messages,         setMessages]         = useState<Message[]>([])
  const [input,            setInput]            = useState('')
  const [loading,          setLoading]          = useState(true)
  const [sending,          setSending]          = useState(false)
  const [isOtherTyping,    setIsOtherTyping]    = useState(false)
  const [incomingCall,     setIncomingCall]     = useState<{ from: string; type: CallType } | null>(null)
  const [floatingReactions,setFloatingReactions]= useState<FloatingReaction[]>([])
  const [showChallengeMenu,setShowChallengeMenu]= useState(false)

  // Voice recording
  const [recState,    setRecState]    = useState<'idle' | 'recording' | 'preview'>('idle')
  const [recSeconds,  setRecSeconds]  = useState(0)
  const [audioBlob,   setAudioBlob]   = useState<Blob | null>(null)
  const [audioPreview,setAudioPreview]= useState<string | null>(null)
  const mediaRecRef   = useRef<MediaRecorder | null>(null)
  const recChunks     = useRef<Blob[]>([])
  const recTimer      = useRef<ReturnType<typeof setInterval> | null>(null)

  const bottomRef    = useRef<HTMLDivElement>(null)
  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const typingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sigChannel   = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const challengeMenuRef = useRef<HTMLDivElement>(null)

  // WebRTC
  const webrtc = useWebRTC({
    userId: user?.id ?? '',
    peerId: otherId,
    onIncomingCall: (from, type) => { setIncomingCall({ from, type }) },
  })

  // ── Close challenge menu on outside click ──────────────────────────────────
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (challengeMenuRef.current && !challengeMenuRef.current.contains(e.target as Node)) {
        setShowChallengeMenu(false)
      }
    }
    if (showChallengeMenu) document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [showChallengeMenu])

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || !otherId) return
    loadData()
    setupRealtimeSignaling()
    return () => { if (sigChannel.current) supabase.removeChannel(sigChannel.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, otherId])

  async function loadData() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [{ data: profile }, { data: msgs }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('profiles').select('id, username, avatar, photo_url, bio, now_playing, max_level, status, banner_preset').eq('id', otherId).single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('messages').select('*')
          .or(`and(from_id.eq.${user!.id},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${user!.id})`)
          .order('created_at', { ascending: true })
          .limit(100),
      ])
      setOtherProfile(profile)
      setMessages(msgs ?? [])
    } catch (e) { console.error('[Chat] loadData:', e) }
    finally { setLoading(false) }
  }

  // ── Realtime: new messages + typing ─────────────────────────────────────────
  function setupRealtimeSignaling() {
    const chanId = `chat:${[user!.id, otherId].sort().join('_')}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = (supabase as any).channel(chanId)

      .on('broadcast', { event: 'new-message' }, ({ payload }: { payload: { message: Message } }) => {
        const m = payload.message
        if (!m || m.from_id !== otherId) return
        setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
      })

      .on('broadcast', { event: 'typing' }, () => {
        setIsOtherTyping(true)
        if (typingTimer.current) clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setIsOtherTyping(false), 2500)
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: { new: Message }) => {
        const m = payload.new
        if (!((m.from_id === user!.id && m.to_id === otherId) || (m.from_id === otherId && m.to_id === user!.id))) return

        setMessages(prev => {
          if (m.from_id === user!.id) {
            const idx = prev.findIndex(x => x.id > 1_000_000_000_000 && x.content === m.content)
            if (idx !== -1) {
              const updated = [...prev]; updated[idx] = m; return updated
            }
          }
          return prev.some(x => x.id === m.id) ? prev : [...prev, m]
        })
      })

      .subscribe()
    sigChannel.current = ch
  }

  // ── Scroll to bottom ─────────────────────────────────────────────────────────
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isOtherTyping])

  // ── Typing indicator broadcast ───────────────────────────────────────────────
  function handleInputChange(val: string) {
    setInput(val)
    sigChannel.current?.send({ type: 'broadcast', event: 'typing', payload: { from: user?.id } })
  }

  // ── Send text message ────────────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim()
    if (!text || sending || !user) return
    setSending(true); setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const optimistic: Message = { id: Date.now(), from_id: user.id, to_id: otherId, content: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: inserted, error } = await (supabase as any)
        .from('messages').insert({ from_id: user.id, to_id: otherId, content: text }).select().single()
      if (error) throw error

      sigChannel.current?.send({
        type: 'broadcast', event: 'new-message',
        payload: { message: inserted ?? optimistic },
      })
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setInput(text)
    } finally { setSending(false) }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Voice recording ───────────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      recChunks.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) recChunks.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(recChunks.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioPreview(URL.createObjectURL(blob))
        setRecState('preview')
      }
      mr.start(250)
      mediaRecRef.current = mr
      setRecState('recording')
      setRecSeconds(0)
      recTimer.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
    } catch { alert('No se pudo acceder al micrófono.') }
  }

  function stopRecording() {
    if (recTimer.current) { clearInterval(recTimer.current); recTimer.current = null }
    mediaRecRef.current?.stop()
    mediaRecRef.current = null
  }

  function cancelAudio() {
    if (audioPreview) URL.revokeObjectURL(audioPreview)
    setAudioBlob(null); setAudioPreview(null); setRecState('idle'); setRecSeconds(0)
  }

  async function sendAudio() {
    if (!audioBlob || !user) return
    setSending(true)
    try {
      const path = `${user.id}/${Date.now()}.webm`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: uploadErr } = await (supabase.storage as any).from('message-audio').upload(path, audioBlob, { contentType: 'audio/webm' })
      if (uploadErr) throw uploadErr
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: urlData } = (supabase.storage as any).from('message-audio').getPublicUrl(path)
      const audioUrl = urlData.publicUrl

      let inserted: Message | null = null
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).from('messages').insert({ from_id: user.id, to_id: otherId, content: '🎤 Mensaje de voz', type: 'audio', audio_url: audioUrl }).select().single()
        if (error) throw error
        inserted = data
      } catch {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any).from('messages').insert({ from_id: user.id, to_id: otherId, content: `🎤 Mensaje de voz: ${audioUrl}` }).select().single()
        inserted = data
      }

      const optimistic: Message = inserted ?? { id: Date.now(), from_id: user.id, to_id: otherId, content: '🎤 Mensaje de voz', type: 'audio', audio_url: audioUrl, created_at: new Date().toISOString() }
      setMessages(prev => [...prev, optimistic])

      sigChannel.current?.send({
        type: 'broadcast', event: 'new-message',
        payload: { message: optimistic },
      })
      cancelAudio()
    } catch (e) { console.error('[Chat] sendAudio:', e) }
    finally { setSending(false) }
  }

  // ── Send game challenge ───────────────────────────────────────────────────────
  async function sendGameChallenge(gameId: string) {
    setShowChallengeMenu(false)
    if (!user) return
    const gameNames: Record<string, string> = {
      snake: 'Snake', pong: 'Pong', breakout: 'Breakout',
      asteroids: 'Asteroids', flappy: 'Flappy Bird', tetris: 'Tetris',
      dino: 'Dino Run', spaceinvaders: 'Space Invaders',
    }
    const content = `⚔️ ¡Desafío de ${gameNames[gameId] ?? gameId}! ¿Te animás?`
    const optimistic: Message = {
      id: Date.now(), from_id: user.id, to_id: otherId,
      content, created_at: new Date().toISOString(),
      challenge_game: gameId,
    }
    setMessages(prev => [...prev, optimistic])
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: inserted } = await (supabase as any)
        .from('messages')
        .insert({ from_id: user.id, to_id: otherId, content, challenge_game: gameId })
        .select().single()
      sigChannel.current?.send({
        type: 'broadcast', event: 'new-message',
        payload: { message: inserted ?? optimistic },
      })
    } catch { setMessages(prev => prev.filter(m => m.id !== optimistic.id)) }
  }

  // ── Group messages ────────────────────────────────────────────────────────────
  const grouped: MsgGroup[] = []
  for (const m of messages) {
    const date = fmtDate(m.created_at)
    const last = grouped[grouped.length - 1]
    if (last && last.sender === m.from_id && last.date === date) { last.msgs.push(m) }
    else grouped.push({ sender: m.from_id, msgs: [m], date })
  }

  const isMe = (id: string) => id === user?.id
  const showCallUI = webrtc.callState !== 'idle'

  // ── Status helpers ────────────────────────────────────────────────────────────
  function statusColor(s?: string | null) {
    if (s === 'away') return '#FBB040'
    if (s === 'dnd')  return '#FF4F7B'
    if (s === 'invisible') return '#555570'
    return '#4ade80'
  }
  function statusLabel(s?: string | null) {
    if (s === 'away') return 'Ausente'
    if (s === 'dnd')  return 'No molestar'
    if (s === 'invisible') return 'Invisible'
    return 'En línea'
  }

  function getAvatarSrc(profile: OtherProfile | null | undefined) {
    if (!profile) return '/avatar1.png'
    return profile.photo_url ?? (profile.avatar?.startsWith('/') ? profile.avatar : `/${profile.avatar ?? 'avatar1.png'}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: 'var(--void)', maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
      <style>{animations}</style>

      {/* ── HEADER: Squad Room ── */}
      <div style={{
        background: 'var(--deep)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        {/* Top accent line */}
        <div style={{
          height: '2px',
          background: 'linear-gradient(90deg, rgba(0,255,247,0.3), rgba(192,132,252,0.4), rgba(255,79,123,0.3))',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px' }}>
          <button onClick={() => router.push('/messages')} style={{
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: '18px', padding: '4px', lineHeight: 1, outline: 'none', flexShrink: 0,
          }}>←</button>

          {otherProfile ? (
            <>
              {/* Avatar with status ring */}
              <Link href={`/profile/${otherProfile.username}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    border: `2px solid ${statusColor(otherProfile.status)}`,
                    boxShadow: `0 0 10px ${statusColor(otherProfile.status)}55`,
                    overflow: 'hidden', background: 'var(--surface)',
                    animation: otherProfile.status === 'online' || !otherProfile.status ? 'neon-pulse 3s ease-in-out infinite' : 'none',
                  }}>
                    <img
                      src={getAvatarSrc(otherProfile)}
                      alt={otherProfile.username}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: otherProfile.photo_url ? 'auto' : 'pixelated' }}
                    />
                  </div>
                  {/* Status dot */}
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 11, height: 11, borderRadius: '50%',
                    background: statusColor(otherProfile.status),
                    border: '2px solid var(--deep)',
                    boxShadow: `0 0 6px ${statusColor(otherProfile.status)}`,
                  }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                      @{otherProfile.username}
                    </span>
                    {(otherProfile.max_level ?? 1) > 1 && (
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: '8px', fontWeight: 700,
                        color: 'var(--cyan)', background: 'rgba(0,255,247,0.1)',
                        border: '1px solid rgba(0,255,247,0.25)', borderRadius: '4px',
                        padding: '1px 5px', letterSpacing: '1px',
                      }}>LVL {otherProfile.max_level}</span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: otherProfile.now_playing ? '#4ade80' : statusColor(otherProfile.status), marginTop: '1px' }}>
                    {otherProfile.now_playing
                      ? <span>🎮 <span style={{ color: '#4ade80' }}>{otherProfile.now_playing}</span></span>
                      : <span>{statusLabel(otherProfile.status)}</span>
                    }
                  </div>
                </div>
              </Link>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button onClick={() => webrtc.startCall('audio')} title="Llamada de voz" style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '7px 10px', cursor: 'pointer',
                  fontSize: '15px', transition: 'all 0.15s', outline: 'none',
                  color: 'var(--text-muted)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#4ade80'; e.currentTarget.style.background = 'rgba(74,222,128,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
                >📞</button>
                <button onClick={() => webrtc.startCall('video')} title="Videollamada" style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '7px 10px', cursor: 'pointer',
                  fontSize: '15px', transition: 'all 0.15s', outline: 'none',
                  color: 'var(--text-muted)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.background = 'rgba(0,255,247,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
                >📹</button>
              </div>
            </>
          ) : <div style={{ flex: 1 }} />}
        </div>

        {/* Now playing indicator */}
        {otherProfile?.now_playing && (
          <div style={{
            padding: '6px 16px 8px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse-dot 1.5s ease-in-out infinite', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#4ade80' }}>
              Jugando {otherProfile.now_playing} ahora mismo
            </span>
          </div>
        )}
      </div>

      {/* ── Messages area ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: '0' }}>
        {loading ? (
          <div style={{ margin: 'auto', textAlign: 'center' }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ height: '40px', background: 'var(--card)', borderRadius: '12px', marginBottom: '8px', opacity: 1 - i * 0.3, width: i % 2 === 0 ? '60%' : '45%', marginLeft: i % 2 === 0 ? '0' : 'auto' }} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>👾</div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '13px', color: 'var(--text-muted)', letterSpacing: '1px' }}>Empezá la conversación</p>
            {otherProfile && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>// Mandá un mensaje a @{otherProfile.username}</p>}
          </div>
        ) : (
          <>
            {(() => {
              const items: React.ReactNode[] = []
              let lastDate = ''
              for (const group of grouped) {
                if (group.date !== lastDate) {
                  items.push(
                    <div key={`d-${group.date}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 8px' }}>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', whiteSpace: 'nowrap' }}>{group.date}</span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    </div>
                  )
                  lastDate = group.date
                }
                const mine = isMe(group.sender)
                items.push(
                  <div key={`g-${group.msgs[0].id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: '12px' }}>
                    {/* Sender name + avatar (theirs only) */}
                    {!mine && otherProfile && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', paddingLeft: '4px' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                          <img src={getAvatarSrc(otherProfile)} alt={otherProfile.username} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: otherProfile.photo_url ? 'auto' : 'pixelated' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>@{otherProfile.username}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: '2px', maxWidth: '75%' }}>
                      {group.msgs.map((m, mi) => {
                        const isFirst = mi === 0; const isLast = mi === group.msgs.length - 1
                        const br = mine
                          ? `${isFirst ? '18px' : '6px'} 18px ${isLast ? '6px' : '18px'} 18px`
                          : `18px ${isFirst ? '18px' : '6px'} 18px ${isLast ? '6px' : '18px'}`

                        return (
                          <div key={m.id}>
                            {/* Challenge message */}
                            {m.challenge_game ? (
                              <div style={{
                                background: 'linear-gradient(135deg, rgba(192,132,252,0.12), rgba(0,255,247,0.06))',
                                border: '1px solid rgba(192,132,252,0.35)',
                                borderRadius: '16px', padding: '14px 16px', minWidth: '220px',
                                boxShadow: '0 4px 24px rgba(192,132,252,0.1)',
                                animation: 'slide-up 0.3s ease',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                  <span style={{ fontSize: '18px' }}>⚔️</span>
                                  <div>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: 'var(--purple)', letterSpacing: '1px' }}>DESAFÍO ARCADE</div>
                                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>{m.content.replace('⚔️ ', '')}</div>
                                  </div>
                                </div>
                                {!mine && m.challenge_game && (
                                  <Link href={`/arcade/${m.challenge_game}`} style={{ textDecoration: 'none' }}>
                                    <button style={{
                                      width: '100%', padding: '8px', background: 'rgba(192,132,252,0.15)',
                                      border: '1px solid rgba(192,132,252,0.4)', borderRadius: '10px',
                                      color: 'var(--purple)', fontFamily: 'var(--font-display)', fontSize: '11px',
                                      fontWeight: 700, letterSpacing: '1px', cursor: 'pointer', outline: 'none',
                                    }}>
                                      🎮 ACEPTAR DESAFÍO
                                    </button>
                                  </Link>
                                )}
                                {mine && (
                                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                                    ⏳ Esperando respuesta...
                                  </div>
                                )}
                              </div>
                            ) : (m.type === 'audio' && m.audio_url) ? (
                              /* Audio/voice message */
                              <div style={{
                                background: mine ? 'linear-gradient(135deg,rgba(0,255,247,0.12),rgba(0,255,247,0.06))' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${mine ? 'rgba(0,255,247,0.25)' : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: '16px', padding: '10px 14px', minWidth: '200px',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontSize: '18px' }}>🎙️</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1, height: '24px' }}>
                                    {[...Array(16)].map((_, i) => (
                                      <div key={i} style={{
                                        width: '3px', background: mine ? 'var(--cyan)' : 'var(--text-muted)',
                                        borderRadius: '2px', height: '4px',
                                        animation: `waveform-bar ${0.6 + (i % 5) * 0.12}s ease-in-out ${i * 0.04}s infinite`,
                                        opacity: 0.7,
                                      }} />
                                    ))}
                                  </div>
                                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: mine ? 'var(--cyan)' : 'var(--text-muted)' }}>VOZ</div>
                                </div>
                                <audio src={m.audio_url} controls style={{ width: '100%', height: '28px', marginTop: '6px', accentColor: mine ? 'var(--cyan)' : 'var(--purple)' }} />
                              </div>
                            ) : (
                              /* Regular text message */
                              <div style={{
                                background: mine
                                  ? 'linear-gradient(135deg, rgba(0,255,247,0.15), rgba(0,255,247,0.08))'
                                  : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${mine ? 'rgba(0,255,247,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: br, padding: '9px 13px',
                                color: 'var(--text-primary)',
                                fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.5,
                                wordBreak: 'break-word',
                                boxShadow: mine ? '0 2px 16px rgba(0,255,247,0.08), inset 0 0 12px rgba(0,255,247,0.03)' : 'none',
                              }}>
                                {m.content}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', padding: '0 4px' }}>
                        {fmtTime(group.msgs[group.msgs.length - 1].created_at)}
                      </span>
                    </div>
                  </div>
                )
              }
              return items
            })()}

            {/* Typing indicator — terminal style */}
            {isOtherTyping && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '8px', paddingLeft: '4px', animation: 'slide-up 0.2s ease' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                  <img src={getAvatarSrc(otherProfile)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: otherProfile?.photo_url ? 'auto' : 'pixelated' }} />
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '18px 18px 18px 4px', padding: '10px 16px',
                  display: 'flex', gap: '5px', alignItems: 'center',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginRight: '4px', letterSpacing: '1px' }}>escribiendo</span>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--cyan)', animation: `typing-dot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Floating reactions */}
        {floatingReactions.map(r => (
          <div key={r.id} style={{
            position: 'fixed', left: `${r.x}px`, bottom: '80px',
            fontSize: '28px', animation: 'float-up 1.5s ease-out forwards',
            pointerEvents: 'none', zIndex: 50,
          }}>{r.emoji}</div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Audio preview bar ─────────────────────────────────────────────────── */}
      {recState === 'preview' && audioPreview && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--deep)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <audio src={audioPreview} controls style={{ flex: 1, height: '32px', accentColor: 'var(--cyan)' }} />
          <button onClick={cancelAudio} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', color: 'var(--pink)', fontSize: '14px', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
          <button onClick={sendAudio} disabled={sending} style={{ background: 'rgba(0,255,247,0.1)', border: '1px solid rgba(0,255,247,0.3)', borderRadius: '10px', color: 'var(--cyan)', fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, padding: '8px 16px', cursor: 'pointer', letterSpacing: '1px', outline: 'none' }}>
            {sending ? '...' : 'ENVIAR'}
          </button>
        </div>
      )}

      {/* ── Input area ────────────────────────────────────────────────────────── */}
      {recState !== 'preview' && (
        <div style={{
          padding: '12px 16px 16px', borderTop: '1px solid var(--border)',
          background: 'var(--deep)', flexShrink: 0,
        }}>
          {recState === 'recording' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
              padding: '8px 14px', background: 'rgba(255,79,123,0.08)',
              border: '1px solid rgba(255,79,123,0.25)', borderRadius: '12px',
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pink)', animation: 'pulse-dot 0.8s ease-in-out infinite', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--pink)', flex: 1 }}>
                REC {recSeconds}s — {recSeconds < 60 ? 'hablá...' : 'enviá el mensaje'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '16px' }}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} style={{ width: '3px', background: 'var(--pink)', borderRadius: '2px', height: '4px', animation: `waveform-bar ${0.4 + i * 0.08}s ease-in-out ${i * 0.05}s infinite` }} />
                ))}
              </div>
              <button onClick={stopRecording} style={{ background: 'var(--pink)', border: 'none', borderRadius: '8px', color: '#fff', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, padding: '4px 12px', cursor: 'pointer', outline: 'none', letterSpacing: '1px' }}>DETENER</button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            {/* Challenge button */}
            <div ref={challengeMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setShowChallengeMenu(v => !v)}
                title="Retar a un juego"
                style={{
                  background: showChallengeMenu ? 'rgba(192,132,252,0.15)' : 'transparent',
                  border: `1px solid ${showChallengeMenu ? 'rgba(192,132,252,0.4)' : 'var(--border)'}`,
                  borderRadius: '12px', width: '40px', height: '40px',
                  fontSize: '17px', cursor: 'pointer', outline: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s', color: showChallengeMenu ? 'var(--purple)' : 'var(--text-muted)',
                }}
              >⚔️</button>
              {showChallengeMenu && (
                <div style={{
                  position: 'absolute', bottom: '48px', left: 0, zIndex: 50,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: '16px', padding: '8px', width: '200px',
                  boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
                  animation: 'slide-up 0.2s ease',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '2px', padding: '4px 8px 8px', borderBottom: '1px solid var(--border)', marginBottom: '6px' }}>
                    ELEGÍ UN JUEGO
                  </div>
                  {[
                    { id: 'snake', emoji: '🐍', name: 'Snake', color: '#00FFF7' },
                    { id: 'pong', emoji: '🏓', name: 'Pong', color: '#FF4F7B' },
                    { id: 'breakout', emoji: '🧱', name: 'Breakout', color: '#C084FC' },
                    { id: 'tetris', emoji: '🟪', name: 'Tetris', color: '#a78bfa' },
                    { id: 'asteroids', emoji: '☄️', name: 'Asteroids', color: '#FFB800' },
                    { id: 'spaceinvaders', emoji: '👾', name: 'Space Invaders', color: '#4ade80' },
                  ].map(g => (
                    <button key={g.id} onClick={() => sendGameChallenge(g.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      width: '100%', padding: '8px 10px', background: 'transparent',
                      border: 'none', borderRadius: '10px', cursor: 'pointer',
                      transition: 'background 0.1s', outline: 'none',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = `${g.color}11`)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontSize: '16px' }}>{g.emoji}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: g.color, letterSpacing: '0.5px' }}>{g.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Text input */}
            <textarea
              ref={textareaRef} value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Mensaje para @${otherProfile?.username ?? '...'}`}
              rows={1}
              disabled={recState === 'recording'}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                borderRadius: '16px', padding: '10px 16px',
                color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
                fontSize: '14px', outline: 'none', resize: 'none',
                lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,255,247,0.35)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,255,247,0.06)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
              onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }}
            />

            {/* Mic */}
            <button
              onClick={recState === 'idle' ? startRecording : stopRecording}
              style={{
                background: recState === 'recording' ? 'rgba(255,79,123,0.15)' : 'transparent',
                border: `1px solid ${recState === 'recording' ? 'var(--pink)' : 'var(--border)'}`,
                borderRadius: '12px', width: '40px', height: '40px',
                fontSize: '17px', cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', outline: 'none',
                color: recState === 'recording' ? 'var(--pink)' : 'var(--text-muted)',
              }}>
              🎙️
            </button>

            {/* Send */}
            <button onClick={handleSend} disabled={!input.trim() || sending} style={{
              background: input.trim() ? 'var(--cyan)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${input.trim() ? 'var(--cyan)' : 'var(--border)'}`,
              borderRadius: '12px', width: '40px', height: '40px',
              color: input.trim() ? '#000' : 'var(--text-muted)',
              fontSize: '16px', fontWeight: 700,
              cursor: input.trim() ? 'pointer' : 'default',
              transition: 'all 0.2s', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              outline: 'none',
              boxShadow: input.trim() ? '0 0 16px rgba(0,255,247,0.3)' : 'none',
            }}>
              {sending ? '···' : '↑'}
            </button>
          </div>
        </div>
      )}

      {/* ── Call overlay ──────────────────────────────────────────────────────── */}
      {showCallUI && (
        <CallOverlay
          webrtc={webrtc}
          otherProfile={otherProfile}
          incomingCall={incomingCall}
          onDismiss={() => { webrtc.endCall() }}
          onAccept={() => { webrtc.acceptCall(); setIncomingCall(null) }}
        />
      )}
    </div>
  )
}

// ── Call Overlay component ────────────────────────────────────────────────────
interface CallOverlayProps {
  webrtc: ReturnType<typeof useWebRTC>
  otherProfile: OtherProfile | null
  incomingCall: { from: string; type: CallType } | null
  onDismiss: () => void
  onAccept: () => void
}

function CallOverlay({ webrtc, otherProfile, incomingCall, onDismiss, onAccept }: CallOverlayProps) {
  const { callState, callType, isMuted, isCameraOff, isScreenSharing, callDuration, toggleMute, toggleCamera, toggleScreenShare, localVideoRef, remoteVideoRef } = webrtc
  const isRinging    = callState === 'ringing'
  const isCalling    = callState === 'calling'
  const isConnecting = callState === 'connecting'
  const isConnected  = callState === 'connected'
  const isVideo      = callType === 'video'

  const [inCallReactions, setInCallReactions] = useState<{ id: number; emoji: string }[]>([])

  function fireInCallReaction(emoji: string) {
    const id = Date.now()
    setInCallReactions(prev => [...prev, { id, emoji }])
    setTimeout(() => setInCallReactions(prev => prev.filter(r => r.id !== id)), 1500)
  }

  const avatarSrc = otherProfile?.photo_url ??
    (otherProfile?.avatar?.startsWith('/') ? otherProfile.avatar : `/${otherProfile?.avatar ?? 'avatar1.png'}`)

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: isConnected && isVideo ? 'transparent' : 'rgba(7,7,15,0.96)',
      backdropFilter: isConnected && isVideo ? 'none' : 'blur(16px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Scan line effect (not during video) */}
      {!(isConnected && isVideo) && (
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
        }}>
          <div style={{
            position: 'absolute', left: 0, right: 0, height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(0,255,247,0.15), transparent)',
            animation: 'scan-line 4s linear infinite',
          }} />
        </div>
      )}

      {/* Remote video — always mounted */}
      <video ref={remoteVideoRef} autoPlay playsInline style={
        isConnected && isVideo
          ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#000' }
          : { position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }
      } />

      {/* Local video preview */}
      {isVideo && (
        <video ref={localVideoRef} autoPlay playsInline muted style={
          isConnected
            ? { position: 'absolute', bottom: '96px', right: '16px', width: '120px', height: '90px', objectFit: 'cover', borderRadius: '12px', border: '2px solid var(--cyan)', zIndex: 2, boxShadow: '0 0 20px rgba(0,255,247,0.3)' }
            : { position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }
        } />
      )}

      {/* ── RINGING / CALLING / CONNECTING states ── */}
      {(isRinging || isCalling || isConnecting) && (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', zIndex: 1 }}>
          {/* Animated radar rings */}
          <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: `2px solid ${isRinging ? 'var(--cyan)' : '#4ade80'}`,
                animation: `radar-ring 2s ease-out ${i * 0.65}s infinite`,
              }} />
            ))}
            <div style={{
              width: 90, height: 90, borderRadius: '50%',
              border: `3px solid ${isRinging ? 'var(--cyan)' : '#4ade80'}`,
              boxShadow: `0 0 30px ${isRinging ? 'rgba(0,255,247,0.4)' : 'rgba(74,222,128,0.4)'}`,
              overflow: 'hidden', position: 'relative', zIndex: 1, flexShrink: 0,
            }}>
              <img src={avatarSrc} alt={otherProfile?.username ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: otherProfile?.photo_url ? 'auto' : 'pixelated' }} />
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '1px' }}>
              @{otherProfile?.username}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: isRinging ? 'var(--cyan)' : '#4ade80', marginTop: '6px', letterSpacing: '2px' }}>
              {isRinging
                ? `📲 ${callType === 'video' ? 'Videollamada' : 'Llamada de voz'} entrante`
                : isConnecting ? '⚡ Conectando...'
                : `📡 Llamando... ${callType === 'video' ? '📹' : '📞'}`}
            </div>
          </div>

          {isRinging ? (
            <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
              <button onClick={onDismiss} style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'rgba(255,79,123,0.2)', border: '2px solid var(--pink)',
                fontSize: '22px', cursor: 'pointer', outline: 'none',
                boxShadow: '0 0 24px rgba(255,79,123,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>📵</button>
              <button onClick={onAccept} style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'rgba(74,222,128,0.2)', border: '2px solid #4ade80',
                fontSize: '22px', cursor: 'pointer', outline: 'none',
                boxShadow: '0 0 24px rgba(74,222,128,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>📞</button>
            </div>
          ) : (
            <button onClick={onDismiss} style={{
              background: 'rgba(255,79,123,0.15)', border: '1px solid rgba(255,79,123,0.4)',
              borderRadius: '24px', color: 'var(--pink)',
              fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
              letterSpacing: '2px', padding: '10px 28px', cursor: 'pointer', outline: 'none',
              marginTop: '8px',
            }}>CANCELAR</button>
          )}
        </div>
      )}

      {/* ── CONNECTED state ── */}
      {isConnected && (
        <>
          {/* Top pill — name + duration */}
          <div style={{
            position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(7,7,15,0.75)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '24px', padding: '6px 16px', zIndex: 3,
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', animation: 'pulse-dot 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '1px' }}>
              @{otherProfile?.username}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cyan)', letterSpacing: '1px' }}>
              {callDuration}
            </span>
          </div>

          {/* Audio call UI — waveform visualization */}
          {!isVideo && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', zIndex: 1 }}>
              <div style={{ position: 'relative', width: 110, height: 110 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--cyan)', animation: 'neon-pulse 2s ease-in-out infinite' }} />
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--card)' }}>
                  <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: otherProfile?.photo_url ? 'auto' : 'pixelated' }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '40px' }}>
                {[...Array(20)].map((_, i) => (
                  <div key={i} style={{
                    width: '4px', background: 'var(--cyan)', borderRadius: '2px',
                    animation: `waveform-bar ${0.5 + (i % 7) * 0.1}s ease-in-out ${i * 0.05}s infinite`,
                    opacity: 0.7 + (i % 3) * 0.1,
                  }} />
                ))}
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '2px' }}>
                {isMuted ? '🔇 SILENCIADO' : '🎙️ EN LLAMADA'}
              </div>
            </div>
          )}

          {/* In-call floating reactions */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
            {inCallReactions.map(r => (
              <div key={r.id} style={{
                position: 'absolute', left: '50%', bottom: '100px',
                fontSize: '32px', animation: 'float-up 1.5s ease-out forwards',
                pointerEvents: 'none',
              }}>{r.emoji}</div>
            ))}
          </div>

          {/* Bottom controls bar */}
          <div style={{
            position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(7,7,15,0.85)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '32px', padding: '10px 16px', zIndex: 3,
            backdropFilter: 'blur(12px)',
          }}>
            {/* In-call reactions */}
            {(['🏆', '😮', '💀', '😂'] as const).map((emoji, i) => {
              const labels = ['GG', 'POG', 'RIP', 'KEKW']
              return (
                <button key={emoji} onClick={() => fireInCallReaction(emoji)} style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', padding: '6px 8px', cursor: 'pointer', outline: 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  transition: 'all 0.15s', minWidth: '36px',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'scale(1.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <span style={{ fontSize: '16px' }}>{emoji}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '7px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>{labels[i]}</span>
                </button>
              )
            })}

            <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)' }} />

            {/* Mute */}
            <button onClick={toggleMute} style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: isMuted ? 'rgba(255,79,123,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${isMuted ? 'var(--pink)' : 'rgba(255,255,255,0.15)'}`,
              fontSize: '18px', cursor: 'pointer', outline: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>{isMuted ? '🔇' : '🎙️'}</button>

            {/* Camera (video only) */}
            {isVideo && (
              <button onClick={toggleCamera} style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: isCameraOff ? 'rgba(255,79,123,0.2)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${isCameraOff ? 'var(--pink)' : 'rgba(255,255,255,0.15)'}`,
                fontSize: '18px', cursor: 'pointer', outline: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>{isCameraOff ? '📷' : '📹'}</button>
            )}

            {/* Screen share */}
            <button onClick={toggleScreenShare} style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: isScreenSharing ? 'rgba(0,255,247,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${isScreenSharing ? 'var(--cyan)' : 'rgba(255,255,255,0.15)'}`,
              fontSize: '18px', cursor: 'pointer', outline: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>🖥️</button>

            <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)' }} />

            {/* Hang up */}
            <button onClick={onDismiss} style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'rgba(255,79,123,0.25)', border: '1px solid var(--pink)',
              fontSize: '18px', cursor: 'pointer', outline: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(255,79,123,0.3)',
              transition: 'all 0.15s',
            }}>📵</button>
          </div>
        </>
      )}
    </div>
  )
}
