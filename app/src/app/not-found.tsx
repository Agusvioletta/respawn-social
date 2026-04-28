import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '404 — Página no encontrada' }

export default function NotFound() {
  return (
    <div style={{
      background: 'var(--void)', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', textAlign: 'center', gap: '0',
      fontFamily: 'var(--font-mono)',
    }}>
      <div style={{
        fontSize: 'clamp(80px, 20vw, 160px)', fontFamily: 'var(--font-display)',
        fontWeight: 900, color: 'var(--cyan)',
        textShadow: '0 0 60px rgba(0,255,247,0.3)',
        lineHeight: 1, marginBottom: '8px',
        letterSpacing: '-4px',
      }}>
        404
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--cyan)', letterSpacing: '3px', marginBottom: '24px' }}>
        // PÁGINA NO ENCONTRADA
      </div>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--text-muted)', maxWidth: '360px', lineHeight: 1.6, marginBottom: '40px' }}>
        Esta página no existe, fue eliminada o nunca estuvo aquí. Revisá la URL o volvé al feed.
      </p>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/feed" style={{
          padding: '10px 28px', borderRadius: '8px',
          background: 'rgba(0,255,247,0.1)', border: '1px solid var(--cyan)',
          fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
          color: 'var(--cyan)', textDecoration: 'none', letterSpacing: '1px',
        }}>
          ← VOLVER AL FEED
        </Link>
        <Link href="/" style={{
          padding: '10px 28px', borderRadius: '8px',
          background: 'transparent', border: '1px solid var(--border)',
          fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
          color: 'var(--text-muted)', textDecoration: 'none', letterSpacing: '1px',
        }}>
          LANDING
        </Link>
      </div>
    </div>
  )
}
