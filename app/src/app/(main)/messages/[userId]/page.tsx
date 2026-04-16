'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { useWebRTC, type CallState, type CallType } from '@/hooks/useWebRTC'

// ── Types ─────────────────────────────────────────────────────────────────────
interface OtherProfile {
  id: string; username: string; avatar: string | null; bio: string | null; now_playing?: string | null
}
interface Message {
  id: number; from_id: string; to_id: string; content: string; created_at: string
  type?: 'text' | 'audio' | 'image'
  audio_url?: string | null
  image_url?: string | null
}
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

  const [otherProfile,   setOtherProfile]   = useState<OtherProfile | null>(null)
  const [messages,       setMessages]       = useState<Message[]>([])
  const [input,          setInput]          = useState('')
  const [loading,        setLoading]        = useState(true)
  const [sending,        setSending]        = useState(false)
  const [isOtherTyping,  setIsOtherTyping]  = useState(false)
  const [incomingCall,   setIncomingCall]   = useState<{ from: string; type: CallType } | null>(null)

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

  // WebRTC
  const webrtc = useWebRTC({
    userId: user?.id ?? '',
    peerId: otherId,
    onIncomingCall: (from, type) => { setIncomingCall({ from, type }) },
  })

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
        (supabase as any).from('profiles').select('id, username, avatar, bio, now_playing').eq('id', otherId).single(),
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: { new: Message }) => {
        const m = payload.new
        if (!((m.from_id === user!.id && m.to_id === otherId) || (m.from_id === otherId && m.to_id === user!.id))) return

        setMessages(prev => {
          // Si el mensaje es nuestro, reemplazar el optimista que tiene id Date.now()
          // (> 1 billón) con el mismo contenido → evita burbuja duplicada
          if (m.from_id === user!.id) {
            const idx = prev.findIndex(x => x.id > 1_000_000_000_000 && x.content === m.content)
            if (idx !== -1) {
              const updated = [...prev]
              updated[idx] = m
              return updated
            }
          }
          return prev.some(x => x.id === m.id) ? prev : [...prev, m]
        })
      })
      .on('broadcast', { event: 'typing' }, () => {
        setIsOtherTyping(true)
        if (typingTimer.current) clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setIsOtherTyping(false), 2500)
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
      const { error } = await (supabase as any).from('messages').insert({ from_id: user.id, to_id: otherId, content: text })
      if (error) throw error
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

      // Try to insert with type+audio_url; fall back to plain text link
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from('messages').insert({ from_id: user.id, to_id: otherId, content: '🎤 Mensaje de voz', type: 'audio', audio_url: audioUrl })
        if (error) throw error
      } catch {
        // Fallback: SQL migration not run yet — send as text with link
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('messages').insert({ from_id: user.id, to_id: otherId, content: `🎤 Mensaje de voz: ${audioUrl}` })
      }

      const optimistic: Message = { id: Date.now(), from_id: user.id, to_id: otherId, content: '🎤 Mensaje de voz', type: 'audio', audio_url: audioUrl, created_at: new Date().toISOString() }
      setMessages(prev => [...prev, optimistic])
      cancelAudio()
    } catch (e) { console.error('[Chat] sendAudio:', e) }
    finally { setSending(false) }
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: 'var(--void)', maxWidth: '800px', margin: '0 auto', position: 'relative' }}>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--deep)', flexShrink: 0,
        backdropFilter: 'blur(8px)', zIndex: 10,
      }}>
        <button onClick={() => router.push('/messages')} style={{
          background: 'transparent', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: '20px', padding: '0', lineHeight: 1, outline: 'none',
        }}>←</button>

        {otherProfile ? (
          <Link href={`/profile/${otherProfile.username}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flex: 1 }}>
            <div style={{ position: 'relative' }}>
              <UserAvatar avatar={otherProfile.avatar} username={otherProfile.username} size={36} />
              <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80', border: '2px solid var(--deep)', boxShadow: '0 0 6px #4ade80' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>@{otherProfile.username}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: otherProfile.now_playing ? '#4ade80' : 'var(--text-muted)' }}>
                {otherProfile.now_playing ? `🎮 ${otherProfile.now_playing}` : 'En línea'}
              </div>
            </div>
          </Link>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        {/* Call buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => webrtc.startCall('audio')} title="Llamada de voz" style={callBtnStyle}>
            📞
          </button>
          <button onClick={() => webrtc.startCall('video')} title="Videollamada" style={callBtnStyle}>
            📹
          </button>
        </div>
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
                        <UserAvatar avatar={otherProfile.avatar} username={otherProfile.username} size={20} />
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
                            {/* Audio message */}
                            {(m.type === 'audio' && m.audio_url) ? (
                              <div style={{ background: mine ? 'rgba(0,255,247,0.12)' : 'var(--card)', border: `1px solid ${mine ? 'var(--cyan-border)' : 'var(--border)'}`, borderRadius: br, padding: '10px 14px', minWidth: '220px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '14px' }}>🎤</span>
                                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: mine ? 'var(--cyan)' : 'var(--text-muted)', letterSpacing: '1px' }}>VOZ</span>
                                </div>
                                <audio src={m.audio_url} controls style={{ width: '100%', height: '32px', accentColor: 'var(--cyan)' }} />
                              </div>
                            ) : (
                              <div style={{
                                background: mine ? 'rgba(0,255,247,0.12)' : 'var(--card)',
                                border: `1px solid ${mine ? 'rgba(0,255,247,0.25)' : 'var(--border)'}`,
                                borderRadius: br, padding: '9px 13px',
                                color: mine ? 'var(--text-primary)' : 'var(--text-primary)',
                                fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.5,
                                wordBreak: 'break-word',
                                boxShadow: mine ? '0 2px 12px rgba(0,255,247,0.06)' : 'none',
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

            {/* Typing indicator */}
            {isOtherTyping && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginBottom: '8px', paddingLeft: '4px' }}>
                {otherProfile && <UserAvatar avatar={otherProfile.avatar} username={otherProfile.username} size={20} />}
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px 18px 18px 4px', padding: '10px 14px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', animation: `typing-dot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Audio preview bar ─────────────────────────────────────────────────── */}
      {recState === 'preview' && audioPreview && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--deep)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <audio src={audioPreview} controls style={{ flex: 1, height: '32px', accentColor: 'var(--cyan)' }} />
          <button onClick={cancelAudio} style={{ ...iconBtnStyle, color: 'var(--pink)' }}>✕</button>
          <button onClick={sendAudio} disabled={sending} style={{ background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)', borderRadius: 'var(--radius-md)', color: 'var(--cyan)', fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, padding: '8px 16px', cursor: 'pointer', letterSpacing: '1px', outline: 'none' }}>
            {sending ? '...' : 'ENVIAR'}
          </button>
        </div>
      )}

      {/* ── Input area ────────────────────────────────────────────────────────── */}
      {recState !== 'preview' && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--deep)', flexShrink: 0 }}>
          {/* Recording indicator */}
          {recState === 'recording' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '6px 10px', background: 'rgba(255,79,123,0.1)', border: '1px solid rgba(255,79,123,0.3)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pink)', animation: 'pulse-dot 0.8s ease-in-out infinite' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--pink)' }}>Grabando... {recSeconds}s</span>
              <button onClick={stopRecording} style={{ marginLeft: 'auto', background: 'var(--pink)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, padding: '3px 10px', cursor: 'pointer', outline: 'none' }}>DETENER</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef} value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Mensaje para @${otherProfile?.username ?? '...'}`}
              rows={1}
              disabled={recState === 'recording'}
              style={{
                flex: 1, background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '20px', padding: '10px 16px',
                color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
                fontSize: '14px', outline: 'none', resize: 'none',
                lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto',
                transition: 'border-color var(--transition)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,255,247,0.3)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }}
            />
            {/* Mic button */}
            <button
              onClick={recState === 'idle' ? startRecording : stopRecording}
              title="Mensaje de voz"
              style={{
                ...iconBtnStyle,
                background: recState === 'recording' ? 'rgba(255,79,123,0.15)' : 'transparent',
                border: `1px solid ${recState === 'recording' ? 'var(--pink)' : 'var(--border)'}`,
                color: recState === 'recording' ? 'var(--pink)' : 'var(--text-muted)',
              }}>
              🎤
            </button>
            {/* Send button */}
            <button onClick={handleSend} disabled={!input.trim() || sending} style={{
              background: input.trim() ? 'var(--cyan)' : 'var(--card)',
              border: `1px solid ${input.trim() ? 'var(--cyan)' : 'var(--border)'}`,
              borderRadius: '50%', width: '40px', height: '40px',
              color: input.trim() ? '#000' : 'var(--text-muted)',
              fontSize: '16px', cursor: input.trim() ? 'pointer' : 'default',
              transition: 'all var(--transition)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              outline: 'none',
            }}>
              {sending ? '···' : '↑'}
            </button>
          </div>
        </div>
      )}

      {/* ── Call overlay ──────────────────────────────────────────────────────── */}
      {showCallUI && <CallOverlay webrtc={webrtc} otherProfile={otherProfile} incomingCall={incomingCall} onDismiss={() => { webrtc.endCall() }} onAccept={() => { webrtc.acceptCall(); setIncomingCall(null) }} />}
    </div>
  )
}

// ── Call button style ─────────────────────────────────────────────────────────
const callBtnStyle: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', padding: '6px 10px', cursor: 'pointer',
  fontSize: '16px', transition: 'all var(--transition)', outline: 'none',
}

const iconBtnStyle: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)',
  borderRadius: '50%', width: '40px', height: '40px',
  fontSize: '16px', cursor: 'pointer', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all var(--transition)', outline: 'none',
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

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: isConnected && isVideo ? 'transparent' : 'rgba(7,7,15,0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Remote stream — siempre montado para que el ref esté disponible cuando ontrack dispare.
          El <video> también reproduce audio-only streams, por eso sirve tanto para audio como video. */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={
          isConnected && isVideo
            ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#000' }
            : { position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }
        }
      />

      {/* Local preview — montado en videollamada (oculto hasta conectar) */}
      {isVideo && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={
            isConnected
              ? { position: 'absolute', bottom: '80px', right: '16px', width: '120px', height: '90px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '2px solid var(--cyan)', zIndex: 2 }
              : { position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }
          }
        />
      )}

      {/* Card */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: '32px 28px',
        textAlign: 'center', minWidth: '280px', maxWidth: '340px', width: '100%',
        position: 'relative', zIndex: 3,
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Glow ring around avatar */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
          <div style={{
            position: 'absolute', inset: '-6px', borderRadius: '50%',
            background: isRinging ? 'conic-gradient(var(--purple), var(--pink), var(--purple))' : 'conic-gradient(var(--cyan), var(--purple), var(--cyan))',
            animation: 'spin-ring 3s linear infinite',
            opacity: 0.7,
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            {otherProfile && <UserAvatar avatar={otherProfile.avatar} username={otherProfile.username} size={72} />}
          </div>
        </div>

        <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '1px' }}>
          @{otherProfile?.username ?? '...'}
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          {isRinging    && (incomingCall ? `📞 ${incomingCall.type === 'video' ? 'Videollamada' : 'Llamada de voz'} entrante` : '...')}
          {isCalling    && '📞 Llamando...'}
          {isConnecting && '🔗 Conectando...'}
          {isConnected  && `${isVideo ? '📹' : '📞'} ${callDuration}`}
        </div>

        {/* Llamada entrante — aceptar/rechazar */}
        {isRinging && (
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button onClick={onDismiss} style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,79,123,0.15)', border: '2px solid var(--pink)', color: 'var(--pink)', fontSize: '22px', cursor: 'pointer', outline: 'none' }}>✕</button>
            <button onClick={onAccept}  style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '2px solid #4ade80', color: '#4ade80', fontSize: '22px', cursor: 'pointer', outline: 'none' }}>✓</button>
          </div>
        )}

        {/* Llamando / conectando — solo botón colgar */}
        {(isCalling || isConnecting) && (
          <button onClick={onDismiss} style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,79,123,0.15)', border: '2px solid var(--pink)', color: 'var(--pink)', fontSize: '22px', cursor: 'pointer', outline: 'none' }}>✕</button>
        )}

        {/* Llamada activa — controles completos */}
        {isConnected && (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <CallCtrlBtn onClick={toggleMute} active={isMuted} label={isMuted ? '🔇' : '🎤'} title={isMuted ? 'Activar mic' : 'Silenciar'} />
            {isVideo && <CallCtrlBtn onClick={toggleCamera} active={isCameraOff} label={isCameraOff ? '📷' : '📸'} title={isCameraOff ? 'Activar cámara' : 'Apagar cámara'} />}
            {isVideo && <CallCtrlBtn onClick={toggleScreenShare} active={isScreenSharing} label="🖥️" title={isScreenSharing ? 'Dejar de compartir' : 'Compartir pantalla'} accent="var(--purple)" />}
            <button onClick={onDismiss} title="Colgar" style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,79,123,0.2)', border: '2px solid var(--pink)', color: 'var(--pink)', fontSize: '20px', cursor: 'pointer', outline: 'none' }}>📵</button>
          </div>
        )}
      </div>
    </div>
  )
}

function CallCtrlBtn({ onClick, active, label, title, accent = 'var(--cyan)' }: { onClick: () => void; active: boolean; label: string; title: string; accent?: string }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: '52px', height: '52px', borderRadius: '50%',
      background: active ? `rgba(255,79,123,0.15)` : `rgba(0,0,0,0.3)`,
      border: `2px solid ${active ? 'var(--pink)' : accent}`,
      color: active ? 'var(--pink)' : accent,
      fontSize: '20px', cursor: 'pointer', outline: 'none',
      transition: 'all var(--transition)',
    }}>
      {label}
    </button>
  )
}
