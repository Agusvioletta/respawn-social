'use client'

import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[App Error]', error)
  }, [error])

  return (
    <div style={{
      background: 'var(--void)', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(60px, 15vw, 120px)',
        fontWeight: 900, color: 'var(--pink)',
        textShadow: '0 0 40px rgba(255,79,123,0.3)',
        lineHeight: 1, marginBottom: '12px', letterSpacing: '-2px',
      }}>
        500
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--pink)', letterSpacing: '3px', marginBottom: '20px' }}>
        // ERROR INESPERADO
      </div>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--text-muted)', maxWidth: '400px', lineHeight: 1.6, marginBottom: '40px' }}>
        Algo salió mal. Ya registramos el error. Podés intentar recargar la página o volver al feed.
      </p>

      {error.digest && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '32px', letterSpacing: '1px' }}>
          Código: {error.digest}
        </p>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '10px 28px', borderRadius: '8px',
            background: 'rgba(255,79,123,0.1)', border: '1px solid var(--pink)',
            fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
            color: 'var(--pink)', cursor: 'pointer', letterSpacing: '1px',
          }}
        >
          REINTENTAR
        </button>
        <a href="/feed" style={{
          padding: '10px 28px', borderRadius: '8px',
          background: 'transparent', border: '1px solid var(--border)',
          fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
          color: 'var(--text-muted)', textDecoration: 'none', letterSpacing: '1px',
        }}>
          ← AL FEED
        </a>
      </div>
    </div>
  )
}
