'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'

interface Comment {
  id: number
  post_id: number
  user_id: string
  username: string
  avatar: string | null
  content: string
  parent_id: number | null
  image_url: string | null
  created_at: string
}

interface PostDetail {
  id: number
  user_id: string
  username: string
  avatar: string | null
  content: string
  image_url: string | null
  created_at: string
  likes: { user_id: string }[]
  comments: Comment[]
}

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const supabase = createClient()

  const [post, setPost] = useState<PostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [replyText, setReplyText] = useState<Record<number, string>>({})
  const [openReply, setOpenReply] = useState<number | null>(null)
  const [showReplies, setShowReplies] = useState<Record<number, boolean>>({})
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  async function loadPost() {
    if (!/^\d+$/.test(params.id as string)) { setLoading(false); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('posts')
      .select('*, likes(user_id), comments(id, post_id, user_id, username, avatar, content, parent_id, image_url, created_at)')
      .eq('id', params.id)
      .single()
    if (error || !data) { setLoading(false); return }
    setPost(data)
    setLikeCount(data.likes?.length ?? 0)
    setLiked(user ? data.likes?.some((l: { user_id: string }) => l.user_id === user.id) : false)
    setLoading(false)
  }

  useEffect(() => { loadPost() }, [params.id])

  async function handleLike() {
    if (!user || !post) return
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount((c) => c + (newLiked ? 1 : -1))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any).from('likes').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle()
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('likes').delete().eq('post_id', post.id).eq('user_id', user.id)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('likes').insert({ post_id: post.id, user_id: user.id })
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || !user || !post) return
    setSubmitting(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from('comments').insert({
      post_id: post.id, user_id: user.id,
      username: user.username, avatar: user.avatar,
      content: commentText.trim(), parent_id: null,
    }).select().single()
    if (data) {
      setPost((p) => p ? { ...p, comments: [...p.comments, data] } : p)
      setCommentText('')
    }
    setSubmitting(false)
  }

  async function handleReply(parentId: number) {
    const content = replyText[parentId]?.trim()
    if (!content || !user || !post) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from('comments').insert({
      post_id: post.id, user_id: user.id,
      username: user.username, avatar: user.avatar,
      content, parent_id: parentId,
    }).select().single()
    if (data) {
      setPost((p) => p ? { ...p, comments: [...p.comments, data] } : p)
      setReplyText((r) => ({ ...r, [parentId]: '' }))
      setOpenReply(null)
      setShowReplies((s) => ({ ...s, [parentId]: true }))
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (!confirm('¿Borrar este comentario?') || !user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('comments').delete().eq('id', commentId).eq('user_id', user.id)
    setPost((p) => p ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p)
  }

  async function handleDeletePost() {
    if (!confirm('¿Borrar esta publicación?') || !user || !post) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('posts').delete().eq('id', post.id).eq('user_id', user.id)
    router.push('/feed')
  }

  function formatContent(text: string) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/#(\w+)/g, '<a href="/explore?q=$1" style="color:var(--cyan);text-decoration:none;">#$1</a>')
      .replace(/@(\w+)/g, '<a href="/profile/$1" style="color:var(--purple);text-decoration:none;">@$1</a>')
  }

  if (loading) return (
    <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
      Cargando...
    </div>
  )

  if (!post) return (
    <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
      // Post no encontrado
    </div>
  )

  const topComments = post.comments.filter((c) => !c.parent_id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const replies = post.comments.filter((c) => c.parent_id)
  const date = new Date(post.created_at).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' })
  const isOwn = user?.id === post.user_id

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px' }}>

      {/* Back */}
      <button
        onClick={() => router.back()}
        style={{
          background: 'transparent', border: 'none',
          fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)',
          cursor: 'pointer', padding: 0, marginBottom: '20px', display: 'inline-block',
        }}
      >
        ← Volver
      </button>

      {/* Post principal */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <Link href={`/profile/${post.username}`}>
            <UserAvatar avatar={post.avatar} username={post.username} size={44} />
          </Link>
          <div style={{ flex: 1 }}>
            <Link href={`/profile/${post.username}`} style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none' }}>
              @{post.username}
            </Link>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{date}</div>
          </div>
          {isOwn && (
            <button onClick={handleDeletePost} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>
              borrar
            </button>
          )}
        </div>

        {post.content && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: post.image_url ? '14px' : '0', whiteSpace: 'pre-wrap' }}
            dangerouslySetInnerHTML={{ __html: formatContent(post.content) }}
          />
        )}

        {post.image_url && (
          <img src={post.image_url} alt="" onClick={() => window.open(post.image_url!, '_blank')}
            style={{ width: '100%', maxHeight: '500px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', cursor: 'zoom-in' }}
          />
        )}

        {/* Stats + like */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
          <button onClick={handleLike} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: liked ? 'rgba(255,79,123,0.1)' : 'transparent',
            border: `1px solid ${liked ? 'var(--pink)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)', padding: '6px 14px',
            color: liked ? 'var(--pink)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', fontSize: '13px',
            cursor: 'pointer', transition: 'all var(--transition)',
          }}>
            ♥ {likeCount}
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
            💬 {topComments.length} comentario{topComments.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Composer comentario */}
      {user && (
        <form onSubmit={handleComment} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <UserAvatar avatar={user.avatar} username={user.username} size={34} />
            <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)}
              placeholder="Comentá este post..." rows={2} maxLength={500}
              style={{ ...inputStyle, resize: 'none', flex: 1 }}
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

      {/* Hilo de comentarios */}
      {topComments.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            💬 COMENTARIOS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topComments.map((comment) => {
              const commentReplies = replies.filter((r) => r.parent_id === comment.id)
              const isOwnComment = user?.id === comment.user_id
              const cDate = new Date(comment.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

              return (
                <div key={comment.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                  {/* Comment header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Link href={`/profile/${comment.username}`}>
                      <UserAvatar avatar={comment.avatar} username={comment.username} size={30} />
                    </Link>
                    <Link href={`/profile/${comment.username}`} style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                      @{comment.username}
                    </Link>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{cDate}</span>
                    {isOwnComment && (
                      <button onClick={() => handleDeleteComment(comment.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        ✕
                      </button>
                    )}
                  </div>

                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.5', marginBottom: '10px', whiteSpace: 'pre-wrap' }}
                    dangerouslySetInnerHTML={{ __html: formatContent(comment.content) }}
                  />

                  {/* Comment actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {user && (
                      <button onClick={() => setOpenReply(openReply === comment.id ? null : comment.id)}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        ↩ Responder
                      </button>
                    )}
                    {commentReplies.length > 0 && (
                      <button onClick={() => setShowReplies((s) => ({ ...s, [comment.id]: !s[comment.id] }))}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cyan)', cursor: 'pointer' }}>
                        {showReplies[comment.id] ? 'Ocultar' : `Ver ${commentReplies.length}`} respuesta{commentReplies.length !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>

                  {/* Reply composer */}
                  {openReply === comment.id && user && (
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                      <input type="text" value={replyText[comment.id] ?? ''} maxLength={280}
                        onChange={(e) => setReplyText((r) => ({ ...r, [comment.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleReply(comment.id) }}
                        placeholder={`Respondé a @${comment.username}...`}
                        style={{ ...inputStyle, padding: '7px 12px', fontSize: '13px' }}
                      />
                      <button onClick={() => handleReply(comment.id)} style={{ background: 'transparent', border: '1px solid var(--cyan)', borderRadius: 'var(--radius-sm)', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        enviar
                      </button>
                    </div>
                  )}

                  {/* Replies */}
                  {showReplies[comment.id] && commentReplies.length > 0 && (
                    <div style={{ marginTop: '10px', paddingLeft: '16px', borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {commentReplies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((reply) => (
                        <div key={reply.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <UserAvatar avatar={reply.avatar} username={reply.username} size={24} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Link href={`/profile/${reply.username}`} style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                                @{reply.username}
                              </Link>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                                {new Date(reply.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {user?.id === reply.user_id && (
                                <button onClick={() => handleDeleteComment(reply.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                              )}
                            </div>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', margin: '2px 0 0', whiteSpace: 'pre-wrap' }}
                              dangerouslySetInnerHTML={{ __html: formatContent(reply.content) }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {topComments.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
          // Sin comentarios todavía. ¡Sé el primero!
        </div>
      )}
    </div>
  )
}
