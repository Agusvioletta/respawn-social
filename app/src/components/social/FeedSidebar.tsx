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

const TRENDING_TAGS = [
  { tag: 'Valorant', hot: true },
  { tag: 'Minecraft', hot: false },
  { tag: 'LoL', hot: true },
  { tag: 'Fortnite', hot: false },
  { tag: 'CS2', hot: true },
  { tag: 'Elden Ring', hot: false },
  { tag: 'GTA6', hot: true },
]

export function FeedSidebar() {
  const user = useAuthStore((s) => s.user)
  const supabase = createClient()
  const [suggested, setSuggested] = useState<SuggestedUser[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set())

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = user as any

  useEffect(() => {
    if (!user) return
    loadSuggested()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

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

  // XP del usuario
  const xpTotal = u ? calculateXP({
    posts: 0, followers: 0, following: 0, likes: 0,
    gameLevels: u.max_level ?? 1,
  }) : 0
  const { level, current, needed } = xpLevel(xpTotal)

  return (
    <div>
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

      {/* Trending tags */}
      <div style={cardStyle}>
        <div style={titleStyle}>🔥 TRENDING</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {TRENDING_TAGS.map((t) => (
            <span key={t.tag} style={{
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
          ))}
        </div>
      </div>
    </div>
  )
}
