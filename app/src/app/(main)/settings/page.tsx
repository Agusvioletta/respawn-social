'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { calculateXP, xpLevel, getLevelName } from '@/lib/utils/xp'

const AVATARS = [
  { id: 'avatar1', src: '/avatar1.png', label: 'Avatar 1' },
  { id: 'avatar2', src: '/avatar2.png', label: 'Avatar 2' },
]

const ACHIEVEMENTS = [
  { icon: '📝', name: 'Primera Sangre',   desc: 'Publicá tu primer post',         check: (d: D) => d.posts >= 1 },
  { icon: '🔥', name: 'En Racha',         desc: 'Publicá 10 posts',               check: (d: D) => d.posts >= 10 },
  { icon: '💬', name: 'Sin Parar',        desc: 'Publicá 50 posts',               check: (d: D) => d.posts >= 50 },
  { icon: '🤝', name: 'Sociable',         desc: 'Seguí a alguien',                check: (d: D) => d.following >= 1 },
  { icon: '👥', name: 'Networker',        desc: 'Seguí a 10 personas',            check: (d: D) => d.following >= 10 },
  { icon: '⭐', name: 'Popular',          desc: 'Conseguí 3 seguidores',          check: (d: D) => d.followers >= 3 },
  { icon: '🎤', name: 'Famoso',           desc: 'Conseguí 10 seguidores',         check: (d: D) => d.followers >= 10 },
  { icon: '👑', name: 'Leyenda Social',   desc: 'Conseguí 50 seguidores',         check: (d: D) => d.followers >= 50 },
  { icon: '💜', name: 'Querido',          desc: 'Recibí 5 likes',                 check: (d: D) => d.likes >= 5 },
  { icon: '❤️', name: 'Muy Querido',      desc: 'Recibí 50 likes',                check: (d: D) => d.likes >= 50 },
  { icon: '💎', name: 'Viral',            desc: 'Recibí 200 likes',               check: (d: D) => d.likes >= 200 },
  { icon: '🐍', name: 'Snake Master',     desc: 'Superá Snake',                   check: (d: D) => d.maxLevel >= 2 },
  { icon: '🏓', name: 'Pong Pro',         desc: 'Ganá en Pong',                   check: (d: D) => d.maxLevel >= 3 },
  { icon: '🧱', name: 'Block Breaker',    desc: 'Superá Breakout',                check: (d: D) => d.maxLevel >= 4 },
  { icon: '☄️', name: 'Astronauta',       desc: 'Superá Asteroids',               check: (d: D) => d.maxLevel >= 5 },
  { icon: '🐦', name: 'Flappy Bird',      desc: 'Superá Flappy',                  check: (d: D) => d.maxLevel >= 6 },
  { icon: '🟪', name: 'Tetris God',       desc: 'Superá Tetris',                  check: (d: D) => d.maxLevel >= 7 },
  { icon: '👾', name: 'Space Cadet',      desc: 'Superá Space Invaders',          check: (d: D) => d.maxLevel >= 8 },
  { icon: '🏆', name: 'Competidor',       desc: 'Inscribite en un torneo',        check: (d: D) => d.tournamentsJoined >= 1 },
  { icon: '🎪', name: 'Organizador',      desc: 'Creá un torneo',                 check: (d: D) => d.tournamentsCreated >= 1 },
  { icon: '📨', name: 'Primer Mensaje',   desc: 'Enviá tu primer DM',             check: (d: D) => d.dmsSent >= 1 },
  { icon: '⚡', name: 'Primer Nivel',     desc: 'Llegá a nivel 2',                check: (d: D) => d.level >= 2 },
  { icon: '🚀', name: 'En Ascenso',       desc: 'Llegá a nivel 5',                check: (d: D) => d.level >= 5 },
]

interface D {
  posts: number; following: number; followers: number; likes: number
  maxLevel: number; tournamentsJoined: number; tournamentsCreated: number
  dmsSent: number; level: number
}

type Section = 'perfil' | 'cuenta' | 'logros' | 'faq'

const FAQ = [
  { q: '¿Cómo subo de nivel?', a: 'Publicando posts, consiguiendo likes y seguidores, y completando juegos del arcade. Cada acción suma XP.' },
  { q: '¿Cómo desbloqueo más juegos?', a: 'Completá el juego anterior en el arcade. Snake → Pong → Breakout → Asteroids → Flappy → Tetris → Space Invaders → Dino.' },
  { q: '¿Se puede cambiar el avatar?', a: 'Sí, desde esta página en la sección "Perfil".' },
  { q: '¿Los datos se guardan en la nube?', a: 'Sí, usamos Supabase (PostgreSQL). Tus datos están seguros.' },
  { q: '¿Cómo reporto un usuario?', a: 'La función de reportes está en desarrollo. Próximamente.' },
]

export default function SettingsPage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const supabase = createClient()

  const [section, setSection] = useState<Section>('perfil')
  const [form, setForm] = useState({ username: '', bio: '', games: ['', '', ''] })
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [stats, setStats] = useState<D | null>(null)

  useEffect(() => {
    if (!user) return
    setForm({ username: user.username, bio: user.bio ?? '', games: [...((user as { games?: string[] }).games ?? ['', '', '']), '', '', ''].slice(0, 3) })
    setSelectedAvatar(user.avatar ?? 'avatar1')
    loadStats()
  }, [user])

  async function loadStats() {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [{ data: posts }, { data: following }, { data: followers }, { data: msgs }, { data: tournaments }] = await Promise.all([
      (supabase as any).from('posts').select('id, likes(id)').eq('user_id', user.id),
      (supabase as any).from('follows').select('id').eq('follower_id', user.id),
      (supabase as any).from('follows').select('id').eq('following_id', user.id),
      (supabase as any).from('messages').select('id').eq('from_id', user.id),
      (supabase as any).from('tournament_players').select('tournament_id').eq('user_id', user.id),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: createdTournaments } = await (supabase as any).from('tournaments').select('id').eq('creator_id', user.id)

    const totalLikes = (posts ?? []).reduce((s: number, p: { likes?: unknown[] }) => s + (p.likes?.length ?? 0), 0)
    const xp = calculateXP({
      posts: posts?.length ?? 0, followers: followers?.length ?? 0,
      following: following?.length ?? 0, likes: totalLikes,
      gameLevels: user.max_level,
    })
    const { level } = xpLevel(xp)

    setStats({
      posts: posts?.length ?? 0, following: following?.length ?? 0,
      followers: followers?.length ?? 0, likes: totalLikes,
      maxLevel: user.max_level, tournamentsJoined: tournaments?.length ?? 0,
      tournamentsCreated: createdTournaments?.length ?? 0,
      dmsSent: msgs?.length ?? 0, level,
    })
  }

  async function handleSaveProfile() {
    if (!user) return
    setSaving(true); setSaveMsg('')
    try {
      const updates: Record<string, unknown> = {
        username: form.username.trim(),
        bio: form.bio.trim() || null,
        avatar: selectedAvatar,
        games: form.games.filter(Boolean),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('profiles').update(updates).eq('id', user.id)
      if (error) throw error
      setUser({ ...user, ...updates } as typeof user)
      setSaveMsg('✓ Perfil actualizado.')
    } catch (e: unknown) {
      setSaveMsg('⚠ ' + (e instanceof Error ? e.message : 'Error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('¿Segura? Esta acción es irreversible.')) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('profiles').delete().eq('id', user!.id)
    await supabase.auth.signOut()
    setUser(null)
    router.push('/login')
  }

  const xpTotal = stats ? calculateXP({ posts: stats.posts, followers: stats.followers, following: stats.following, likes: stats.likes, gameLevels: stats.maxLevel }) : 0
  const { level, current, needed } = xpLevel(xpTotal)
  const pct = needed > 0 ? Math.round((current / needed) * 100) : 100

  const tabStyle = (s: Section) => ({
    background: section === s ? 'var(--cyan-glow)' : 'transparent',
    border: `1px solid ${section === s ? 'var(--cyan-border)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-md)',
    color: section === s ? 'var(--cyan)' : 'var(--text-muted)',
    fontFamily: 'var(--font-mono)' as const,
    fontSize: '11px' as const,
    padding: '6px 14px', cursor: 'pointer' as const,
    transition: 'all var(--transition)',
  })

  const inputStyle = {
    width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '9px 12px',
    color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
    fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const,
  }

  if (!user) return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
      Cargando...
    </div>
  )

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px' }}>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', letterSpacing: '3px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '20px' }}>
        CONFIGURACIÓN
      </h1>

      {/* XP bar */}
      {stats && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <UserAvatar avatar={user.avatar} username={user.username} size={40} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>@{user.username}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cyan)' }}>
                Nivel {level} · {getLevelName(level)} · {xpTotal} XP
              </div>
            </div>
          </div>
          <div style={{ height: '6px', background: 'var(--surface)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--cyan), var(--purple))', borderRadius: '3px' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
            {current} / {needed} XP al siguiente nivel
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button style={tabStyle('perfil')} onClick={() => setSection('perfil')}>👤 Perfil</button>
        <button style={tabStyle('cuenta')} onClick={() => setSection('cuenta')}>🔑 Cuenta</button>
        <button style={tabStyle('logros')} onClick={() => setSection('logros')}>🏆 Logros</button>
        <button style={tabStyle('faq')} onClick={() => setSection('faq')}>❓ FAQ</button>
      </div>

      {/* Perfil */}
      {section === 'perfil' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Avatar selector */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>AVATAR</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {AVATARS.map((av) => (
                <button key={av.id} onClick={() => setSelectedAvatar(av.src)} style={{
                  background: 'transparent', border: `2px solid ${selectedAvatar === av.src ? 'var(--cyan)' : 'var(--border)'}`,
                  borderRadius: '50%', padding: '2px', cursor: 'pointer',
                  boxShadow: selectedAvatar === av.src ? '0 0 12px var(--cyan)' : 'none',
                  transition: 'all var(--transition)',
                }}>
                  <UserAvatar avatar={av.src} username={av.label} size={48} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '1px' }}>USERNAME</div>
            <input style={inputStyle} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>

          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '1px' }}>BIO</div>
            <textarea style={{ ...inputStyle, resize: 'none', minHeight: '80px' }} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Contá quién sos..." />
          </div>

          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '1px' }}>JUEGOS FAVORITOS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[0, 1, 2].map((i) => (
                <input key={i} style={inputStyle} placeholder={`Juego ${i + 1}`} value={form.games[i]} onChange={e => setForm(f => { const g = [...f.games]; g[i] = e.target.value; return { ...f, games: g } })} />
              ))}
            </div>
          </div>

          {saveMsg && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: saveMsg.startsWith('✓') ? 'var(--cyan)' : 'var(--pink)' }}>
              {saveMsg}
            </div>
          )}

          <button onClick={handleSaveProfile} disabled={saving} style={{
            background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)',
            borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
            fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
            letterSpacing: '1px', padding: '10px', cursor: 'pointer', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
          </button>
        </div>
      )}

      {/* Cuenta */}
      {section === 'cuenta' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>EMAIL</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)' }}>{user.email}</div>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>MIEMBRO DESDE</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {new Date((user as { created_at?: string }).created_at ?? Date.now()).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div style={{ background: 'rgba(255,79,123,0.05)', border: '1px solid rgba(255,79,123,0.2)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: 'var(--pink)', letterSpacing: '1px', marginBottom: '8px' }}>
              ZONA PELIGROSA
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Eliminar tu cuenta es permanente. Todos tus posts, seguidores y progreso se borrarán.
            </p>
            <button onClick={handleDeleteAccount} style={{
              background: 'transparent', border: '1px solid var(--pink)',
              borderRadius: 'var(--radius-md)', color: 'var(--pink)',
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              padding: '8px 16px', cursor: 'pointer',
            }}>
              Eliminar cuenta
            </button>
          </div>
        </div>
      )}

      {/* Logros */}
      {section === 'logros' && (
        <div>
          {stats && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {ACHIEVEMENTS.filter(a => a.check(stats)).length} / {ACHIEVEMENTS.length} desbloqueados
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
            {ACHIEVEMENTS.map((a) => {
              const unlocked = stats ? a.check(stats) : false
              return (
                <div key={a.name} style={{
                  background: unlocked ? 'var(--card)' : 'var(--surface)',
                  border: `1px solid ${unlocked ? 'var(--cyan-border)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)', padding: '12px',
                  opacity: unlocked ? 1 : 0.45,
                  transition: 'all var(--transition)',
                }}>
                  <div style={{ fontSize: '22px', marginBottom: '6px' }}>{a.icon}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: unlocked ? 'var(--cyan)' : 'var(--text-muted)', marginBottom: '3px' }}>
                    {a.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    {a.desc}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FAQ */}
      {section === 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {FAQ.map((item) => (
            <div key={item.q} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {item.q}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                {item.a}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
