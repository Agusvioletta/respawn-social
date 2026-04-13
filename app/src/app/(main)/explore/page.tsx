'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { PostCard } from '@/components/social/PostCard'
import type { PostWithMeta } from '@/lib/supabase/queries/posts'

interface Profile {
  id: string
  username: string
  avatar: string | null
  bio: string | null
}

type Tab = 'usuarios' | 'posts'

export default function ExplorePage() {
  const user = useAuthStore((s) => s.user)
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('usuarios')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [users, setUsers] = useState<Profile[]>([])
  const [posts, setPosts] = useState<PostWithMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350)
    return () => clearTimeout(t)
  }, [query])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setUsers([])
      setPosts([])
      setHasSearched(false)
      return
    }
    setLoading(true)
    setHasSearched(true)

    const term = q.trim().toLowerCase()

    if (tab === 'usuarios') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('profiles')
        .select('id, username, avatar, bio')
        .ilike('username', `%${term}%`)
        .neq('id', user?.id ?? '')
        .limit(20)
      setUsers(data ?? [])
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('posts')
        .select(`
          *,
          likes ( user_id ),
          comments ( id )
        `)
        .ilike('content', `%${term}%`)
        .order('created_at', { ascending: false })
        .limit(20)
      setPosts(data ?? [])
    }

    setLoading(false)
  }, [tab, supabase, user?.id])

  useEffect(() => {
    search(debouncedQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, tab])

  const tabStyle = (t: Tab) => ({
    background: tab === t ? 'var(--cyan-glow)' : 'transparent',
    border: `1px solid ${tab === t ? 'var(--cyan-border)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-md)',
    color: tab === t ? 'var(--cyan)' : 'var(--text-muted)',
    fontFamily: 'var(--font-mono)' as const,
    fontSize: '11px' as const,
    padding: '6px 16px',
    cursor: 'pointer' as const,
    transition: 'all var(--transition)',
  })

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 16px' }}>

      {/* Header */}
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: '16px',
        letterSpacing: '3px', color: 'var(--text-muted)',
        fontWeight: 700, marginBottom: '20px',
      }}>
        EXPLORAR
      </h1>

      {/* Search input */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={tab === 'usuarios' ? 'Buscar usuarios...' : 'Buscar en posts...'}
        autoFocus
        style={{
          width: '100%', background: 'var(--card)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          padding: '12px 16px', color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)', fontSize: '14px',
          outline: 'none', marginBottom: '16px',
          boxSizing: 'border-box',
        }}
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button style={tabStyle('usuarios')} onClick={() => setTab('usuarios')}>
          👤 Usuarios
        </button>
        <button style={tabStyle('posts')} onClick={() => setTab('posts')}>
          📝 Posts
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
          Buscando...
        </p>
      ) : !hasSearched ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
            Escribí algo para buscar.
          </p>
        </div>
      ) : tab === 'usuarios' ? (
        users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
              Sin resultados para &quot;{debouncedQuery}&quot;.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {users.map((p) => (
              <Link key={p.id} href={`/profile/${p.username}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', padding: '12px 14px',
                  cursor: 'pointer', transition: 'background var(--transition)',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--card)')}
                >
                  <UserAvatar avatar={p.avatar} username={p.username} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                      @{p.username}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.bio || 'Jugando en Respawn'}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--cyan)', flexShrink: 0 }}>
                    ver →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
              Sin posts para &quot;{debouncedQuery}&quot;.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )
      )}
    </div>
  )
}
