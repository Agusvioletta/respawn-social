'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { useRouter } from 'next/navigation'

interface LFGPost {
  id: number
  user_id: string
  username: string
  avatar: string | null
  content: string
  lfg_game: string | null
  lfg_platform: string | null
  lfg_slots: number | null
  created_at: string
  likes: { user_id: string }[]
  comments: { id: number }[]
}

const PLATFORMS = ['Todos', 'PC', 'PS5', 'PS4', 'Xbox', 'Nintendo Switch', 'Mobile']

const POPULAR_GAMES = [
  'Valorant', 'Minecraft', 'League of Legends', 'Fortnite', 'CS2',
  'Apex Legends', 'Rocket League', 'Elden Ring', 'GTA V', 'Among Us',
]

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export default function LFGPage() {
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const supabase = createClient()

  const [posts, setPosts] = useState<LFGPost[]>([])
  const [loading, setLoading] = useState(true)
  const [gameFilter, setGameFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('Todos')
  const [gameSearch, setGameSearch] = useState('')

  const loadLFG = useCallback(async () => {
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('posts')
        .select('id, user_id, username, avatar, content, lfg_game, lfg_platform, lfg_slots, created_at, likes(user_id), comments(id)')
        .eq('post_type', 'lfg')
        .order('created_at', { ascending: false })
        .limit(50)

      if (gameFilter) query = query.ilike('lfg_game', `%${gameFilter}%`)
      if (platformFilter !== 'Todos') query = query.eq('lfg_platform', platformFilter)

      const { data } = await query
      setPosts(data ?? [])
    } catch {
      // Si la columna no existe aún, mostrar vacío
      setPosts([])
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameFilter, platformFilter])

  useEffect(() => { loadLFG() }, [loadLFG])

  // Agrupar posts por juego para el contador
  const gameGroups = posts.reduce<Record<string, number>>((acc, p) => {
    const g = p.lfg_game ?? 'Otro'
    acc[g] = (acc[g] ?? 0) + 1
    return acc
  }, {})

  const totalSlots = posts.reduce((s, p) => s + (p.lfg_slots ?? 0), 0)

  return (
    <div style={{ maxWidth: '960px', padding: '24px 24px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <span style={{ fontSize: '28px' }}>🔎</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 900, color: 'var(--purple)', letterSpacing: '3px', margin: 0 }}>
            LOOKING FOR GROUP
          </h1>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
          Encontrá compañeros de juego. {posts.length} búsquedas activas · {totalSlots} lugares disponibles
        </p>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

        {/* Sidebar filtros */}
        <aside style={{ width: '220px', flexShrink: 0, position: 'sticky', top: '24px' }} className="hidden lg:block">

          {/* Publicar LFG */}
          <Link href="/feed" style={{ textDecoration: 'none' }}>
            <button style={{
              width: '100%', background: 'rgba(192,132,252,0.15)',
              border: '1px solid rgba(192,132,252,0.5)',
              borderRadius: 'var(--radius-md)', color: 'var(--purple)',
              fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
              letterSpacing: '1px', padding: '12px', cursor: 'pointer',
              marginBottom: '16px', transition: 'all var(--transition)',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(192,132,252,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(192,132,252,0.15)')}
            >
              + BUSCAR GRUPO
            </button>
          </Link>

          {/* Plataforma */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '12px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '2px', marginBottom: '10px' }}>
              PLATAFORMA
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => setPlatformFilter(p)} style={{
                  background: platformFilter === p ? 'rgba(192,132,252,0.15)' : 'transparent',
                  border: `1px solid ${platformFilter === p ? 'rgba(192,132,252,0.4)' : 'transparent'}`,
                  borderRadius: 'var(--radius-sm)', color: platformFilter === p ? 'var(--purple)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '6px 10px',
                  cursor: 'pointer', textAlign: 'left', transition: 'all var(--transition)',
                }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Juegos populares */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '2px', marginBottom: '10px' }}>
              JUEGOS POPULARES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {POPULAR_GAMES.map(g => {
                const count = Object.entries(gameGroups).find(([k]) => k.toLowerCase() === g.toLowerCase())?.[1] ?? 0
                const active = gameFilter.toLowerCase() === g.toLowerCase()
                return (
                  <button key={g} onClick={() => setGameFilter(active ? '' : g)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: active ? 'rgba(192,132,252,0.15)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(192,132,252,0.4)' : 'transparent'}`,
                    borderRadius: 'var(--radius-sm)', color: active ? 'var(--purple)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '6px 10px',
                    cursor: 'pointer', textAlign: 'left', transition: 'all var(--transition)',
                  }}>
                    <span>{g}</span>
                    {count > 0 && (
                      <span style={{ background: 'rgba(192,132,252,0.2)', borderRadius: '10px', padding: '1px 6px', fontSize: '10px', color: 'var(--purple)' }}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Search bar */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              value={gameSearch}
              onChange={e => setGameSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setGameFilter(gameSearch) }}
              placeholder="Buscar por juego... (Enter para filtrar)"
              style={{
                flex: 1, background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '13px',
                outline: 'none',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(192,132,252,0.5)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
            {(gameFilter || platformFilter !== 'Todos') && (
              <button onClick={() => { setGameFilter(''); setGameSearch(''); setPlatformFilter('Todos') }} style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '10px 14px', cursor: 'pointer',
              }}>
                Limpiar
              </button>
            )}
          </div>

          {/* Active filters */}
          {(gameFilter || platformFilter !== 'Todos') && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {gameFilter && (
                <span style={{ background: 'rgba(192,132,252,0.15)', border: '1px solid rgba(192,132,252,0.3)', borderRadius: '20px', padding: '3px 12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--purple)' }}>
                  🎮 {gameFilter} ×
                </span>
              )}
              {platformFilter !== 'Todos' && (
                <span style={{ background: 'rgba(0,255,247,0.1)', border: '1px solid rgba(0,255,247,0.2)', borderRadius: '20px', padding: '3px 12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--cyan)' }}>
                  📱 {platformFilter} ×
                </span>
              )}
            </div>
          )}

          {/* Posts */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
              Cargando...
            </div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--card)', border: '1px dashed rgba(192,132,252,0.3)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔎</div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                No hay búsquedas activas
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                {gameFilter || platformFilter !== 'Todos' ? 'Probá con otros filtros.' : 'Sé el primero en buscar grupo.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="animate-fade-in-up"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid rgba(192,132,252,0.3)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '18px 20px',
                    position: 'relative', overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all var(--transition)',
                  }}
                  onClick={() => router.push(`/post/${post.id}`)}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(192,132,252,0.6)'
                    e.currentTarget.style.boxShadow = '0 4px 24px rgba(192,132,252,0.1)'
                    const shine = e.currentTarget.querySelector('.lfg-shine') as HTMLElement
                    if (shine) shine.style.opacity = '1'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(192,132,252,0.3)'
                    e.currentTarget.style.boxShadow = 'none'
                    const shine = e.currentTarget.querySelector('.lfg-shine') as HTMLElement
                    if (shine) shine.style.opacity = '0'
                  }}
                >
                  {/* Top shine */}
                  <div className="lfg-shine" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(192,132,252,0.8), transparent)', opacity: 0, transition: 'opacity var(--transition)' }} />

                  {/* Game + platform + slots header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, color: 'var(--purple)', letterSpacing: '2px', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.25)', borderRadius: '4px', padding: '2px 8px' }}>
                      🔎 LFG
                    </span>
                    {post.lfg_game && (
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        🎮 {post.lfg_game}
                      </span>
                    )}
                    {post.lfg_platform && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--surface)', borderRadius: '4px', padding: '2px 8px' }}>
                        {post.lfg_platform}
                      </span>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {post.lfg_slots != null && post.lfg_slots > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '20px', padding: '3px 10px' }}>
                          {Array.from({ length: Math.min(post.lfg_slots, 5) }).map((_, i) => (
                            <span key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 4px #4ade80' }} />
                          ))}
                          {post.lfg_slots > 5 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#4ade80' }}>+{post.lfg_slots - 5}</span>}
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#4ade80', marginLeft: '2px' }}>
                            {post.lfg_slots} libre{post.lfg_slots !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User + content */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Link href={`/profile/${post.username}`} onClick={e => e.stopPropagation()}>
                      <UserAvatar avatar={post.avatar} username={post.username} size={40} />
                    </Link>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Link href={`/profile/${post.username}`} onClick={e => e.stopPropagation()} style={{ textDecoration: 'none' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            @{post.username}
                          </span>
                        </Link>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                          · {timeAgo(post.created_at)}
                        </span>
                      </div>
                      {post.content && (
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                          {post.content}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                      ♥ {post.likes?.length ?? 0}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                      💬 {post.comments?.length ?? 0}
                    </span>
                    {user && user.id !== post.user_id && (
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/messages/${post.user_id}`) }}
                        style={{
                          marginLeft: 'auto',
                          background: 'rgba(192,132,252,0.15)',
                          border: '1px solid rgba(192,132,252,0.4)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--purple)',
                          fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
                          letterSpacing: '1px', padding: '5px 14px', cursor: 'pointer',
                          transition: 'all var(--transition)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(192,132,252,0.25)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(192,132,252,0.15)')}
                      >
                        UNIRSE →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
