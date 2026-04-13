'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import type { GameDef } from '@/lib/games/types'

// Puntos mínimos para desbloquear el siguiente nivel en cada juego
const WIN_THRESHOLDS: Record<string, number> = {
  snake: 100, pong: 100, breakout: 200, asteroids: 500,
  flappy: 100, tetris: 300, dino: 200, spaceinvaders: 300,
}

export type GameState = 'idle' | 'playing' | 'gameover'

export interface GameEngine {
  /** Called once when the game starts. Return cleanup fn. */
  init: (canvas: HTMLCanvasElement, onScore: (s: number) => void, onGameOver: (s: number) => void) => () => void
}

interface GameCanvasProps {
  game: GameDef
  engine: GameEngine
  width?: number
  height?: number
}

export function GameCanvas({ game, engine, width = 480, height = 480 }: GameCanvasProps) {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const supabase = createClient()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const [state, setState] = useState<GameState>('idle')
  const [score, setScore] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [bestScore, setBestScore] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // Load personal best
  useEffect(() => {
    if (!user) return
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('game_scores')
        .select('score')
        .eq('user_id', user!.id)
        .eq('game_id', game.id)
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) setBestScore(data.score)
    }
    load()
  }, [user, game.id])

  const handleGameOver = useCallback(async (s: number) => {
    setState('gameover')
    setFinalScore(s)
    if (!user) return

    setSaving(true)

    // 1. Guardar score (independiente del level unlock)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('game_scores')
        .insert({ user_id: user.id, game_id: game.id, score: s })
      if (bestScore === null || s > bestScore) setBestScore(s)
    } catch (e) {
      console.error('Error guardando score:', e)
    }

    // 2. Desbloquear siguiente nivel si corresponde (try independiente)
    try {
      const threshold = WIN_THRESHOLDS[game.id] ?? 100
      const shouldUnlock = s >= threshold && game.minLevel <= user.max_level && user.max_level < 8
      if (shouldUnlock) {
        const newLevel = user.max_level + 1
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('profiles')
          .update({ max_level: newLevel })
          .eq('id', user.id)
        if (!error) {
          // Actualizar el store para que se refleje sin recargar
          setUser({ ...user, max_level: newLevel })
        }
      }
    } catch (e) {
      console.error('Error desbloqueando nivel:', e)
    }

    setSaving(false)
  }, [user, game.id, game.minLevel, bestScore, supabase, setUser])

  function startGame() {
    if (!canvasRef.current) return
    cleanupRef.current?.()
    setScore(0)
    setState('playing')
    cleanupRef.current = engine.init(
      canvasRef.current,
      (s) => setScore(s),
      handleGameOver,
    )
  }

  // Cleanup on unmount
  useEffect(() => () => { cleanupRef.current?.() }, [])

  return (
    <div style={{ maxWidth: `${width + 32}px`, margin: '0 auto', padding: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <Link href="/arcade" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '18px' }}>
          ←
        </Link>
        <span style={{ fontSize: '22px' }}>{game.emoji}</span>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '2px', color: game.color, fontWeight: 700, margin: 0 }}>
            {game.name.toUpperCase()}
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>
            {game.description}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>SCORE</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: game.color }}>
            {score.toLocaleString('es-AR')}
          </div>
        </div>
      </div>

      {/* Canvas container */}
      <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            border: `1px solid ${game.color}44`,
            borderRadius: 'var(--radius-lg)',
            boxShadow: `0 0 24px ${game.color}22`,
            background: 'var(--void)',
            imageRendering: 'pixelated',
          }}
        />

        {/* Overlay: idle */}
        {state === 'idle' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(7,7,15,0.85)', borderRadius: 'var(--radius-lg)', gap: '16px',
          }}>
            <span style={{ fontSize: '48px' }}>{game.emoji}</span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, color: game.color, letterSpacing: '2px' }}>
              {game.name.toUpperCase()}
            </div>
            {bestScore !== null && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                Tu mejor score: <span style={{ color: game.color }}>{bestScore.toLocaleString('es-AR')}</span>
              </div>
            )}
            <button onClick={startGame} style={{
              background: `${game.color}22`, border: `1px solid ${game.color}66`,
              borderRadius: 'var(--radius-md)', color: game.color,
              fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
              letterSpacing: '2px', padding: '10px 28px', cursor: 'pointer',
            }}>
              JUGAR
            </button>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>
              Usá las flechas o WASD para moverte
            </p>
          </div>
        )}

        {/* Overlay: game over */}
        {state === 'gameover' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(7,7,15,0.9)', borderRadius: 'var(--radius-lg)', gap: '14px',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, color: 'var(--pink)', letterSpacing: '2px' }}>
              GAME OVER
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
              Score: <span style={{ color: game.color, fontWeight: 700 }}>{finalScore.toLocaleString('es-AR')}</span>
            </div>
            {bestScore !== null && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                Mejor: <span style={{ color: game.color }}>{bestScore.toLocaleString('es-AR')}</span>
                {finalScore >= bestScore && finalScore > 0 && (
                  <span style={{ color: 'var(--cyan)', marginLeft: '8px' }}>¡Nuevo récord! 🎉</span>
                )}
              </div>
            )}
            {saving && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                Guardando score...
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={startGame} style={{
                background: `${game.color}22`, border: `1px solid ${game.color}66`,
                borderRadius: 'var(--radius-md)', color: game.color,
                fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
                letterSpacing: '2px', padding: '8px 24px', cursor: 'pointer',
              }}>
                REINTENTAR
              </button>
              <Link href="/arcade/leaderboard">
                <button style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  padding: '8px 16px', cursor: 'pointer',
                }}>
                  Rankings
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
