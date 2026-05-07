'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import Link from 'next/link'
import { PostCard } from './PostCard'
import { PostComposer } from './PostComposer'
import { PostCardSkeleton } from '@/components/ui/Skeleton'
import type { PostWithMeta } from '@/lib/supabase/queries/posts'

const PAGE_SIZE = 20

interface FeedListProps {
  initialPosts: PostWithMeta[]
}

// ── Helper: enrich posts with premium_tier / name_color ──────────────────────
async function enrichPosts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  data: PostWithMeta[]
): Promise<PostWithMeta[]> {
  if (!data.length) return data
  const uids = [...new Set(data.map((p) => p.user_id))]
  const { data: profs } = await sb.from('profiles').select('id, premium_tier, name_color').in('id', uids)
  const tMap: Record<string, { premium_tier: string | null; name_color: string | null }> = {}
  for (const pr of (profs ?? [])) tMap[pr.id] = { premium_tier: pr.premium_tier, name_color: pr.name_color }
  return data.map((p) => ({
    ...p,
    author_premium_tier: tMap[p.user_id]?.premium_tier ?? null,
    author_name_color:   tMap[p.user_id]?.name_color   ?? null,
  }))
}

// ── Component ─────────────────────────────────────────────────────────────────
export function FeedList({ initialPosts }: FeedListProps) {
  const user    = useAuthStore((s) => s.user)
  const supabase = createClient()

  // ── For You tab ─────────────────────────────────────────────────────────────
  const [posts,        setPosts]        = useState<PostWithMeta[]>(initialPosts)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [hasMore,      setHasMore]      = useState(initialPosts.length >= 30)
  const [pendingPosts, setPendingPosts] = useState<PostWithMeta[]>([])

  // ── Following tab ───────────────────────────────────────────────────────────
  const [feedTab,            setFeedTab]            = useState<'forYou' | 'following'>('forYou')
  const [followingPosts,     setFollowingPosts]     = useState<PostWithMeta[]>([])
  const [followingLoading,   setFollowingLoading]   = useState(false)
  const [followingMore,      setFollowingMore]      = useState(false)
  const [followingHasMore,   setFollowingHasMore]   = useState(true)
  const [followingLoaded,    setFollowingLoaded]    = useState(false)  // true after first fetch
  const followingIdsRef      = useRef<string[]>([])
  const followingOffsetRef   = useRef(0)

  // ── Shared ──────────────────────────────────────────────────────────────────
  const topRef        = useRef<HTMLDivElement>(null)
  const sentinelRef   = useRef<HTMLDivElement>(null)
  const flwSentinelRef= useRef<HTMLDivElement>(null)
  const postsLenRef   = useRef(initialPosts.length)

  useEffect(() => { postsLenRef.current = posts.length }, [posts.length])

  // ── Realtime ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('feed-realtime')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'posts' }, (payload: any) => {
        const newPost: PostWithMeta = { ...payload.new, likes: [], comments: [] }
        if (newPost.user_id === user?.id) return
        setPendingPosts((prev) => {
          if (prev.some((p) => p.id === newPost.id)) return prev
          return [newPost, ...prev]
        })
        // Also queue into following if from a followed user
        if (followingIdsRef.current.includes(newPost.user_id)) {
          setFollowingPosts(prev => {
            if (prev.some(p => p.id === newPost.id)) return prev
            return [newPost, ...prev]
          })
        }
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: 'DELETE', schema: 'public', table: 'posts' }, (payload: any) => {
        setPosts((prev) => prev.filter((p) => p.id !== payload.old.id))
        setPendingPosts((prev) => prev.filter((p) => p.id !== payload.old.id))
        setFollowingPosts((prev) => prev.filter((p) => p.id !== payload.old.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // ── Show pending banner ──────────────────────────────────────────────────────
  function showPendingPosts() {
    setPosts((prev) => {
      const merged = [...pendingPosts, ...prev]
      const seen = new Set<number>()
      return merged.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
    })
    setPendingPosts([])
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Load more (For You) ──────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const offset = postsLenRef.current
      let excludedIds: string[] = []
      if (user?.id) {
        const { data: restricted } = await sb.from('profiles').select('id, privacy_posts').in('privacy_posts', ['followers', 'private'])
        if (restricted?.length) {
          const rIds = restricted.map((p: { id: string }) => p.id)
          const { data: follows } = await sb.from('follows').select('following_id').eq('follower_id', user.id).in('following_id', rIds)
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
      const enriched = await enrichPosts(sb, data ?? [])
      setPosts(prev => {
        const incoming = enriched.filter((p: PostWithMeta) => !prev.some(e => e.id === p.id))
        return [...prev, ...incoming]
      })
      if ((data?.length ?? 0) < PAGE_SIZE) setHasMore(false)
    } catch { /* silently skip */ }
    finally { setLoadingMore(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, hasMore, user?.id])

  // ── Load following posts ─────────────────────────────────────────────────────
  const loadFollowing = useCallback(async (reset = false) => {
    if (!user?.id) return
    if (reset) {
      followingOffsetRef.current = 0
      setFollowingPosts([])
      setFollowingHasMore(true)
    }
    const isFirst = reset || followingOffsetRef.current === 0
    if (isFirst) setFollowingLoading(true)
    else setFollowingMore(true)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      // Fetch followed IDs (only on first load or reset)
      if (isFirst || followingIdsRef.current.length === 0) {
        const { data: fols } = await sb.from('follows').select('following_id').eq('follower_id', user.id)
        followingIdsRef.current = (fols ?? []).map((f: { following_id: string }) => f.following_id)
      }
      const ids = followingIdsRef.current
      if (ids.length === 0) {
        setFollowingLoading(false)
        setFollowingMore(false)
        setFollowingLoaded(true)
        return
      }

      const offset = followingOffsetRef.current
      const { data } = await sb
        .from('posts')
        .select('id, user_id, username, avatar, content, image_url, created_at, post_type, lfg_game, lfg_platform, lfg_slots, likes(user_id), comments(id, user_id, username, avatar, content, parent_id, created_at)')
        .in('user_id', ids)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      const enriched = await enrichPosts(sb, data ?? [])
      followingOffsetRef.current = offset + enriched.length

      setFollowingPosts(prev => {
        const merged = reset ? enriched : [...prev, ...enriched.filter(p => !prev.some(e => e.id === p.id))]
        return merged
      })
      if ((data?.length ?? 0) < PAGE_SIZE) setFollowingHasMore(false)
    } catch { /* silently skip */ }
    finally {
      setFollowingLoading(false)
      setFollowingMore(false)
      setFollowingLoaded(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // ── Activate following tab ───────────────────────────────────────────────────
  function switchTab(tab: 'forYou' | 'following') {
    setFeedTab(tab)
    if (tab === 'following' && !followingLoaded && user?.id) {
      loadFollowing(true)
    }
  }

  // ── IntersectionObserver — For You ───────────────────────────────────────────
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || feedTab !== 'forYou') return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore() },
      { rootMargin: '400px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadMore, feedTab])

  // ── IntersectionObserver — Following ─────────────────────────────────────────
  useEffect(() => {
    if (!flwSentinelRef.current || !followingHasMore || feedTab !== 'following' || !followingLoaded) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting && !followingMore) loadFollowing(false) },
      { rootMargin: '400px' }
    )
    observer.observe(flwSentinelRef.current)
    return () => observer.disconnect()
  }, [followingHasMore, followingMore, followingLoaded, feedTab, loadFollowing])

  // ── Handle new post from composer ────────────────────────────────────────────
  function handlePost(newPost: PostWithMeta) {
    setPosts((prev) => {
      if (prev.some((p) => p.id === newPost.id)) return prev
      return [newPost, ...prev]
    })
    // Own posts also appear in following feed
    setFollowingPosts((prev) => {
      if (prev.some((p) => p.id === newPost.id)) return prev
      return [newPost, ...prev]
    })
  }

  function handleDeleted(postId: number) {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
    setFollowingPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  // ── Tab style helper ──────────────────────────────────────────────────────────
  function tabStyle(active: boolean) {
    return {
      flex: 1, padding: '11px 8px',
      background: 'transparent', border: 'none',
      borderBottom: `2px solid ${active ? 'var(--cyan)' : 'transparent'}`,
      color: active ? 'var(--cyan)' : 'var(--text-muted)',
      fontFamily: 'var(--font-display)', fontSize: '11px',
      fontWeight: active ? 800 : 600, letterSpacing: '1.5px',
      cursor: 'pointer', transition: 'all var(--transition)',
    } as React.CSSProperties
  }

  // ── Current tab data ──────────────────────────────────────────────────────────
  const isFollowingTab = feedTab === 'following'
  const activePosts    = isFollowingTab ? followingPosts : posts
  const activeLoading  = isFollowingTab ? followingLoading : false
  const activeMore     = isFollowingTab ? followingMore : loadingMore
  const activeHasMore  = isFollowingTab ? followingHasMore : hasMore

  return (
    <div>
      {/* Ancla invisible para scroll-to-top */}
      <div ref={topRef} style={{ height: 0 }} />

      {/* Banner "N posts nuevos" — only on For You */}
      {!isFollowingTab && pendingPosts.length > 0 && (
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
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'linear-gradient(90deg, rgba(0,255,247,0.2), rgba(192,132,252,0.2))'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'linear-gradient(90deg, rgba(0,255,247,0.12), rgba(192,132,252,0.12))'
          }}
        >
          <span style={{ fontSize: '14px' }}>↑</span>
          {pendingPosts.length} post{pendingPosts.length !== 1 ? 's' : ''} nuevo{pendingPosts.length !== 1 ? 's' : ''}
        </button>
      )}

      {/* ── Composer ──────────────────────────────────────────────────────────── */}
      {user ? (
        <PostComposer onPost={handlePost} />
      ) : (
        <div style={{
          background: 'var(--card)',
          border: '1px solid rgba(0,255,247,0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--cyan)', letterSpacing: '1px', marginBottom: '4px' }}>
              ¿Qué estás jugando?
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Unite a Respawn para publicar, comentar y conectar con otros gamers.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <Link href="/signup" style={{
              padding: '8px 16px', borderRadius: 'var(--radius-md)',
              background: 'var(--cyan)', color: 'var(--void)',
              fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 800,
              letterSpacing: '1.5px', textDecoration: 'none',
              boxShadow: '0 0 14px rgba(0,255,247,0.25)',
            }}>
              CREAR CUENTA
            </Link>
            <Link href="/login" style={{
              padding: '8px 16px', borderRadius: 'var(--radius-md)',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-display)', fontSize: '11px',
              letterSpacing: '1px', textDecoration: 'none',
            }}>
              Entrar
            </Link>
          </div>
        </div>
      )}

      {/* ── Tabs (only for authenticated users) ─────────────────────────────── */}
      {user && (
        <div style={{
          display: 'flex',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '12px',
          overflow: 'hidden',
        }}>
          <button style={tabStyle(feedTab === 'forYou')} onClick={() => switchTab('forYou')}>
            PARA VOS
          </button>
          <button style={tabStyle(feedTab === 'following')} onClick={() => switchTab('following')}>
            SIGUIENDO
          </button>
        </div>
      )}

      {/* ── Posts list ──────────────────────────────────────────────────────── */}
      {activeLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Array.from({ length: 4 }).map((_, i) => <PostCardSkeleton key={i} />)}
        </div>
      ) : activePosts.length === 0 ? (
        isFollowingTab ? (
          /* Empty state — following tab */
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '1px', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Tu feed de siguiendo está vacío
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              {followingIdsRef.current.length === 0
                ? '// Seguí gamers para ver sus posts acá'
                : '// Las personas que seguís no han publicado aún'}
            </p>
            <Link href="/explore" style={{
              display: 'inline-block',
              padding: '10px 24px', borderRadius: 'var(--radius-md)',
              background: 'rgba(0,255,247,0.08)', border: '1px solid var(--cyan)',
              color: 'var(--cyan)', fontFamily: 'var(--font-display)', fontSize: '11px',
              fontWeight: 700, letterSpacing: '1.5px', textDecoration: 'none',
            }}>
              EXPLORAR GAMERS
            </Link>
          </div>
        ) : (
          /* Empty state — for you tab */
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎮</div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '1px', color: 'var(--text-muted)' }}>
              Sin posts todavía
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              {'// Sé el primero en publicar algo'}
            </p>
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activePosts.map((post) => (
            <PostCard key={post.id} post={post} onDeleted={handleDeleted} />
          ))}

          {/* Sentinel — For You */}
          {!isFollowingTab && activeHasMore && (
            <div ref={sentinelRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeMore && Array.from({ length: 3 }).map((_, i) => <PostCardSkeleton key={i} />)}
            </div>
          )}

          {/* Sentinel — Following */}
          {isFollowingTab && activeHasMore && (
            <div ref={flwSentinelRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeMore && Array.from({ length: 3 }).map((_, i) => <PostCardSkeleton key={i} />)}
            </div>
          )}

          {/* End of feed */}
          {!activeHasMore && activePosts.length > PAGE_SIZE && (
            <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', padding: '12px' }}>
              {'// sin más posts'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
