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

type Section = 'perfil' | 'privacidad' | 'notificaciones' | 'seguridad' | 'cuenta' | 'logros' | 'faq'

const SECTIONS: { id: Section; icon: string; label: string }[] = [
  { id: 'perfil',        icon: '👤', label: 'Perfil' },
  { id: 'privacidad',    icon: '🔒', label: 'Privacidad' },
  { id: 'notificaciones',icon: '🔔', label: 'Notificaciones' },
  { id: 'seguridad',     icon: '🛡️', label: 'Seguridad' },
  { id: 'cuenta',        icon: '🔑', label: 'Cuenta' },
  { id: 'logros',        icon: '🏆', label: 'Logros' },
  { id: 'faq',           icon: '❓', label: 'FAQ' },
]

const FAQ = [
  { q: '¿Cómo subo de nivel?', a: 'Publicando posts, consiguiendo likes y seguidores, y completando juegos del arcade. Cada acción suma XP.' },
  { q: '¿Cómo desbloqueo más juegos?', a: 'Completá el juego anterior en el arcade. Snake → Pong → Breakout → Asteroids → Flappy → Tetris → Dino → Space Invaders.' },
  { q: '¿Se puede cambiar el avatar?', a: 'Sí, desde esta página en la sección "Perfil".' },
  { q: '¿Los datos se guardan en la nube?', a: 'Sí, usamos Supabase (PostgreSQL). Tus datos están seguros y encriptados.' },
  { q: '¿Qué es un post LFG?', a: '"Looking for Group" — un post especial para buscar compañeros de juego. Podés indicar el juego, plataforma y cuántos lugares quedan.' },
  { q: '¿Qué hace la privacidad de posts?', a: 'Controla quién puede ver tus publicaciones. "Solo seguidores" oculta tus posts a quienes no te siguen.' },
  { q: '¿Cómo reporto un usuario?', a: 'La función de reportes está en desarrollo. Próximamente.' },
]

export default function SettingsPage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const supabase = createClient()

  const [section, setSection] = useState<Section>('perfil')

  // Perfil
  const [form, setForm] = useState({ username: '', bio: '', games: ['', '', ''], nowPlaying: '' })
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Privacidad
  const [privacy, setPrivacy] = useState({
    posts: 'public' as 'public' | 'followers' | 'private',
    messages: 'everyone' as 'everyone' | 'followers' | 'none',
    showFollowers: true,
    showFollowing: true,
  })
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [privacyMsg, setPrivacyMsg] = useState('')

  // Notificaciones
  const [notifs, setNotifs] = useState({
    likes: true, comments: true, follows: true, messages: true, tournaments: true,
  })
  const [savingNotifs, setSavingNotifs] = useState(false)
  const [notifsMsg, setNotifsMsg] = useState('')

  // Seguridad
  const [pwForm, setPwForm] = useState({ newPw: '', confirmPw: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Stats
  const [stats, setStats] = useState<D | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = user as any

  useEffect(() => {
    if (!user) return
    setForm({
      username: user.username,
      bio: user.bio ?? '',
      games: [...((u.games ?? ['', '', '']), '', '', '')].slice(0, 3),
      nowPlaying: u.now_playing ?? '',
    })
    setSelectedAvatar(user.avatar ?? '/avatar1.png')
    setPrivacy({
      posts: u.privacy_posts ?? 'public',
      messages: u.privacy_messages ?? 'everyone',
      showFollowers: u.privacy_show_followers ?? true,
      showFollowing: u.privacy_show_following ?? true,
    })
    setNotifs({
      likes:       u.notif_likes       ?? true,
      comments:    u.notif_comments    ?? true,
      follows:     u.notif_follows     ?? true,
      messages:    u.notif_messages    ?? true,
      tournaments: u.notif_tournaments ?? true,
    })
    loadStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const xp = calculateXP({ posts: posts?.length ?? 0, followers: followers?.length ?? 0, following: following?.length ?? 0, likes: totalLikes, gameLevels: user.max_level })
    const { level } = xpLevel(xp)
    setStats({ posts: posts?.length ?? 0, following: following?.length ?? 0, followers: followers?.length ?? 0, likes: totalLikes, maxLevel: user.max_level, tournamentsJoined: tournaments?.length ?? 0, tournamentsCreated: createdTournaments?.length ?? 0, dmsSent: msgs?.length ?? 0, level })
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
        now_playing: form.nowPlaying.trim() || null,
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

  async function handleSavePrivacy() {
    if (!user) return
    setSavingPrivacy(true); setPrivacyMsg('')
    try {
      const updates = {
        privacy_posts: privacy.posts,
        privacy_messages: privacy.messages,
        privacy_show_followers: privacy.showFollowers,
        privacy_show_following: privacy.showFollowing,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('profiles').update(updates).eq('id', user.id)
      if (error) throw error
      setUser({ ...user, ...updates } as typeof user)
      setPrivacyMsg('✓ Privacidad actualizada.')
    } catch (e: unknown) {
      setPrivacyMsg('⚠ ' + (e instanceof Error ? e.message : 'Error'))
    } finally {
      setSavingPrivacy(false)
    }
  }

  async function handleSaveNotifs() {
    if (!user) return
    setSavingNotifs(true); setNotifsMsg('')
    try {
      const updates = {
        notif_likes: notifs.likes,
        notif_comments: notifs.comments,
        notif_follows: notifs.follows,
        notif_messages: notifs.messages,
        notif_tournaments: notifs.tournaments,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('profiles').update(updates).eq('id', user.id)
      if (error) throw error
      setUser({ ...user, ...updates } as typeof user)
      setNotifsMsg('✓ Preferencias guardadas.')
    } catch (e: unknown) {
      setNotifsMsg('⚠ ' + (e instanceof Error ? e.message : 'Error'))
    } finally {
      setSavingNotifs(false)
    }
  }

  async function handleChangePassword() {
    if (!pwForm.newPw || !pwForm.confirmPw) { setPwMsg('⚠ Completá ambos campos.'); return }
    if (pwForm.newPw.length < 8) { setPwMsg('⚠ La contraseña debe tener al menos 8 caracteres.'); return }
    if (pwForm.newPw !== pwForm.confirmPw) { setPwMsg('⚠ Las contraseñas no coinciden.'); return }
    setSavingPw(true); setPwMsg('')
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
      if (error) throw error
      setPwMsg('✓ Contraseña actualizada correctamente.')
      setPwForm({ newPw: '', confirmPw: '' })
    } catch (e: unknown) {
      setPwMsg('⚠ ' + (e instanceof Error ? e.message : 'Error'))
    } finally {
      setSavingPw(false)
    }
  }

  async function handleSignOutAll() {
    if (!confirm('¿Cerrar sesión en todos los dispositivos?')) return
    await supabase.auth.signOut({ scope: 'global' })
    setUser(null)
    router.push('/login')
  }

  async function handleDeleteAccount() {
    const confirm1 = confirm('¿Segura? Esta acción es IRREVERSIBLE. Se borrarán todos tus posts, seguidores y progreso.')
    if (!confirm1) return
    const input = window.prompt('Escribí tu username para confirmar:')
    if (input !== user?.username) { alert('Username incorrecto. Operación cancelada.'); return }
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
    padding: '6px 12px', cursor: 'pointer' as const,
    transition: 'all var(--transition)',
    whiteSpace: 'nowrap' as const,
  })

  const inputStyle = {
    width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '9px 12px',
    color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
    fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    fontFamily: 'var(--font-mono)', fontSize: '10px',
    color: 'var(--text-muted)', marginBottom: '6px',
    letterSpacing: '1px', display: 'block' as const,
  }

  const cardStyle = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '16px',
  }

  const saveBtn = (onClick: () => void, saving: boolean, label = 'GUARDAR') => (
    <button onClick={onClick} disabled={saving} style={{
      background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)',
      borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
      fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
      letterSpacing: '1px', padding: '10px', cursor: 'pointer', opacity: saving ? 0.6 : 1,
      width: '100%',
    }}>
      {saving ? 'GUARDANDO...' : label}
    </button>
  )

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
        <div style={{ ...cardStyle, marginBottom: '20px' }}>
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
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--cyan), var(--purple))', borderRadius: '3px', transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
            {current} / {needed} XP al siguiente nivel
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {SECTIONS.map((s) => (
          <button key={s.id} style={tabStyle(s.id)} onClick={() => setSection(s.id)}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ── PERFIL ── */}
      {section === 'perfil' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <span style={labelStyle}>AVATAR</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              {AVATARS.map((av) => (
                <button key={av.id} onClick={() => setSelectedAvatar(av.src)} style={{
                  background: 'transparent',
                  border: `2px solid ${selectedAvatar === av.src ? 'var(--cyan)' : 'var(--border)'}`,
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
            <span style={labelStyle}>USERNAME</span>
            <input style={inputStyle} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>

          <div>
            <span style={labelStyle}>BIO</span>
            <textarea style={{ ...inputStyle, resize: 'none', minHeight: '80px' }} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Contá quién sos..." />
          </div>

          <div>
            <span style={labelStyle}>JUEGOS FAVORITOS</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[0, 1, 2].map((i) => (
                <input key={i} style={inputStyle} placeholder={`Juego ${i + 1}`} value={form.games[i] ?? ''} onChange={e => setForm(f => { const g = [...f.games]; g[i] = e.target.value; return { ...f, games: g } })} />
              ))}
            </div>
          </div>

          <div>
            <span style={labelStyle}>🎮 JUGANDO AHORA</span>
            <input
              style={inputStyle}
              value={form.nowPlaying}
              onChange={e => setForm(f => ({ ...f, nowPlaying: e.target.value.slice(0, 60) }))}
              placeholder="ej: Valorant, Minecraft, The Witcher 3..."
            />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Visible en tu perfil y en la barra lateral. Máx 60 caracteres.
            </div>
          </div>

          {saveMsg && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: saveMsg.startsWith('✓') ? 'var(--cyan)' : 'var(--pink)' }}>
              {saveMsg}
            </div>
          )}
          {saveBtn(handleSaveProfile, saving, 'GUARDAR CAMBIOS')}
        </div>
      )}

      {/* ── PRIVACIDAD ── */}
      {section === 'privacidad' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={cardStyle}>
            <span style={{ ...labelStyle, marginBottom: '12px' }}>VISIBILIDAD DE POSTS</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {([
                { val: 'public',    label: 'Público', desc: 'Cualquier persona puede ver tus posts' },
                { val: 'followers', label: 'Solo seguidores', desc: 'Solo quienes te siguen pueden verlos' },
                { val: 'private',   label: 'Privado', desc: 'Nadie más puede ver tus posts' },
              ] as const).map((opt) => (
                <label key={opt.val} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input type="radio" name="privacy_posts" value={opt.val}
                    checked={privacy.posts === opt.val}
                    onChange={() => setPrivacy(p => ({ ...p, posts: opt.val }))}
                    style={{ marginTop: '2px', accentColor: 'var(--cyan)' }}
                  />
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>{opt.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <span style={{ ...labelStyle, marginBottom: '12px' }}>¿QUIÉN PUEDE ENVIARTE DMs?</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {([
                { val: 'everyone',  label: 'Todos', desc: 'Cualquier usuario puede escribirte' },
                { val: 'followers', label: 'Solo seguidores', desc: 'Solo quienes te siguen' },
                { val: 'none',      label: 'Nadie', desc: 'Cerrás los mensajes directos' },
              ] as const).map((opt) => (
                <label key={opt.val} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input type="radio" name="privacy_messages" value={opt.val}
                    checked={privacy.messages === opt.val}
                    onChange={() => setPrivacy(p => ({ ...p, messages: opt.val }))}
                    style={{ marginTop: '2px', accentColor: 'var(--cyan)' }}
                  />
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>{opt.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <span style={{ ...labelStyle, marginBottom: '12px' }}>VISIBILIDAD DE LISTAS</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {([
                { key: 'showFollowers', label: 'Mostrar mis seguidores', desc: 'Otros pueden ver quién te sigue' },
                { key: 'showFollowing', label: 'Mostrar a quiénes sigo', desc: 'Otros pueden ver tu lista de seguidos' },
              ] as const).map((opt) => (
                <div key={opt.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>{opt.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                  <button
                    onClick={() => setPrivacy(p => ({ ...p, [opt.key]: !p[opt.key] }))}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                      background: privacy[opt.key] ? 'var(--cyan)' : 'var(--surface)',
                      cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: '3px',
                      left: privacy[opt.key] ? '22px' : '3px',
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: privacy[opt.key] ? 'var(--void)' : 'var(--text-muted)',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {privacyMsg && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: privacyMsg.startsWith('✓') ? 'var(--cyan)' : 'var(--pink)' }}>
              {privacyMsg}
            </div>
          )}
          {saveBtn(handleSavePrivacy, savingPrivacy, 'GUARDAR PRIVACIDAD')}
        </div>
      )}

      {/* ── NOTIFICACIONES ── */}
      {section === 'notificaciones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={cardStyle}>
            <span style={{ ...labelStyle, marginBottom: '16px' }}>ACTIVAR / DESACTIVAR NOTIFICACIONES</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {([
                { key: 'likes',       icon: '♥', label: 'Likes', desc: 'Cuando alguien le da like a tus posts' },
                { key: 'comments',    icon: '💬', label: 'Comentarios', desc: 'Cuando alguien comenta tus posts' },
                { key: 'follows',     icon: '👤', label: 'Nuevos seguidores', desc: 'Cuando alguien empieza a seguirte' },
                { key: 'messages',    icon: '✉️', label: 'Mensajes directos', desc: 'Cuando recibís un DM' },
                { key: 'tournaments', icon: '🏆', label: 'Torneos', desc: 'Actualizaciones de torneos en los que participás' },
              ] as const).map((item) => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{item.icon}</span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>{item.label}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{item.desc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifs(n => ({ ...n, [item.key]: !n[item.key] }))}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                      background: notifs[item.key] ? 'var(--cyan)' : 'var(--surface)',
                      cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: '3px',
                      left: notifs[item.key] ? '22px' : '3px',
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: notifs[item.key] ? 'var(--void)' : 'var(--text-muted)',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {notifsMsg && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: notifsMsg.startsWith('✓') ? 'var(--cyan)' : 'var(--pink)' }}>
              {notifsMsg}
            </div>
          )}
          {saveBtn(handleSaveNotifs, savingNotifs, 'GUARDAR NOTIFICACIONES')}
        </div>
      )}

      {/* ── SEGURIDAD ── */}
      {section === 'seguridad' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Cambiar contraseña */}
          <div style={cardStyle}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '1px', marginBottom: '14px' }}>
              🔑 CAMBIAR CONTRASEÑA
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={labelStyle}>NUEVA CONTRASEÑA</span>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    style={{ ...inputStyle, paddingRight: '40px' }}
                    value={pwForm.newPw}
                    onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px',
                  }}>
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div>
                <span style={labelStyle}>CONFIRMAR CONTRASEÑA</span>
                <input
                  type={showPw ? 'text' : 'password'}
                  style={inputStyle}
                  value={pwForm.confirmPw}
                  onChange={e => setPwForm(f => ({ ...f, confirmPw: e.target.value }))}
                  placeholder="Repetí la nueva contraseña"
                />
              </div>
              {pwMsg && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: pwMsg.startsWith('✓') ? 'var(--cyan)' : 'var(--pink)' }}>
                  {pwMsg}
                </div>
              )}
              <button onClick={handleChangePassword} disabled={savingPw} style={{
                background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)',
                borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
                fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
                letterSpacing: '1px', padding: '10px', cursor: 'pointer', opacity: savingPw ? 0.6 : 1,
              }}>
                {savingPw ? 'CAMBIANDO...' : 'CAMBIAR CONTRASEÑA'}
              </button>
            </div>
          </div>

          {/* Info de sesión */}
          <div style={cardStyle}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '1px', marginBottom: '12px' }}>
              🖥️ SESIÓN ACTIVA
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
              <div>ID de usuario: <span style={{ color: 'var(--text-secondary)' }}>{user.id.slice(0, 16)}...</span></div>
              <div>Email: <span style={{ color: 'var(--text-secondary)' }}>{user.email}</span></div>
              <div>Miembro desde: <span style={{ color: 'var(--text-secondary)' }}>
                {new Date((u.created_at ?? Date.now())).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span></div>
            </div>
          </div>

          {/* Cerrar todas las sesiones */}
          <div style={{ background: 'rgba(255,170,0,0.05)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: '#FFAA00', letterSpacing: '1px', marginBottom: '8px' }}>
              ⚠️ CERRAR TODAS LAS SESIONES
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Cerrará la sesión en todos los dispositivos donde hayas ingresado. Tendrás que volver a loguearte.
            </p>
            <button onClick={handleSignOutAll} style={{
              background: 'transparent', border: '1px solid #FFAA00',
              borderRadius: 'var(--radius-md)', color: '#FFAA00',
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              padding: '8px 16px', cursor: 'pointer',
            }}>
              Cerrar todas las sesiones
            </button>
          </div>
        </div>
      )}

      {/* ── CUENTA ── */}
      {section === 'cuenta' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={cardStyle}>
            <span style={{ ...labelStyle, marginBottom: '4px' }}>EMAIL</span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)' }}>{user.email}</div>
          </div>
          <div style={cardStyle}>
            <span style={{ ...labelStyle, marginBottom: '4px' }}>MIEMBRO DESDE</span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {new Date((u.created_at ?? Date.now())).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div style={cardStyle}>
            <span style={{ ...labelStyle, marginBottom: '4px' }}>ESTADÍSTICAS</span>
            {stats ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Posts', value: stats.posts },
                  { label: 'Seguidores', value: stats.followers },
                  { label: 'Seguidos', value: stats.following },
                  { label: 'Likes recibidos', value: stats.likes },
                  { label: 'Torneos', value: stats.tournamentsJoined },
                  { label: 'DMs enviados', value: stats.dmsSent },
                ].map((s) => (
                  <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>{s.label.toUpperCase()}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--cyan)' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>Cargando...</div>
            )}
          </div>

          <div style={{ background: 'rgba(255,79,123,0.05)', border: '1px solid rgba(255,79,123,0.2)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: 'var(--pink)', letterSpacing: '1px', marginBottom: '8px' }}>
              ZONA PELIGROSA
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Eliminar tu cuenta es permanente e irreversible. Se borrarán todos tus posts, seguidores, mensajes y progreso del arcade. Se te pedirá confirmar con tu username.
            </p>
            <button onClick={handleDeleteAccount} style={{
              background: 'transparent', border: '1px solid var(--pink)',
              borderRadius: 'var(--radius-md)', color: 'var(--pink)',
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              padding: '8px 16px', cursor: 'pointer',
            }}>
              Eliminar cuenta permanentemente
            </button>
          </div>
        </div>
      )}

      {/* ── LOGROS ── */}
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

      {/* ── FAQ ── */}
      {section === 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {FAQ.map((item) => (
            <div key={item.q} style={cardStyle}>
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
