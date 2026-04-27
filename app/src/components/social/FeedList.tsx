'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  // Sentinel para infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null)
  // Ref para el offset actual sin causar re-renders
  const postsLenRef = useRef(initialPosts.length)

  // Mantener el ref sincronizado
  useEffect(() => { postsLenRef.current = posts.length }, [posts.length])

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

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const offset = postsLenRef.current

      // Filtro básico de privacidad
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
        .range(offset, offset + PAGE_SIZE - 1)

      if (excludedIds.length > 0) query = query.not('user_id', 'in', `(${excludedIds.join(',')})`)

      const { data } = await query
      // Enriquecer con premium_tier y name_color
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let enriched: PostWithMeta[] = data ?? []
      if (enriched.length > 0) {
        const uids = [...new Set(enriched.map((p: PostWithMeta) => p.user_id))]
        const { data: profs } = await sb.from('profiles').select('id, premium_tier, name_color').in('id', uids)
        const tMap: Record<string, { premium_tier: string | null; name_color: string | null }> = {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const pr of (profs ?? [])) tMap[pr.id] = { premium_tier: pr.premium_tier, name_color: pr.name_color }
        enriched = enriched.map((p: PostWithMeta) => ({ ...p, author_premium_tier: tMap[p.user_id]?.premium_tier ?? null, author_name_color: tMap[p.user_id]?.name_color ?? null }))
      }
      setPosts(prev => {
        const newPosts = enriched.filter((p: PostWithMeta) => !prev.some(existing => existing.id === p.id))
        return [...prev, ...newPosts]
      })
      if ((data?.length ?? 0) < PAGE_SIZE) setHasMore(false)
    } catch { /* silently skip */ }
    finally { setLoadingMore(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, hasMore, user?.id])

  // IntersectionObserver — auto-load when sentinel enters viewport
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '400px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

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

          {/* Sentinel invisible para infinite scroll */}
          {hasMore && (
            <div ref={sentinelRef} style={{ padding: '16px', textAlign: 'center' }}>
              {loadingMore && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>
                  // cargando...
                </span>
              )}
            </div>
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
