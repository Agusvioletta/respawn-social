import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '404 — Página no encontrada | Respawn' }

export default function NotFound() {
  return (
    <div style={{
      background: 'var(--void)', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', textAlign: 'center',
      fontFamily: 'var(--font-mono)',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Glow de fondo */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 35% at 50% 45%, rgba(0,255,247,0.06) 0%, transparent 70%)',
      }} />

      {/* Tag superior */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '3px', marginBottom: '32px', opacity: 0.6 }}>
        RESPAWN SOCIAL
      </div>

      {/* Número */}
      <div style={{
        fontSize: 'clamp(80px, 20vw, 160px)', fontFamily: 'var(--font-display)',
        fontWeight: 900, color: 'var(--cyan)',
        textShadow: '0 0 60px rgba(0,255,247,0.25), 0 0 120px rgba(0,255,247,0.1)',
        lineHeight: 1, marginBottom: '4px',
        letterSpacing: '-4px',
      }}>
        404
      </div>

      {/* Línea divisora */}
      <div style={{
        width: '200px', height: '1px',
        background: 'linear-gradient(90deg, transparent, var(--cyan), transparent)',
        margin: '16px auto 24px', opacity: 0.5,
      }} />

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--cyan)', letterSpacing: '3px', marginBottom: '16px' }}>
        // PÁGINA NO ENCONTRADA
      </div>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '360px', lineHeight: 1.7, marginBottom: '8px' }}>
        Esta página no existe, fue eliminada o el link está roto.
      </p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '40px' }}>
        Pero Respawn sigue en pie — siempre volvés.
      </p>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/feed" style={{
          padding: '10px 28px', borderRadius: '8px',
          background: 'rgba(0,255,247,0.1)', border: '1px solid var(--cyan-border)',
          fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
          color: 'var(--cyan)', textDecoration: 'none', letterSpacing: '1px',
        }}>
          ↩ VOLVER AL FEED
        </Link>
        <Link href="/" style={{
          padding: '10px 28px', borderRadius: '8px',
          background: 'transparent', border: '1px solid var(--border)',
          fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
          color: 'var(--text-muted)', textDecoration: 'none', letterSpacing: '1px',
        }}>
          INICIO
        </Link>
      </div>
    </div>
  )
}
