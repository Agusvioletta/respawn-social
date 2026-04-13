'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { GAMES } from '@/lib/games/types'

interface BestScore {
  game_id: string
  score: number
}

export default function ArcadePage() {
  const user = useAuthStore((s) => s.user)
  const supabase = createClient()
  const maxLevel = user?.max_level ?? 1

  const [bestScores, setBestScores] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('game_scores')
        .select('game_id, score')
        .eq('user_id', user!.id)
        .order('score', { ascending: false })

      if (data) {
        const map: Record<string, number> = {}
        for (const row of data as BestScore[]) {
          if (!map[row.game_id] || row.score > map[row.game_id]) {
            map[row.game_id] = row.score
          }
        }
        setBestScores(map)
      }
      setLoading(false)
    }
    load()
  }, [user])

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', letterSpacing: '3px', color: 'var(--text-muted)', fontWeight: 700, margin: 0 }}>
            ARCADE
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Nivel {maxLevel} desbloqueado — {GAMES.filter(g => g.minLevel <= maxLevel).length}/{GAMES.length} juegos
          </p>
        </div>
        <Link href="/arcade/leaderboard" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)',
            borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            padding: '6px 14px', cursor: 'pointer',
          }}>
            🏆 Rankings
          </button>
        </Link>
      </div>

      {/* XP progress bar for max_level */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '12px 16px',
        marginBottom: '24px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
          PROGRESIÓN
        </span>
        <div style={{ flex: 1, height: '6px', background: 'var(--surface)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(maxLevel / 8) * 100}%`,
            background: 'linear-gradient(90deg, var(--cyan), var(--purple))',
            borderRadius: '3px',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--cyan)', flexShrink: 0 }}>
          {maxLevel}/8
        </span>
      </div>

      {/* Game grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '12px',
      }}>
        {GAMES.map((game) => {
          const unlocked = game.minLevel <= maxLevel
          const best = bestScores[game.id]

          return (
            <div key={game.id} style={{ position: 'relative' }}>
              {unlocked ? (
                <Link href={`/arcade/${game.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'var(--card)', border: `1px solid var(--border)`,
                    borderRadius: 'var(--radius-lg)', padding: '20px',
                    cursor: 'pointer', transition: 'all var(--transition)',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                  }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = game.color
                      e.currentTarget.style.boxShadow = `0 0 16px ${game.color}22`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '28px' }}>{game.emoji}</span>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: game.color, letterSpacing: '1px' }}>
                          {game.name.toUpperCase()}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>
                          Nivel {game.minLevel}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {game.description}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                        {loading ? '...' : best ? `🏅 ${best.toLocaleString('es-AR')} pts` : 'Sin score'}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: game.color }}>
                        JUGAR →
                      </span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', padding: '20px',
                  opacity: 0.4, display: 'flex', flexDirection: 'column', gap: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '28px', filter: 'grayscale(1)' }}>{game.emoji}</span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                        {game.name.toUpperCase()}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>
                        🔒 Requiere nivel {game.minLevel}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    {game.description}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
