'use client'

import { useState, useEffect, useRef } from 'react'
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
  // Posts pendientes de mostrar (llegaron via realtime de otros usuarios)
  const [pendingPosts, setPendingPosts] = useState<PostWithMeta[]>([])
  const user = useAuthStore((s) => s.user)
  const supabase = createClient()
  const topRef = useRef<HTMLDivElement>(null)

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
          // Si es del usuario actual → agregar de inmediato (ya lo maneja onPost)
          // Si es de otro → cola de pendientes para el banner
          if (newPost.user_id === user?.id) return
          setPosts((prev) => {
            if (prev.some((p) => p.id === newPost.id)) return prev
            return prev // No agregar automáticamente — mostrar banner
          })
          setPendingPosts((prev) => {
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
          setPendingPosts((prev) => prev.filter((p) => p.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  function showPendingPosts() {
    setPosts((prev) => {
      const merged = [...pendingPosts, ...prev]
      // Dedup por id
      const seen = new Set<number>()
      return merged.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
    })
    setPendingPosts([])
    // Scroll suave al tope
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
      {/* Ancla invisible para scroll-to-top */}
      <div ref={topRef} style={{ height: 0 }} />

      {/* Banner "N posts nuevos" */}
      {pendingPosts.length > 0 && (
        <button
          onClick={showPendingPosts}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            width: '100%',
            background: 'linear-gradient(90deg, rgba(0,255,247,0.12), rgba(192,132,252,0.12))',
            border: '1px solid rgba(0,255,247,0.3)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--cyan)',
            fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
            letterSpacing: '1px', padding: '10px 20px',
            cursor: 'pointer', marginBottom: '12px',
            transition: 'all var(--transition)',
            animation: 'fade-in-down 0.3s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'linear-gradient(90deg, rgba(0,255,247,0.2), rgba(192,132,252,0.2))'
            e.currentTarget.style.borderColor = 'var(--cyan)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'linear-gradient(90deg, rgba(0,255,247,0.12), rgba(192,132,252,0.12))'
            e.currentTarget.style.borderColor = 'rgba(0,255,247,0.3)'
          }}
        >
          <span style={{ fontSize: '14px' }}>↑</span>
          {pendingPosts.length} post{pendingPosts.length !== 1 ? 's' : ''} nuevo{pendingPosts.length !== 1 ? 's' : ''}
        </button>
      )}

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
