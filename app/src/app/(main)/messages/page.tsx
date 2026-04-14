'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'

interface Profile {
  id: string
  username: string
  avatar: string | null
  bio: string | null
}

interface Conversation {
  otherId: string
  otherProfile: Profile
  lastMessage: string
  lastTime: string
  isMine: boolean
}

export default function MessagesPage() {
  const user = useAuthStore((s) => s.user)
  const supabase = createClient()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNewConv, setShowNewConv] = useState(false)
  const [newConvSearch, setNewConvSearch] = useState('')

  async function loadConversations() {
    if (!user) { setLoading(false); return }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: msgs } = await (supabase as any)
        .from('messages')
        .select('*')
        .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allProfiles } = await (supabase as any).from('profiles').select('id, username, avatar, bio')
      setProfiles(allProfiles ?? [])

      if (!msgs?.length) return

      // Agrupar por conversación (último mensaje por usuario)
      const convMap = new Map<string, { msg: { from_id: string; to_id: string; content: string; created_at: string }; otherId: string }>()
      for (const m of msgs) {
        const otherId = m.from_id === user.id ? m.to_id : m.from_id
        if (!convMap.has(otherId)) convMap.set(otherId, { msg: m, otherId })
      }

      const convs: Conversation[] = []
      for (const [otherId, { msg }] of convMap.entries()) {
        const profile = (allProfiles ?? []).find((p: Profile) => p.id === otherId)
        if (!profile) continue
        convs.push({
          otherId,
          otherProfile: profile,
          lastMessage: (msg.from_id === user.id ? 'Vos: ' : '') + msg.content.slice(0, 40) + (msg.content.length > 40 ? '...' : ''),
          lastTime: new Date(msg.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
          isMine: msg.from_id === user.id,
        })
      }
      setConversations(convs)
    } catch (e) {
      console.error('[Messages]', e)
    } finally {
      setLoading(false)
    }
  }

  // Usar user?.id como dep — evita re-fetch en TOKEN_REFRESHED (misma referencia distinta)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadConversations() }, [user?.id])

  const filtered = conversations.filter((c) =>
    c.otherProfile.username.toLowerCase().includes(search.toLowerCase())
  )

  const newConvCandidates = profiles
    .filter((p) => p.id !== user?.id && p.username.toLowerCase().includes(newConvSearch.toLowerCase()))
    .slice(0, 10)

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', letterSpacing: '3px', color: 'var(--text-muted)', fontWeight: 700, margin: 0 }}>
          MENSAJES
        </h1>
        <button onClick={() => setShowNewConv(true)} style={{
          background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)',
          borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
          fontFamily: 'var(--font-mono)', fontSize: '11px',
          padding: '6px 14px', cursor: 'pointer',
        }}>
          + Nuevo
        </button>
      </div>

      {/* Search */}
      <input
        type="text" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar conversaciones..."
        style={{
          width: '100%', background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '13px',
          outline: 'none', marginBottom: '16px',
        }}
      />

      {/* Conversations */}
      {loading ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
          Cargando...
        </p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
            Sin conversaciones todavía.<br />Entrá al perfil de alguien para escribirle.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filtered.map((conv) => (
            <Link key={conv.otherId} href={`/messages/${conv.otherId}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '12px 14px',
                cursor: 'pointer', transition: 'background var(--transition)',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--card)')}
              >
                <UserAvatar avatar={conv.otherProfile.avatar} username={conv.otherProfile.username} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    @{conv.otherProfile.username}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.lastMessage}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {conv.lastTime}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New conversation modal */}
      {showNewConv && (
        <div onClick={() => setShowNewConv(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '16px',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '24px',
            width: '100%', maxWidth: '400px',
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '2px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              NUEVA CONVERSACIÓN
            </h2>
            <input
              type="text" value={newConvSearch} onChange={(e) => setNewConvSearch(e.target.value)}
              placeholder="Buscar usuario..." autoFocus
              style={{
                width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '13px',
                outline: 'none', marginBottom: '12px',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
              {newConvCandidates.map((p) => (
                <Link key={p.id} href={`/messages/${p.id}`} onClick={() => setShowNewConv(false)} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px', borderRadius: 'var(--radius-md)',
                    cursor: 'pointer', transition: 'background var(--transition)',
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <UserAvatar avatar={p.avatar} username={p.username} size={36} />
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        @{p.username}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                        {p.bio || 'Jugando en Respawn'}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
