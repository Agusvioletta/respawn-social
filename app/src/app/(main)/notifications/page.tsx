'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { UserAvatar } from '@/components/ui/UserAvatar'

// ── Types ─────────────────────────────────────────────────────────────────────
type NotifType = 'like' | 'comment' | 'follow' | 'message'
type Filter    = 'all' | NotifType

interface Notif {
  id:             string
  type:           NotifType
  actor_id?:      string
  actor_username: string
  actor_avatar:   string | null
  post_id?:       number
  content?:       string
  created_at:     string | null
}

// ── Config por tipo ───────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<NotifType, { icon: string; color: string; bg: string; label: string }> = {
  like:    { icon: '❤️',  color: '#FF4F7B', bg: 'rgba(255,79,123,0.08)',  label: 'Likes'       },
  comment: { icon: '💬',  color: '#00FFF7', bg: 'rgba(0,255,247,0.06)',   label: 'Comentarios' },
  follow:  { icon: '✦',   color: '#C084FC', bg: 'rgba(192,132,252,0.08)', label: 'Seguidores'  },
  message: { icon: '✉️',  color: '#4ade80', bg: 'rgba(74,222,128,0.06)',  label: 'Mensajes'    },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 0)        return 'ahora'
  if (diff < 60)       return 'ahora'
  if (diff < 3600)     return `${Math.floor(diff / 60)}m`
  if (diff < 86400)    return `${Math.floor(diff / 3600)}h`
  if (diff < 30 * 86400)  return `${Math.floor(diff / 86400)}d`
  if (diff < 365 * 86400) return `${Math.floor(diff / (30 * 86400))}mes`
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })
}

function notifText(n: Notif) {
  switch (n.type) {
    case 'like':    return 'le dio like a tu post'
    case 'comment': return `comentó en tu post`
    case 'follow':  return 'empezó a seguirte'
    case 'message': return 'te envió un mensaje'
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const user    = useAuthStore((s) => s.user)
  const supabase = createClient()
  const { readNotifIds, markRead } = useNotificationStore()

  const [notifs,          setNotifs]          = useState<Notif[]>([])
  const [loading,         setLoading]         = useState(true)
  const [filter,          setFilter]          = useState<Filter>('all')
  const [followRequests,  setFollowRequests]  = useState<{ id: number; from_id: string; username: string; avatar: string | null; photo_url: string | null; created_at: string }[]>([])
  const [reqLoading,      setReqLoading]      = useState<Record<number, boolean>>({})

  const loadNotifs = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const result: Notif[] = []

      // ── Posts del usuario (para filtrar likes y comentarios) ──────────────
      const { data: myPosts } = await sb.from('posts').select('id').eq('user_id', user.id)
      const myPostIds = new Set<number>((myPosts ?? []).map((p: { id: number }) => p.id))

      // ── Likes ─────────────────────────────────────────────────────────────
      // Intentamos traer created_at; si la columna no existe Supabase lo ignora
      const { data: likes } = await sb
        .from('likes').select('id, user_id, post_id, created_at')
        .neq('user_id', user.id).order('id', { ascending: false }).limit(40)

      if (likes?.length) {
        const likerIds = [...new Set<string>(likes.map((l: { user_id: string }) => l.user_id))]
        const { data: likerProfs } = await sb.from('profiles').select('id, username, avatar').in('id', likerIds)
        const likerMap = new Map<string, { username: string; avatar: string | null }>()
        for (const p of (likerProfs ?? [])) likerMap.set(p.id, p)

        for (const like of likes) {
          if (!myPostIds.has(like.post_id)) continue
          const prof = likerMap.get(like.user_id)
          if (!prof) continue
          result.push({
            id: `like-${like.id}`, type: 'like',
            actor_username: prof.username, actor_avatar: prof.avatar,
            post_id: like.post_id,
            // Usar created_at real si existe, si no null (se muestra '—')
            created_at: like.created_at ?? null,
          })
        }
      }

      // ── Comentarios ───────────────────────────────────────────────────────
      const { data: comments } = await sb
        .from('comments').select('id, user_id, post_id, content, created_at, username, avatar')
        .neq('user_id', user.id).order('created_at', { ascending: false }).limit(30)

      for (const c of (comments ?? [])) {
        if (!myPostIds.has(c.post_id)) continue
        result.push({
          id: `comment-${c.id}`, type: 'comment',
          actor_username: c.username, actor_avatar: c.avatar,
          post_id: c.post_id, content: c.content?.slice(0, 80),
          created_at: c.created_at,
        })
      }

      // ── Seguidores ────────────────────────────────────────────────────────
      const { data: follows } = await sb
        .from('follows').select('follower_id, created_at')
        .eq('following_id', user.id).order('created_at', { ascending: false }).limit(30)

      if (follows?.length) {
        const followerIds = follows.map((f: { follower_id: string }) => f.follower_id)
        const { data: followerProfs } = await sb.from('profiles').select('id, username, avatar').in('id', followerIds)
        const followerMap = new Map<string, { username: string; avatar: string | null }>()
        for (const p of (followerProfs ?? [])) followerMap.set(p.id, p)

        for (const f of follows) {
          const prof = followerMap.get(f.follower_id)
          if (!prof) continue
          result.push({
            id: `follow-${f.follower_id}`, type: 'follow',
            actor_username: prof.username, actor_avatar: prof.avatar,
            created_at: f.created_at,
          })
        }
      }

      // ── Mensajes recibidos ────────────────────────────────────────────────
      const { data: msgs } = await sb
        .from('messages').select('id, from_id, content, created_at')
        .eq('to_id', user.id).order('created_at', { ascending: false }).limit(20)

      if (msgs?.length) {
        const senderIds = [...new Set<string>(msgs.map((m: { from_id: string }) => m.from_id))]
        const { data: senderProfs } = await sb.from('profiles').select('id, username, avatar').in('id', senderIds)
        const senderMap = new Map<string, { username: string; avatar: string | null }>()
        for (const p of (senderProfs ?? [])) senderMap.set(p.id, p)

        // Un item por sender (el más reciente)
        const seen = new Set<string>()
        for (const m of msgs) {
          if (seen.has(m.from_id)) continue
          seen.add(m.from_id)
          const prof = senderMap.get(m.from_id)
          if (!prof) continue
          result.push({
            id: `msg-${m.id}`, type: 'message',
            actor_id: m.from_id,
            actor_username: prof.username, actor_avatar: prof.avatar,
            content: m.content?.slice(0, 60),
            created_at: m.created_at,
          })
        }
      }

      // ── Solicitudes de seguimiento pendientes ────────────────────────────
      const { data: requests } = await sb
        .from('follow_requests').select('id, from_id, created_at')
        .eq('to_id', user.id).order('created_at', { ascending: false })

      if (requests?.length) {
        const reqIds = requests.map((r: { from_id: string }) => r.from_id)
        const { data: reqProfs } = await sb.from('profiles').select('id, username, avatar, photo_url').in('id', reqIds)
        const profMap = new Map<string, { username: string; avatar: string | null; photo_url: string | null }>()
        for (const p of (reqProfs ?? [])) profMap.set(p.id, p)
        setFollowRequests(requests.map((r: { id: number; from_id: string; created_at: string }) => {
          const p = profMap.get(r.from_id) ?? { username: r.from_id, avatar: null, photo_url: null }
          return { id: r.id, from_id: r.from_id, username: p.username, avatar: p.avatar, photo_url: p.photo_url, created_at: r.created_at }
        }))
      } else {
        setFollowRequests([])
      }

      result.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      setNotifs(result.slice(0, 60))
    } catch (e) {
      console.error('[Notifications]', e)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => { loadNotifs() }, [loadNotifs])

  // Marcar todas como leídas cuando se monta la página
  useEffect(() => {
    if (notifs.length) markRead(notifs.map(n => n.id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifs])

  async function handleAccept(req: typeof followRequests[0]) {
    setReqLoading(l => ({ ...l, [req.id]: true }))
    try {
      // RPC con SECURITY DEFINER — bypasa RLS sin necesitar service role key
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('accept_follow_request', { request_id: req.id })
      if (error) { console.error('[Notifications] accept error:', error); return }
      setFollowRequests(prev => prev.filter(r => r.id !== req.id))
    } catch (e) { console.error('[Notifications] accept:', e) }
    finally { setReqLoading(l => ({ ...l, [req.id]: false })) }
  }

  async function handleReject(reqId: number) {
    setReqLoading(l => ({ ...l, [reqId]: true }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    try {
      await sb.from('follow_requests').delete().eq('id', reqId)
      setFollowRequests(prev => prev.filter(r => r.id !== reqId))
    } catch (e) { console.error('[Notifications] reject:', e) }
    finally { setReqLoading(l => ({ ...l, [reqId]: false })) }
  }

  const isUnread = (id: string) => !readNotifIds.includes(id)

  const filtered = filter === 'all' ? notifs : notifs.filter(n => n.type === filter)
  const unreadCount = notifs.filter(n => isUnread(n.id)).length

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',     label: 'Todas' },
    { key: 'like',    label: '❤️ Likes' },
    { key: 'comment', label: '💬 Comentarios' },
    { key: 'follow',  label: '✦ Seguidores' },
    { key: 'message', label: '✉️ Mensajes' },
  ]

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', letterSpacing: '3px', color: 'var(--text-primary)', fontWeight: 800, margin: 0 }}>
            NOTIFICACIONES
          </h1>
          {unreadCount > 0 && (
            <span style={{
              background: 'var(--pink)', color: '#fff',
              fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 800,
              borderRadius: '999px', padding: '2px 8px',
              boxShadow: '0 0 10px rgba(255,79,123,0.4)',
            }}>
              {unreadCount} nueva{unreadCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markRead(notifs.map(n => n.id))}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '1px',
              padding: '5px 12px', cursor: 'pointer', transition: 'all var(--transition)',
            }}
          >
            marcar todo como leído
          </button>
        )}
      </div>

      {/* ── Solicitudes de seguimiento ──────────────────────────────────────── */}
      {followRequests.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: 'var(--purple)', letterSpacing: '2px' }}>
              SOLICITUDES DE SEGUIMIENTO
            </span>
            <span style={{
              background: 'rgba(192,132,252,0.2)', border: '1px solid rgba(192,132,252,0.4)',
              borderRadius: '999px', padding: '1px 8px',
              fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, color: 'var(--purple)',
            }}>{followRequests.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {followRequests.map(req => (
              <div key={req.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'rgba(192,132,252,0.06)',
                border: '1px solid rgba(192,132,252,0.2)',
                borderLeft: '3px solid var(--purple)',
                borderRadius: 'var(--radius-md)', padding: '12px 14px',
              }}>
                <Link href={`/profile/${req.username}`} style={{ display: 'block', flexShrink: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(192,132,252,0.3)', background: 'var(--surface)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={req.photo_url ?? (req.avatar ? (req.avatar.startsWith('/') || req.avatar.startsWith('http') ? req.avatar : `/${req.avatar}`) : '/avatar1.png')}
                      alt={req.username}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: req.photo_url ? 'auto' : 'pixelated' }}
                    />
                  </div>
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/profile/${req.username}`} style={{ textDecoration: 'none' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                      @{req.username}
                    </span>
                  </Link>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                    quiere seguirte
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {relativeTime(req.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleAccept(req)}
                    disabled={!!reqLoading[req.id]}
                    style={{
                      background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.4)',
                      borderRadius: '10px', color: '#4ade80',
                      fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                      letterSpacing: '1px', padding: '6px 14px', cursor: 'pointer', outline: 'none',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.1)' }}
                  >
                    {reqLoading[req.id] ? '...' : '✓ ACEPTAR'}
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={!!reqLoading[req.id]}
                    style={{
                      background: 'transparent', border: '1px solid var(--border)',
                      borderRadius: '10px', color: 'var(--text-muted)',
                      fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                      letterSpacing: '1px', padding: '6px 14px', cursor: 'pointer', outline: 'none',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--pink)'; e.currentTarget.style.color = 'var(--pink)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: '1px', background: 'var(--border)', margin: '16px 0 0' }} />
        </div>
      )}

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {FILTERS.map(f => {
          const active = filter === f.key
          const count  = f.key === 'all' ? notifs.length : notifs.filter(n => n.type === f.key).length
          if (f.key !== 'all' && count === 0) return null
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              background:  active ? 'rgba(0,255,247,0.1)' : 'transparent',
              border:      `1px solid ${active ? 'rgba(0,255,247,0.4)' : 'var(--border)'}`,
              borderRadius: '999px',
              color:       active ? 'var(--cyan)' : 'var(--text-muted)',
              fontFamily:  'var(--font-display)', fontSize: '10px', fontWeight: active ? 700 : 500,
              letterSpacing: '0.5px', padding: '5px 12px', cursor: 'pointer',
              whiteSpace: 'nowrap', transition: 'all var(--transition)',
              flexShrink: 0,
            }}>
              {f.label}
              {count > 0 && (
                <span style={{ marginLeft: '5px', opacity: 0.6 }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Lista ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              height: '68px', borderRadius: 'var(--radius-md)',
              background: 'var(--card)', border: '1px solid var(--border)',
              opacity: 1 - i * 0.12,
            }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 20px' }}>
          <div style={{ fontSize: '44px', marginBottom: '14px', filter: 'grayscale(0.3)' }}>🔔</div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '1px' }}>
            Sin notificaciones todavía
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
            // cuando alguien interactúe con tu contenido, aparecerá acá
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filtered.map((n) => {
            const cfg    = TYPE_CONFIG[n.type]
            const unread = isUnread(n.id)
            return (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: unread ? cfg.bg : 'var(--card)',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${unread ? cfg.color : 'transparent'}`,
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                transition: 'background var(--transition)',
                cursor: 'default',
              }}>

                {/* Avatar + tipo icon */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Link href={`/profile/${n.actor_username}`} style={{ display: 'block' }}>
                    <UserAvatar avatar={n.actor_avatar} username={n.actor_username} size={40} />
                  </Link>
                  <span style={{
                    position: 'absolute', bottom: '-3px', right: '-4px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'var(--surface)', border: `1px solid ${cfg.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '9px', lineHeight: 1,
                  }}>
                    {cfg.icon}
                  </span>
                </div>

                {/* Texto */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', flexWrap: 'wrap' }}>
                    <Link href={`/profile/${n.actor_username}`} style={{ textDecoration: 'none' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: unread ? 'var(--text-primary)' : 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                        @{n.actor_username}
                      </span>
                    </Link>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {notifText(n)}
                    </span>
                  </div>
                  {n.content && (
                    <p style={{
                      fontFamily: 'var(--font-body)', fontSize: '11px',
                      color: 'var(--text-muted)', margin: '3px 0 0',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: '340px',
                    }}>
                      "{n.content}"
                    </p>
                  )}
                </div>

                {/* Meta: tiempo + link */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                    {relativeTime(n.created_at)}
                  </span>
                  {n.type === 'message' ? (
                    <Link href={`/messages/${n.actor_id ?? n.actor_username}`} style={{
                      fontFamily: 'var(--font-mono)', fontSize: '10px',
                      color: cfg.color, textDecoration: 'none', letterSpacing: '0.5px',
                    }}>
                      responder →
                    </Link>
                  ) : n.post_id ? (
                    <Link href={`/post/${n.post_id}`} style={{
                      fontFamily: 'var(--font-mono)', fontSize: '10px',
                      color: cfg.color, textDecoration: 'none', letterSpacing: '0.5px',
                    }}>
                      ver post →
                    </Link>
                  ) : null}
                  {/* Dot unread */}
                  {unread && (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
