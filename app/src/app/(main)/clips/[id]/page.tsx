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
  clip_id: number
  user_id: string
  username: string
  avatar: string | null
  content: string
  parent_id: number | null
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
  const [replyText, setReplyText] = useState<Record<number, string>>({})
  const [openReply, setOpenReply] = useState<number | null>(null)
  const [showReplies, setShowReplies] = useState<Record<number, boolean>>({})
  const [commentLikeCounts, setCommentLikeCounts] = useState<Record<number, number>>({})
  const [commentLikedIds, setCommentLikedIds] = useState<Set<number>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const viewCountedRef = useRef(false)

  useEffect(() => {
    const id = params.id
    if (!id || !/^\d+$/.test(id as string)) { setLoading(false); return }
    loadClip(Number(id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  // Realtime: nuevos comentarios
  useEffect(() => {
    const id = params.id
    if (!id || !/^\d+$/.test(id as string)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = (supabase as any)
      .channel(`clip-comments:${id}`)
      .on('postgres_changes' as any, {
        event: 'INSERT', schema: 'public', table: 'clip_comments',
        filter: `clip_id=eq.${id}`,
      }, (payload: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        setComments(prev => prev.some(c => c.id === payload.new.id) ? prev : [...prev, payload.new as ClipComment])
      })
      .on('postgres_changes' as any, {
        event: 'DELETE', schema: 'public', table: 'clip_comments',
        filter: `clip_id=eq.${id}`,
      }, (payload: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        setComments(prev => prev.filter(c => c.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
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
        .order('created_at', { ascending: true })
      setComments(cmts ?? [])

      // Likes de comentarios
      try {
        const ids = (cmts ?? []).map((c: ClipComment) => c.id)
        if (ids.length > 0) {
          const { data: clData } = await sb
            .from('clip_comment_likes').select('clip_comment_id, user_id').in('clip_comment_id', ids)
          if (clData) {
            const counts: Record<number, number> = {}
            const likedSet = new Set<number>()
            for (const row of clData) {
              counts[row.clip_comment_id] = (counts[row.clip_comment_id] ?? 0) + 1
              if (user && row.user_id === user.id) likedSet.add(row.clip_comment_id)
            }
            setCommentLikeCounts(counts)
            setCommentLikedIds(likedSet)
          }
        }
      } catch { /* best effort */ }
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

  async function handleReply(parentId: number) {
    const content = replyText[parentId]?.trim()
    if (!content || !user || !clip) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from('clip_comments').insert({
      clip_id: clip.id, user_id: user.id,
      username: user.username,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      avatar: (user as any).photo_url ?? user.avatar ?? null,
      content, parent_id: parentId,
    }).select().single()
    if (data) {
      setComments(prev => [...prev, data])
      setReplyText(r => ({ ...r, [parentId]: '' }))
      setOpenReply(null)
      setShowReplies(s => ({ ...s, [parentId]: true }))
    }
  }

  async function handleCommentLike(commentId: number) {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const isLiked = commentLikedIds.has(commentId)
    setCommentLikedIds(prev => { const n = new Set(prev); isLiked ? n.delete(commentId) : n.add(commentId); return n })
    setCommentLikeCounts(prev => ({ ...prev, [commentId]: Math.max(0, (prev[commentId] ?? 0) + (isLiked ? -1 : 1)) }))
    try {
      if (isLiked) {
        await sb.from('clip_comment_likes').delete().eq('clip_comment_id', commentId).eq('user_id', user.id)
      } else {
        await sb.from('clip_comment_likes').insert({ clip_comment_id: commentId, user_id: user.id })
      }
    } catch {
      setCommentLikedIds(prev => { const n = new Set(prev); isLiked ? n.add(commentId) : n.delete(commentId); return n })
      setCommentLikeCounts(prev => ({ ...prev, [commentId]: Math.max(0, (prev[commentId] ?? 0) + (isLiked ? 1 : -1)) }))
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('clip_comments').delete()
      .eq('id', commentId).eq('user_id', user.id)
    setComments(prev => prev.filter(c => c.id !== commentId))
    setConfirmDeleteId(null)
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

  function formatContent(text: string) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/#(\w+)/g, '<a href="/explore?q=$1" style="color:var(--cyan);text-decoration:none;">#$1</a>')
      .replace(/@(\w+)/g, '<a href="/profile/$1" style="color:var(--purple);text-decoration:none;">@$1</a>')
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
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          💬 COMENTARIOS ({comments.filter(c => !c.parent_id).length})
        </div>

        {/* Composer */}
        {user && (
          <form onSubmit={handleComment} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <UserAvatar avatar={user.avatar} username={user.username} size={34} />
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Comentá este clip..."
                rows={2} maxLength={500}
                style={{
                  flex: 1, resize: 'none',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', padding: '10px 14px',
                  color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
                  fontSize: '14px', outline: 'none', width: '100%',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="submit" disabled={submitting || !commentText.trim()} style={{
                background: 'transparent', border: '1px solid var(--cyan)', borderRadius: 'var(--radius-md)',
                color: 'var(--cyan)', fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
                letterSpacing: '2px', padding: '6px 16px', cursor: 'pointer',
                opacity: (!commentText.trim() || submitting) ? 0.4 : 1,
              }}>
                COMENTAR
              </button>
            </div>
          </form>
        )}

        {/* Lista de comentarios */}
        {(() => {
          const topComments = comments.filter(c => !c.parent_id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          const replies = comments.filter(c => c.parent_id)

          if (topComments.length === 0) return (
            <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
              // Sin comentarios todavía. ¡Sé el primero!
            </div>
          )

          const inputStyle: React.CSSProperties = {
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '7px 12px',
            color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
            fontSize: '13px', outline: 'none', width: '100%',
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topComments.map(comment => {
                const commentReplies = replies.filter(r => r.parent_id === comment.id)
                const cDate = new Date(comment.created_at).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={comment.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Link href={`/profile/${comment.username}`}>
                        <UserAvatar avatar={comment.avatar} username={comment.username} size={30} />
                      </Link>
                      <Link href={`/profile/${comment.username}`} style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                        @{comment.username}
                      </Link>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{cDate}</span>
                      {(user?.id === comment.user_id || user?.id === clip.user_id) && (
                        confirmDeleteId === comment.id ? (
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>¿Borrar?</span>
                            <button onClick={() => handleDeleteComment(comment.id)} style={{ background: 'rgba(255,79,123,0.1)', border: '1px solid rgba(255,79,123,0.4)', borderRadius: '4px', padding: '1px 8px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--pink)', cursor: 'pointer' }}>Sí</button>
                            <button onClick={() => setConfirmDeleteId(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 8px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}>No</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(comment.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.6 }}>✕</button>
                        )
                      )}
                    </div>

                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.5', marginBottom: '10px', whiteSpace: 'pre-wrap' }}
                      dangerouslySetInnerHTML={{ __html: formatContent(comment.content) }}
                    />

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button onClick={() => handleCommentLike(comment.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: commentLikedIds.has(comment.id) ? 'rgba(255,79,123,0.1)' : 'none',
                        border: `1px solid ${commentLikedIds.has(comment.id) ? 'rgba(255,79,123,0.5)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)', padding: '3px 10px',
                        fontFamily: 'var(--font-mono)', fontSize: '10px',
                        color: commentLikedIds.has(comment.id) ? 'var(--pink)' : 'var(--text-muted)',
                        cursor: user ? 'pointer' : 'default', transition: 'all var(--transition)',
                      }}>
                        ♥ {commentLikeCounts[comment.id] || ''}
                      </button>
                      {user && (
                        <button onClick={() => setOpenReply(openReply === comment.id ? null : comment.id)}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          ↩ Responder
                        </button>
                      )}
                      {commentReplies.length > 0 && (
                        <button onClick={() => setShowReplies(s => ({ ...s, [comment.id]: !s[comment.id] }))}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cyan)', cursor: 'pointer' }}>
                          {showReplies[comment.id] ? 'Ocultar' : `Ver ${commentReplies.length}`} respuesta{commentReplies.length !== 1 ? 's' : ''}
                        </button>
                      )}
                    </div>

                    {openReply === comment.id && user && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                        <input type="text" value={replyText[comment.id] ?? ''} maxLength={280}
                          onChange={e => setReplyText(r => ({ ...r, [comment.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') handleReply(comment.id) }}
                          placeholder={`Respondé a @${comment.username}...`}
                          style={inputStyle}
                        />
                        <button onClick={() => handleReply(comment.id)} style={{ background: 'transparent', border: '1px solid var(--cyan)', borderRadius: 'var(--radius-sm)', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          enviar
                        </button>
                      </div>
                    )}

                    {showReplies[comment.id] && commentReplies.length > 0 && (
                      <div style={{ marginTop: '10px', paddingLeft: '16px', borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {commentReplies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(reply => (
                          <div key={reply.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <UserAvatar avatar={reply.avatar} username={reply.username} size={24} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <Link href={`/profile/${reply.username}`} style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                                  @{reply.username}
                                </Link>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                                  {new Date(reply.created_at).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {(user?.id === reply.user_id || user?.id === clip.user_id) && (
                                  confirmDeleteId === reply.id ? (
                                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>¿Borrar?</span>
                                      <button onClick={() => handleDeleteComment(reply.id)} style={{ background: 'rgba(255,79,123,0.1)', border: '1px solid rgba(255,79,123,0.4)', borderRadius: '4px', padding: '1px 8px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--pink)', cursor: 'pointer' }}>Sí</button>
                                      <button onClick={() => setConfirmDeleteId(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 8px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}>No</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setConfirmDeleteId(reply.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.6 }}>✕</button>
                                  )
                                )}
                              </div>
                              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', margin: '0 0 6px', whiteSpace: 'pre-wrap' }}
                                dangerouslySetInnerHTML={{ __html: formatContent(reply.content) }}
                              />
                              {/* Acciones de reply */}
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button onClick={() => handleCommentLike(reply.id)} style={{
                                  display: 'flex', alignItems: 'center', gap: '4px',
                                  background: commentLikedIds.has(reply.id) ? 'rgba(255,79,123,0.1)' : 'none',
                                  border: `1px solid ${commentLikedIds.has(reply.id) ? 'rgba(255,79,123,0.5)' : 'var(--border)'}`,
                                  borderRadius: 'var(--radius-sm)', padding: '2px 8px',
                                  fontFamily: 'var(--font-mono)', fontSize: '10px',
                                  color: commentLikedIds.has(reply.id) ? 'var(--pink)' : 'var(--text-muted)',
                                  cursor: user ? 'pointer' : 'default', transition: 'all var(--transition)',
                                }}>
                                  ♥ {commentLikeCounts[reply.id] || ''}
                                </button>
                                {user && (
                                  <button onClick={() => {
                                    setOpenReply(comment.id)
                                    setReplyText(r => ({ ...r, [comment.id]: `@${reply.username} ` }))
                                  }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    ↩ Responder
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
