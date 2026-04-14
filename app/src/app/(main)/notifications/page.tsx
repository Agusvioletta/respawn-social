'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'

interface Notification {
  id: string
  type: 'like' | 'comment' | 'follow'
  actor_username: string
  actor_avatar: string | null
  post_id?: number
  content?: string
  created_at: string
}

export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user)
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // Usar user?.id como dep — evita re-fetch en TOKEN_REFRESHED (misma referencia distinta)
  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    loadNotifications()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function loadNotifications() {
    if (!user) { setLoading(false); return }
    setLoading(true)
    try {
      // Get current user's post IDs first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: userPosts } = await (supabase as any)
        .from('posts').select('id').eq('user_id', user.id)
      const userPostIds = new Set<number>((userPosts ?? []).map((p: { id: number }) => p.id))

      const notifs: Notification[] = []

      // --- Likes en posts del usuario ---
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: likes } = await (supabase as any)
        .from('likes')
        .select('id, user_id, post_id')
        .neq('user_id', user.id)
        .order('id', { ascending: false })
        .limit(50)

      if (likes?.length) {
        const likerIds = [...new Set<string>((likes as { user_id: string }[]).map(l => l.user_id))]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: likerProfiles } = await (supabase as any)
          .from('profiles').select('id, username, avatar').in('id', likerIds)
        const likerMap = new Map<string, { username: string; avatar: string | null }>()
        for (const p of (likerProfiles ?? [])) likerMap.set(p.id, p)

        for (const like of likes) {
          if (!userPostIds.has(like.post_id)) continue
          const prof = likerMap.get(like.user_id)
          if (!prof) continue
          notifs.push({
            id: `like-${like.id}`,
            type: 'like',
            actor_username: prof.username,
            actor_avatar: prof.avatar,
            post_id: like.post_id,
            created_at: new Date(Date.now() - notifs.length * 1000).toISOString(),
          })
        }
      }

      // --- Comentarios en posts del usuario ---
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: comments } = await (supabase as any)
        .from('comments')
        .select('id, user_id, post_id, content, created_at, username, avatar')
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)

      for (const comment of (comments ?? [])) {
        if (!userPostIds.has(comment.post_id)) continue
        notifs.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          actor_username: comment.username,
          actor_avatar: comment.avatar,
          post_id: comment.post_id,
          content: comment.content?.slice(0, 60),
          created_at: comment.created_at,
        })
      }

      // --- Nuevos seguidores ---
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: follows } = await (supabase as any)
        .from('follows')
        .select('follower_id, created_at')
        .eq('following_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)

      if (follows?.length) {
        const followerIds = (follows as { follower_id: string }[]).map(f => f.follower_id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: followerProfiles } = await (supabase as any)
          .from('profiles').select('id, username, avatar').in('id', followerIds)
        const followerMap = new Map<string, { username: string; avatar: string | null }>()
        for (const p of (followerProfiles ?? [])) followerMap.set(p.id, p)

        for (const follow of follows) {
          const prof = followerMap.get(follow.follower_id)
          if (!prof) continue
          notifs.push({
            id: `follow-${follow.follower_id}`,
            type: 'follow',
            actor_username: prof.username,
            actor_avatar: prof.avatar,
            created_at: follow.created_at,
          })
        }
      }

      // Ordenar por fecha descendente
      notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setNotifications(notifs.slice(0, 50))
    } catch (e) {
      console.error('[Notifications]', e)
    } finally {
      setLoading(false)
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return 'ahora'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  function notifText(n: Notification) {
    switch (n.type) {
      case 'like':    return 'le dio like a tu post'
      case 'comment': return `comentó: "${n.content}"`
      case 'follow':  return 'empezó a seguirte'
      default:        return ''
    }
  }

  function notifIcon(type: string) {
    return { like: '❤️', comment: '💬', follow: '👤' }[type] ?? '🔔'
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', letterSpacing: '3px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '20px' }}>
        NOTIFICACIONES
      </h1>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: '64px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔔</div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
            Sin notificaciones todavía.<br />Cuando alguien interactúe con tu contenido, aparecerá acá.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {notifications.map((n) => (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '12px 14px',
            }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Link href={`/profile/${n.actor_username}`}>
                  <UserAvatar avatar={n.actor_avatar} username={n.actor_username} size={38} />
                </Link>
                <span style={{ position: 'absolute', bottom: -2, right: -2, fontSize: '13px' }}>
                  {notifIcon(n.type)}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  @{n.actor_username}
                </span>{' '}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {notifText(n)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                  {formatTime(n.created_at)}
                </span>
                {n.post_id && (
                  <Link href={`/post/${n.post_id}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cyan)', textDecoration: 'none' }}>
                    ver →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
