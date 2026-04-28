import Link from 'next/link'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--void)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      <header style={{
        borderBottom: '1px solid var(--border)', padding: '0 24px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--deep)',
      }}>
        <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 900, color: 'var(--cyan)', letterSpacing: '2px', textDecoration: 'none' }}>
          RESPAWN
        </Link>
        <Link href="/feed" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Volver al feed
        </Link>
      </header>
      {children}
    </div>
  )
}
