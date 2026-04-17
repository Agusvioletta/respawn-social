'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import type { GameDef } from '@/lib/games/types'
import { GAMES } from '@/lib/games/types'

const WIN_THRESHOLDS: Record<string, number> = {
  snake: 100, pong: 100, breakout: 200, asteroids: 500,
  flappy: 100, tetris: 300, dino: 200, spaceinvaders: 300,
}

export type GameState = 'idle' | 'playing' | 'gameover'

export interface GameEngineControls {
  cleanup: () => void
  pause:   () => void
  resume:  () => void
}

export interface GameEngine {
  init: (canvas: HTMLCanvasElement, onScore: (s: number) => void, onGameOver: (s: number, won?: boolean) => void) => GameEngineControls
}

interface GameCanvasProps {
  game: GameDef
  engine: GameEngine
  width?: number
  height?: number
}

// ── Tipos de control por juego ────────────────────────────────────────────────
type ControlType = 'dpad4' | 'v2' | 'h2' | 'asteroids' | 'shooter' | 'duck_only' | 'none'

const CONTROL_TYPES: Record<string, ControlType> = {
  snake:         'dpad4',
  tetris:        'dpad4',
  pong:          'v2',
  breakout:      'h2',
  asteroids:     'asteroids',
  flappy:        'none',       // tap canvas ya funciona
  dino:          'duck_only',  // tap canvas = saltar, solo agregar agachar
  spaceinvaders: 'shooter',
}

// ── Despachar evento de teclado sintético ─────────────────────────────────────
function fireKey(key: string, type: 'keydown' | 'keyup' = 'keydown') {
  window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }))
}

// ── Botón táctil individual ───────────────────────────────────────────────────
interface TBtnProps {
  label: string
  keyCode: string
  color: string
  size?: number
  held?: boolean        // si true, envía keyup al soltar
  fontSize?: number
}

function TBtn({ label, keyCode, color, size = 56, held = true, fontSize = 20 }: TBtnProps) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); fireKey(keyCode, 'keydown') }}
      onPointerUp={held ? (e) => { e.preventDefault(); fireKey(keyCode, 'keyup') } : undefined}
      onPointerLeave={held ? (e) => { e.preventDefault(); fireKey(keyCode, 'keyup') } : undefined}
      onPointerCancel={held ? (e) => { e.preventDefault(); fireKey(keyCode, 'keyup') } : undefined}
      style={{
        width: size, height: size, borderRadius: '12px',
        background: `rgba(${hexToRgb(color)},0.12)`,
        border: `2px solid ${color}55`,
        color, fontSize, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        userSelect: 'none', WebkitUserSelect: 'none',
        touchAction: 'none',
        transition: 'background 0.1s, border-color 0.1s',
        outline: 'none',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
      }}
      onContextMenu={e => e.preventDefault()}
    >
      {label}
    </button>
  )
}

// ── D-pad 4 direcciones ───────────────────────────────────────────────────────
function DPad4({ color, gameId }: { color: string; gameId: string }) {
  const isTetris = gameId === 'tetris'
  const cell = { width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' } as const
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '60px 60px 60px', gridTemplateRows: '60px 60px 60px', gap: '4px' }}>
      <div style={cell} />
      <div style={cell}><TBtn label="▲" keyCode="ArrowUp" color={color} held={!isTetris} size={56} /></div>
      {isTetris && <div style={cell}><TBtn label="⤓" keyCode=" " color={color} held={false} size={56} fontSize={20} /></div>}
      {!isTetris && <div style={cell} />}
      <div style={cell}><TBtn label="◀" keyCode="ArrowLeft" color={color} held={!isTetris} size={56} /></div>
      <div style={{ ...cell, opacity: 0.15 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: color }} />
      </div>
      <div style={cell}><TBtn label="▶" keyCode="ArrowRight" color={color} held={!isTetris} size={56} /></div>
      <div style={cell} />
      <div style={cell}><TBtn label="▼" keyCode="ArrowDown" color={color} held={!isTetris} size={56} /></div>
      <div style={cell} />
    </div>
  )
}

// ── Controles por tipo ────────────────────────────────────────────────────────
function TouchControls({ game, state }: { game: GameDef; state: GameState }) {
  if (state !== 'playing') return null
  const type = CONTROL_TYPES[game.id] ?? 'none'
  const c = game.color

  if (type === 'none') return null

  return (
    <div
      style={{
        marginTop: '12px', display: 'flex', justifyContent: 'center',
        alignItems: 'center', gap: '16px', padding: '8px',
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
      onContextMenu={e => e.preventDefault()}
    >

      {/* ── D-pad 4 (snake, tetris) ── */}
      {type === 'dpad4' && <DPad4 color={c} gameId={game.id} />}

      {/* ── Solo vertical (pong) ── */}
      {type === 'v2' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <TBtn label="▲" keyCode="ArrowUp"   color={c} size={70} fontSize={24} />
          <TBtn label="▼" keyCode="ArrowDown" color={c} size={70} fontSize={24} />
        </div>
      )}

      {/* ── Solo horizontal (breakout) ── */}
      {type === 'h2' && (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <TBtn label="◀" keyCode="ArrowLeft"  color={c} size={70} fontSize={24} />
          <TBtn label="▶" keyCode="ArrowRight" color={c} size={70} fontSize={24} />
        </div>
      )}

      {/* ── Asteroids: rotar + empuje + fuego ── */}
      {type === 'asteroids' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 60px 60px', gridTemplateRows: '60px 60px', gap: '4px' }}>
            <TBtn label="↺" keyCode="ArrowLeft"  color={c} size={56} fontSize={18} />
            <TBtn label="▲" keyCode="ArrowUp"    color={c} size={56} />
            <TBtn label="↻" keyCode="ArrowRight" color={c} size={56} fontSize={18} />
            <div style={{ width: 56, height: 56 }} />
            <div style={{ width: 56, height: 56 }} />
            <div style={{ width: 56, height: 56 }} />
          </div>
          <TBtn label="🔥" keyCode=" " color={c} size={70} fontSize={22} held={false} />
        </div>
      )}

      {/* ── Space Invaders: horizontal + fuego ── */}
      {type === 'shooter' && (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <TBtn label="◀" keyCode="ArrowLeft"  color={c} size={64} fontSize={22} />
          <TBtn label="🔥" keyCode=" " color={c} size={64} fontSize={20} held={false} />
          <TBtn label="▶" keyCode="ArrowRight" color={c} size={64} fontSize={22} />
        </div>
      )}

      {/* ── Dino: solo agachar (saltar = tap canvas) ── */}
      {type === 'duck_only' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>
            TAP = saltar
          </div>
          <TBtn label="▼ agachar" keyCode="ArrowDown" color={c} size={56} fontSize={12} />
        </div>
      )}

    </div>
  )
}

// ── Util ──────────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  if (isNaN(r)) return '128,128,128'
  return `${r},${g},${b}`
}

// ── GameCanvas ────────────────────────────────────────────────────────────────
export function GameCanvas({ game, engine, width = 480, height = 480 }: GameCanvasProps) {
  const user    = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const supabase = createClient()

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const controlsRef  = useRef<GameEngineControls | null>(null)

  const [state,      setState]      = useState<GameState>('idle')
  const [score,      setScore]      = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [bestScore,  setBestScore]  = useState<number | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [won,        setWon]        = useState(false)
  const [paused,     setPaused]     = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    setIsTouchDevice(
      window.matchMedia('(pointer: coarse)').matches ||
      ('ontouchstart' in window)
    )
  }, [])

  useEffect(() => {
    if (!user) return
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('game_scores').select('score')
        .eq('user_id', user!.id).eq('game_id', game.id)
        .order('score', { ascending: false }).limit(1).maybeSingle()
      if (data) setBestScore(data.score)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, game.id])

  const handleGameOver = useCallback(async (s: number, didWin?: boolean) => {
    setState('gameover')
    setWon(!!didWin)
    setFinalScore(s)
    if (!user) return
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('game_scores').insert({ user_id: user.id, game_id: game.id, score: s })
      if (bestScore === null || s > bestScore) setBestScore(s)
    } catch (e) { console.error('Error guardando score:', e) }
    try {
      const threshold = WIN_THRESHOLDS[game.id] ?? 100
      if (s >= threshold && game.minLevel === user.max_level && user.max_level < 8) {
        const newLevel = user.max_level + 1
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from('profiles').update({ max_level: newLevel }).eq('id', user.id)
        if (!error) setUser({ ...user, max_level: newLevel })
      }
    } catch (e) { console.error('Error desbloqueando nivel:', e) }
    setSaving(false)
  }, [user, game.id, game.minLevel, bestScore, supabase, setUser])

  function startGame() {
    if (!canvasRef.current) return
    controlsRef.current?.cleanup()
    setScore(0)
    setWon(false)
    setPaused(false)
    setState('playing')
    controlsRef.current = engine.init(canvasRef.current, (s) => setScore(s), handleGameOver)
  }

  function stopGame() {
    controlsRef.current?.cleanup()
    controlsRef.current = null
    handleGameOver(score, false)
  }

  function togglePause() {
    if (!controlsRef.current) return
    if (paused) {
      controlsRef.current.resume()
      setPaused(false)
    } else {
      controlsRef.current.pause()
      setPaused(true)
    }
  }

  useEffect(() => () => { controlsRef.current?.cleanup() }, [])

  // Juego siguiente (para mostrar qué se desbloquea)
  const nextGame = GAMES.find(g => g.minLevel === game.minLevel + 1)
  const threshold = WIN_THRESHOLDS[game.id] ?? 100

  const controlType  = CONTROL_TYPES[game.id] ?? 'none'
  const hasTouchCtrl = controlType !== 'none' && isTouchDevice

  // Hint de controles según plataforma
  const hintText: Record<ControlType, string> = {
    dpad4:     game.id === 'tetris' ? '← → mover  ▲ rotar  ▼ bajar' : '← ↑ → ↓  o  WASD',
    v2:        '↑ / ↓  o  W / S',
    h2:        '← →  o  A / D',
    asteroids: '← → rotar  ↑ empuje  Espacio disparar',
    shooter:   '← → moverse  Espacio disparar',
    duck_only: 'Espacio / ↑ saltar  ↓ agachar',
    none:      'Espacio o tap para saltar',
  }

  return (
    <div style={{ maxWidth: `${width + 32}px`, margin: '0 auto', padding: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <Link href="/arcade" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '18px' }}>←</Link>
        <span style={{ fontSize: '22px' }}>{game.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '2px', color: game.color, fontWeight: 700, margin: 0 }}>
            {game.name.toUpperCase()}
          </h1>
          {/* Unlock info */}
          {nextGame ? (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', margin: '2px 0 0', letterSpacing: '0.3px' }}>
              🔓 {threshold} pts → desbloquea {nextGame.emoji} {nextGame.name}
            </p>
          ) : (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {game.description}
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>SCORE</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: game.color, lineHeight: 1 }}>
              {score.toLocaleString('es-AR')}
            </div>
          </div>
          {/* Pause + Stop buttons — solo durante partida */}
          {state === 'playing' && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={togglePause} style={{
                background: paused ? 'rgba(0,255,247,0.1)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${paused ? 'rgba(0,255,247,0.4)' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 'var(--radius-sm)', color: paused ? 'var(--cyan)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700,
                letterSpacing: '1px', padding: '4px 10px', cursor: 'pointer', outline: 'none',
              }}>
                {paused ? '▶ REANUDAR' : '⏸ PAUSAR'}
              </button>
              <button onClick={stopGame} style={{
                background: 'rgba(255,79,123,0.1)', border: '1px solid rgba(255,79,123,0.3)',
                borderRadius: 'var(--radius-sm)', color: 'var(--pink)',
                fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700,
                letterSpacing: '1px', padding: '4px 10px', cursor: 'pointer', outline: 'none',
              }}>
                ■ GUARDAR Y SALIR
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            display: 'block', width: '100%', height: 'auto',
            border: `1px solid ${game.color}44`, borderRadius: 'var(--radius-lg)',
            boxShadow: `0 0 24px ${game.color}22`, background: 'var(--void)',
            imageRendering: 'pixelated', touchAction: 'none',
          }}
        />

        {/* Overlay: idle */}
        {state === 'idle' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(7,7,15,0.85)', borderRadius: 'var(--radius-lg)', gap: '16px',
          }}>
            <span style={{ fontSize: '48px' }}>{game.emoji}</span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, color: game.color, letterSpacing: '2px' }}>
              {game.name.toUpperCase()}
            </div>
            {bestScore !== null && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                Tu mejor: <span style={{ color: game.color }}>{bestScore.toLocaleString('es-AR')}</span>
              </div>
            )}
            {/* Unlock info en idle */}
            {nextGame && (
              <div style={{
                background: `${game.color}11`, border: `1px solid ${game.color}33`,
                borderRadius: 'var(--radius-sm)', padding: '6px 14px',
                fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)',
                textAlign: 'center',
              }}>
                🔓 Llegá a <span style={{ color: game.color, fontWeight: 700 }}>{threshold} pts</span> para desbloquear {nextGame.emoji} {nextGame.name}
              </div>
            )}
            <button onClick={startGame} style={{
              background: `${game.color}22`, border: `1px solid ${game.color}66`,
              borderRadius: 'var(--radius-md)', color: game.color,
              fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
              letterSpacing: '2px', padding: '10px 28px', cursor: 'pointer', outline: 'none',
            }}>
              JUGAR
            </button>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: '0 16px' }}>
              {hintText[controlType]}
            </p>
          </div>
        )}

        {/* Overlay: game over */}
        {state === 'gameover' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(7,7,15,0.9)', borderRadius: 'var(--radius-lg)', gap: '14px',
          }}>
            {won ? (
              <>
                <span style={{ fontSize: '36px' }}>🏆</span>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, color: 'var(--cyan)', letterSpacing: '2px' }}>
                  ¡VICTORIA!
                </div>
              </>
            ) : (
              <>
                <span style={{ fontSize: '36px' }}>💀</span>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, color: 'var(--pink)', letterSpacing: '2px' }}>
                  GAME OVER
                </div>
              </>
            )}
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
            {/* Unlock feedback en gameover */}
            {nextGame && !saving && (
              won && finalScore >= threshold ? (
                <div style={{
                  background: 'rgba(0,255,247,0.08)', border: '1px solid rgba(0,255,247,0.3)',
                  borderRadius: 'var(--radius-sm)', padding: '6px 14px',
                  fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cyan)',
                  textAlign: 'center',
                }}>
                  🎉 ¡Desbloqueaste {nextGame.emoji} {nextGame.name}!
                </div>
              ) : finalScore < threshold ? (
                <div style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '6px 14px',
                  fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)',
                  textAlign: 'center',
                }}>
                  🔓 Necesitás <span style={{ color: game.color }}>{threshold} pts</span> para desbloquear {nextGame.emoji} {nextGame.name}
                </div>
              ) : null
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={startGame} style={{
                background: `${game.color}22`, border: `1px solid ${game.color}66`,
                borderRadius: 'var(--radius-md)', color: game.color,
                fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
                letterSpacing: '2px', padding: '8px 24px', cursor: 'pointer', outline: 'none',
              }}>
                REINTENTAR
              </button>
              <Link href="/arcade/leaderboard">
                <button style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  padding: '8px 16px', cursor: 'pointer', outline: 'none',
                }}>
                  Rankings
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Overlay: pausa */}
        {state === 'playing' && paused && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(7,7,15,0.8)', borderRadius: 'var(--radius-lg)', gap: '16px',
            backdropFilter: 'blur(2px)',
          }}>
            <span style={{ fontSize: '40px' }}>⏸</span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--cyan)', letterSpacing: '3px' }}>
              PAUSA
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
              Score: <span style={{ color: game.color }}>{score.toLocaleString('es-AR')}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={togglePause} style={{
                background: 'rgba(0,255,247,0.15)', border: '1px solid rgba(0,255,247,0.4)',
                borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
                fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
                letterSpacing: '2px', padding: '10px 24px', cursor: 'pointer', outline: 'none',
              }}>
                ▶ REANUDAR
              </button>
              <button onClick={stopGame} style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)', fontSize: '11px',
                padding: '10px 16px', cursor: 'pointer', outline: 'none',
              }}>
                Guardar y salir
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Controles táctiles (solo en dispositivos táctiles) ── */}
      {hasTouchCtrl && <TouchControls game={game} state={state} />}

      {/* Hint desktop (solo en playing + hay controles para ese juego) */}
      {controlType !== 'none' && state === 'playing' && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px', letterSpacing: '0.5px' }}>
          desktop: {hintText[controlType]}
        </p>
      )}
    </div>
  )
}
