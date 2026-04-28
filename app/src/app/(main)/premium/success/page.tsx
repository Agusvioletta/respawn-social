'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

export default function PremiumSuccessPage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const [status, setStatus] = useState<'loading' | 'success' | 'pending'>('loading')
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    check()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function check(att = 0) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('profiles').select('premium_tier, premium_since, name_color')
      .eq('id', user!.id).single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tier = (data as any)?.premium_tier
    if (tier === 'pro' || tier === 'elite') {
      setUser({ ...user!, ...data } as typeof user)
      setStatus('success')
    } else if (att < 6) {
      setAttempts(att + 1)
      setTimeout(() => check(att + 1), 3000)
    } else {
      setStatus('pending')
    }
  }

  return (
    <div style={{ maxWidth: '480px', margin: '80px auto', padding: '32px 16px', textAlign: 'center' }}>
      {status === 'loading' && (
        <>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 8px' }}>
            Confirmando tu suscripcion...
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
            Esperando confirmacion de Mercado Pago.
          </p>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 900, color: 'var(--cyan)', margin: '0 0 8px' }}>
            Bienvenido al nivel siguiente!
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
            Tu cuenta ya tiene acceso a todos los beneficios premium.
          </p>
          <button onClick={() => router.push('/feed')} style={{
            background: 'var(--cyan-glow)', border: '1px solid var(--cyan-border)',
            borderRadius: 'var(--radius-md)', color: 'var(--cyan)',
            fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
            letterSpacing: '1px', padding: '12px 32px', cursor: 'pointer',
          }}>
            IR AL FEED
          </button>
        </>
      )}
      {status === 'pending' && (
        <>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 900, color: '#F59E0B', margin: '0 0 8px' }}>
            Pago en proceso
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Mercado Pago esta procesando tu pago. Puede tardar unos minutos.
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '28px' }}>
            Tu cuenta se actualizara automaticamente cuando se confirme.
          </p>
          <button onClick={() => router.push('/feed')} style={{
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '10px 24px', cursor: 'pointer',
          }}>
            Volver al feed
          </button>
        </>
      )}
    </div>
  )
}
