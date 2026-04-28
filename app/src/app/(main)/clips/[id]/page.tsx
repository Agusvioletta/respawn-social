'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'

interface Clip {
  id: number
  user_id: string
  username: string
  avatar: string | null
  title: string
  description: string | null
  game: string | null
  video_url: string
  thumbnail_url: string | null
  views: number
  created_at: string
}

interface ClipComment {
  id: number
  user_id: string
  username: string
  avatar: string | null
  content: string
  created_at: string
}

export default function ClipDetailPage() {
  const params = useParams()
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const supabase = createClient()

  const [clip, setClip] = useState<Clip | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [comments, setComments] = useState<ClipComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const viewCountedRef = useRef(false)

  useEffect(() => {
    const id = params.id
    if (!id || !/^\d+$/.test(id as string)) { setLoading(false); return }
    loadClip(Number(id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function loadClip(id: number) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any

      const { data, error } = await sb.from('clips').select('*').eq('id', id).single()
      if (error || !data) { setLoading(false); return }
      setClip(data)

      const { data: likes } = await sb
        .from('clip_likes').select('user_id').eq('clip_id', id)
      setLikeCount(likes?.length ?? 0)
      setLiked(user ? (likes ?? []).some((l: { user_id: string }) => l.user_id === user.id) : false)

      const { data: cmts } = await sb
        .from('clip_comments').select('*').eq('clip_id', id)
        .order('created_at', { ascending: false })
      setComments(cmts ?? [])
    } catch (e) {
      console.error('[ClipDetail]', e)
    } finally {
      setLoading(false)
    }
  }

  // Contar vista una sola vez por sesión
  async function handleVideoPlay() {
    if (viewCountedRef.current || !clip) return
    viewCountedRef.current = true
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('increment_clip_views', { clip_id: clip.id })
      setClip(c => c ? { ...c, views: c.views + 1 } : c)
    } catch { /* best effort */ }
  }

  async function handleLike() {
    if (!user) { router.push('/login'); return }
    if (!clip) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(c => c + (wasLiked ? -1 : 1))
    try {
      if (wasLiked) {
        await sb.from('clip_likes').delete().eq('clip_id', clip.id).eq('user_id', user.id)
      } else {
        await sb.from('clip_likes').insert({ clip_id: clip.id, user_id: user.id })
      }
    } catch {
      setLiked(wasLiked)
      setLikeCount(c => c + (wasLiked ? 1 : -1))
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || !user || !clip) return
    setSubmitting(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from('clip_comments').insert({
        clip_id:  clip.id,
        user_id:  user.id,
        username: user.username,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        avatar:   (user as any).photo_url ?? user.avatar ?? null,
        content:  commentText.trim(),
      }).select().single()
      if (!error && data) {
        setComments(prev => [data, ...prev])
        setCommentText('')
      }
    } catch (e) {
      console.error('[ClipComment]', e)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('clip_comments').delete()
      .eq('id', commentId).eq('user_id', user.id)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  async function handleDeleteClip() {
    if (!clip || !user || !confirm('¿Borrar este clip? Esta acción no se puede deshacer.')) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    // Borrar archivos de storage
    try {
      const videoPath = clip.video_url.split('/clips/')[1]
      if (videoPath) await sb.storage.from('clips').remove([videoPath])
      if (clip.thumbnail_url) {
        const thumbPath = clip.thumbnail_url.split('/clips/')[1]
        if (thumbPath) await sb.storage.from('clips').remove([thumbPath])
      }
    } catch { /* storage delete best effort */ }
    await sb.from('clips').delete().eq('id', clip.id).eq('user_id', user.id)
    router.push('/clips')
  }

  function handleShare() {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  function relTime(iso: string) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000
    if (s < 60) return 'ahora'
    if (s < 3600) return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    if (s < 604800) return `${Math.floor(s / 86400)}d`
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  // ── Estados de carga/error ──────────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
      Cargando clip...
    </div>
  )

  if (!clip) return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        // Clip no encontrado
      </p>
      <Link href="/clips" style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: '12px', textDecoration: 'none' }}>
        ← Volver a clips
      </Link>
    </div>
  )

  const isOwn = user?.id === clip.user_id

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px 48px' }}>

      {/* Back */}
      <button
        onClick={() => router.back()}
        style={{
          background: 'transparent', border: 'none',
          fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)',
          cursor: 'pointer', padding: 0, marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}
      >
        ← Volver
      </button>

      {/* Video */}
      <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#000', marginBottom: '16px' }}>
        <video
          src={clip.video_url}
          poster={clip.thumbnail_url ?? undefined}
          controls
          playsInline
          onPlay={handleVideoPlay}
          style={{ width: '100%', maxHeight: '480px', display: 'block', objectFit: 'contain' }}
        />
      </div>

      {/* Título + meta */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 800,
            color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: '1px',
          }}>
            {clip.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {clip.game && (
              <span style={{
                background: 'rgba(0,255,247,0.08)', border: '1px solid rgba(0,255,247,0.25)',
                borderRadius: '4px', padding: '2px 8px',
                fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cyan)',
                letterSpacing: '0.5px',
              }}>
                {clip.game}
              </span>
            )}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              👁 {clip.views.toLocaleString('es-AR')} vistas
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              · {relTime(clip.created_at)}
            </span>
          </div>
        </div>

        {isOwn && (
          <button
            onClick={handleDeleteClip}
            style={{
              background: 'transparent', border: '1px solid rgba(255,79,123,0.35)',
              borderRadius: 'var(--radius-sm)', padding: '6px 12px',
              fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--pink)',
              cursor: 'pointer', flexShrink: 0, transition: 'all var(--transition)',
            }}
          >
            🗑 Borrar
          </button>
        )}
      </div>

      {/* Usuario + acciones */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 0', flexWrap: 'wrap', gap: '10px',
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        marginBottom: '16px',
      }}>
        <Link href={`/profile/${clip.username}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <UserAvatar avatar={clip.avatar} username={clip.username} size={36} />
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '13px',
            fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.5px',
          }}>
            @{clip.username}
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleLike}
            style={{
              background: liked ? 'rgba(255,79,123,0.1)' : 'transparent',
              border: `1px solid ${liked ? 'var(--pink)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)', padding: '7px 16px',
              fontFamily: 'var(--font-mono)', fontSize: '12px',
              color: liked ? 'var(--pink)' : 'var(--text-muted)',
              cursor: 'pointer', transition: 'all var(--transition)',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {liked ? '❤️' : '🤍'} {likeCount}
          </button>
          <button
            onClick={handleShare}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '7px 16px',
              fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)',
              cursor: 'pointer', transition: 'all var(--transition)',
            }}
          >
            {copied ? '✓ Copiado' : '🔗 Compartir'}
          </button>
        </div>
      </div>

      {/* Descripción */}
      {clip.description && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px',
          marginBottom: '24px',
        }}>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '14px',
            color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6',
          }}>
            {clip.description}
          </p>
        </div>
      )}

      {/* Comentarios */}
      <div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
          letterSpacing: '2px', color: 'var(--text-muted)', margin: '0 0 16px',
        }}>
          COMENTARIOS ({comments.length})
        </h2>

        {/* Input */}
        {user && (
          <form onSubmit={handleComment} style={{ marginBottom: '24px', display: 'flex', gap: '10px' }}>
            <div style={{ flexShrink: 0 }}>
              <UserAvatar avatar={user.avatar} username={user.username} size={32} />
            </div>
            <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Escribí un comentario..."
                maxLength={300}
                style={{
                  flex: 1,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', padding: '8px 12px',
                  fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                style={{
                  background: submitting || !commentText.trim() ? 'transparent' : 'var(--cyan-glow)',
                  border: `1px solid ${submitting || !commentText.trim() ? 'var(--border)' : 'var(--cyan)'}`,
                  borderRadius: 'var(--radius-md)', padding: '8px 14px',
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  color: submitting || !commentText.trim() ? 'var(--text-muted)' : 'var(--cyan)',
                  cursor: submitting || !commentText.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all var(--transition)',
                  whiteSpace: 'nowrap',
                }}
              >
                Enviar
              </button>
            </div>
          </form>
        )}

        {comments.length === 0 ? (
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '12px',
            color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0',
          }}>
            // Sin comentarios todavía. ¡Sé el primero!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: '10px' }}>
                <Link href={`/profile/${c.username}`} style={{ textDecoration: 'none', flexShrink: 0, marginTop: '2px' }}>
                  <UserAvatar avatar={c.avatar} username={c.username} size={32} />
                </Link>
                <div style={{
                  flex: 1,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', padding: '10px 12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <Link href={`/profile/${c.username}`} style={{ textDecoration: 'none' }}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: '12px',
                        fontWeight: 600, color: 'var(--text-primary)',
                      }}>
                        @{c.username}
                      </span>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                        {relTime(c.created_at)}
                      </span>
                      {(user?.id === c.user_id || user?.id === clip.user_id) && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          style={{
                            background: 'transparent', border: 'none',
                            cursor: 'pointer', color: 'var(--text-muted)',
                            fontSize: '12px', padding: 0, lineHeight: 1,
                            opacity: 0.6, transition: 'opacity var(--transition)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{
                    fontFamily: 'var(--font-body)', fontSize: '13px',
                    color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5',
                  }}>
                    {c.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
