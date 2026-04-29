'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

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
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=/reset-password`
        : `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://respawn-social.vercel.app'}/auth/callback?next=/reset-password`

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    })

    if (err) {
      setError('// No se pudo enviar el email. Verificá la dirección.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{ width: '100%', maxWidth: '400px' }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px', filter: 'drop-shadow(0 0 10px rgba(0,255,247,0.6))' }}>
          🔑
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800,
          letterSpacing: '3px', color: 'var(--cyan)',
          textShadow: '0 0 20px rgba(0,255,247,0.4)', marginBottom: '4px',
        }}>
          RESPAWN SOCIAL
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
          Recuperá tu cuenta, jugador
        </p>
      </div>

      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '28px',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '2px',
          color: 'var(--text-primary)', marginBottom: '8px', textAlign: 'center',
        }}>
          OLVIDÉ MI CONTRASEÑA
        </h2>

        {!sent ? (
          <>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '12px',
              color: 'var(--text-muted)', textAlign: 'center', marginBottom: '24px', lineHeight: '1.6',
            }}>
              Ingresá tu email y te mandamos un link para crear una nueva contraseña.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{
                  fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
                  letterSpacing: '2px', color: 'var(--text-muted)',
                }}>
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gamer@respawn.gg"
                  autoComplete="email"
                  required
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--cyan-border)')}
                  onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {error && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--pink)', textAlign: 'center' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                style={{
                  width: '100%', padding: '14px',
                  background: 'transparent', border: '1px solid var(--cyan)',
                  borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
                  fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
                  letterSpacing: '2px', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading || !email.trim() ? 0.5 : 1,
                  transition: 'all var(--transition)',
                }}
              >
                {loading ? 'ENVIANDO...' : 'ENVIAR LINK'}
              </button>
            </form>
          </>
        ) : (
          /* Estado: email enviado */
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📬</div>
            <p style={{
              fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
              color: 'var(--cyan)', letterSpacing: '1px', marginBottom: '10px',
            }}>
              ¡LINK ENVIADO!
            </p>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.7',
            }}>
              Revisá tu bandeja de entrada (y el spam por las dudas).
              El link expira en 1 hora.
            </p>
          </div>
        )}
      </div>

      <p style={{
        textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px',
        color: 'var(--text-muted)', marginTop: '20px',
      }}>
        <Link href="/login" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>
          ← Volver al login
        </Link>
      </p>

    </div>
  )
}
