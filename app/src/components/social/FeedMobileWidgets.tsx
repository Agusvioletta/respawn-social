'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { calculateXP, xpLevel, getLevelName } from '@/lib/utils/xp'

interface TopGamer {
  id: string
  username: string
  avatar: string | null
  photo_url?: string | null
  max_level: number
  xp: number
}

interface SuggestedUser {
  id: string
  username: string
  avatar: string | null
  photo_url?: string | null
  bio: string | null
}

const FALLBACK_TAGS = ['Valorant', 'Minecraft', 'LoL', 'Fortnite', 'CS2']

/**
 * Widgets compactos para mobile/tablet (xl:hidden).
 * Muestra trending tags + top gamers + sugerencias de seguir.
 * En desktop (xl+) el sidebar real los muestra — estos se ocultan.
 */
export function FeedMobileWidgets() {
  const user = useAuthStore((s) => s.user)
  const supabase = createClient()

  const [trendingTags, setTrendingTags] = useState<{ tag: string; hot: boolean }[]>(
    FALLBACK_TAGS.map((t, i) => ({ tag: t, hot: i < 2 }))
  )
  const [topGamers, setTopGamers] = useState<TopGamer[]>([])
  const [suggested, setSuggested] = useState<SuggestedUser[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadTrendingTags()
    loadTopGamers()
    if (user?.id) loadSuggested()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

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
        .slice(0, 8)
      setTrendingTags(sorted.map(([tag], i) => ({ tag, hot: i < 3 })))
    } catch { /* silently skip */ }
  }

  async function loadTopGamers() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('id, username, avatar, photo_url, max_level')
        .order('max_level', { ascending: false })
        .limit(10)

      if (!profiles?.length) return
      const userIds = profiles.map((p: { id: string }) => p.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [{ data: postRows }, { data: followRows }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('posts').select('user_id, likes(user_id)').in('user_id', userIds),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('follows').select('following_id').in('following_id', userIds),
      ])

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

      const withXP = profiles.map((p: { id: string; username: string; avatar: string | null; photo_url?: string | null; max_level: number }) => ({
        ...p,
        xp: calculateXP({
          posts: postCounts.get(p.id) ?? 0,
          followers: followCounts.get(p.id) ?? 0,
          following: 0,
          likes: likesCounts.get(p.id) ?? 0,
          gameLevels: Math.max(0, (p.max_level ?? 1) - 1),
        }),
      }))

      setTopGamers(
        withXP
          .sort((a: { xp: number }, b: { xp: number }) => b.xp - a.xp)
          .slice(0, 5)
      )
    } catch { /* silently skip */ }
  }

  async function loadSuggested() {
    if (!user) return
    try {
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
        .select('id, username, avatar, photo_url, bio')
        .neq('id', user.id)
        .not('id', 'in', followingIds.length > 0 ? `(${followingIds.join(',')})` : '(null)')
        .limit(3)

      setSuggested(data ?? [])
    } catch { /* silently skip */ }
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

  const sectionTitle = (icon: string, label: string) => (
    <div style={{
      fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700,
      color: 'var(--text-muted)', letterSpacing: '2px',
      display: 'flex', alignItems: 'center', gap: '5px',
      marginBottom: '10px',
    }}>
      {icon} {label}
    </div>
  )

  return (
    /* xl:hidden — se oculta cuando el sidebar real es visible */
    <div className="xl:hidden" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* ── Trending tags ── */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '14px 16px',
      }}>
        {sectionTitle('🔥', 'TRENDING')}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
          {trendingTags.map((t) => (
            <Link key={t.tag} href={`/explore?q=${encodeURIComponent(t.tag)}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '3px',
                background: t.hot ? 'rgba(255,79,123,0.08)' : 'var(--surface)',
                border: `1px solid ${t.hot ? 'rgba(255,79,123,0.3)' : 'var(--border)'}`,
                borderRadius: '20px', padding: '4px 11px',
                fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                color: t.hot ? 'var(--pink)' : 'var(--text-secondary)',
                letterSpacing: '0.5px', whiteSpace: 'nowrap',
              }}>
                {t.hot ? '🔥 ' : ''}#{t.tag}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Top Gamers (horizontal scroll) ── */}
      {topGamers.length > 0 && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '14px 16px',
        }}>
          {sectionTitle('👑', 'TOP GAMERS')}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
            {topGamers.map((g, i) => {
              const { level } = xpLevel(g.xp)
              const medals = ['🥇', '🥈', '🥉', '4', '5']
              const isMe = user?.id === g.id
              return (
                <Link key={g.id} href={`/profile/${g.username}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                    background: isMe ? 'rgba(0,255,247,0.05)' : 'var(--surface)',
                    border: `1px solid ${isMe ? 'var(--cyan-border)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)', padding: '10px 12px',
                    minWidth: '72px',
                  }}>
                    <span style={{ fontSize: '12px', lineHeight: 1 }}>{i < 3 ? medals[i] : `#${i + 1}`}</span>
                    <UserAvatar avatar={g.avatar} photoUrl={g.photo_url} username={g.username} size={34} />
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, color: isMe ? 'var(--cyan)' : 'var(--text-primary)', whiteSpace: 'nowrap', maxWidth: '68px', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.3px' }}>
                      @{g.username}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-muted)' }}>
                      {getLevelName(level)}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Descubrí gamers ── */}
      {suggested.length > 0 && user && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '14px 16px',
        }}>
          {sectionTitle('👥', 'DESCUBRÍ GAMERS')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {suggested.map((s, i) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                padding: '8px 0',
                borderBottom: i < suggested.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <Link href={`/profile/${s.username}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flex: 1, minWidth: 0 }}>
                  <UserAvatar avatar={s.avatar} photoUrl={s.photo_url} username={s.username} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      @{s.username}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.bio || 'Jugando en Respawn'}
                    </div>
                  </div>
                </Link>
                <button onClick={() => handleFollow(s.id)} style={{
                  background: following.has(s.id) ? 'transparent' : 'var(--cyan-glow)',
                  border: `1px solid ${following.has(s.id) ? 'var(--border)' : 'var(--cyan-border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  color: following.has(s.id) ? 'var(--text-muted)' : 'var(--cyan)',
                  fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                  letterSpacing: '0.5px', padding: '4px 10px', cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'all var(--transition)',
                }}>
                  {following.has(s.id) ? 'Siguiendo' : 'Seguir'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
