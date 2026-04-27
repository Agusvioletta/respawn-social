'use client'

import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'

export default function PremiumSuccessPage() {
  const { user } = useAuthStore()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tier = ((user as any)?.premium_tier ?? 'pro') as string
  const isElite = tier === 'elite'

  return (
    <div style={{ maxWidth: '480px', margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
      <div style={{ fontSize: '56px', marginBottom: '20px' }}>{isElite ? '👑' : '⚡'}</div>

      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 900,
        background: isElite
          ? 'linear-gradient(90deg, #FFD700, #FFA500)'
          : 'linear-gradient(90deg, var(--cyan), var(--purple))',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        marginBottom: '12px',
      }}>
        ¡Bienvenido a {isElite ? 'Elite' : 'Pro'}!
      </h1>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '32px' }}>
        Tu suscripción está activa. Los beneficios ya aparecen en tu perfil.
      </p>

      <div style={{
        background: 'var(--card)', border: `1px solid ${isElite ? 'rgba(255,215,0,0.3)' : 'var(--cyan-border)'}`,
        borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '28px',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '2px', marginBottom: '12px' }}>
          TUS BENEFICIOS ACTIVOS
        </div>
        {(isElite ? [
          '👑 Badge Elite animado en perfil y posts',
          '📊 Estadísticas del perfil',
          '🏆 Torneos con prize pool real',
          '🎨 Color de nombre personalizado',
          '📹 Clips súper destacados',
        ] : [
          '⚡ Badge Pro en perfil y posts',
          '💬 Posts hasta 500 caracteres',
          '🏆 Crear torneos',
          '🔍 Destacado en Explorar',
          '📹 Clips destacados',
        ]).map(b => (
          <div key={b} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)' }}>{b}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <Link href={`/profile/${user?.username ?? ''}`} style={{ textDecoration: 'none' }}>
          <button style={{
            background: isElite ? 'rgba(255,215,0,0.12)' : 'var(--cyan-glow)',
            border: `1px solid ${isElite ? 'rgba(255,215,0,0.4)' : 'var(--cyan-border)'}`,
            borderRadius: 'var(--radius-md)', color: isElite ? '#FFD700' : 'var(--cyan)',
            fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
            letterSpacing: '1px', padding: '10px 20px', cursor: 'pointer',
          }}>
            Ver mi perfil →
          </button>
        </Link>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            padding: '10px 20px', cursor: 'pointer',
          }}>
            Ir al feed
          </button>
        </Link>
      </div>
    </div>
  )
}
