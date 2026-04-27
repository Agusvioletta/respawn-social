'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { GAMES } from '@/lib/games/types'
import { calculateXP, xpLevel, getLevelName } from '@/lib/utils/xp'

interface SuggestedUser {
  id: string
  username: string
  avatar: string | null
  bio: string | null
}

interface TopGamer {
  id: string
  username: string
  avatar: string | null
  max_level: number
  xp: number
  rank: number
}

const FALLBACK_TAGS = ['Valorant', 'Minecraft', 'LoL', 'Fortnite', 'CS2', 'Elden Ring', 'GTA6']

export function FeedSidebar() {
  const user = useAuthStore((s) => s.user)
  const supabase = createClient()
  const [suggested, setSuggested] = useState<SuggestedUser[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [topGamers, setTopGamers] = useState<TopGamer[]>([])
  const [myXP, setMyXP] = useState(0)
  const [trendingTags, setTrendingTags] = useState<{ tag: string; hot: boolean }[]>(
    FALLBACK_TAGS.map((t, i) => ({ tag: t, hot: i % 2 === 0 }))
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = user as any

  useEffect(() => {
    loadTopGamers()
    loadTrendingTags()
    if (!user?.id) return
    loadSuggested()
    loadMyXP()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function loadTopGamers() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('id, username, avatar, max_level')
        .order('max_level', { ascending: false })
        .limit(20)

      if (!profiles?.length) return

      const userIds = profiles.map((p: { id: string }) => p.id)

      // Batch queries — evita N+1 round-trips a la DB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [{ data: postRows }, { data: followRows }] = await Promise.all([
        // Posts con likes incluidos para contar en JS
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('posts').select('user_id, likes(user_id)').in('user_id', userIds),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('follows').select('following_id').in('following_id', userIds),
      ])

      // Contar en JS — más rápido que múltiples round-trips a la DB
      const postCounts = new Map<string, number>()
      const likesCounts = new Map<string, number>()
      for (const row of (postRows ?? [])) {
        postCounts.set(row.user_id, (postCounts.get(row.user_id) ?? 0) + 1)
        likesCounts.set(row.user_id, (likesCounts.get(row.user_id) ?? 0) + (row.likes?.length ?? 0))
      }
      const followCounts = new Map<string, number>()
      for (const row of (followRows ?? [])) {
        followCounts.set(row.following_id, (followCounts.get(row.following_id) ?? 0) + 1)
      }

      const withXP = profiles.map((p: { id: string; username: string; avatar: string | null; max_level: number }) => ({
        ...p,
        xp: calculateXP({
          posts: postCounts.get(p.id) ?? 0,
          followers: followCounts.get(p.id) ?? 0,
          following: 0,
          likes: likesCounts.get(p.id) ?? 0,
          gameLevels: Math.max(0, (p.max_level ?? 1) - 1),
        }),
      }))

      const sorted = withXP
        .sort((a: { xp: number }, b: { xp: number }) => b.xp - a.xp)
        .slice(0, 5)
        .map((p: typeof withXP[0], i: number) => ({ ...p, rank: i + 1 }))

      setTopGamers(sorted)
    } catch { /* silently skip */ }
  }

  async function loadTrendingTags() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('posts')
        .select('content')
        .order('created_at', { ascending: false })
        .limit(200)
      if (!data?.length) return
      const counts: Record<string, number> = {}
      for (const post of data) {
        const tags = (post.content ?? '').match(/#(\w+)/g) ?? []
        for (const tag of tags) {
          const clean = tag.slice(1).toLowerCase()
          counts[clean] = (counts[clean] ?? 0) + 1
        }
      }
      if (!Object.keys(counts).length) return
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
      // "hot" = top 3 más mencionados
      setTrendingTags(sorted.map(([tag], i) => ({ tag, hot: i < 3 })))
    } catch { /* silently skip */ }
  }

  async function loadMyXP() {
    if (!user?.id) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const [
        { count: postCount },
        { count: followerCount },
        { count: followingCount },
        { count: commentCount },
        { data: likesData },
      ] = await Promise.all([
        sb.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        sb.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
        sb.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
        sb.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        sb.from('posts').select('likes(user_id)').eq('user_id', user.id),
      ])
      const likesReceived = (likesData ?? []).reduce((s: number, p: { likes?: unknown[] }) => s + (p.likes?.length ?? 0), 0)
      setMyXP(calculateXP({
        posts: postCount ?? 0,
        followers: followerCount ?? 0,
        following: followingCount ?? 0,
        comments: commentCount ?? 0,
        likes: likesReceived,
        gameLevels: (u?.max_level ?? 1) - 1,
      }))
    } catch { /* silently skip */ }
  }

  async function loadSuggested() {
    if (!user) return
    // Usuarios que no seguís (excluye al propio user)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: followingData } = await (supabase as any)
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds: string[] = (followingData ?? []).map((f: { following_id: string }) => f.following_id)
    setFollowing(new Set(followingIds))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('profiles')
      .select('id, username, avatar, bio')
      .neq('id', user.id)
      .not('id', 'in', followingIds.length > 0 ? `(${followingIds.join(',')})` : '(null)')
      .limit(4)

    setSuggested(data ?? [])
  }

  async function handleFollow(targetId: string) {
    if (!user) return
    if (following.has(targetId)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId)
      setFollowing(prev => { const n = new Set(prev); n.delete(targetId); return n })
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('follows').insert({ follower_id: user.id, following_id: targetId })
      setFollowing(prev => new Set([...prev, targetId]))
    }
  }

  const cardStyle = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '18px',
    marginBottom: '12px',
  }

  const titleStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '2px',
    marginBottom: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  }

  // XP del usuario (cargado en loadMyXP con stats reales)
  const { level, current, needed } = xpLevel(myXP)

  return (
    <div style={{ paddingBottom: '24px' }}>
      {/* Mini perfil propio */}
      {user && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '14px', marginBottom: '14px', borderBottom: '1px solid var(--border)' }}>
            <Link href={`/profile/${user.username}`}>
              <UserAvatar avatar={user.avatar} username={user.username} size={44} />
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link href={`/profile/${user.username}`} style={{ textDecoration: 'none' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--cyan)', letterSpacing: '0.5px' }}>
                  @{user.username}
                </div>
              </Link>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                LVL {level} · {getLevelName(level)}
              </div>
              {/* Mini XP bar */}
              <div style={{ height: '3px', background: 'var(--surface)', borderRadius: '2px', overflow: 'hidden', marginTop: '6px' }}>
                <div style={{ height: '100%', width: `${needed > 0 ? Math.round((current / needed) * 100) : 100}%`, background: 'linear-gradient(90deg, var(--purple-dim), var(--cyan))', borderRadius: '2px', transition: 'width 1s ease' }} />
              </div>
            </div>
          </div>
          {/* Now playing */}
          {u?.now_playing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', flexShrink: 0, boxShadow: '0 0 6px #4ade80', animation: 'pulse-dot 2s infinite' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#4ade80', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.now_playing}
              </span>
            </div>
          ) : (
            <Link href="/settings" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textDecoration: 'none' }}>
              + Agregar estado de juego
            </Link>
          )}
        </div>
      )}

      {/* Sugerencias */}
      {suggested.length > 0 && (
        <div style={cardStyle}>
          <div style={titleStyle}>👥 DESCUBRÍ GAMERS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {suggested.map((s, i) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                padding: '8px 0',
                borderBottom: i < suggested.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <Link href={`/profile/${s.username}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flex: 1, minWidth: 0 }}>
                  <UserAvatar avatar={s.avatar} username={s.username} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      @{s.username}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.bio || 'Jugando en Respawn'}
                    </div>
                  </div>
                </Link>
                {user && (
                  <button onClick={() => handleFollow(s.id)} style={{
                    background: following.has(s.id) ? 'transparent' : 'var(--cyan-glow)',
                    border: `1px solid ${following.has(s.id) ? 'var(--border)' : 'var(--cyan-border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    color: following.has(s.id) ? 'var(--text-muted)' : 'var(--cyan)',
                    fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                    letterSpacing: '0.5px', padding: '4px 10px', cursor: 'pointer',
                    whiteSpace: 'nowrap', transition: 'all var(--transition)',
                  }}>
                    {following.has(s.id) ? 'Siguiendo' : 'Seguir'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Arcade */}
      <div style={cardStyle}>
        <div style={titleStyle}>🕹️ ARCADE</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {GAMES.slice(0, 4).map((game) => {
            const locked = user ? game.minLevel > (u?.max_level ?? 1) : game.minLevel > 1
            return (
              <Link key={game.id} href={locked ? '/arcade' : `/arcade/${game.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  opacity: locked ? 0.5 : 1,
                  transition: 'all var(--transition)',
                  position: 'relative', overflow: 'hidden',
                }}
                  onMouseEnter={(e) => {
                    if (!locked) {
                      e.currentTarget.style.borderColor = game.color + '66'
                      e.currentTarget.style.transform = 'translateX(3px)'
                      const line = e.currentTarget.querySelector('.game-line') as HTMLElement
                      if (line) line.style.transform = 'scaleY(1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.transform = 'translateX(0)'
                    const line = e.currentTarget.querySelector('.game-line') as HTMLElement
                    if (line) line.style.transform = 'scaleY(0)'
                  }}
                >
                  <div className="game-line" style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
                    background: game.color, transform: 'scaleY(0)', transition: 'transform var(--transition)',
                    transformOrigin: 'center',
                  }} />
                  <span style={{ fontSize: '16px' }}>{game.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: locked ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {game.name.toUpperCase()}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px' }}>
                      {locked ? `🔒 Nivel ${game.minLevel} requerido` : game.description}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
          <Link href="/arcade" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cyan)', textDecoration: 'none', textAlign: 'center', paddingTop: '4px' }}>
            Ver todos los juegos →
          </Link>
        </div>
      </div>

      {/* Top Gamers */}
      {topGamers.length > 0 && (
        <div style={cardStyle}>
          <div style={titleStyle}>👑 TOP GAMERS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {topGamers.map((g, i) => {
              const { level } = xpLevel(g.xp)
              const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32', 'var(--text-muted)', 'var(--text-muted)']
              const medalEmojis = ['🥇', '🥈', '🥉', '4', '5']
              const isMe = user?.id === g.id
              return (
                <div key={g.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 0',
                  borderBottom: i < topGamers.length - 1 ? '1px solid var(--border)' : 'none',
                  background: isMe ? 'rgba(0,255,247,0.03)' : 'transparent',
                  borderRadius: isMe ? 'var(--radius-sm)' : '0',
                }}>
                  {/* Rank */}
                  <div style={{
                    width: '20px', textAlign: 'center', flexShrink: 0,
                    fontFamily: 'var(--font-display)', fontSize: i < 3 ? '14px' : '11px',
                    fontWeight: 700, color: medalColors[i],
                  }}>
                    {i < 3 ? medalEmojis[i] : medalEmojis[i]}
                  </div>
                  <Link href={`/profile/${g.username}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flex: 1, minWidth: 0 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <UserAvatar avatar={g.avatar} username={g.username} size={30} />
                      {isMe && (
                        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '8px', height: '8px', background: 'var(--cyan)', borderRadius: '50%', border: '1px solid var(--card)' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
                        color: isMe ? 'var(--cyan)' : 'var(--text-primary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        @{g.username}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>
                        LVL {level} · {g.xp.toLocaleString('es-AR')} XP
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Trending tags */}
      <div style={cardStyle}>
        <div style={titleStyle}>🔥 TRENDING</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {trendingTags.map((t) => (
            <Link key={t.tag} href={`/explore?q=${encodeURIComponent(t.tag)}`} style={{ textDecoration: 'none' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: t.hot ? 'rgba(255,79,123,0.06)' : 'var(--surface)',
                border: `1px solid ${t.hot ? 'rgba(255,79,123,0.3)' : 'var(--border)'}`,
                borderRadius: '20px', padding: '4px 12px',
                fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                color: t.hot ? 'var(--pink)' : 'var(--text-secondary)',
                letterSpacing: '0.5px', cursor: 'pointer',
                transition: 'all var(--transition)',
              }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = t.hot ? 'var(--pink)' : 'rgba(0,255,247,0.3)'
                  ;(e.currentTarget as HTMLElement).style.color = t.hot ? 'var(--pink)' : 'var(--cyan)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = t.hot ? 'rgba(255,79,123,0.3)' : 'var(--border)'
                  ;(e.currentTarget as HTMLElement).style.color = t.hot ? 'var(--pink)' : 'var(--text-secondary)'
                }}
              >
                {t.hot && '🔥 '}#{t.tag}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
