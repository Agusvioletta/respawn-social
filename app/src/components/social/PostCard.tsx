'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { detectGameTag } from '@/lib/utils/xp'
import type { PostWithMeta } from '@/lib/supabase/queries/posts'

interface PostCardProps {
  post: PostWithMeta
  onDeleted?: (postId: number) => void
  onLikeToggled?: (postId: number, liked: boolean) => void
}

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

  const isOwn = user?.id === post.user_id
  const gameTag = detectGameTag(post.content ?? '')
  const date = new Date(post.created_at).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) return

    // Optimistic update
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
      // Revert on error
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
      .replace(/#(\w+)/g, '<span style="color:var(--cyan);cursor:pointer;">#$1</span>')
      .replace(/@(\w+)/g, '<span style="color:var(--purple);">@$1</span>')
  }

  return (
    <article
      onClick={() => router.push(`/post/${post.id}`)}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        cursor: 'pointer',
        transition: 'border-color var(--transition), background var(--transition)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-bright)'
        e.currentTarget.style.background = 'var(--card-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.background = 'var(--card)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href={`/profile/${post.username}`} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: '38px', height: '38px',
              borderRadius: '50%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', cursor: 'pointer', flexShrink: 0,
            }}>
              {post.avatar === 'avatar1.png' ? '🧑‍💻' : '👾'}
            </div>
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <Link href={`/profile/${post.username}`} onClick={(e) => e.stopPropagation()}
                style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none' }}>
                @{post.username}
              </Link>
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
            cursor: 'zoom-in', marginBottom: '0',
          }}
        />
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
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
          ver →
        </span>
      </div>
    </article>
  )
}
