'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TickerItem {
  id: string
  icon: string
  text: string
  color: string
}

const SEPARATOR = '   ·   '

// Fallback items para cuando no hay actividad real
const FALLBACK: TickerItem[] = [
  { id: 'f1', icon: '🎮', text: 'Bienvenido a Respawn Social', color: 'var(--cyan)' },
  { id: 'f2', icon: '🏆', text: 'Los torneos ya están abiertos — inscribite ahora', color: 'var(--purple)' },
  { id: 'f3', icon: '🔎', text: 'Usá LFG para encontrar equipo', color: 'var(--purple)' },
  { id: 'f4', icon: '🕹️', text: 'Jugá en el Arcade y subí de nivel', color: 'var(--cyan)' },
  { id: 'f5', icon: '⚡', text: 'El lugar donde siempre volvés', color: 'var(--pink)' },
]

export function LiveTicker() {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK)
  const [ready, setReady] = useState(false)
  const animRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchActivity()
    const interval = setInterval(fetchActivity, 45_000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchActivity() {
    const supabase = createClient()
    const fresh: TickerItem[] = []

    try {
      // Perfiles con "now playing"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: playing } = await (supabase as any)
        .from('profiles')
        .select('username, now_playing')
        .not('now_playing', 'is', null)
        .limit(6)
      for (const p of (playing ?? [])) {
        if (p.now_playing)
          fresh.push({ id: `play-${p.username}`, icon: '🎮', text: `@${p.username} jugando ${p.now_playing}`, color: '#4ade80' })
      }

      // Posts recientes (priorizando LFG)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: posts } = await (supabase as any)
        .from('posts')
        .select('id, username, post_type, lfg_game, lfg_platform')
        .order('created_at', { ascending: false })
        .limit(12)
      for (const p of (posts ?? [])) {
        if (p.post_type === 'lfg' && p.lfg_game) {
          fresh.push({
            id: `lfg-${p.id}`, icon: '🔎',
            text: `@${p.username} busca equipo para ${p.lfg_game}${p.lfg_platform ? ` (${p.lfg_platform})` : ''}`,
            color: 'var(--purple)',
          })
        } else {
          fresh.push({ id: `post-${p.id}`, icon: '📝', text: `@${p.username} publicó algo nuevo`, color: 'var(--text-secondary)' })
        }
      }

      // Follows recientes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: follows } = await (supabase as any)
        .from('follows')
        .select('follower_id, following_id, created_at')
        .order('created_at', { ascending: false })
        .limit(6)
      if ((follows ?? []).length > 0) {
        const ids = [...new Set<string>([
          ...(follows as { follower_id: string; following_id: string }[]).map(f => f.follower_id),
          ...(follows as { follower_id: string; following_id: string }[]).map(f => f.following_id),
        ])]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profiles } = await (supabase as any).from('profiles').select('id, username').in('id', ids)
        const umap = new Map<string, string>((profiles ?? []).map((p: { id: string; username: string }) => [p.id, p.username]))
        for (const f of (follows ?? []) as { follower_id: string; following_id: string }[]) {
          const from = umap.get(f.follower_id)
          const to = umap.get(f.following_id)
          if (from && to)
            fresh.push({ id: `follow-${f.follower_id}-${f.following_id}`, icon: '👥', text: `@${from} ahora sigue a @${to}`, color: 'var(--cyan)' })
        }
      }

      // Torneos recientes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tp } = await (supabase as any)
        .from('tournament_players')
        .select('user_id, tournament_id, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
      if ((tp ?? []).length > 0) {
        const userIds = (tp as { user_id: string }[]).map(t => t.user_id)
        const tIds = (tp as { tournament_id: string }[]).map(t => t.tournament_id)
        const [{ data: tUsers }, { data: tournaments }] = await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('profiles').select('id, username').in('id', userIds),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('tournaments').select('id, name').in('id', tIds),
        ])
        const umap = new Map<string, string>((tUsers ?? []).map((p: { id: string; username: string }) => [p.id, p.username]))
        const tmap = new Map<string, string>((tournaments ?? []).map((t: { id: string; name: string }) => [String(t.id), t.name]))
        for (const t of (tp as { user_id: string; tournament_id: string }[])) {
          const uname = umap.get(t.user_id)
          const tname = tmap.get(String(t.tournament_id))
          if (uname && tname)
            fresh.push({ id: `tp-${t.user_id}-${t.tournament_id}`, icon: '🏆', text: `@${uname} se unió al torneo ${tname}`, color: 'var(--pink)' })
        }
      }
    } catch (e) {
      console.error('[LiveTicker]', e)
    }

    const result = fresh.length >= 4 ? fresh : FALLBACK
    setItems(result)
    setReady(true)
  }

  // Velocidad del ticker: px/s
  const SPEED = 60
  // Necesitamos medir el ancho del contenido para calcular duración correctamente
  // Duplicamos el arreglo para seamless loop: [items, items]
  const doubleItems = [...items, ...items]
  // Duración estimada: 35s para ~20 items
  const duration = Math.max(20, items.length * 3.5)

  if (!ready) return null

  return (
    <div style={{
      position: 'relative',
      height: '36px',
      background: 'linear-gradient(90deg, var(--deep) 0%, var(--void) 50%, var(--deep) 100%)',
      borderBottom: '1px solid var(--border)',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
      zIndex: 10,
    }}>
      {/* Glow line superior */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,247,0.4) 50%, transparent 100%)',
      }} />

      {/* Badge EN VIVO — fixed a la izquierda */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '0 14px',
        borderRight: '1px solid var(--border)',
        height: '100%',
        background: 'var(--deep)',
        flexShrink: 0,
        zIndex: 2,
      }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'var(--pink)',
          boxShadow: '0 0 8px var(--pink)',
          animation: 'pulse-dot 1.2s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '9px',
          fontWeight: 800,
          letterSpacing: '2px',
          color: 'var(--pink)',
          whiteSpace: 'nowrap',
        }}>
          EN VIVO
        </span>
      </div>

      {/* Fade mask izquierda */}
      <div style={{
        position: 'absolute', left: '98px', top: 0, width: '32px', height: '100%',
        background: 'linear-gradient(90deg, var(--deep), transparent)',
        zIndex: 1, pointerEvents: 'none',
      }} />

      {/* Scrolling content */}
      <div
        ref={animRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          animation: `ticker-scroll ${duration}s linear infinite`,
          willChange: 'transform',
        }}
      >
        {doubleItems.map((item, idx) => (
          <span key={`${item.id}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '12px' }}>{item.icon}</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: item.color,
              letterSpacing: '0.3px',
            }}>
              {item.text}
            </span>
            <span style={{
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              margin: '0 12px',
            }}>
              {SEPARATOR}
            </span>
          </span>
        ))}
      </div>

      {/* Fade mask derecha */}
      <div style={{
        position: 'absolute', right: 0, top: 0, width: '48px', height: '100%',
        background: 'linear-gradient(270deg, var(--deep), transparent)',
        zIndex: 1, pointerEvents: 'none',
      }} />
    </div>
  )
}
