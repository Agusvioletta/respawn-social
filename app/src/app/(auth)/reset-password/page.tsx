'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [ready, setReady]         = useState(false)

  // Esperamos a que Supabase confirme que hay una sesión activa
  // (la callback ya hizo el exchangeCodeForSession)
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })
    // También verificamos si ya hay sesión al montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const inputStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    transition: 'border-color var(--transition)',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('// La contraseña tiene que tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('// Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) {
      setError(`// ${err.message}`)
    } else {
      setDone(true)
      setTimeout(() => router.push('/feed'), 2500)
    }
  }

  // Sin sesión todavía — link inválido o expirado
  if (!ready) {
    return (
      <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '36px 28px',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>⏳</div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
            Verificando el link...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: '400px' }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px', filter: 'drop-shadow(0 0 10px rgba(0,255,247,0.6))' }}>
          🔐
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800,
          letterSpacing: '3px', color: 'var(--cyan)',
          textShadow: '0 0 20px rgba(0,255,247,0.4)', marginBottom: '4px',
        }}>
          RESPAWN SOCIAL
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
          Creá tu nueva contraseña
        </p>
      </div>

      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '28px',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '2px',
          color: 'var(--text-primary)', marginBottom: '24px', textAlign: 'center',
        }}>
          NUEVA CONTRASEÑA
        </h2>

        {!done ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                letterSpacing: '2px', color: 'var(--text-muted)',
              }}>
                NUEVA CONTRASEÑA
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  required
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--cyan-border)')}
                  onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)',
                  }}
                >
                  {showPass ? 'ocultar' : 'ver'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                letterSpacing: '2px', color: 'var(--text-muted)',
              }}>
                REPETIR CONTRASEÑA
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Igual que arriba"
                autoComplete="new-password"
                required
                style={{
                  ...inputStyle,
                  borderColor: confirm && confirm !== password ? 'rgba(255,79,123,0.6)' : undefined,
                }}
                onFocus={(e) => (e.target.style.borderColor = password === confirm || !confirm ? 'var(--cyan-border)' : 'rgba(255,79,123,0.6)')}
                onBlur={(e)  => (e.target.style.borderColor = confirm && confirm !== password ? 'rgba(255,79,123,0.6)' : 'var(--border)')}
              />
            </div>

            {error && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--pink)', textAlign: 'center' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              style={{
                width: '100%', padding: '14px',
                background: 'transparent', border: '1px solid var(--cyan)',
                borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
                fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
                letterSpacing: '2px', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading || !password || !confirm ? 0.5 : 1,
                transition: 'all var(--transition)',
              }}
            >
              {loading ? 'GUARDANDO...' : 'GUARDAR CONTRASEÑA'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
            <p style={{
              fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
              color: 'var(--cyan)', letterSpacing: '1px', marginBottom: '10px',
            }}>
              ¡CONTRASEÑA ACTUALIZADA!
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
              Redirigiendo al feed...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
