'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { GAMES } from '@/lib/games/types'

type Period = 'hoy' | 'semana' | 'todo'

interface ScoreRow {
  id: number
  user_id: string
  game_id: string
  score: number
  created_at: string
  profiles: {
    username: string
    avatar: string | null
    photo_url?: string | null
  }
}

export default function LeaderboardPage() {
  const supabase = createClient()

  const [gameId, setGameId] = useState('snake')
  const [period, setPeriod] = useState<Period>('todo')
  const [rows, setRows] = useState<ScoreRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      let from: string | undefined
      const now = new Date()
      if (period === 'hoy') {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      } else if (period === 'semana') {
        const d = new Date(now)
        d.setDate(d.getDate() - 7)
        from = d.toISOString()
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from('game_scores')
        .select('id, user_id, game_id, score, created_at, profiles(username, avatar, photo_url)')
        .eq('game_id', gameId)
        .order('score', { ascending: false })
        .limit(50)

      if (from) q = q.gte('created_at', from)

      const { data } = await q
      setRows(data ?? [])
      setLoading(false)
    }
    load()
  }, [gameId, period])

  const currentGame = GAMES.find((g) => g.id === gameId)

  const tabBtn = (val: string, current: string, label: string) => ({
    background: val === current ? 'var(--cyan-glow)' : 'transparent',
    border: `1px solid ${val === current ? 'var(--cyan-border)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-md)',
    color: val === current ? 'var(--cyan)' : 'var(--text-muted)',
    fontFamily: 'var(--font-mono)' as const,
    fontSize: '11px' as const,
    padding: '5px 12px',
    cursor: 'pointer' as const,
  })

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Link href="/arcade" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '18px' }}>
          ←
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', letterSpacing: '3px', color: 'var(--text-muted)', fontWeight: 700, margin: 0 }}>
          RANKINGS
        </h1>
      </div>

      {/* Game selector */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {GAMES.map((g) => (
          <button key={g.id} onClick={() => setGameId(g.id)} style={tabBtn(g.id, gameId, g.name)}>
            {g.emoji} {g.name}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {(['hoy', 'semana', 'todo'] as Period[]).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} style={tabBtn(p, period, p)}>
            {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Histórico'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      }}>
        {/* Game header */}
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '20px' }}>{currentGame?.emoji}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: currentGame?.color ?? 'var(--cyan)', letterSpacing: '1px' }}>
            {currentGame?.name.toUpperCase()}
          </span>
        </div>

        {loading ? (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
            Cargando...
          </p>
        ) : rows.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
            Sin scores todavía. ¡Sé el primero!
          </p>
        ) : (
          rows.map((row, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
            return (
              <div key={row.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
                background: i < 3 ? `${currentGame?.color ?? '#00FFF7'}08` : 'transparent',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)', width: '28px', textAlign: 'center', flexShrink: 0 }}>
                  {medal ?? `${i + 1}`}
                </span>
                <UserAvatar avatar={row.profiles?.avatar ?? null} photoUrl={row.profiles?.photo_url} username={row.profiles?.username ?? '?'} size={32} />
                <Link href={`/profile/${row.profiles?.username}`} style={{ flex: 1, textDecoration: 'none' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    @{row.profiles?.username}
                  </span>
                </Link>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: currentGame?.color ?? 'var(--cyan)', flexShrink: 0 }}>
                  {row.score.toLocaleString('es-AR')}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
