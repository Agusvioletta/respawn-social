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
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Glow de fondo */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 35% at 50% 45%, rgba(255,79,123,0.06) 0%, transparent 70%)',
      }} />

      {/* Tag superior */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '3px', marginBottom: '32px', opacity: 0.6 }}>
        RESPAWN SOCIAL
      </div>

      {/* Número */}
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(60px, 15vw, 120px)',
        fontWeight: 900, color: 'var(--pink)',
        textShadow: '0 0 40px rgba(255,79,123,0.25), 0 0 80px rgba(255,79,123,0.1)',
        lineHeight: 1, marginBottom: '4px', letterSpacing: '-2px',
      }}>
        500
      </div>

      {/* Línea divisora */}
      <div style={{
        width: '200px', height: '1px',
        background: 'linear-gradient(90deg, transparent, var(--pink), transparent)',
        margin: '16px auto 24px', opacity: 0.5,
      }} />

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--pink)', letterSpacing: '3px', marginBottom: '16px' }}>
        // ERROR INESPERADO
      </div>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.7, marginBottom: '8px' }}>
        Algo salió mal de nuestro lado. Ya lo registramos.
      </p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>
        Podés reintentar o volver al feed.
      </p>

      {error.digest && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '32px', letterSpacing: '1px', opacity: 0.6 }}>
          ref: {error.digest}
        </p>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '10px 28px', borderRadius: '8px',
            background: 'rgba(255,79,123,0.1)', border: '1px solid rgba(255,79,123,0.4)',
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
          ↩ AL FEED
        </a>
      </div>
    </div>
  )
}
