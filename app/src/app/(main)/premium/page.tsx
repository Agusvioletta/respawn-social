'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { createClient } from '@/lib/supabase/client'

type Tier = 'pro' | 'elite'
type Billing = 'monthly' | 'yearly'

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    emoji: '🎮',
    price: { monthly: 0, yearly: 0 },
    color: 'var(--text-muted)',
    border: 'var(--border)',
    badge: null,
    features: [
      'Feed, posts y perfil',
      'Arcade completo',
      'Mensajes directos',
      'Inscribirse a torneos',
      'Foto de perfil y banner',
      'Subir clips de gameplay',
    ],
    disabled: [],
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    emoji: '⚡',
    price: { monthly: 3, yearly: 25 },
    color: 'var(--cyan)',
    border: 'var(--cyan-border)',
    badge: 'PRO',
    badgeColor: 'var(--cyan)',
    badgeBg: 'var(--cyan-glow)',
    features: [
      'Todo lo de Free',
      'Badge ⚡ PRO en perfil y posts',
      'Posts hasta 500 caracteres',
      'Crear torneos',
      'Destacado en Explorar',
      'Clips destacados en el feed',
      'Historial de notificaciones extendido',
    ],
    disabled: [],
    highlight: false,
  },
  {
    id: 'elite' as const,
    name: 'Elite',
    emoji: '👑',
    price: { monthly: 7, yearly: 59 },
    color: '#FFD700',
    border: 'rgba(255,215,0,0.4)',
    badge: 'ELITE',
    badgeColor: '#FFD700',
    badgeBg: 'rgba(255,215,0,0.1)',
    features: [
      'Todo lo de Pro',
      'Badge 👑 ELITE animado',
      'Estadísticas del perfil',
      'Torneos con entry fee y prize pool',
      'Color de nombre personalizado',
      'Clips súper destacados',
    ],
    disabled: [],
    highlight: true,
  },
]

const FAQS = [
  { q: '¿Puedo cancelar cuando quiero?', a: 'Sí. Cancelás desde Configuración → Cuenta y no se renueva el siguiente período.' },
  { q: '¿Qué pasa si cancelo?', a: 'Mantenés los beneficios hasta el fin del período pagado. Después volvés a Free sin perder tu contenido.' },
  { q: '¿Hay período de prueba?', a: 'Por ahora no, pero estamos evaluando agregarlo próximamente.' },
  { q: '¿Cómo funciona el pago anual?', a: 'Pagás todo de una vez con descuento. Pro anual = $25 (ahorrás $11), Elite anual = $59 (ahorrás $25).' },
  { q: '¿Puedo cambiar de plan?', a: 'Sí, podés subir o bajar de plan cuando quieras. El cambio se aplica en el próximo ciclo.' },
]

export default function PremiumPage() {
  const { user } = useAuthStore()
  const [billing, setBilling] = useState<Billing>('monthly')
  const [loading, setLoading] = useState<Tier | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentTier = ((user as any)?.premium_tier ?? 'free') as string

  async function handleCheckout(tier: Tier) {
    if (!user) return
    setLoading(tier)
    try {
      // Obtener el token de sesión para autenticarnos en la API route
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''

      const res = await fetch('/api/mercadopago/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tier, billing }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error ?? 'Error al iniciar el pago.')
      }
    } catch {
      alert('Error de conexión.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 16px 60px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '4px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          RESPAWN PREMIUM
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 12px', lineHeight: 1.2 }}>
          Llevá tu perfil<br />
          <span style={{ background: 'linear-gradient(90deg, var(--cyan), var(--purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            al siguiente nivel
          </span>
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
          Destacate en la comunidad, creá torneos y accedé a features exclusivos.
        </p>

        {/* Billing toggle */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0', marginTop: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '3px' }}>
          {(['monthly', 'yearly'] as Billing[]).map(b => (
            <button key={b} onClick={() => setBilling(b)} style={{
              background: billing === b ? 'var(--card)' : 'transparent',
              border: 'none', borderRadius: 'var(--radius-sm)',
              color: billing === b ? 'var(--text-primary)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              padding: '6px 16px', cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {b === 'monthly' ? 'Mensual' : 'Anual'}
              {b === 'yearly' && (
                <span style={{ background: 'rgba(0,255,247,0.15)', color: 'var(--cyan)', fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px', letterSpacing: '0.5px' }}>
                  -30%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plans grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '60px' }}>
        {PLANS.map(plan => {
          const isCurrent = currentTier === plan.id
          const isHighlight = plan.id === 'elite'
          const price = plan.price[billing]

          return (
            <div key={plan.id} style={{
              background: isHighlight ? 'linear-gradient(180deg, rgba(255,215,0,0.04), var(--card))' : 'var(--card)',
              border: `1px solid ${isCurrent ? plan.color : isHighlight ? plan.border : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: isHighlight ? '0 0 40px rgba(255,215,0,0.06)' : 'none',
              transition: 'all var(--transition)',
            }}>

              {/* Top glow line */}
              {isHighlight && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #FFD700, transparent)' }} />
              )}

              {/* Popular badge */}
              {isHighlight && (
                <div style={{
                  position: 'absolute', top: '16px', right: '16px',
                  background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.4)',
                  borderRadius: '20px', padding: '2px 10px',
                  fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700,
                  color: '#FFD700', letterSpacing: '1px',
                }}>
                  POPULAR
                </div>
              )}

              {/* Plan header */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{plan.emoji}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 900, color: plan.color, letterSpacing: '1px' }}>
                    {plan.name}
                  </span>
                  {isCurrent && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: plan.color, background: `${plan.color}22`, border: `1px solid ${plan.color}44`, borderRadius: '20px', padding: '1px 8px' }}>
                      TU PLAN
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  {price === 0 ? (
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)' }}>Gratis</span>
                  ) : (
                    <>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)' }}>${price}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                        /{billing === 'monthly' ? 'mes' : 'año'}
                      </span>
                    </>
                  )}
                </div>
                {billing === 'yearly' && price > 0 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cyan)', marginTop: '2px' }}>
                    equiv. ${Math.round(price / 12 * 10) / 10}/mes
                  </div>
                )}
              </div>

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: plan.id === 'free' ? 'var(--text-muted)' : plan.color, fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {plan.id === 'free' ? (
                <div style={{
                  width: '100%', padding: '10px',
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  color: 'var(--text-muted)', textAlign: 'center',
                }}>
                  {isCurrent ? '// tu plan actual' : 'Siempre gratis'}
                </div>
              ) : isCurrent ? (
                <div style={{
                  width: '100%', padding: '10px',
                  background: `${plan.color}11`, border: `1px solid ${plan.color}44`,
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  color: plan.color, textAlign: 'center',
                }}>
                  ✓ Plan activo
                </div>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.id as Tier)}
                  disabled={loading === plan.id}
                  style={{
                    width: '100%', padding: '11px',
                    background: isHighlight ? 'rgba(255,215,0,0.12)' : 'var(--cyan-glow)',
                    border: `1px solid ${isHighlight ? 'rgba(255,215,0,0.5)' : 'var(--cyan-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    color: isHighlight ? '#FFD700' : 'var(--cyan)',
                    fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
                    letterSpacing: '1px', cursor: 'pointer',
                    opacity: loading === plan.id ? 0.6 : 1,
                    transition: 'all var(--transition)',
                  }}
                >
                  {loading === plan.id ? 'Redirigiendo...' : `Obtener ${plan.name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '3px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '20px' }}>
          PREGUNTAS FRECUENTES
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{faq.q}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', flexShrink: 0, marginLeft: '12px', transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(180deg)' : 'none' }}>▾</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 16px 14px', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
