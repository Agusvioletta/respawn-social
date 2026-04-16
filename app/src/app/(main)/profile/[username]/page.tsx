'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { PostCard } from '@/components/social/PostCard'
import { calculateXP, xpLevel, getLevelName } from '@/lib/utils/xp'
import type { PostWithMeta } from '@/lib/supabase/queries/posts'
import type { Profile } from '@/lib/types/database'

// ── Logros ────────────────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  { icon: '📝', name: 'Primera Sangre',  desc: 'Publicá tu primer post',         check: (d: StatsData) => d.postCount >= 1  },
  { icon: '🔥', name: 'En Racha',        desc: 'Publicá 10 posts',               check: (d: StatsData) => d.postCount >= 10 },
  { icon: '💬', name: 'Sin Parar',       desc: 'Publicá 50 posts',               check: (d: StatsData) => d.postCount >= 50 },
  { icon: '🤝', name: 'Sociable',        desc: 'Seguí a alguien',                check: (d: StatsData) => d.followingCount >= 1  },
  { icon: '⭐', name: 'Popular',         desc: 'Conseguí 3 seguidores',          check: (d: StatsData) => d.followersCount >= 3  },
  { icon: '🎤', name: 'Famoso',          desc: 'Conseguí 10 seguidores',         check: (d: StatsData) => d.followersCount >= 10 },
  { icon: '👑', name: 'Leyenda Social',  desc: 'Conseguí 50 seguidores',         check: (d: StatsData) => d.followersCount >= 50 },
  { icon: '💜', name: 'Querido',         desc: 'Recibí 5 likes',                 check: (d: StatsData) => d.likesReceived >= 5   },
  { icon: '❤️', name: 'Muy Querido',     desc: 'Recibí 50 likes',                check: (d: StatsData) => d.likesReceived >= 50  },
  { icon: '🐍', name: 'Snake Master',    desc: 'Superá Snake',                   check: (d: StatsData) => d.maxLevel >= 2 },
  { icon: '🏓', name: 'Pong Pro',        desc: 'Ganá en Pong',                   check: (d: StatsData) => d.maxLevel >= 3 },
  { icon: '🧱', name: 'Block Breaker',   desc: 'Superá Breakout',                check: (d: StatsData) => d.maxLevel >= 4 },
  { icon: '☄️', name: 'Astronauta',      desc: 'Superá Asteroids',               check: (d: StatsData) => d.maxLevel >= 5 },
  { icon: '🐦', name: 'Flappy Bird',     desc: 'Superá Flappy',                  check: (d: StatsData) => d.maxLevel >= 6 },
  { icon: '🟪', name: 'Tetris God',      desc: 'Superá Tetris',                  check: (d: StatsData) => d.maxLevel >= 7 },
  { icon: '👾', name: 'Space Cadet',     desc: 'Superá Space Invaders',          check: (d: StatsData) => d.maxLevel >= 8 },
  { icon: '🎮', name: 'Arcade Master',   desc: 'Completá todo el Arcade',        check: (d: StatsData) => d.maxLevel >= 9 },
  { icon: '🏆', name: 'Competidor',      desc: 'Inscribite en un torneo',        check: (d: StatsData) => d.tournamentsJoined >= 1 },
]

const LEVEL_NAMES = ['Novato','Aprendiz','Jugador','Veterano','Elite','Leyenda','Máster','Campeón']

const ARCADE_GAMES = [
  { id: 'snake',         emoji: '🐍', name: 'Snake',          color: '#00FFF7' },
  { id: 'pong',          emoji: '🏓', name: 'Pong',           color: '#FF4F7B' },
  { id: 'breakout',      emoji: '🧱', name: 'Breakout',       color: '#C084FC' },
  { id: 'asteroids',     emoji: '☄️', name: 'Asteroids',      color: '#FFB800' },
  { id: 'flappy',        emoji: '🐦', name: 'Flappy',         color: '#4ade80' },
  { id: 'tetris',        emoji: '🟪', name: 'Tetris',         color: '#a78bfa' },
  { id: 'dino',          emoji: '🦕', name: 'Dino Run',       color: '#FF8C00' },
  { id: 'spaceinvaders', emoji: '👾', name: 'Space Invaders', color: '#4ade80' },
]

interface StatsData {
  postCount: number; followersCount: number; followingCount: number
  likesReceived: number; commentsCount: number; maxLevel: number; tournamentsJoined: number
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const params = useParams()
  const username = params.username as string
  const currentUser = useAuthStore((s) => s.user)
  const supabase = createClient()

  const [profile,       setProfile]       = useState<Profile | null>(null)
  const [posts,         setPosts]         = useState<PostWithMeta[]>([])
  const [stats,         setStats]         = useState({ followers: 0, following: 0, likes: 0 })
  const [arcadeScores,  setArcadeScores]  = useState<Record<string, number>>({})
  const [isFollowing,   setIsFollowing]   = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab,     setActiveTab]     = useState<'posts' | 'logros' | 'arcade'>('posts')

  const isOwn = currentUser?.username === username

  async function loadProfile() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const { data: prof } = await sb.from('profiles').select('*').eq('username', username).single()
      if (!prof) { setLoading(false); return }
      setProfile(prof)

      const [
        { data: postsData },
        { count: followerCount },
        { count: followingCount },
        { data: scores },
      ] = await Promise.all([
        sb.from('posts')
          .select('*, likes(user_id), comments(id,user_id,username,avatar,content,parent_id,created_at)')
          .eq('user_id', prof.id).order('created_at', { ascending: false }).limit(20),
        sb.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', prof.id),
        sb.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', prof.id),
        sb.from('game_scores').select('game_id, score').eq('user_id', prof.id),
      ])

      setPosts(postsData ?? [])
      const likes = (postsData ?? []).reduce((s: number, p: PostWithMeta) => s + (p.likes?.length ?? 0), 0)
      setStats({ followers: followerCount ?? 0, following: followingCount ?? 0, likes })

      // Best score por juego
      const best: Record<string, number> = {}
      for (const row of (scores ?? [])) {
        if (!best[row.game_id] || row.score > best[row.game_id]) best[row.game_id] = row.score
      }
      setArcadeScores(best)

      if (currentUser && !isOwn) {
        const { data: followData } = await sb.from('follows').select('follower_id')
          .eq('follower_id', currentUser.id).eq('following_id', prof.id).maybeSingle()
        setIsFollowing(!!followData)
      }
    } catch (e) { console.error('[Profile]', e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadProfile() }, [username])  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFollow() {
    if (!currentUser || !profile || isOwn) return
    setFollowLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    if (isFollowing) {
      const { error } = await sb.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profile.id)
      if (!error) { setIsFollowing(false); setStats(s => ({ ...s, followers: s.followers - 1 })) }
    } else {
      const { error } = await sb.from('follows').insert({ follower_id: currentUser.id, following_id: profile.id })
      if (!error) { setIsFollowing(true); setStats(s => ({ ...s, followers: s.followers + 1 })) }
    }
    setFollowLoading(false)
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Banner skeleton */}
      <div style={{ height: '160px', background: 'var(--card)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }} />
      <div style={{ padding: '0 20px' }}>
        <div style={{ height: '96px', width: '96px', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', marginTop: '-48px', marginBottom: '12px', border: '3px solid var(--card)' }} />
        <div style={{ height: '20px', width: '160px', background: 'var(--surface)', borderRadius: '4px', marginBottom: '8px' }} />
        <div style={{ height: '14px', width: '220px', background: 'var(--surface)', borderRadius: '4px' }} />
      </div>
    </div>
  )

  if (!profile) return (
    <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '13px' }}>
      // Usuario no encontrado
    </div>
  )

  const statsData: StatsData = {
    postCount: posts.length, followersCount: stats.followers, followingCount: stats.following,
    likesReceived: stats.likes, commentsCount: 0, maxLevel: profile.max_level ?? 1, tournamentsJoined: 0,
  }
  const xp        = calculateXP({ posts: posts.length, followers: stats.followers, following: stats.following, likes: stats.likes, gameLevels: (profile.max_level ?? 1) - 1 })
  const lvl       = xpLevel(xp)
  const levelName = getLevelName(lvl.level)
  const xpPct     = Math.round((lvl.current / lvl.needed) * 100)
  const nowPlaying = (profile as any).now_playing as string | null  // eslint-disable-line @typescript-eslint/no-explicit-any
  const unlockedCount = ACHIEVEMENTS.filter(a => a.check(statsData)).length

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', paddingBottom: '24px' }}>

      {/* ── BANNER ──────────────────────────────────────────────────────────── */}
      <div style={{
        height: '168px', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg,#07070F 0%,#0d0a1e 45%,#080814 100%)',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(0,255,247,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,247,0.05) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(180deg,black 30%,transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg,black 30%,transparent 100%)',
        }} />
        {/* Radial glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 120% at 50% 110%,rgba(0,255,247,0.12),transparent 70%)',
        }} />
        {/* Rank chip */}
        <div style={{
          position: 'absolute', top: '16px', left: '16px',
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(0,0,0,0.55)', border: '1px solid var(--border)',
          borderRadius: '20px', padding: '4px 14px',
          fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
          color: 'var(--text-secondary)', letterSpacing: '1px',
        }}>
          🎮 {(levelName || 'RESPAWN').toUpperCase()}
        </div>
        {/* Online indicator */}
        <div style={{
          position: 'absolute', top: '16px', right: '16px',
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(0,0,0,0.55)', border: '1px solid var(--border)',
          borderRadius: '20px', padding: '4px 12px',
          fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
          ONLINE
        </div>
      </div>

      {/* ── MAIN CARD ───────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)', borderBottom: '1px solid var(--border)',
        padding: '0 20px 24px',
      }}>
        {/* Avatar row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
          {/* Avatar + level badge */}
          <div style={{ position: 'relative', marginTop: '-48px' }}>
            <div style={{
              borderRadius: 'var(--radius-lg)', border: '3px solid var(--card)',
              boxShadow: '0 0 0 2px var(--cyan), 0 0 32px rgba(0,255,247,0.2)',
              overflow: 'hidden', display: 'inline-block',
            }}>
              <UserAvatar avatar={profile.avatar} username={profile.username} size={88} />
            </div>
            <div style={{
              position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--deep)', border: '1px solid rgba(0,255,247,0.4)',
              borderRadius: '20px', padding: '2px 10px', whiteSpace: 'nowrap',
              fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 900,
              color: 'var(--cyan)', letterSpacing: '1px',
            }}>
              LVL {lvl.level}
            </div>
          </div>

          {/* Follow / Edit */}
          <div style={{ paddingBottom: '4px', display: 'flex', gap: '8px' }}>
            {isOwn ? (
              <Link href="/settings" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
                  letterSpacing: '1px', padding: '8px 18px', cursor: 'pointer',
                  transition: 'all var(--transition)',
                }}>
                  ✏ Editar
                </button>
              </Link>
            ) : currentUser && (
              <>
                <Link href={`/messages/${profile.id}`} style={{ textDecoration: 'none' }}>
                  <button style={{
                    background: 'transparent', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)', fontSize: '12px',
                    padding: '8px 12px', cursor: 'pointer',
                  }}>
                    💬
                  </button>
                </Link>
                <button onClick={handleFollow} disabled={followLoading} style={{
                  background: isFollowing ? 'transparent' : 'var(--cyan-glow)',
                  border: `1px solid ${isFollowing ? 'var(--border)' : 'var(--cyan)'}`,
                  borderRadius: 'var(--radius-md)',
                  color: isFollowing ? 'var(--text-muted)' : 'var(--cyan)',
                  fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
                  letterSpacing: '1px', padding: '8px 18px', cursor: 'pointer',
                  transition: 'all var(--transition)',
                }}>
                  {followLoading ? '...' : isFollowing ? 'Siguiendo' : 'Seguir'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Name + bio + games */}
        <div style={{ marginTop: '14px', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '1px', marginBottom: '2px' }}>
            {profile.username}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--cyan)', marginBottom: '8px' }}>
            @{profile.username} · {levelName}
          </div>
          {profile.bio && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.5 }}>
              {profile.bio}
            </p>
          )}
          {/* Now playing */}
          {nowPlaying && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)',
              borderRadius: '6px', padding: '5px 12px', marginBottom: '10px',
            }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#4ade80' }}>
                Jugando: {nowPlaying}
              </span>
            </div>
          )}
          {/* Games */}
          {profile.games && profile.games.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {profile.games.map(g => (
                <span key={g} style={{
                  fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                  color: 'var(--text-secondary)', letterSpacing: '0.5px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '20px', padding: '3px 12px',
                }}>
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── XP Bar ───────────────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>⚡</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, color: 'var(--purple)', letterSpacing: '2px' }}>EXPERIENCIA</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>Nivel {lvl.level} — {levelName}</span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{lvl.current} / {lvl.needed} XP</span>
          </div>

          {/* XP track */}
          <div style={{ height: '8px', background: 'var(--void)', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px', position: 'relative' }}>
            <div style={{
              height: '100%', width: `${xpPct}%`,
              background: 'linear-gradient(90deg,rgba(192,132,252,0.7),#a78bfa,var(--cyan))',
              borderRadius: '4px', transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
              position: 'relative',
            }}>
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', background: 'rgba(255,255,255,0.6)', borderRadius: '4px', filter: 'blur(1px)' }} />
            </div>
          </div>

          {/* Level milestones */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: '3px' }}>
            {LEVEL_NAMES.map((name, i) => {
              const lNum    = i + 1
              const reached = lvl.level > lNum
              const current = lvl.level === lNum
              return (
                <div key={name} style={{
                  background: current ? 'rgba(0,255,247,0.1)' : reached ? 'rgba(0,255,247,0.05)' : 'var(--void)',
                  border: `1px solid ${current ? 'var(--cyan)' : reached ? 'rgba(0,255,247,0.25)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: '4px', padding: '5px 2px', textAlign: 'center',
                  boxShadow: current ? '0 0 8px rgba(0,255,247,0.3)' : 'none',
                  transition: 'all var(--transition)',
                }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, color: current || reached ? 'var(--cyan)' : 'var(--text-muted)', display: 'block', lineHeight: 1 }}>{lNum}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'var(--text-muted)', display: 'block', marginTop: '2px', lineHeight: 1.1 }}>{name.slice(0,5)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
          gap: '1px', background: 'var(--border)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden',
        }}>
          {[
            { icon: '📝', label: 'Posts',     value: posts.length    },
            { icon: '⭐', label: 'Seguidores', value: stats.followers },
            { icon: '👥', label: 'Siguiendo',  value: stats.following },
            { icon: '💜', label: 'Likes',      value: stats.likes     },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', padding: '14px 8px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background var(--transition)' }}>
              <span style={{ fontSize: '16px', opacity: 0.7, flexShrink: 0 }}>{s.icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 900, color: 'var(--cyan)', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TABS ────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', background: 'var(--deep)',
        borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        {([
          { key: 'posts',  label: `📝 Posts (${posts.length})` },
          { key: 'logros', label: `🏆 Logros (${unlockedCount}/${ACHIEVEMENTS.length})` },
          { key: 'arcade', label: '🕹️ Arcade' },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            flex: 1, padding: '13px 8px',
            background: 'transparent', border: 'none',
            borderBottom: `2px solid ${activeTab === tab.key ? 'var(--cyan)' : 'transparent'}`,
            color: activeTab === tab.key ? 'var(--cyan)' : 'var(--text-muted)',
            fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
            letterSpacing: '1px', cursor: 'pointer', transition: 'all var(--transition)',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px' }}>

        {/* Posts */}
        {activeTab === 'posts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.4 }}>📝</div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>// Sin posts todavía</p>
              </div>
            ) : posts.map(post => (
              <PostCard key={post.id} post={post} onDeleted={id => setPosts(p => p.filter(x => x.id !== id))} />
            ))}
          </div>
        )}

        {/* Logros */}
        {activeTab === 'logros' && (
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {unlockedCount} / {ACHIEVEMENTS.length} desbloqueados
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '8px' }}>
              {ACHIEVEMENTS.map(a => {
                const unlocked = a.check(statsData)
                return (
                  <div key={a.name} style={{
                    background: unlocked ? 'linear-gradient(135deg,rgba(192,132,252,0.08),transparent)' : 'var(--surface)',
                    border: `1px solid ${unlocked ? 'rgba(192,132,252,0.35)' : 'rgba(255,255,255,0.04)'}`,
                    borderRadius: 'var(--radius-md)', padding: '12px 10px', textAlign: 'center',
                    position: 'relative', overflow: 'hidden',
                    opacity: unlocked ? 1 : 0.28, filter: unlocked ? 'none' : 'grayscale(1)',
                    transition: 'all var(--transition)',
                  }}>
                    {/* Top gradient bar on unlocked */}
                    {unlocked && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                        background: 'linear-gradient(90deg,rgba(192,132,252,0.6),var(--cyan))',
                      }} />
                    )}
                    <div style={{ fontSize: '20px', marginBottom: '6px' }}>{a.icon}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px', marginBottom: '3px' }}>
                      {a.name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      {a.desc}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Arcade */}
        {activeTab === 'arcade' && (
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              // mejores puntajes en cada juego
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '8px' }}>
              {ARCADE_GAMES.map(game => {
                const score  = arcadeScores[game.id]
                const hasScore = score !== undefined
                return (
                  <div key={game.id} style={{
                    background: 'var(--surface)', border: `1px solid ${hasScore ? game.color + '33' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)', padding: '14px 12px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    opacity: hasScore ? 1 : 0.45,
                  }}>
                    <span style={{ fontSize: '22px', flexShrink: 0 }}>{game.emoji}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: game.color, letterSpacing: '0.5px', marginBottom: '2px' }}>
                        {game.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: hasScore ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: hasScore ? 700 : 400 }}>
                        {hasScore ? score.toLocaleString('es-AR') : '—'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
