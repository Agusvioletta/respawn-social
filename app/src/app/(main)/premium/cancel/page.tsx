'use client'

import Link from 'next/link'

export default function PremiumCancelPage() {
  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>😅</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
        Pago cancelado
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
        No se realizó ningún cargo. Podés volver cuando quieras.
      </p>
      <Link href="/premium" style={{ textDecoration: 'none' }}>
        <button style={{
          background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)',
          borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
          fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
          letterSpacing: '1px', padding: '10px 24px', cursor: 'pointer',
        }}>
          Ver planes →
        </button>
      </Link>
    </div>
  )
}
