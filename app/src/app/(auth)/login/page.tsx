'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const setUser      = useAuthStore((s) => s.setUser)
  const supabase     = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Mostrar error si el link de reset fue inválido/expirado
  useEffect(() => {
    if (searchParams.get('error') === 'link_invalido') {
      setError('// El link expiró o es inválido. Pedí uno nuevo.')
    }
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('// Completá todos los campos.')
      return
    }

    setLoading(true)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profile) setUser(Object.assign({}, profile, { email: data.user.email! }))
      router.push('/feed')
    } catch {
      setError('// Email o contraseña incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '400px' }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px', filter: 'drop-shadow(0 0 10px rgba(0,255,247,0.6))' }}>
          🕹️
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '22px',
          fontWeight: 800,
          letterSpacing: '3px',
          color: 'var(--cyan)',
          textShadow: '0 0 20px rgba(0,255,247,0.4)',
          marginBottom: '4px',
        }}>
          RESPAWN SOCIAL
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
          Bienvenido de vuelta, jugador
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
          fontSize: '14px',
          letterSpacing: '2px',
          color: 'var(--text-primary)',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          INICIAR SESIÓN
        </h2>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              fontFamily: 'var(--font-display)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gamer@respawn.gg"
              autoComplete="email"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color var(--transition)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--cyan-border)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              fontFamily: 'var(--font-display)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color var(--transition)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--cyan-border)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Olvidé mi contraseña */}
          <div style={{ textAlign: 'right', marginTop: '-8px' }}>
            <Link href="/forgot-password" style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: 'var(--text-muted)', textDecoration: 'none',
              transition: 'color var(--transition)',
            }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--cyan)')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--text-muted)')}
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* Error */}
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--pink)',
            minHeight: '16px',
            textAlign: 'center',
          }}>
            {error}
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? 'var(--surface)' : 'transparent',
              border: '1px solid var(--cyan)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--cyan)',
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '2px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition)',
              textShadow: '0 0 10px rgba(0,255,247,0.4)',
            }}
          >
            {loading ? 'ENTRANDO...' : 'INICIAR SESIÓN'}
          </button>

        </form>
      </div>

      {/* Footer */}
      <p style={{
        textAlign: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        color: 'var(--text-muted)',
        marginTop: '20px',
      }}>
        ¿No tenés cuenta?{' '}
        <Link href="/signup" style={{ color: 'var(--cyan)', fontWeight: 600, textDecoration: 'none' }}>
          Registrate
        </Link>
      </p>

    </div>
  )
}
