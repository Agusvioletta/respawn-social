'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'

// ── Types ─────────────────────────────────────────────────────────────────────
interface TPlayer {
  user_id: string
  seed?: number
  profiles: { username: string; avatar: string | null; photo_url?: string | null }
}

interface BracketMatch {
  id: string          // e.g. "r0-m0"
  round: number
  matchIndex: number
  p1: TPlayer | null
  p2: TPlayer | null
  winnerId: string | null
}

// winnerId per match — stored as { [matchId]: userId }
type BracketState = Record<string, string>

interface Tournament {
  id: number
  creator_id: string
  name: string
  game: string
  format: string
  max_players: number
  prize: string | null
  description: string | null
  date: string | null
  status: 'upcoming' | 'live' | 'finished'
  bracket_state?: BracketState | null
  tournament_players: TPlayer[]
}

// ── Bracket helpers ───────────────────────────────────────────────────────────
function buildBracket(players: TPlayer[], saved: BracketState = {}): BracketMatch[][] {
  // Potencia de 2 más cercana ≥ players.length
  const size = Math.max(2, Math.pow(2, Math.ceil(Math.log2(Math.max(2, players.length)))))
  const slots = Array.from({ length: size }, (_, i) => players[i] ?? null)

  // Seeding estilo torneo: 1 vs last, 2 vs second-last, etc.
  const seeded: (TPlayer | null)[] = new Array(size).fill(null)
  const positions = generateSeedPositions(size)
  slots.forEach((p, i) => { seeded[positions[i]] = p })

  // Ronda 0: matches iniciales
  const rounds: BracketMatch[][] = []
  const round0: BracketMatch[] = []
  for (let i = 0; i < size; i += 2) {
    const id = `r0-m${i / 2}`
    round0.push({ id, round: 0, matchIndex: i / 2, p1: seeded[i], p2: seeded[i + 1], winnerId: saved[id] ?? null })
  }
  rounds.push(round0)

  // Rondas siguientes — ganadores avanzan desde la ronda anterior
  let prev = round0.length
  while (prev > 1) {
    const next = Math.ceil(prev / 2)
    const r = rounds.length
    const prevRound = rounds[r - 1]
    const newRound: BracketMatch[] = Array.from({ length: next }, (_, i) => {
      const id = `r${r}-m${i}`
      // Llenar con ganadores de la ronda previa si existen
      const leftMatch  = prevRound[i * 2]
      const rightMatch = prevRound[i * 2 + 1]
      const getWinner = (m: BracketMatch | undefined): TPlayer | null => {
        if (!m) return null
        if (m.winnerId) return m.p1?.user_id === m.winnerId ? m.p1 : m.p2
        // BYE automático: si solo hay un jugador, avanza solo
        if (m.p1 && !m.p2) return m.p1
        return null
      }
      const p1 = getWinner(leftMatch)
      const p2 = getWinner(rightMatch)
      return { id, round: r, matchIndex: i, p1, p2, winnerId: saved[id] ?? null }
    })
    rounds.push(newRound)
    prev = next
  }

  return rounds
}

// Genera posiciones de seeding estilo bracket
function generateSeedPositions(size: number): number[] {
  if (size === 1) return [0]
  const half = size / 2
  const left = generateSeedPositions(half)
  const right = left.map(p => size - 1 - p)
  return left.flatMap((l, i) => [l, right[i]])
}

const GAME_ICONS: Record<string, string> = {
  valorant: '🔫', minecraft: '⛏', 'league of legends': '⚔', fortnite: '🏗',
  apex: '🎯', cs2: '💣', overwatch: '🎮', 'rocket league': '🚗', default: '🎮',
}
function gameIcon(g: string) { return GAME_ICONS[g.toLowerCase()] ?? GAME_ICONS.default }

// ── Component ─────────────────────────────────────────────────────────────────
export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const user    = useAuthStore((s) => s.user)
  const supabase = createClient()

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'bracket' | 'players'>('bracket')
  const [joining, setJoining] = useState(false)
  const [toast, setToast] = useState('')
  const [bracketState, setBracketState] = useState<BracketState>({})

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('tournaments')
        .select(`*, tournament_players(user_id, profiles(username, avatar, photo_url))`)
        .eq('id', id)
        .single()
      setTournament(data ?? null)
      setBracketState((data?.bracket_state as BracketState) ?? {})
    } catch { setTournament(null) }
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 3000)
  }

  async function handleJoin() {
    if (!user || !tournament) return
    setJoining(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('tournament_players').insert({
        tournament_id: tournament.id, user_id: user.id,
      })
      showToast('✓ ¡Te inscribiste!')
      load()
    } catch { showToast('Error al inscribirse.') }
    setJoining(false)
  }

  async function handleLeave() {
    if (!user || !tournament) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('tournament_players').delete()
      .eq('tournament_id', tournament.id).eq('user_id', user.id)
    showToast('Saliste del torneo.')
    load()
  }

  async function handleSetWinner(matchId: string, winnerId: string) {
    if (!tournament) return
    // winnerId = '' means reset
    const newState = { ...bracketState }
    if (winnerId) newState[matchId] = winnerId
    else delete newState[matchId]
    setBracketState(newState) // optimistic
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('tournaments').update({ bracket_state: newState })
        .eq('id', tournament.id).eq('creator_id', user!.id)
      if (error) {
        // Columna bracket_state puede no existir todavía — mostrar aviso
        if (error.message?.includes('bracket_state') || error.code === '42703') {
          showToast('⚠ Ejecutá el SQL: ALTER TABLE tournaments ADD COLUMN bracket_state JSONB;')
        } else {
          showToast('⚠ Error guardando resultado. Verificá permisos RLS.')
        }
        setBracketState(bracketState) // revert
      }
    } catch {
      setBracketState(bracketState) // revert
    }
  }

  if (loading) return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', paddingTop: '80px' }}>
      Cargando torneo...
    </div>
  )

  if (!tournament) return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px', textAlign: 'center', paddingTop: '80px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>Torneo no encontrado.</p>
      <Link href="/tournaments" style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>← Volver a torneos</Link>
    </div>
  )

  const players = tournament.tournament_players ?? []
  const isCreator = tournament.creator_id === user?.id
  const joined    = players.some(p => p.user_id === user?.id)
  const full      = players.length >= tournament.max_players
  const bracket   = buildBracket(players, bracketState)
  const rounds    = bracket.length

  const statusColor = { live: 'var(--pink)', upcoming: 'var(--cyan)', finished: 'var(--text-muted)' }[tournament.status]
  const statusLabel = { live: '🔴 EN VIVO', upcoming: '⏳ PRÓXIMO', finished: '✅ FINALIZADO' }[tournament.status]
  const date = tournament.date
    ? new Date(tournament.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

  const ROUND_NAMES = ['Octavos', 'Cuartos', 'Semifinal', 'Final']
  function getRoundName(r: number) {
    const fromEnd = rounds - 1 - r
    return ROUND_NAMES[fromEnd] ?? `Ronda ${r + 1}`
  }

  // Campeón: ganador de la final (última ronda, único match)
  const finalMatch = bracket[rounds - 1]?.[0]
  const champion: TPlayer | null = finalMatch?.winnerId
    ? (finalMatch.p1?.user_id === finalMatch.winnerId ? finalMatch.p1 : finalMatch.p2) ?? null
    : null

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px 48px' }}>

      {/* ── Back + header ── */}
      <div style={{ marginBottom: '20px' }}>
        <Link href="/tournaments" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
          ← Todos los torneos
        </Link>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '20px 24px',
          display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: statusColor, letterSpacing: '1px' }}>{statusLabel}</span>
              {isCreator && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--purple)', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.2)', borderRadius: '20px', padding: '1px 7px' }}>
                  TU TORNEO
                </span>
              )}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '1px', margin: '0 0 4px' }}>
              {tournament.name}
            </h1>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {gameIcon(tournament.game)} {tournament.game} · {tournament.format}
            </div>
            {tournament.description && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px' }}>
                {tournament.description}
              </p>
            )}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px' }}>FECHA</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>{date}</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px' }}>PARTICIPANTES</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: players.length >= tournament.max_players ? 'var(--pink)' : 'var(--cyan)' }}>
                  {players.length} / {tournament.max_players}
                </div>
              </div>
              {tournament.prize && (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px' }}>PREMIO</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--cyan)' }}>{tournament.prize}</div>
                </div>
              )}
            </div>
          </div>

          {/* Action */}
          {user && !isCreator && tournament.status === 'upcoming' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
              {joined ? (
                <button onClick={handleLeave} disabled={joining} style={{
                  background: 'rgba(0,255,247,0.1)', border: '1px solid var(--cyan-border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
                  fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '10px 20px', cursor: 'pointer',
                }}>
                  ✓ Inscripto — Salir
                </button>
              ) : full ? (
                <button disabled style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '10px 20px', cursor: 'not-allowed',
                }}>
                  Cupos llenos
                </button>
              ) : (
                <button onClick={handleJoin} disabled={joining} style={{
                  background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
                  fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
                  letterSpacing: '1px', padding: '10px 20px', cursor: 'pointer',
                }}>
                  {joining ? 'INSCRIBIENDO...' : 'INSCRIBIRME'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Champion banner ── */}
      {champion && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,200,0,0.1), rgba(0,255,247,0.06))',
          border: '1px solid rgba(255,200,0,0.4)',
          borderRadius: 'var(--radius-lg)', padding: '20px 24px',
          marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '16px',
          boxShadow: '0 0 30px rgba(255,200,0,0.08)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Glow */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,200,0,0.8), transparent)' }} />
          <span style={{ fontSize: '36px', flexShrink: 0 }}>🏆</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700, color: 'rgba(255,200,0,0.7)', letterSpacing: '3px', marginBottom: '6px' }}>
              CAMPEÓN DEL TORNEO
            </div>
            <Link href={`/profile/${champion.profiles?.username}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <UserAvatar avatar={champion.profiles?.avatar ?? null} photoUrl={champion.profiles?.photo_url} username={champion.profiles?.username ?? '?'} size={44} />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 900, color: '#FFD700', letterSpacing: '1px', textShadow: '0 0 20px rgba(255,200,0,0.5)' }}>
                  @{champion.profiles?.username}
                </div>
                {tournament.prize && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255,200,0,0.7)', marginTop: '2px' }}>
                    🎖 {tournament.prize}
                  </div>
                )}
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {(['bracket', 'players'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? 'var(--cyan-glow)' : 'transparent',
            border: `1px solid ${tab === t ? 'var(--cyan-border)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            color: tab === t ? 'var(--cyan)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            padding: '6px 16px', cursor: 'pointer',
          }}>
            {t === 'bracket' ? '🏆 Bracket' : `👾 Participantes (${players.length})`}
          </button>
        ))}
      </div>

      {/* ── Bracket tab ── */}
      {tab === 'bracket' && (
        <div>
          {/* Hint para el creador: explicar cómo marcar ganadores */}
          {isCreator && tournament.status === 'live' && players.length >= 2 && (
            <div style={{
              background: 'rgba(0,255,247,0.05)', border: '1px solid rgba(0,255,247,0.2)',
              borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '14px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ fontSize: '14px' }}>💡</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--cyan)' }}>
                Hacé click en un jugador para marcarlo como ganador del enfrentamiento. El ↩ resetea el resultado.
              </span>
            </div>
          )}
          {players.length < 2 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              background: 'var(--card)', border: '1px dashed rgba(0,255,247,0.2)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚔</div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                Hacen falta al menos 2 participantes para generar el bracket.
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                {tournament.max_players - players.length} lugar{tournament.max_players - players.length !== 1 ? 'es' : ''} disponible{tournament.max_players - players.length !== 1 ? 's' : ''}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', paddingBottom: '16px' }}>
              <div style={{
                display: 'flex', gap: '0', alignItems: 'stretch',
                minWidth: `${rounds * 200}px`,
              }}>
                {bracket.map((round, rIdx) => (
                  <div key={rIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: '180px' }}>
                    {/* Round header */}
                    <div style={{
                      padding: '8px 12px', textAlign: 'center', marginBottom: '8px',
                      fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                      color: rIdx === rounds - 1 ? 'var(--cyan)' : 'var(--text-muted)',
                      letterSpacing: '2px',
                      borderBottom: `1px solid ${rIdx === rounds - 1 ? 'rgba(0,255,247,0.3)' : 'var(--border)'}`,
                    }}>
                      {getRoundName(rIdx)}
                      {rIdx === rounds - 1 && <span style={{ marginLeft: '6px' }}>🏆</span>}
                    </div>

                    {/* Matches */}
                    <div style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      justifyContent: 'space-around',
                      gap: '8px', padding: '4px 8px',
                    }}>
                      {round.map((match) => (
                        <BracketMatchCard
                          key={match.id}
                          match={match}
                          highlight={rIdx === rounds - 1}
                          canEdit={isCreator && tournament.status === 'live'}
                          onSetWinner={(winnerId) => handleSetWinner(match.id, winnerId)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Players tab ── */}
      {tab === 'players' && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        }}>
          {players.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '48px' }}>
              Todavía no hay participantes.
            </p>
          ) : (
            players.map((p, i) => (
              <div key={p.user_id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                borderBottom: i < players.length - 1 ? '1px solid var(--border)' : 'none',
                background: p.user_id === user?.id ? 'rgba(0,255,247,0.03)' : 'transparent',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  color: 'var(--text-muted)', width: '24px', textAlign: 'center', flexShrink: 0,
                }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <UserAvatar avatar={p.profiles?.avatar ?? null} photoUrl={p.profiles?.photo_url} username={p.profiles?.username ?? '?'} size={36} />
                <Link href={`/profile/${p.profiles?.username}`} style={{ textDecoration: 'none', flex: 1 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: p.user_id === user?.id ? 'var(--cyan)' : 'var(--text-primary)' }}>
                    @{p.profiles?.username}
                  </span>
                </Link>
                {p.user_id === tournament.creator_id && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--purple)', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.2)', borderRadius: '20px', padding: '1px 7px' }}>
                    CREADOR
                  </span>
                )}
                {p.user_id === user?.id && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--cyan)', background: 'rgba(0,255,247,0.08)', border: '1px solid rgba(0,255,247,0.2)', borderRadius: '20px', padding: '1px 7px' }}>
                    VOS
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '80px', right: '24px',
          background: 'var(--card)', border: '1px solid var(--cyan-border)',
          borderRadius: 'var(--radius-md)', padding: '12px 20px',
          fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--cyan)',
          zIndex: 200,
        }}>{toast}</div>
      )}
    </div>
  )
}

// ── Bracket match card ─────────────────────────────────────────────────────────
function BracketMatchCard({
  match, highlight, canEdit, onSetWinner,
}: {
  match: BracketMatch
  highlight: boolean
  canEdit?: boolean
  onSetWinner?: (winnerId: string) => void
}) {
  const borderColor = highlight ? 'rgba(0,255,247,0.35)' : 'var(--border)'
  const slots = [match.p1, match.p2]
  // Partida jugable: ambos jugadores presentes (o BYE automático)
  const canPickWinner = canEdit && match.p1 && match.p2 && !match.winnerId

  return (
    <div style={{
      background: 'var(--card)', border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)', overflow: 'hidden',
      boxShadow: highlight ? '0 0 12px rgba(0,255,247,0.06)' : 'none',
      position: 'relative',
    }}>
      {canPickWinner && (
        <div style={{
          position: 'absolute', top: '2px', right: '4px',
          fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-muted)',
          letterSpacing: '0.5px',
        }}>
          click = ganador
        </div>
      )}
      {/* Botón para resetear ganador (creator only) */}
      {canEdit && match.winnerId && (
        <button
          onClick={() => onSetWinner?.('')}
          title="Resetear resultado"
          style={{
            position: 'absolute', top: '2px', right: '4px',
            background: 'transparent', border: 'none',
            fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-muted)',
            cursor: 'pointer', padding: '0 2px',
          }}
        >
          ↩
        </button>
      )}
      {slots.map((player, si) => {
        const isWinner = match.winnerId && player && match.winnerId === player.user_id
        const isBye    = match.p1 && !match.p2 && si === 1
        const clickable = canPickWinner && !!player
        return (
          <div
            key={si}
            onClick={clickable ? () => onSetWinner?.(player!.user_id) : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '7px 10px',
              borderBottom: si === 0 ? `1px solid ${borderColor}` : 'none',
              background: isWinner ? 'rgba(0,255,247,0.06)' : 'transparent',
              opacity: match.winnerId && !isWinner && player ? 0.45 : 1,
              minHeight: '36px',
              cursor: clickable ? 'pointer' : 'default',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (clickable) (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,247,0.04)' }}
            onMouseLeave={e => { if (clickable) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            {isBye ? (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                BYE
              </span>
            ) : player ? (
              <>
                <UserAvatar avatar={player.profiles?.avatar ?? null} photoUrl={player.profiles?.photo_url} username={player.profiles?.username ?? '?'} size={22} />
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600,
                  color: isWinner ? 'var(--cyan)' : 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>
                  @{player.profiles?.username}
                </span>
                {isWinner && <span style={{ fontSize: '12px', flexShrink: 0 }}>👑</span>}
                {clickable && (
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', flexShrink: 0, opacity: 0.6 }}>✓</span>
                )}
              </>
            ) : (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Por definir
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
