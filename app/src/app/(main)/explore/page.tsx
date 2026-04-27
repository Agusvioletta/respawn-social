'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'

// ── Juegos conocidos ──────────────────────────────────────────────────────────
const GAME_ICONS: Record<string, string> = {
  valorant: '🔫', minecraft: '⛏', 'league of legends': '⚔', fortnite: '🏗',
  apex: '🎯', cs2: '💣', overwatch: '🎮', 'rocket league': '🚗',
  'among us': '🔪', terraria: '⚒', genshin: '🌸', 'elden ring': '⚔',
  'hollow knight': '🦋', 'stardew valley': '🌾', fifa: '⚽', cod: '🔫',
}
const GAME_LIST = [
  'Valorant', 'Minecraft', 'League of Legends', 'Fortnite', 'Apex',
  'CS2', 'Overwatch', 'Rocket League', 'Among Us', 'Terraria',
  'Genshin', 'Elden Ring', 'Hollow Knight', 'Stardew Valley',
]
function gameIcon(name: string) { return GAME_ICONS[name.toLowerCase()] ?? '🎮' }

// ── Types ─────────────────────────────────────────────────────────────────────
interface GamerProfile {
  id: string; username: string; avatar: string | null
  bio: string | null; games: string[] | null; created_at: string
}
interface MiniPost {
  id: number; user_id: string; username: string; avatar: string | null
  content: string; created_at: string
  likes: { user_id: string }[]
  comments: { id: number }[]
}

export default function ExplorePageWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: '80px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>Cargando...</div>}>
      <ExplorePage />
    </Suspense>
  )
}

function ExplorePage() {
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [gamers, setGamers] = useState<GamerProfile[]>([])
  const [recent, setRecent] = useState<MiniPost[]>([])
  const [trending, setTrending] = useState<{ game: string; count: number }[]>([])
  const [stats, setStats] = useState({ users: 0, posts: 0, likes: 0, comments: 0 })
  const [newUsers, setNewUsers] = useState<GamerProfile[]>([])
  const [quickTags, setQuickTags] = useState<string[]>([])
  const [searchUsers, setSearchUsers] = useState<GamerProfile[]>([])
  const [searchPosts, setSearchPosts] = useState<MiniPost[]>([])
  const [searching, setSearching] = useState(false)
  const [followPending, setFollowPending] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { loadAll() }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Si hay query inicial (desde URL ?q=...), disparar búsqueda
  useEffect(() => {
    const initial = searchParams.get('q')
    if (initial?.trim()) runSearch(initial.trim())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadAll() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any

      const [{ data: profiles }, { data: posts }, folResult, privResult] = await Promise.all([
        sb.from('profiles').select('id, username, avatar, bio, games, created_at').limit(60),
        sb.from('posts').select('id, username, avatar, user_id, content, created_at, likes(user_id), comments(id)').order('created_at', { ascending: false }).limit(50),
        user?.id
          ? sb.from('follows').select('following_id').eq('follower_id', user.id)
          : Promise.resolve({ data: [] }),
        sb.from('profiles').select('id, privacy_posts').in('privacy_posts', ['followers', 'private']),
      ])

      const allProfiles: GamerProfile[] = profiles ?? []
      let allPosts: MiniPost[] = posts ?? []

      // Following
      const followingSet = new Set<string>((folResult.data ?? []).map((f: { following_id: string }) => f.following_id))
      if (user?.id) setFollowingIds(followingSet)

      // ── Filtrar posts por privacidad ──────────────────────────────────────
      const restrictedProfiles: { id: string; privacy_posts: string }[] = privResult.data ?? []
      if (restrictedProfiles.length) {
        const excludedIds = new Set(
          restrictedProfiles
            .filter(p => {
              if (p.id === user?.id) return false               // propios siempre visibles
              if (p.privacy_posts === 'private') return true    // privado → excluir
              return !followingSet.has(p.id)                    // followers → excluir si no seguís
            })
            .map(p => p.id)
        )
        if (excludedIds.size > 0) {
          allPosts = allPosts.filter((p: MiniPost & { user_id?: string }) => !excludedIds.has(p.user_id ?? ''))
        }
      }

      // Gamers destacados: ordenados por cantidad de posts
      const postCountByUser: Record<string, number> = {}
      for (const p of allPosts) postCountByUser[p.username] = (postCountByUser[p.username] ?? 0) + 1
      const featured = allProfiles
        .filter(p => p.id !== user?.id)
        .map(p => ({ ...p, score: postCountByUser[p.username] ?? 0 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
      setGamers(featured)

      // Posts recientes (ya filtrados)
      setRecent(allPosts.slice(0, 8))

      // Nuevos usuarios
      const newest = [...allProfiles]
        .filter(p => p.id !== user?.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3)
      setNewUsers(newest)

      // Trending games: menciones en posts + juegos en perfiles
      const counts: Record<string, number> = {}
      for (const p of allPosts) {
        for (const g of GAME_LIST) {
          if (p.content.toLowerCase().includes(g.toLowerCase())) counts[g] = (counts[g] ?? 0) + 2
        }
      }
      for (const p of allProfiles) {
        for (const g of (p.games ?? [])) counts[g] = (counts[g] ?? 0) + 1
      }
      if (!Object.keys(counts).length) GAME_LIST.forEach((g, i) => { counts[g] = Math.max(1, 10 - i) })
      const trendList = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([game, count]) => ({ game, count }))
      setTrending(trendList)

      // Quick tags: top juegos
      const topGames = trendList.slice(0, 8).map(t => t.game)
      setQuickTags(topGames.length ? topGames : GAME_LIST.slice(0, 6))

      // Community stats
      const totalLikes = allPosts.reduce((s, p) => s + (p.likes?.length ?? 0), 0)
      const totalCmts = allPosts.reduce((s, p) => s + (p.comments?.length ?? 0), 0)
      setStats({ users: allProfiles.length, posts: allPosts.length, likes: totalLikes, comments: totalCmts })
    } catch (e) { console.error('[Explore]', e) }
  }

  // ── Search ──────────────────────────────────────────────────────────────────
  function handleQueryChange(val: string) {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) { setSearchUsers([]); setSearchPosts([]); setSearching(false); return }
    debounceRef.current = setTimeout(() => runSearch(val.trim()), 320)
  }

  async function runSearch(term: string) {
    setSearching(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const [{ data: uRes }, { data: pRes }] = await Promise.all([
        // Buscar por username O bio (or filter)
        sb.from('profiles')
          .select('id, username, avatar, bio, games, created_at')
          .or(`username.ilike.%${term}%,bio.ilike.%${term}%`)
          .neq('id', user?.id ?? '').limit(12),
        sb.from('posts').select('id, username, avatar, user_id, content, created_at, likes(user_id), comments(id)').ilike('content', `%${term}%`).order('created_at', { ascending: false }).limit(20),
      ])

      // Filtrar posts de búsqueda por privacidad
      let filteredPosts = pRes ?? []
      if (filteredPosts.length) {
        const { data: restricted } = await sb.from('profiles').select('id, privacy_posts').in('privacy_posts', ['followers', 'private'])
        const excludedIds = new Set<string>(
          (restricted ?? [])
            .filter((p: { id: string; privacy_posts: string }) => {
              if (p.id === user?.id) return false
              if (p.privacy_posts === 'private') return true
              return !followingIds.has(p.id)
            })
            .map((p: { id: string }) => p.id)
        )
        if (excludedIds.size > 0) {
          filteredPosts = filteredPosts.filter((p: { user_id?: string }) => !excludedIds.has(p.user_id ?? ''))
        }
      }

      setSearchUsers(uRes ?? [])
      setSearchPosts(filteredPosts.slice(0, 6))
    } catch { /* empty */ }
    setSearching(false)
  }

  // ── Follow toggle ───────────────────────────────────────────────────────────
  async function toggleFollow(targetId: string) {
    if (!user || followPending.has(targetId)) return
    setFollowPending(s => new Set(s).add(targetId))
    const isFollowing = followingIds.has(targetId)
    const next = new Set(followingIds)
    if (isFollowing) {
      next.delete(targetId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId)
    } else {
      next.add(targetId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('follows').insert({ follower_id: user.id, following_id: targetId })
    }
    setFollowingIds(next)
    setFollowPending(s => { const n = new Set(s); n.delete(targetId); return n })
  }

  const isSearching = query.trim().length > 0

  // ── Styles ──────────────────────────────────────────────────────────────────
  const sectionCard = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden' as const,
  }
  const sectionHeader = {
    padding: '14px 18px',
    borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }
  const sectionTitle = {
    fontFamily: 'var(--font-display)', fontSize: '10px',
    fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '2px',
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px 40px' }}>

      {/* ── Hero search ── */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: '40px 32px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
        marginBottom: '24px',
      }}>
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(0,255,247,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,247,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 100% at 50% 0%, black, transparent)',
          maskImage: 'radial-gradient(ellipse 80% 100% at 50% 0%, black, transparent)',
        }} />
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900,
          color: 'var(--text-primary)', letterSpacing: '2px', marginBottom: '8px',
          position: 'relative',
        }}>
          Explorá <span style={{ color: 'var(--cyan)', textShadow: '0 0 24px rgba(0,255,247,0.4)' }}>Respawn</span>
        </h1>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)',
          marginBottom: '28px', position: 'relative',
        }}>
          Descubrí gamers, posts y tendencias de la comunidad
        </p>

        {/* Search bar */}
        <div style={{ display: 'flex', alignItems: 'center', maxWidth: '560px', margin: '0 auto', position: 'relative' }}>
          <input
            type="text" value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Buscar usuarios, juegos, posts..."
            style={{
              flex: 1, padding: '14px 20px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)',
              borderRight: 'none',
              color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '14px',
              outline: 'none', transition: 'border-color var(--transition)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--cyan)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          <button
            onClick={() => query.trim() && runSearch(query.trim())}
            style={{
              padding: '14px 24px',
              background: 'var(--cyan)', color: '#000',
              border: 'none', borderRadius: '0 var(--radius-lg) var(--radius-lg) 0',
              fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 900,
              letterSpacing: '1px', cursor: 'pointer',
              transition: 'all var(--transition)', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cyan-dim)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(0,255,247,0.3)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cyan)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
          >
            BUSCAR
          </button>
        </div>

        {/* Quick tags */}
        {quickTags.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '16px', position: 'relative' }}>
            {quickTags.map(tag => (
              <button key={tag} onClick={() => { setQuery(tag); runSearch(tag) }} style={{
                fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                color: 'var(--text-muted)', background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: '20px',
                padding: '4px 12px', cursor: 'pointer',
                transition: 'all var(--transition)', letterSpacing: '0.5px',
                outline: 'none',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--cyan)'; el.style.borderColor = 'var(--cyan)'; el.style.background = 'rgba(0,255,247,0.06)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-muted)'; el.style.borderColor = 'var(--border)'; el.style.background = 'var(--surface)' }}
              >
                {gameIcon(tag)} {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Search results ── */}
      {isSearching && (
        <div style={{ ...sectionCard, marginBottom: '24px' }}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>
              {searching ? 'Buscando...' : `${searchUsers.length + searchPosts.length} resultado${searchUsers.length + searchPosts.length !== 1 ? 's' : ''} para "${query}"`}
            </span>
            <button onClick={() => { setQuery(''); setSearchUsers([]); setSearchPosts([]) }} style={{
              background: 'transparent', border: 'none',
              fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)',
              cursor: 'pointer', padding: '2px 6px',
            }}>
              ✕ Limpiar
            </button>
          </div>
          <div style={{ padding: '16px 18px' }}>
            {!searching && searchUsers.length === 0 && searchPosts.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
                Sin resultados. Probá con otro nombre o juego.
              </p>
            ) : (
              <>
                {searchUsers.length > 0 && (
                  <>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '2px', marginBottom: '10px' }}>
                      USUARIOS ({searchUsers.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: searchPosts.length ? '16px' : 0 }}>
                      {searchUsers.map(u => <GamerCard key={u.id} user={u} isFollowing={followingIds.has(u.id)} pending={followPending.has(u.id)} onFollow={() => toggleFollow(u.id)} />)}
                    </div>
                  </>
                )}
                {searchPosts.length > 0 && (
                  <>
                    {searchUsers.length > 0 && <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />}
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '2px', marginBottom: '10px' }}>
                      POSTS ({searchPosts.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {searchPosts.map(p => <MiniPostCard key={p.id} post={p} onClick={() => router.push(`/post/${p.id}`)} />)}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Main grid ── */}
      {!isSearching && (
        <div className="explore-grid">

          {/* Gamers destacados */}
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <span style={sectionTitle}>👾 Gamers destacados</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                {gamers.length} gamers
              </span>
            </div>
            <div style={{ padding: '8px 18px' }}>
              {gamers.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', padding: '24px 0', textAlign: 'center' }}>No hay otros usuarios aún.</p>
              ) : gamers.map(u => (
                <GamerCard key={u.id} user={u} isFollowing={followingIds.has(u.id)} pending={followPending.has(u.id)} onFollow={() => toggleFollow(u.id)} />
              ))}
            </div>
          </div>

          {/* Posts recientes */}
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <span style={sectionTitle}>📡 Posts recientes</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--cyan)' }}>En vivo</span>
            </div>
            <div style={{ padding: '0 18px' }}>
              {recent.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', padding: '24px 0', textAlign: 'center' }}>Sin posts todavía.</p>
              ) : recent.map(p => (
                <MiniPostCard key={p.id} post={p} onClick={() => router.push(`/post/${p.id}`)} />
              ))}
            </div>
          </div>

          {/* Sidebar derecho */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Trending games */}
            <div style={sectionCard}>
              <div style={sectionHeader}>
                <span style={sectionTitle}>🔥 Juegos trending</span>
              </div>
              <div style={{ padding: '8px 18px' }}>
                {(() => {
                  const max = trending[0]?.count ?? 1
                  return trending.map((t, i) => (
                    <div key={t.game} onClick={() => { setQuery(t.game); runSearch(t.game) }} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '9px 0',
                      borderBottom: i < trending.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: i < 3 ? '14px' : '12px',
                        fontWeight: 900, color: i < 3 ? 'var(--cyan)' : 'var(--text-muted)',
                        width: '20px', textAlign: 'center', flexShrink: 0,
                      }}>{i + 1}</span>
                      <span style={{ fontSize: '22px', flexShrink: 0 }}>{gameIcon(t.game)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{t.game}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{t.count} mención{t.count !== 1 ? 'es' : ''}</div>
                      </div>
                      <div style={{ width: '52px', height: '4px', background: 'var(--surface)', borderRadius: '2px', overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{
                          height: '100%', borderRadius: '2px',
                          width: `${Math.round(t.count / max * 100)}%`,
                          background: 'linear-gradient(90deg, var(--cyan-dim), var(--purple-dim))',
                        }} />
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>

            {/* Community stats */}
            <div style={sectionCard}>
              <div style={sectionHeader}>
                <span style={sectionTitle}>📊 Comunidad</span>
              </div>
              <div style={{ padding: '4px 18px' }}>
                {[
                  ['👾 Gamers registrados', stats.users],
                  ['📝 Posts totales', stats.posts],
                  ['♥ Likes totales', stats.likes],
                  ['💬 Comentarios', stats.comments],
                  ['🕹 Juegos disponibles', '8 (más pronto)'],
                ].map(([label, value], i, arr) => (
                  <div key={String(label)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: 'var(--cyan)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nuevos usuarios */}
            {newUsers.length > 0 && (
              <div style={sectionCard}>
                <div style={sectionHeader}>
                  <span style={sectionTitle}>✨ Recién llegados</span>
                </div>
                <div style={{ padding: '8px 18px' }}>
                  {newUsers.map((u, i) => (
                    <div key={u.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '9px 0',
                      borderBottom: i < newUsers.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <Link href={`/profile/${u.username}`}>
                          <UserAvatar avatar={u.avatar} username={u.username} size={36} />
                        </Link>
                        <div style={{
                          position: 'absolute', top: '-4px', right: '-4px',
                          background: 'var(--purple)', color: '#fff',
                          fontFamily: 'var(--font-display)', fontSize: '7px', fontWeight: 900,
                          borderRadius: '20px', padding: '1px 5px',
                        }}>NEW</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link href={`/profile/${u.username}`} style={{ textDecoration: 'none' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>@{u.username}</div>
                        </Link>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.bio || 'Recién llegado a Respawn'}
                        </div>
                      </div>
                      <FollowButton isFollowing={followingIds.has(u.id)} pending={followPending.has(u.id)} onToggle={() => toggleFollow(u.id)} small />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

// ── Gamer card ────────────────────────────────────────────────────────────────
function GamerCard({ user, isFollowing, pending, onFollow }: {
  user: { id: string; username: string; avatar: string | null; bio: string | null; games: string[] | null }
  isFollowing: boolean; pending: boolean; onFollow: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '11px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Link href={`/profile/${user.username}`}>
          <UserAvatar avatar={user.avatar} username={user.username} size={46} />
        </Link>
        {/* Online dot — decorativo */}
        <div style={{
          position: 'absolute', bottom: '-2px', right: '-2px',
          width: '10px', height: '10px', borderRadius: '50%',
          background: '#4ade80', border: '2px solid var(--card)',
          boxShadow: '0 0 6px #4ade80',
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/profile/${user.username}`} style={{ textDecoration: 'none' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px', marginBottom: '2px' }}>
            @{user.username}
          </div>
        </Link>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
          {user.bio || 'Jugando en Respawn'}
        </div>
        {(user.games ?? []).length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {(user.games ?? []).slice(0, 2).map(g => (
              <span key={g} style={{
                fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700,
                color: 'var(--purple)', background: 'rgba(192,132,252,0.1)',
                border: '1px solid rgba(192,132,252,0.2)', borderRadius: '20px', padding: '1px 7px',
              }}>
                {gameIcon(g)} {g}
              </span>
            ))}
          </div>
        )}
      </div>
      <FollowButton isFollowing={isFollowing} pending={pending} onToggle={onFollow} />
    </div>
  )
}

// ── Follow button ─────────────────────────────────────────────────────────────
function FollowButton({ isFollowing, pending, onToggle, small }: {
  isFollowing: boolean; pending: boolean; onToggle: () => void; small?: boolean
}) {
  const pad = small ? '5px 10px' : '6px 14px'
  if (isFollowing) {
    return (
      <button onClick={onToggle} disabled={pending} style={{
        padding: pad, fontSize: '10px', background: 'transparent',
        border: '1px solid var(--purple-dim)', color: 'var(--purple)',
        borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-display)',
        fontWeight: 700, letterSpacing: '0.5px', cursor: 'pointer',
        transition: 'all var(--transition)', whiteSpace: 'nowrap', flexShrink: 0,
        outline: 'none',
      }}>
        {pending ? '...' : 'Siguiendo'}
      </button>
    )
  }
  return (
    <button onClick={onToggle} disabled={pending} style={{
      padding: pad, fontSize: '10px',
      background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)',
      color: 'var(--cyan)', borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.5px',
      cursor: 'pointer', transition: 'all var(--transition)', whiteSpace: 'nowrap', flexShrink: 0,
      outline: 'none',
    }}>
      {pending ? '...' : 'Seguir'}
    </button>
  )
}

// ── Mini post card ────────────────────────────────────────────────────────────
function MiniPostCard({ post, onClick }: { post: MiniPost; onClick: () => void }) {
  const date = new Date(post.created_at).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  return (
    <div onClick={onClick} style={{
      padding: '13px 0', borderBottom: '1px solid var(--border)',
      cursor: 'pointer', transition: 'opacity var(--transition)',
    }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <UserAvatar avatar={post.avatar} username={post.username} size={28} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
          @{post.username}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {date}
        </span>
      </div>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)',
        lineHeight: 1.45, marginBottom: '6px',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
      }}>
        {post.content}
      </p>
      <div style={{ display: 'flex', gap: '14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
        <span>♥ {post.likes?.length ?? 0}</span>
        <span>💬 {post.comments?.length ?? 0}</span>
      </div>
    </div>
  )
}
