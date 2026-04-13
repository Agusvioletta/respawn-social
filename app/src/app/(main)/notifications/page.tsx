'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'

interface Notification {
  id: string
  type: 'like' | 'comment' | 'follow' | 'mention'
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

  useEffect(() => {
    if (!user) { setLoading(false); return }
    loadNotifications()
  }, [user])

  async function loadNotifications() {
    if (!user) return
    setLoading(true)

    // Construir notificaciones desde las tablas existentes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [{ data: likes }, { data: comments }, { data: follows }] = await Promise.all([
      // Likes en posts del usuario
      (supabase as any)
        .from('likes')
        .select('id, user_id, post_id, profiles!likes_user_id_fkey(username, avatar), posts!likes_post_id_fkey(created_at)')
        .neq('user_id', user.id)
        .order('id', { ascending: false })
        .limit(30),
      // Comentarios en posts del usuario
      (supabase as any)
        .from('comments')
        .select('id, user_id, post_id, content, created_at, profiles!comments_user_id_fkey(username, avatar), posts!comments_post_id_fkey(user_id)')
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30),
      // Nuevos seguidores
      (supabase as any)
        .from('follows')
        .select('follower_id, created_at, profiles!follows_follower_id_fkey(username, avatar)')
        .eq('following_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    const notifs: Notification[] = []

    // Filtrar likes en posts del usuario — necesitamos los post_ids del usuario primero
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userPosts } = await (supabase as any).from('posts').select('id').eq('user_id', user.id)
    const userPostIds = new Set((userPosts ?? []).map((p: { id: number }) => p.id))

    for (const like of (likes ?? [])) {
      if (!userPostIds.has(like.post_id)) continue
      if (!like.profiles?.username) continue // perfil eliminado
      notifs.push({
        id: `like-${like.id}`,
        type: 'like',
        actor_username: like.profiles.username,
        actor_avatar: like.profiles?.avatar ?? null,
        post_id: like.post_id,
        created_at: like.posts?.created_at ?? '2000-01-01T00:00:00Z', // likes sin fecha → al final
      })
    }

    for (const comment of (comments ?? [])) {
      if (!userPostIds.has(comment.post_id)) continue
      if (!comment.profiles?.username) continue // perfil eliminado
      notifs.push({
        id: `comment-${comment.id}`,
        type: 'comment',
        actor_username: comment.profiles.username,
        actor_avatar: comment.profiles?.avatar ?? null,
        post_id: comment.post_id,
        content: comment.content?.slice(0, 60),
        created_at: comment.created_at,
      })
    }

    for (const follow of (follows ?? [])) {
      if (!follow.profiles?.username) continue // perfil eliminado
      notifs.push({
        id: `follow-${follow.follower_id}`,
        type: 'follow',
        actor_username: follow.profiles.username,
        actor_avatar: follow.profiles?.avatar ?? null,
        created_at: follow.created_at,
      })
    }

    // Ordenar por fecha descendente
    notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setNotifications(notifs.slice(0, 50))
    setLoading(false)
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
    return { like: '❤️', comment: '💬', follow: '👤', mention: '📢' }[type] ?? '🔔'
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', letterSpacing: '3px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '20px' }}>
        NOTIFICACIONES
      </h1>

      {loading ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
          Cargando...
        </p>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔔</div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
            Sin notificaciones todavía.
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
