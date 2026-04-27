'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { detectGameTag } from '@/lib/utils/xp'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { PremiumBadge } from '@/components/ui/PremiumBadge'
import type { PostWithMeta } from '@/lib/supabase/queries/posts'

interface PostCardProps {
  post: PostWithMeta
  onDeleted?: (postId: number) => void
  onLikeToggled?: (postId: number, liked: boolean) => void
}

const REACTIONS = [
  { type: 'GG',   emoji: '🏆', label: 'GG' },
  { type: 'POG',  emoji: '😮', label: 'POG' },
  { type: 'RIP',  emoji: '💀', label: 'RIP' },
  { type: 'KEKW', emoji: '😂', label: 'KEKW' },
]

export function PostCard({ post, onDeleted, onLikeToggled }: PostCardProps) {
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const supabase = createClient()

  const likes = post.likes ?? []
  const comments = post.comments ?? []
  const isLiked = user ? likes.some((l) => l.user_id === user.id) : false
  const [likeCount, setLikeCount] = useState(likes.length)
  const [liked, setLiked] = useState(isLiked)
  const [deleting, setDeleting] = useState(false)

  // Reactions state
  const [reactions, setReactions] = useState<Record<string, number>>({ GG: 0, POG: 0, RIP: 0, KEKW: 0 })
  const [myReaction, setMyReaction] = useState<string | null>(null)

  const isOwn = user?.id === post.user_id
  const gameTag = detectGameTag(post.content ?? '')
  const date = new Date(post.created_at).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  useEffect(() => {
    loadReactions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id])

  async function loadReactions() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('post_reactions')
        .select('reaction_type, user_id')
        .eq('post_id', post.id)
      if (!data) return
      const counts: Record<string, number> = { GG: 0, POG: 0, RIP: 0, KEKW: 0 }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.forEach((r: any) => { if (r.reaction_type in counts) counts[r.reaction_type]++ })
      setReactions(counts)
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mine = data.find((r: any) => r.user_id === user.id)
        setMyReaction(mine?.reaction_type ?? null)
      }
    } catch { /* table might not exist yet — reactions silently disabled */ }
  }

  async function handleReaction(type: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) return

    const prevReaction = myReaction
    const prevCounts = { ...reactions }

    // Optimistic update
    if (myReaction === type) {
      setMyReaction(null)
      setReactions(r => ({ ...r, [type]: Math.max(0, r[type] - 1) }))
    } else {
      if (myReaction) setReactions(r => ({ ...r, [myReaction]: Math.max(0, r[myReaction] - 1) }))
      setMyReaction(type)
      setReactions(r => ({ ...r, [type]: r[type] + 1 }))
    }

    try {
      if (prevReaction) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('post_reactions').delete()
          .eq('post_id', post.id).eq('user_id', user.id)
      }
      if (prevReaction !== type) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('post_reactions').insert({
          post_id: post.id, user_id: user.id, reaction_type: type,
        })
      }
    } catch {
      // Revert on error
      setMyReaction(prevReaction)
      setReactions(prevCounts)
    }
  }

  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) return

    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount((c) => c + (newLiked ? 1 : -1))
    onLikeToggled?.(post.id, newLiked)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from('likes').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle()
      if (existing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('likes').insert({ post_id: post.id, user_id: user.id })
      }
    } catch {
      setLiked(!newLiked)
      setLikeCount((c) => c + (newLiked ? -1 : 1))
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('¿Borrar esta publicación?')) return
    setDeleting(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('posts').delete().eq('id', post.id).eq('user_id', user!.id)
      onDeleted?.(post.id)
    } catch {
      setDeleting(false)
    }
  }

  function formatContent(text: string) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/#(\w+)/g, '<a href="/explore?q=$1" onclick="event.stopPropagation()" style="color:var(--cyan);text-decoration:none;cursor:pointer;">#$1</a>')
      .replace(/@(\w+)/g, '<a href="/profile/$1" onclick="event.stopPropagation()" style="color:var(--purple);text-decoration:none;">@$1</a>')
  }

  const [copied, setCopied] = useState(false)

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation()
    const url = `${window.location.origin}/post/${post.id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const isLFG = post.post_type === 'lfg'
  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0)

  return (
    <article
      onClick={() => router.push(`/post/${post.id}`)}
      className="animate-fade-in-up"
      style={{
        background: 'var(--card)',
        border: `1px solid ${isLFG ? 'rgba(192,132,252,0.35)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color var(--transition), background var(--transition), box-shadow var(--transition)',
        boxShadow: isLFG ? '0 0 16px rgba(192,132,252,0.06)' : 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isLFG ? 'rgba(192,132,252,0.6)' : 'rgba(0,255,247,0.2)'
        e.currentTarget.style.background = 'var(--card-hover)'
        e.currentTarget.style.boxShadow = isLFG ? '0 4px 24px rgba(192,132,252,0.1)' : '0 4px 24px rgba(0,0,0,0.3)'
        const shine = e.currentTarget.querySelector('.post-shine') as HTMLElement
        if (shine) shine.style.opacity = '1'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isLFG ? 'rgba(192,132,252,0.35)' : 'var(--border)'
        e.currentTarget.style.background = 'var(--card)'
        e.currentTarget.style.boxShadow = isLFG ? '0 0 16px rgba(192,132,252,0.06)' : 'none'
        const shine = e.currentTarget.querySelector('.post-shine') as HTMLElement
        if (shine) shine.style.opacity = '0'
      }}
    >
      {/* Top shine line */}
      <div className="post-shine" style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: isLFG
          ? 'linear-gradient(90deg, transparent, rgba(192,132,252,0.6), transparent)'
          : 'linear-gradient(90deg, transparent, var(--cyan-dim), transparent)',
        opacity: 0, transition: 'opacity var(--transition)',
      }} />

      {/* LFG badge */}
      {isLFG && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.25)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, color: 'var(--purple)', letterSpacing: '2px' }}>🔎 LFG</span>
          {post.lfg_game && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)', background: 'rgba(192,132,252,0.15)', borderRadius: '4px', padding: '1px 8px' }}>
              🎮 {post.lfg_game}
            </span>
          )}
          {post.lfg_platform && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
              📱 {post.lfg_platform}
            </span>
          )}
          {post.lfg_slots != null && post.lfg_slots > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#4ade80', marginLeft: 'auto' }}>
              {post.lfg_slots} lugar{post.lfg_slots !== 1 ? 'es' : ''} libre{post.lfg_slots !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href={`/profile/${post.username}`} onClick={(e) => e.stopPropagation()}>
            <UserAvatar avatar={post.avatar} username={post.username} size={38} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <Link href={`/profile/${post.username}`} onClick={(e) => e.stopPropagation()}
                style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: post.author_name_color ?? 'var(--text-primary)', textDecoration: 'none' }}>
                @{post.username}
              </Link>
              {(post.author_premium_tier === 'pro' || post.author_premium_tier === 'elite') && (
                <PremiumBadge tier={post.author_premium_tier} />
              )}
              {gameTag && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px',
                  color: 'var(--cyan)', background: 'var(--cyan-glow)',
                  border: '1px solid var(--cyan-border)', borderRadius: '4px',
                  padding: '1px 6px',
                }}>
                  {gameTag.icon} {gameTag.game}
                </span>
              )}
              {isLFG && !gameTag && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--purple)', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.3)', borderRadius: '4px', padding: '1px 6px' }}>
                  🔎 LFG
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
              {date}
            </div>
          </div>
        </div>

        {isOwn && (
          <button onClick={handleDelete} disabled={deleting}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
              fontSize: '11px', cursor: 'pointer', padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
            }}>
            {deleting ? '...' : 'borrar'}
          </button>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <p
          style={{
            fontFamily: 'var(--font-body)', fontSize: '15px',
            color: 'var(--text-primary)', lineHeight: '1.5',
            marginBottom: post.image_url ? '12px' : '0',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}
          dangerouslySetInnerHTML={{ __html: formatContent(post.content) }}
        />
      )}

      {/* Image */}
      {post.image_url && (
        <img
          src={post.image_url}
          alt="imagen del post"
          onClick={(e) => { e.stopPropagation(); window.open(post.image_url!, '_blank') }}
          style={{
            width: '100%', maxHeight: '400px', objectFit: 'cover',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            cursor: 'zoom-in',
          }}
        />
      )}

      {/* Reactions row — only shown if there are any or user is logged in */}
      {(user || totalReactions > 0) && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
          {REACTIONS.map((r) => {
            const isActive = myReaction === r.type
            const count = reactions[r.type]
            if (!user && count === 0) return null
            return (
              <button
                key={r.type}
                onClick={(e) => handleReaction(r.type, e)}
                title={r.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: isActive ? 'rgba(0,255,247,0.08)' : 'var(--surface)',
                  border: `1px solid ${isActive ? 'var(--cyan-border)' : 'var(--border)'}`,
                  borderRadius: '20px',
                  color: isActive ? 'var(--cyan)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: isActive ? 700 : 400,
                  letterSpacing: '0.5px',
                  padding: '3px 9px',
                  cursor: user ? 'pointer' : 'default',
                  transition: 'all var(--transition)',
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseEnter={(e) => {
                  if (user && !isActive) {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,247,0.3)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                  }
                }}
              >
                <span style={{ fontSize: '13px' }}>{r.emoji}</span>
                <span>{r.label}</span>
                {count > 0 && (
                  <span style={{
                    background: isActive ? 'rgba(0,255,247,0.15)' : 'rgba(255,255,255,0.06)',
                    borderRadius: '10px', padding: '0 5px',
                    fontSize: '10px', fontFamily: 'var(--font-mono)',
                    color: isActive ? 'var(--cyan)' : 'var(--text-secondary)',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
        <button onClick={handleLike}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: liked ? 'rgba(255,79,123,0.1)' : 'transparent',
            border: `1px solid ${liked ? 'var(--pink)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)',
            color: liked ? 'var(--pink)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', fontSize: '12px',
            padding: '4px 10px', cursor: 'pointer',
            transition: 'all var(--transition)',
          }}>
          ♥ {likeCount}
        </button>
        <span style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)',
        }}>
          💬 {comments.length} comentario{comments.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={handleShare}
          title="Copiar enlace"
          style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: '4px',
            background: copied ? 'rgba(74,222,128,0.1)' : 'transparent',
            border: `1px solid ${copied ? 'rgba(74,222,128,0.4)' : 'transparent'}`,
            borderRadius: 'var(--radius-sm)',
            color: copied ? '#4ade80' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', fontSize: '10px',
            padding: '3px 8px', cursor: 'pointer',
            transition: 'all var(--transition)',
          }}
        >
          {copied ? '✓ copiado' : '🔗 compartir'}
        </button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
          ver →
        </span>
      </div>
    </article>
  )
}
