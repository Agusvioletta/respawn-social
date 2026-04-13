'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PostCard } from './PostCard'
import { PostComposer } from './PostComposer'
import type { PostWithMeta } from '@/lib/supabase/queries/posts'

interface FeedListProps {
  initialPosts: PostWithMeta[]
}

export function FeedList({ initialPosts }: FeedListProps) {
  const [posts, setPosts] = useState<PostWithMeta[]>(initialPosts)
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
  }, [supabase])

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
        </div>
      )}
    </div>
  )
}
