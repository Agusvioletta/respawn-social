'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

const AVATARS = [
  { id: 'avatar1.png', label: '🧑‍💻' },
  { id: 'avatar2.png', label: '👾' },
]

function getPasswordStrength(password: string) {
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordStrength = getPasswordStrength(password)
  const strengthColor = passwordStrength <= 1 ? 'var(--pink)' : passwordStrength <= 3 ? '#F59E0B' : 'var(--cyan)'
  const strengthWidth = `${(passwordStrength / 5) * 100}%`

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!username || !email || !password || !confirmPassword) {
      setError('// Completá todos los campos.')
      return
    }
    if (!selectedAvatar) { setError('// Elegí un avatar.'); return }
    if (password.length < 6) { setError('// Contraseña mínimo 6 caracteres.'); return }
    if (password !== confirmPassword) { setError('// Las contraseñas no coinciden.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('// Email inválido.'); return }
    if (username.length < 3) { setError('// Username mínimo 3 caracteres.'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError('// Solo letras, números y _.'); return }

    setLoading(true)
    try {
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('username', username).maybeSingle()
      if (existing) { setError('// Ese username ya existe.'); return }

      const { data, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw authError

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: profileError } = await (supabase.from('profiles') as any).insert({
        id: data.user!.id,
        username,
        avatar: selectedAvatar,
        bio: '',
        games: [],
        max_level: 1,
      })
      if (profileError) throw profileError

      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) throw loginError

      router.push('/feed')

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo crear la cuenta.'
      setError(`// ${message}`)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
  }

  return (
    <div style={{ width: '100%', maxWidth: '420px' }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px', filter: 'drop-shadow(0 0 10px rgba(0,255,247,0.6))' }}>
          🕹️
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '20px',
          fontWeight: 800,
          letterSpacing: '3px',
          color: 'var(--cyan)',
          textShadow: '0 0 20px rgba(0,255,247,0.4)',
          marginBottom: '4px',
        }}>
          RESPAWN SOCIAL
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
          Creá tu cuenta y empezá a jugar
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '13px',
          letterSpacing: '2px',
          color: 'var(--text-primary)',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          CREAR CUENTA
        </h2>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Avatar selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle}>Elegí tu avatar</label>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {AVATARS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => setSelectedAvatar(av.id)}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--radius-md)',
                    border: selectedAvatar === av.id ? '2px solid var(--cyan)' : '2px solid var(--border)',
                    background: selectedAvatar === av.id ? 'var(--cyan-glow)' : 'var(--surface)',
                    fontSize: '28px',
                    cursor: 'pointer',
                    boxShadow: selectedAvatar === av.id ? '0 0 12px rgba(0,255,247,0.3)' : 'none',
                    transition: 'all var(--transition)',
                  }}
                >
                  {av.label}
                </button>
              ))}
            </div>
          </div>

          {/* Username */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="tu_nick_gamer" autoComplete="username" style={inputStyle} />
          </div>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="gamer@respawn.gg" autoComplete="email" style={inputStyle} />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="new-password" style={inputStyle} />
            {password && (
              <div style={{ height: '3px', background: 'var(--surface)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: strengthWidth, background: strengthColor, transition: 'width 0.3s ease' }} />
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>Confirmá contraseña</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••" autoComplete="new-password" style={inputStyle} />
          </div>

          {/* Error */}
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--pink)', minHeight: '16px', textAlign: 'center' }}>
            {error}
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'transparent',
              border: '1px solid var(--cyan)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--cyan)',
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '2px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all var(--transition)',
            }}
          >
            {loading ? 'CREANDO...' : 'CREAR CUENTA'}
          </button>

        </form>
      </div>

      {/* Footer */}
      <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px' }}>
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" style={{ color: 'var(--cyan)', fontWeight: 600, textDecoration: 'none' }}>
          Iniciá sesión
        </Link>
      </p>

    </div>
  )
}
