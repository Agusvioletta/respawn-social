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

const ACHIEVEMENTS = [
  { icon: '📝', name: 'Primera Sangre',  desc: 'Publicá tu primer post',       check: (d: StatsData) => d.postCount >= 1 },
  { icon: '🔥', name: 'En Racha',        desc: 'Publicá 10 posts',             check: (d: StatsData) => d.postCount >= 10 },
  { icon: '💬', name: 'Sin Parar',       desc: 'Publicá 50 posts',             check: (d: StatsData) => d.postCount >= 50 },
  { icon: '🤝', name: 'Sociable',        desc: 'Seguí a alguien',              check: (d: StatsData) => d.followingCount >= 1 },
  { icon: '⭐', name: 'Popular',         desc: 'Conseguí 3 seguidores',        check: (d: StatsData) => d.followersCount >= 3 },
  { icon: '🎤', name: 'Famoso',          desc: 'Conseguí 10 seguidores',       check: (d: StatsData) => d.followersCount >= 10 },
  { icon: '👑', name: 'Leyenda Social',  desc: 'Conseguí 50 seguidores',       check: (d: StatsData) => d.followersCount >= 50 },
  { icon: '💜', name: 'Querido',         desc: 'Recibí 5 likes',               check: (d: StatsData) => d.likesReceived >= 5 },
  { icon: '❤️', name: 'Muy Querido',     desc: 'Recibí 50 likes',              check: (d: StatsData) => d.likesReceived >= 50 },
  { icon: '🐍', name: 'Snake Master',    desc: 'Superá Snake',                 check: (d: StatsData) => d.maxLevel >= 2 },
  { icon: '🏓', name: 'Pong Pro',        desc: 'Ganá en Pong',                 check: (d: StatsData) => d.maxLevel >= 3 },
  { icon: '🧱', name: 'Block Breaker',   desc: 'Superá Breakout',              check: (d: StatsData) => d.maxLevel >= 4 },
  { icon: '☄',  name: 'Astronauta',      desc: 'Superá Asteroids',             check: (d: StatsData) => d.maxLevel >= 5 },
  { icon: '🐦', name: 'Flappy Bird',     desc: 'Superá Flappy',                check: (d: StatsData) => d.maxLevel >= 6 },
  { icon: '🟪', name: 'Tetris God',      desc: 'Superá Tetris',                check: (d: StatsData) => d.maxLevel >= 7 },
  { icon: '👾', name: 'Space Cadet',     desc: 'Superá Space Invaders',        check: (d: StatsData) => d.maxLevel >= 8 },
  { icon: '🎮', name: 'Arcade Master',   desc: 'Completá todo el Arcade',      check: (d: StatsData) => d.maxLevel >= 9 },
  { icon: '🏆', name: 'Competidor',      desc: 'Inscribite en un torneo',      check: (d: StatsData) => d.tournamentsJoined >= 1 },
]

interface StatsData {
  postCount: number
  followersCount: number
  followingCount: number
  likesReceived: number
  commentsCount: number
  maxLevel: number
  tournamentsJoined: number
}

export default function ProfilePage() {
  const params = useParams()
  const username = params.username as string
  const currentUser = useAuthStore((s) => s.user)
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<PostWithMeta[]>([])
  const [stats, setStats] = useState({ followers: 0, following: 0, likes: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'logros'>('posts')

  const isOwn = currentUser?.username === username

  async function loadProfile() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profileData } = await (supabase as any).from('profiles').select('*').eq('username', username).single()
    if (!profileData) { setLoading(false); return }
    setProfile(profileData)

    // Posts del usuario
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: postsData } = await (supabase as any).from('posts')
      .select('*, likes(user_id), comments(id, user_id, username, avatar, content, parent_id, created_at)')
      .eq('user_id', profileData.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setPosts(postsData ?? [])

    // Followers / following
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileData.id),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id),
    ])

    const likesReceived = (postsData ?? []).reduce((s: number, p: PostWithMeta) => s + (p.likes?.length ?? 0), 0)
    setStats({ followers: followerCount ?? 0, following: followingCount ?? 0, likes: likesReceived })

    if (currentUser && !isOwn) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: followData } = await (supabase as any).from('follows').select('follower_id').eq('follower_id', currentUser.id).eq('following_id', profileData.id).maybeSingle()
      setIsFollowing(!!followData)
    }

    setLoading(false)
  }

  useEffect(() => { loadProfile() }, [username])

  async function handleFollow() {
    if (!currentUser || !profile || isOwn) return
    setFollowLoading(true)
    if (isFollowing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profile.id)
      if (!error) { setIsFollowing(false); setStats((s) => ({ ...s, followers: s.followers - 1 })) }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('follows').insert({ follower_id: currentUser.id, following_id: profile.id })
      if (!error) { setIsFollowing(true); setStats((s) => ({ ...s, followers: s.followers + 1 })) }
    }
    setFollowLoading(false)
  }

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '13px' }}>
      Cargando perfil...
    </div>
  )

  if (!profile) return (
    <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '13px' }}>
      // Usuario no encontrado
    </div>
  )

  const statsData: StatsData = {
    postCount: posts.length,
    followersCount: stats.followers,
    followingCount: stats.following,
    likesReceived: stats.likes,
    commentsCount: 0,
    maxLevel: profile.max_level ?? 1,
    tournamentsJoined: 0,
  }
  const xp = calculateXP({ posts: posts.length, followers: stats.followers, following: stats.following, likes: stats.likes, gameLevels: (profile.max_level ?? 1) - 1 })
  const lvl = xpLevel(xp)
  const levelName = getLevelName(lvl.level)
  const unlockedAchievements = ACHIEVEMENTS.filter((a) => a.check(statsData))

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 16px' }}>

      {/* Profile card */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: '20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
          <UserAvatar avatar={profile.avatar} username={profile.username} size={72} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                @{profile.username}
              </h1>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '1px',
                color: 'var(--cyan)', background: 'var(--cyan-glow)',
                border: '1px solid var(--cyan-border)', borderRadius: '4px', padding: '2px 8px',
              }}>
                LVL {lvl.level} · {levelName}
              </span>
            </div>

            {profile.bio && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                {profile.bio}
              </p>
            )}

            {/* Now Playing */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(profile as any).now_playing && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '6px', padding: '4px 10px', marginBottom: '8px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 8px #4ade80', animation: 'pulse 2s infinite', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#4ade80' }}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  Jugando: {(profile as any).now_playing}
                </span>
              </div>
            )}

            {/* Games */}
            {profile.games && profile.games.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {profile.games.map((g) => (
                  <span key={g} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--purple)', background: 'var(--purple-glow)', border: '1px solid rgba(192,132,252,0.3)', borderRadius: '4px', padding: '2px 8px' }}>
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Follow / Edit button */}
          {isOwn ? (
            <Link href="/settings" style={{ textDecoration: 'none' }}>
              <button style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '7px 14px', cursor: 'pointer' }}>
                Editar
              </button>
            </Link>
          ) : currentUser && (
            <button onClick={handleFollow} disabled={followLoading} style={{
              background: isFollowing ? 'transparent' : 'var(--cyan-glow)',
              border: `1px solid ${isFollowing ? 'var(--border)' : 'var(--cyan)'}`,
              borderRadius: 'var(--radius-md)',
              color: isFollowing ? 'var(--text-muted)' : 'var(--cyan)',
              fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
              letterSpacing: '1px', padding: '7px 16px', cursor: 'pointer',
              transition: 'all var(--transition)',
            }}>
              {followLoading ? '...' : isFollowing ? 'Siguiendo' : 'Seguir'}
            </button>
          )}
        </div>

        {/* XP bar */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>XP {lvl.current} / {lvl.needed}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{xp} XP total</span>
          </div>
          <div style={{ height: '4px', background: 'var(--surface)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((lvl.current / lvl.needed) * 100)}%`, background: 'var(--cyan)', borderRadius: '2px', transition: 'width 0.5s ease', boxShadow: '0 0 8px var(--cyan-glow)' }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '0', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          {[
            { label: 'Posts', value: posts.length },
            { label: 'Seguidores', value: stats.followers },
            { label: 'Siguiendo', value: stats.following },
            { label: 'Likes', value: stats.likes },
          ].map((stat) => (
            <div key={stat.label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{stat.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>{stat.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {(['posts', 'logros'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: activeTab === tab ? 'var(--cyan-glow)' : 'transparent',
            border: `1px solid ${activeTab === tab ? 'var(--cyan-border)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)', padding: '7px 16px',
            color: activeTab === tab ? 'var(--cyan)' : 'var(--text-muted)',
            fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
            letterSpacing: '1px', cursor: 'pointer', transition: 'all var(--transition)',
          }}>
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Posts tab */}
      {activeTab === 'posts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
              // Sin posts todavía
            </div>
          ) : posts.map((post) => (
            <PostCard key={post.id} post={post} onDeleted={(id) => setPosts((p) => p.filter((x) => x.id !== id))} />
          ))}
        </div>
      )}

      {/* Logros tab */}
      {activeTab === 'logros' && (
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {unlockedAchievements.length} / {ACHIEVEMENTS.length} desbloqueados
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {ACHIEVEMENTS.map((a) => {
              const unlocked = a.check(statsData)
              return (
                <div key={a.name} style={{
                  background: unlocked ? 'var(--cyan-glow)' : 'var(--surface)',
                  border: `1px solid ${unlocked ? 'var(--cyan-border)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)', padding: '12px',
                  opacity: unlocked ? 1 : 0.4,
                  transition: 'all var(--transition)',
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{a.icon}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: unlocked ? 'var(--cyan)' : 'var(--text-muted)', marginBottom: '2px' }}>
                    {a.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                    {a.desc}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
