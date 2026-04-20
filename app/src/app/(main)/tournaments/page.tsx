'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'

const GAME_ICONS: Record<string, string> = {
  'valorant': '🔫', 'minecraft': '⛏', 'league of legends': '⚔',
  'fortnite': '🏗', 'apex': '🎯', 'cs2': '💣', 'overwatch': '🎮',
  'rocket league': '🚗', 'respawn arcade': '🕹', 'default': '🎮',
}

function gameIcon(game: string) {
  return GAME_ICONS[game.toLowerCase()] ?? GAME_ICONS.default
}

const GAMES = ['Valorant', 'CS2', 'Fortnite', 'Apex', 'Minecraft', 'League of Legends', 'Overwatch', 'Rocket League', 'Respawn Arcade']
const FORMATS = ['Eliminación simple', 'Round Robin', 'Suizo']
const PLAYER_OPTS = [4, 8, 16, 32, 64]


type TStatus = 'live' | 'upcoming' | 'finished'
type Tab = 'live' | 'upcoming' | 'finished' | 'mine'

interface TPlayer { user_id: string; profiles?: { username: string; avatar: string | null } }
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
  status: TStatus
  tournament_players: TPlayer[]
}

export default function TournamentsPage() {
  const user = useAuthStore((s) => s.user)
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('upcoming')
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState('')

  // Create form state
  const [form, setForm] = useState({ name: '', game: '', format: FORMATS[0], maxPlayers: 16, date: '', prize: '', description: '' })
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')

  // Edit modal state
  const [showEdit, setShowEdit]   = useState(false)
  const [editId,   setEditId]     = useState<number | null>(null)
  const [editForm, setEditForm]   = useState({ name: '', game: '', format: FORMATS[0], maxPlayers: 16, date: '', prize: '', description: '' })
  const [editing,  setEditing]    = useState(false)
  const [editError, setEditError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('tournaments')
      .select(`*, tournament_players(user_id, profiles(username, avatar))`)
      .order('date', { ascending: true })
    setTournaments(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function joinTournament(id: number) {
    if (!user) return
    const t = tournaments.find(x => x.id === id)
    if (!t) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('tournament_players').insert({ tournament_id: id, user_id: user.id })
    showToast(`✓ ¡Te inscribiste en "${t.name}"!`)
    load()
  }

  async function leaveTournament(id: number) {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('tournament_players').delete().eq('tournament_id', id).eq('user_id', user.id)
    showToast('Saliste del torneo.')
    load()
  }

  async function handleCreate() {
    setFormError('')
    if (!user) { setFormError('Tu sesión no está cargada. Recargá la página.'); return }
    if (!form.name.trim()) { setFormError('Ingresá un nombre.'); return }
    if (!form.game) { setFormError('Seleccioná un juego.'); return }
    if (!form.date) { setFormError('Seleccioná una fecha.'); return }
    setCreating(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('tournaments').insert({
        creator_id: user!.id,
        name: form.name.trim(),
        game: form.game,
        format: form.format,
        max_players: form.maxPlayers,
        prize: form.prize.trim() || null,
        description: form.description.trim() || null,
        date: form.date,
        status: 'upcoming',
      })
      if (error) throw error
      setShowCreate(false)
      setForm({ name: '', game: '', format: FORMATS[0], maxPlayers: 16, date: '', prize: '', description: '' })
      showToast(`✓ Torneo "${form.name}" creado.`)
      setTab('upcoming')
      load()
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al crear.')
    } finally {
      setCreating(false)
    }
  }

  function openEdit(t: Tournament) {
    setEditId(t.id)
    setEditForm({
      name: t.name,
      game: t.game,
      format: t.format,
      maxPlayers: t.max_players,
      date: t.date ? t.date.slice(0, 16) : '',
      prize: t.prize ?? '',
      description: t.description ?? '',
    })
    setEditError('')
    setShowEdit(true)
  }

  async function handleEditSave() {
    setEditError('')
    if (!editForm.name.trim()) { setEditError('Ingresá un nombre.'); return }
    if (!editForm.game) { setEditError('Seleccioná un juego.'); return }
    if (!editForm.date) { setEditError('Seleccioná una fecha.'); return }
    setEditing(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('tournaments').update({
        name: editForm.name.trim(),
        game: editForm.game,
        format: editForm.format,
        max_players: editForm.maxPlayers,
        prize: editForm.prize.trim() || null,
        description: editForm.description.trim() || null,
        date: editForm.date,
      }).eq('id', editId)
      if (error) throw error
      setShowEdit(false)
      showToast('✓ Torneo actualizado.')
      load()
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Error al guardar.')
    } finally {
      setEditing(false)
    }
  }

  async function handleDelete(id: number, name: string) {
    // Optimistic: remove from UI immediately
    setTournaments(prev => prev.filter(t => t.id !== id))
    showToast(`🗑 Torneo "${name}" eliminado.`)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      await sb.from('tournament_players').delete().eq('tournament_id', id)
      const { error } = await sb.from('tournaments').delete().eq('id', id).eq('creator_id', user!.id)
      if (error) throw error
    } catch (e: unknown) {
      // Revert: reload real state and show error
      load()
      showToast(`⚠ Error al eliminar: ${e instanceof Error ? e.message : 'Revisá los permisos en Supabase.'}`)
    }
  }

  async function handleStatusChange(id: number, newStatus: TStatus) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('tournaments').update({ status: newStatus }).eq('id', id)
    const labels: Record<TStatus, string> = { live: 'iniciado 🔴', upcoming: 'programado ⏳', finished: 'finalizado ✅' }
    showToast(`Torneo ${labels[newStatus]}.`)
    load()
  }

  const live     = tournaments.filter(t => t.status === 'live')
  const upcoming = tournaments.filter(t => t.status === 'upcoming')
  const finished = tournaments.filter(t => t.status === 'finished')
  const mine     = tournaments.filter(t =>
    t.creator_id === user?.id ||
    t.tournament_players.some(p => p.user_id === user?.id)
  )

  const allPlayers = new Set(tournaments.flatMap(t => t.tournament_players.map(p => p.user_id)))

  const displayed = tab === 'live' ? live : tab === 'upcoming' ? upcoming : tab === 'finished' ? finished : mine

  const tabStyle = (t: Tab) => ({
    background: tab === t ? 'var(--cyan-glow)' : 'transparent',
    border: `1px solid ${tab === t ? 'var(--cyan-border)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-md)',
    color: tab === t ? 'var(--cyan)' : 'var(--text-muted)',
    fontFamily: 'var(--font-mono)' as const,
    fontSize: '11px' as const,
    padding: '5px 14px',
    cursor: 'pointer' as const,
    transition: 'all var(--transition)',
  })

  const inputStyle = {
    width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '9px 12px',
    color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
    fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', letterSpacing: '3px', color: 'var(--text-muted)', fontWeight: 700, margin: 0 }}>
            TORNEOS
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Competí, ganá, hacete leyenda.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)',
          borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
          fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
          letterSpacing: '1px', padding: '8px 16px', cursor: 'pointer',
        }}>
          + CREAR
        </button>
      </div>

      {/* Hero stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { icon: '🔴', val: live.length, label: 'En vivo' },
          { icon: '🏆', val: tournaments.length, label: 'Torneos' },
          { icon: '👾', val: allPlayers.size, label: 'Competidores' },
          { icon: '⏳', val: upcoming.length, label: 'Próximos' },
        ].map(s => (
          <div key={s.label} style={{
            flex: '1 1 120px', background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--cyan)' }}>
              {s.icon} {s.val}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button style={tabStyle('live')} onClick={() => setTab('live')}>🔴 En vivo {live.length > 0 && `(${live.length})`}</button>
        <button style={tabStyle('upcoming')} onClick={() => setTab('upcoming')}>⏳ Próximos</button>
        <button style={tabStyle('finished')} onClick={() => setTab('finished')}>✅ Finalizados</button>
        <button style={tabStyle('mine')} onClick={() => setTab('mine')}>🎮 Mis torneos</button>
      </div>

      {/* Grid */}
      {loading ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '48px' }}>
          Cargando torneos...
        </p>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>🏆</div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
            {tab === 'mine' ? 'No estás en ningún torneo todavía.' : 'Sin torneos en esta categoría.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {displayed.map(t => (
            <TournamentCard
              key={t.id} t={t} userId={user?.id}
              onJoin={joinTournament} onLeave={leaveTournament}
              onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(7,7,15,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '16px',
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '24px',
            width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '2px', color: 'var(--cyan)', fontWeight: 700, margin: '0 0 20px' }}>
              CREAR TORNEO
            </h2>

            <datalist id="dl-games">{GAMES.map(g => <option key={g} value={g} />)}</datalist>
            <datalist id="dl-formats">{FORMATS.map(f => <option key={f} value={f} />)}</datalist>
            <datalist id="dl-players">{PLAYER_OPTS.map(n => <option key={n} value={n} />)}</datalist>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input style={inputStyle} placeholder="Nombre del torneo *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

              <input
                style={inputStyle} list="dl-games"
                placeholder="Juego * (ej: Valorant, Minecraft...)"
                value={form.game}
                onChange={e => setForm(f => ({ ...f, game: e.target.value }))}
              />

              <input
                style={inputStyle} list="dl-formats"
                placeholder="Formato * (ej: Eliminación simple)"
                value={form.format}
                onChange={e => setForm(f => ({ ...f, format: e.target.value }))}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  style={{ ...inputStyle, flex: 1 }} list="dl-players" type="number" min={2}
                  placeholder="Jugadores *"
                  value={form.maxPlayers}
                  onChange={e => setForm(f => ({ ...f, maxPlayers: parseInt(e.target.value) || 16 }))}
                />
                <input style={{ ...inputStyle, flex: 1 }} type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>

              <input style={inputStyle} placeholder="Premio (ej: $500 ARS, Skin exclusiva)" value={form.prize} onChange={e => setForm(f => ({ ...f, prize: e.target.value }))} />

              <textarea style={{ ...inputStyle, resize: 'none', minHeight: '80px' }} placeholder="Descripción (opcional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

              {formError && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--pink)' }}>
                  ⚠ {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button onClick={() => setShowCreate(false)} style={{
                  flex: 1, background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '10px', cursor: 'pointer',
                }}>
                  Cancelar
                </button>
                <button onClick={handleCreate} disabled={creating} style={{
                  flex: 2, background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
                  fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
                  letterSpacing: '1px', padding: '10px', cursor: 'pointer',
                  opacity: creating ? 0.6 : 1,
                }}>
                  {creating ? 'CREANDO...' : 'CREAR TORNEO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(7,7,15,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '16px',
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowEdit(false) }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '24px',
            width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '2px', color: 'var(--purple)', fontWeight: 700, margin: '0 0 20px' }}>
              EDITAR TORNEO
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input style={inputStyle} placeholder="Nombre del torneo *" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />

              <input
                style={inputStyle} list="dl-games"
                placeholder="Juego * (ej: Valorant, Minecraft...)"
                value={editForm.game}
                onChange={e => setEditForm(f => ({ ...f, game: e.target.value }))}
              />

              <input
                style={inputStyle} list="dl-formats"
                placeholder="Formato *"
                value={editForm.format}
                onChange={e => setEditForm(f => ({ ...f, format: e.target.value }))}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  style={{ ...inputStyle, flex: 1 }} list="dl-players" type="number" min={2}
                  placeholder="Jugadores *"
                  value={editForm.maxPlayers}
                  onChange={e => setEditForm(f => ({ ...f, maxPlayers: parseInt(e.target.value) || 16 }))}
                />
                <input style={{ ...inputStyle, flex: 1 }} type="datetime-local" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
              </div>

              <input style={inputStyle} placeholder="Premio (ej: $500 ARS, Skin exclusiva)" value={editForm.prize} onChange={e => setEditForm(f => ({ ...f, prize: e.target.value }))} />
              <textarea style={{ ...inputStyle, resize: 'none', minHeight: '80px' }} placeholder="Descripción (opcional)" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />

              {editError && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--pink)' }}>
                  ⚠ {editError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button onClick={() => setShowEdit(false)} style={{
                  flex: 1, background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '10px', cursor: 'pointer',
                }}>
                  Cancelar
                </button>
                <button onClick={handleEditSave} disabled={editing} style={{
                  flex: 2, background: 'rgba(192,132,252,0.15)', border: '1px solid rgba(192,132,252,0.4)',
                  borderRadius: 'var(--radius-md)', color: 'var(--purple)',
                  fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
                  letterSpacing: '1px', padding: '10px', cursor: 'pointer',
                  opacity: editing ? 0.6 : 1,
                }}>
                  {editing ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '80px', right: '24px',
          background: 'var(--card)', border: '1px solid var(--cyan-border)',
          borderRadius: 'var(--radius-md)', padding: '12px 20px',
          fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--cyan)',
          zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}

function TournamentCard({
  t, userId, onJoin, onLeave, onEdit, onDelete, onStatusChange
}: {
  t: Tournament
  userId?: string
  onJoin: (id: number) => void
  onLeave: (id: number) => void
  onEdit: (t: Tournament) => void
  onDelete: (id: number, name: string) => void
  onStatusChange: (id: number, status: TStatus) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const players = t.tournament_players
  const pct = Math.min(100, Math.round(players.length / t.max_players * 100))
  const full = players.length >= t.max_players
  const joined = !!userId && players.some(p => p.user_id === userId)
  const isCreator = t.creator_id === userId

  const statusColor = { live: '#FF4F7B', upcoming: '#00FFF7', finished: 'var(--text-muted)' }[t.status]
  const statusLabel = { live: '🔴 EN VIVO', upcoming: '⏳ PRÓXIMO', finished: '✅ FINALIZADO' }[t.status]
  const date = t.date ? new Date(t.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  const avatarPlayers = players.slice(0, 4)
  const extra = players.length - 4

  return (
    <div style={{
      background: 'var(--card)', border: `1px solid var(--border)`,
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      transition: 'border-color var(--transition)',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = statusColor ?? 'var(--border)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Card header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: statusColor, letterSpacing: '1px' }}>
            {statusLabel}
          </span>
          {t.prize && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--cyan)' }}>
                {t.prize}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>PREMIO</div>
            </div>
          )}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          {gameIcon(t.game)} {t.game}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
          {t.name}
          {isCreator && (
            <span style={{ marginLeft: '8px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--purple)', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.2)', borderRadius: '20px', padding: '1px 7px' }}>
              CREADOR
            </span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px' }}>FORMATO</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>{t.format}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px' }}>FECHA</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>{date}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>PARTICIPANTES</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: full ? 'var(--pink)' : 'var(--text-muted)' }}>
              {players.length} / {t.max_players}
            </span>
          </div>
          <div style={{ height: '4px', background: 'var(--surface)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: full ? 'var(--pink)' : 'var(--cyan)', borderRadius: '2px', transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Avatar row */}
        {avatarPlayers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {avatarPlayers.map((p, i) => (
              <Link key={i} href={`/profile/${p.profiles?.username ?? ''}`} style={{ marginLeft: i > 0 ? '-8px' : 0 }}>
                <div style={{ border: '2px solid var(--card)', borderRadius: '50%' }}>
                  <UserAvatar avatar={p.profiles?.avatar ?? null} username={p.profiles?.username ?? '?'} size={24} />
                </div>
              </Link>
            ))}
            {extra > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                +{extra}
              </span>
            )}
          </div>
        )}

        {/* Description */}
        {t.description && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
            {t.description.slice(0, 100)}{t.description.length > 100 ? '...' : ''}
          </p>
        )}

        {/* Action button */}
        <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
          {t.status === 'live' && (
            joined
              ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--pink)', textAlign: 'center', padding: '8px', border: '1px solid rgba(255,79,123,0.3)', borderRadius: 'var(--radius-md)' }}>⚔ EN JUEGO</div>
              : <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>👁 Espectador (próximamente)</div>
          )}
          {t.status === 'upcoming' && !isCreator && (
            joined
              ? <button onClick={() => onLeave(t.id)} style={{
                  width: '100%', background: 'rgba(0,255,247,0.1)', border: '1px solid var(--cyan-border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
                  fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '8px', cursor: 'pointer',
                }}>✓ INSCRIPTO — Salir</button>
              : full
                ? <button disabled style={{
                    width: '100%', background: 'transparent', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '8px', cursor: 'not-allowed',
                  }}>CUPOS LLENOS</button>
                : <button onClick={() => onJoin(t.id)} style={{
                    width: '100%', background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)',
                    borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
                    fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
                    letterSpacing: '1px', padding: '8px', cursor: 'pointer',
                  }}>INSCRIBIRME</button>
          )}
          {t.status === 'finished' && !isCreator && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
              ✅ Finalizado
            </div>
          )}
        </div>

        {/* ── Creator management ─────────────────────────────── */}
        {isCreator && (
          <div style={{
            borderTop: '1px solid rgba(192,132,252,0.15)',
            paddingTop: '10px', marginTop: '4px',
            display: 'flex', flexDirection: 'column', gap: '6px',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--purple)', letterSpacing: '1.5px', marginBottom: '2px' }}>
              ⚙ GESTIÓN
            </div>

            {/* Status transition buttons */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {t.status === 'upcoming' && (
                <>
                  <button
                    onClick={() => onEdit(t)}
                    style={{
                      flex: 1, background: 'transparent', border: '1px solid rgba(192,132,252,0.35)',
                      borderRadius: 'var(--radius-md)', color: 'var(--purple)',
                      fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '6px 8px', cursor: 'pointer',
                      transition: 'all var(--transition)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(192,132,252,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    ✏ Editar
                  </button>
                  <button
                    onClick={() => onStatusChange(t.id, 'live')}
                    style={{
                      flex: 1, background: 'transparent', border: '1px solid rgba(255,79,123,0.35)',
                      borderRadius: 'var(--radius-md)', color: 'var(--pink)',
                      fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '6px 8px', cursor: 'pointer',
                      transition: 'all var(--transition)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,79,123,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    ▶ Iniciar
                  </button>
                </>
              )}
              {t.status === 'live' && (
                <button
                  onClick={() => onStatusChange(t.id, 'finished')}
                  style={{
                    flex: 1, background: 'transparent', border: '1px solid rgba(0,255,247,0.3)',
                    borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
                    fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '6px 8px', cursor: 'pointer',
                    transition: 'all var(--transition)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,255,247,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  ✅ Finalizar torneo
                </button>
              )}
              {t.status === 'finished' && (
                <div style={{
                  flex: 1, fontFamily: 'var(--font-mono)', fontSize: '10px',
                  color: 'var(--text-muted)', textAlign: 'center', padding: '6px',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                }}>
                  ✅ Finalizado
                </div>
              )}
            </div>

            {/* Delete with confirmation */}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,79,123,0.2)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '5px 8px',
                  cursor: 'pointer', transition: 'all var(--transition)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,79,123,0.5)'; e.currentTarget.style.color = 'var(--pink)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,79,123,0.2)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                🗑 Eliminar torneo
              </button>
            ) : (
              <div style={{
                background: 'rgba(255,79,123,0.07)', border: '1px solid rgba(255,79,123,0.35)',
                borderRadius: 'var(--radius-md)', padding: '8px 10px',
              }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--pink)', margin: '0 0 8px' }}>
                  ¿Confirmás que querés eliminar este torneo? Esta acción no se puede deshacer.
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      flex: 1, background: 'transparent', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '5px', cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => { setConfirmDelete(false); onDelete(t.id, t.name) }}
                    style={{
                      flex: 1, background: 'rgba(255,79,123,0.15)', border: '1px solid rgba(255,79,123,0.5)',
                      borderRadius: 'var(--radius-md)', color: 'var(--pink)',
                      fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
                      padding: '5px', cursor: 'pointer',
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
