'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'

interface Profile {
  id: string; username: string; avatar: string | null; photo_url?: string | null
  bio: string | null; now_playing?: string | null; status?: string | null
}

type StatusId = 'online' | 'away' | 'dnd' | 'invisible'

const STATUSES: { id: StatusId; label: string; color: string; dot: string }[] = [
  { id: 'online',    label: 'En línea',     color: '#4ade80', dot: '#4ade80' },
  { id: 'away',      label: 'Ausente',      color: '#FBB040', dot: '#FBB040' },
  { id: 'dnd',       label: 'No molestar',  color: '#FF4F7B', dot: '#FF4F7B' },
  { id: 'invisible', label: 'Invisible',    color: '#555570', dot: '#555570' },
]
interface Conversation {
  otherId: string; otherProfile: Profile
  lastMessage: string; lastTime: string; isMine: boolean; unread: boolean
}

export default function MessagesPage() {
  const { user, setUser } = useAuthStore()
  const supabase = createClient()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [profiles,      setProfiles]      = useState<Profile[]>([])
  const [search,        setSearch]        = useState('')
  const [loading,       setLoading]       = useState(true)
  const [showNew,       setShowNew]       = useState(false)
  const [newSearch,     setNewSearch]     = useState('')
  const [showStatus,    setShowStatus]    = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentStatus: StatusId = ((user as any)?.status as StatusId) ?? 'online'
  const statusInfo = STATUSES.find(s => s.id === currentStatus) ?? STATUSES[0]

  async function handleSetStatus(id: StatusId) {
    setShowStatus(false)
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('profiles').update({ status: id }).eq('id', user.id)
    setUser({ ...user, ...({ status: id } as any) } as typeof user)  // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  // Cerrar dropdown al click fuera
  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setShowStatus(false)
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

  useEffect(() => { loadConversations() }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime: refrescar lista cuando llega un mensaje nuevo ──────────────────
  useEffect(() => {
    if (!user?.id) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = (supabase as any)
      .channel('messages-list-realtime')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const m = payload.new
        if (m.from_id !== user.id && m.to_id !== user.id) return
        // Actualizar la última conversación sin recargar todo
        const otherId = m.from_id === user.id ? m.to_id : m.from_id
        const preview = m.content?.startsWith('🎤') ? '🎤 Mensaje de voz' : (m.from_id === user.id ? 'Vos: ' : '') + (m.content ?? '').slice(0, 50) + ((m.content?.length ?? 0) > 50 ? '…' : '')
        setConversations(prev => {
          const existing = prev.find(c => c.otherId === otherId)
          const updated: Conversation = existing
            ? { ...existing, lastMessage: preview, lastTime: 'ahora', isMine: m.from_id === user.id, unread: m.from_id !== user.id }
            : { otherId, otherProfile: profiles.find(p => p.id === otherId) ?? { id: otherId, username: otherId, avatar: null, bio: null }, lastMessage: preview, lastTime: 'ahora', isMine: m.from_id === user.id, unread: m.from_id !== user.id }
          // Mover al tope
          return [updated, ...prev.filter(c => c.otherId !== otherId)]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profiles])

  async function loadConversations() {
    if (!user) { setLoading(false); return }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [{ data: msgs }, { data: allProfiles }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('messages').select('*').or(`from_id.eq.${user.id},to_id.eq.${user.id}`).order('created_at', { ascending: false }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('profiles').select('id, username, avatar, photo_url, bio, now_playing, status'),
      ])
      setProfiles(allProfiles ?? [])
      if (!msgs?.length) return

      const convMap = new Map<string, { msg: { from_id: string; to_id: string; content: string; created_at: string }; otherId: string }>()
      for (const m of msgs) {
        const otherId = m.from_id === user.id ? m.to_id : m.from_id
        if (!convMap.has(otherId)) convMap.set(otherId, { msg: m, otherId })
      }

      const convs: Conversation[] = []
      for (const [otherId, { msg }] of convMap.entries()) {
        const profile = (allProfiles ?? []).find((p: Profile) => p.id === otherId)
        if (!profile) continue
        const preview = msg.content.startsWith('🎤') ? '🎤 Mensaje de voz' : (msg.from_id === user.id ? 'Vos: ' : '') + msg.content.slice(0, 50) + (msg.content.length > 50 ? '…' : '')
        convs.push({
          otherId, otherProfile: profile,
          lastMessage: preview,
          lastTime: relativeTime(msg.created_at),
          isMine: msg.from_id === user.id,
          unread: msg.from_id !== user.id, // último mensaje del otro → sin leer
        })
      }
      setConversations(convs)
    } catch (e) { console.error('[Messages]', e) }
    finally { setLoading(false) }
  }

  function relativeTime(iso: string) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000
    if (diff < 60)   return 'ahora'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400)return `${Math.floor(diff / 3600)}h`
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  }

  const filtered = conversations.filter(c => c.otherProfile.username.toLowerCase().includes(search.toLowerCase()))
  const newCandidates = profiles.filter(p => p.id !== user?.id && p.username.toLowerCase().includes(newSearch.toLowerCase())).slice(0, 10)

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--deep)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 800, letterSpacing: '3px', color: 'var(--text-primary)', margin: 0 }}>MENSAJES</h1>
            {/* Status selector */}
            <div ref={statusRef} style={{ position: 'relative', display: 'inline-block', marginTop: '6px' }}>
              <button
                onClick={() => setShowStatus(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '20px', padding: '4px 10px 4px 8px',
                  cursor: 'pointer', outline: 'none', transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: statusInfo.color,
                  boxShadow: `0 0 6px ${statusInfo.color}`,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px',
                  color: statusInfo.color, letterSpacing: '0.5px',
                }}>
                  {statusInfo.label}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '8px', marginLeft: '2px' }}>▾</span>
              </button>

              {/* Dropdown */}
              {showStatus && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  minWidth: '150px',
                }}>
                  {STATUSES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSetStatus(s.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        width: '100%', padding: '10px 14px',
                        background: currentStatus === s.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                        border: 'none', cursor: 'pointer',
                        transition: 'background 0.1s',
                        borderLeft: currentStatus === s.id ? `2px solid ${s.color}` : '2px solid transparent',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = currentStatus === s.id ? 'rgba(255,255,255,0.04)' : 'transparent')}
                    >
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: s.color, boxShadow: `0 0 6px ${s.color}55`, flexShrink: 0,
                      }} />
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '11px',
                        color: currentStatus === s.id ? s.color : 'var(--text-secondary)',
                      }}>
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setShowNew(true)} style={{
            background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)',
            borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
            fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
            padding: '7px 14px', cursor: 'pointer', letterSpacing: '1px', outline: 'none',
          }}>
            + NUEVO
          </button>
        </div>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px' }}>🔍</span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar conversaciones..."
            style={{
              width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '20px', padding: '8px 12px 8px 34px',
              color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Conversations list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: '68px', background: 'var(--card)', borderRadius: 'var(--radius-md)', opacity: 1 - i * 0.2 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '1px', color: 'var(--text-muted)' }}>
              {search ? 'Sin resultados' : 'Sin conversaciones todavía'}
            </p>
            {!search && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                // Entrá al perfil de alguien y escribile
              </p>
            )}
          </div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            {filtered.map((conv) => (
              <Link key={conv.otherId} href={`/messages/${conv.otherId}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 20px', cursor: 'pointer',
                  transition: 'background var(--transition)',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Avatar + status dot */}
                  {(() => {
                    const st = (conv.otherProfile.status ?? 'online') as StatusId
                    const si = STATUSES.find(s => s.id === st) ?? STATUSES[0]
                    const visible = st !== 'invisible'
                    return (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <UserAvatar avatar={conv.otherProfile.avatar} photoUrl={conv.otherProfile.photo_url} username={conv.otherProfile.username} size={46} />
                        {visible && (
                          <div style={{
                            position: 'absolute', bottom: '-2px', right: '-2px',
                            width: '12px', height: '12px', borderRadius: '50%',
                            background: si.color, border: '2px solid var(--void)',
                            boxShadow: `0 0 6px ${si.color}`,
                          }} />
                        )}
                      </div>
                    )
                  })()}
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        @{conv.otherProfile.username}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '8px' }}>
                        {conv.lastTime}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.lastMessage}
                    </div>
                    {conv.otherProfile.now_playing && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#4ade80', marginTop: '2px' }}>
                        🎮 {conv.otherProfile.now_playing}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* New conversation modal */}
      {showNew && (
        <div onClick={() => setShowNew(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
            {/* Top line */}
            <div style={{ height: '2px', background: 'linear-gradient(90deg, var(--cyan-dim), var(--purple-dim))', borderRadius: '2px', marginBottom: '20px' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '2px', color: 'var(--text-primary)', marginBottom: '16px', fontWeight: 700 }}>
              NUEVA CONVERSACIÓN
            </h2>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px' }}>🔍</span>
              <input
                type="text" value={newSearch} onChange={e => setNewSearch(e.target.value)}
                placeholder="Buscar usuario..." autoFocus
                style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px 10px 34px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '300px', overflowY: 'auto' }}>
              {newCandidates.map(p => (
                <Link key={p.id} href={`/messages/${p.id}`} onClick={() => setShowNew(false)} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'background var(--transition)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <UserAvatar avatar={p.avatar} photoUrl={p.photo_url} username={p.username} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>@{p.username}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: p.now_playing ? '#4ade80' : 'var(--text-muted)' }}>
                        {p.now_playing ? `🎮 ${p.now_playing}` : (p.bio?.slice(0, 35) || 'Jugando en Respawn')}
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--cyan)', flexShrink: 0 }}>chat →</span>
                  </div>
                </Link>
              ))}
              {newSearch && newCandidates.length === 0 && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Sin resultados.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
