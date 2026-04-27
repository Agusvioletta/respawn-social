'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { PostCard } from './PostCard'
import { PostComposer } from './PostComposer'
import type { PostWithMeta } from '@/lib/supabase/queries/posts'

const PAGE_SIZE = 20

interface FeedListProps {
  initialPosts: PostWithMeta[]
}

export function FeedList({ initialPosts }: FeedListProps) {
  const [posts, setPosts] = useState<PostWithMeta[]>(initialPosts)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialPosts.length >= 30) // server cargó 30
  const user = useAuthStore((s) => s.user)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('feed-realtime')
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'posts' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const newPost: PostWithMeta = { ...payload.new, likes: [], comments: [] }
          setPosts((prev) => {
            // Evitar duplicados (puede llegar via realtime Y via onPost)
            if (prev.some((p) => p.id === newPost.id)) return prev
            return [newPost, ...prev]
          })
        }
      )
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: 'DELETE', schema: 'public', table: 'posts' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          setPosts((prev) => prev.filter((p) => p.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadMore() {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any

      // Filtro básico de privacidad: excluir perfiles privados/followers si no los seguís
      let excludedIds: string[] = []
      if (user?.id) {
        const { data: restricted } = await sb.from('profiles').select('id, privacy_posts').in('privacy_posts', ['followers', 'private'])
        if (restricted?.length) {
          const restrictedIds = restricted.map((p: { id: string }) => p.id)
          const { data: follows } = await sb.from('follows').select('following_id').eq('follower_id', user.id).in('following_id', restrictedIds)
          const followingSet = new Set((follows ?? []).map((f: { following_id: string }) => f.following_id))
          excludedIds = restricted
            .filter((p: { id: string; privacy_posts: string }) => {
              if (p.id === user.id) return false
              if (p.privacy_posts === 'private') return true
              return !followingSet.has(p.id)
            })
            .map((p: { id: string }) => p.id)
        }
      }

      let query = sb
        .from('posts')
        .select('id, user_id, username, avatar, content, image_url, created_at, post_type, lfg_game, lfg_platform, lfg_slots, likes(user_id), comments(id, user_id, username, avatar, content, parent_id, created_at)')
        .order('created_at', { ascending: false })
        .range(posts.length, posts.length + PAGE_SIZE - 1)

      if (excludedIds.length > 0) query = query.not('user_id', 'in', `(${excludedIds.join(',')})`)

      const { data } = await query
      const newPosts: PostWithMeta[] = (data ?? []).filter((p: PostWithMeta) => !posts.some(existing => existing.id === p.id))
      setPosts(prev => [...prev, ...newPosts])
      if ((data?.length ?? 0) < PAGE_SIZE) setHasMore(false)
    } catch { /* silently skip */ }
    finally { setLoadingMore(false) }
  }

  function handlePost(newPost: PostWithMeta) {
    setPosts((prev) => {
      if (prev.some((p) => p.id === newPost.id)) return prev
      return [newPost, ...prev]
    })
  }

  function handleDeleted(postId: number) {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  return (
    <div>
      <PostComposer onPost={handlePost} />

      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎮</div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '1px', color: 'var(--text-muted)' }}>
            Sin posts todavía
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            // Sé el primero en publicar algo
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onDeleted={handleDeleted} />
          ))}

          {/* Load more */}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                width: '100%', background: 'transparent',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                color: loadingMore ? 'var(--text-muted)' : 'var(--cyan)',
                fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '1px',
                padding: '12px', cursor: loadingMore ? 'default' : 'pointer',
                transition: 'all var(--transition)',
                marginTop: '4px',
              }}
              onMouseEnter={e => { if (!loadingMore) (e.currentTarget as HTMLElement).style.borderColor = 'var(--cyan-border)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
            >
              {loadingMore ? '// cargando...' : '↓ cargar más posts'}
            </button>
          )}
          {!hasMore && posts.length > 30 && (
            <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', padding: '12px' }}>
              // sin más posts
            </p>
          )}
        </div>
      )}
    </div>
  )
}
