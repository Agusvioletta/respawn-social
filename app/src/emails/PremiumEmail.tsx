import {
  Body, Container, Head, Heading, Hr, Html,
  Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface Props {
  username: string
  tier: 'pro' | 'elite'
  planName: string
}

export function PremiumEmail({ username, tier, planName }: Props) {
  const isElite = tier === 'elite'
  const accentColor = isElite ? '#C084FC' : '#00FFF7'
  const tierLabel = isElite ? '👑 ELITE' : '⚡ PRO'

  const perks = isElite
    ? [
        '500 caracteres por publicación',
        'Crear torneos ilimitados',
        'Color de nombre personalizado',
        'Estadísticas avanzadas en tu perfil',
        'Badge Elite exclusivo en todos tus posts',
      ]
    : [
        '500 caracteres por publicación',
        'Crear torneos ilimitados',
        'Badge Pro en todos tus posts',
      ]

  return (
    <Html lang="es">
      <Head />
      <Preview>{tierLabel} activado en Respawn Social, @{username} 🎉</Preview>
      <Body style={{ ...body, backgroundColor: '#07070F' }}>
        <Container style={container}>

          {/* Header */}
          <Section style={{ padding: '28px 32px 20px', textAlign: 'center' }}>
            <Heading style={{ color: accentColor, fontSize: '28px', fontWeight: 900, letterSpacing: '4px', margin: 0 }}>
              RESPAWN
            </Heading>
            <Text style={{ color: '#555570', fontSize: '11px', letterSpacing: '1px', margin: '4px 0 0', fontFamily: 'monospace' }}>
              el lugar donde siempre volvés
            </Text>
          </Section>

          <Hr style={{ borderColor: 'rgba(255,255,255,0.07)', margin: 0 }} />

          {/* Badge */}
          <Section style={{ padding: '32px 32px 16px', textAlign: 'center' }}>
            <Text style={{ fontSize: '48px', margin: '0 0 12px' }}>
              {isElite ? '👑' : '⚡'}
            </Text>
            <Heading style={{ color: accentColor, fontSize: '24px', fontWeight: 900, letterSpacing: '3px', margin: '0 0 8px', textShadow: `0 0 20px ${accentColor}44` }}>
              {tierLabel} ACTIVADO
            </Heading>
            <Text style={{ color: '#9090B0', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
              ¡Felicitaciones, @{username}! Tu plan <strong style={{ color: accentColor }}>{planName}</strong> ya está activo.
            </Text>
          </Section>

          {/* Perks */}
          <Section style={{ padding: '16px 32px 24px' }}>
            <Text style={{ color: '#E8E8F0', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', marginBottom: '12px' }}>
              TUS BENEFICIOS:
            </Text>
            {perks.map((perk, i) => (
              <Text key={i} style={{ color: '#9090B0', fontSize: '14px', margin: '0 0 8px', paddingLeft: '16px', borderLeft: `2px solid ${accentColor}` }}>
                {perk}
              </Text>
            ))}
          </Section>

          {/* CTA */}
          <Section style={{ padding: '8px 32px 32px', textAlign: 'center' }}>
            <Link
              href="https://respawnsocial.gg/feed"
              style={{
                display: 'inline-block', padding: '13px 36px',
                backgroundColor: `${accentColor}1A`,
                color: accentColor, textDecoration: 'none',
                borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                letterSpacing: '2px', border: `1px solid ${accentColor}`,
              }}
            >
              IR AL FEED →
            </Link>
          </Section>

          <Hr style={{ borderColor: 'rgba(255,255,255,0.07)', margin: 0 }} />

          {/* Footer */}
          <Section style={{ padding: '20px 32px', textAlign: 'center', backgroundColor: '#0B0B14' }}>
            <Text style={{ color: '#555570', fontSize: '11px', margin: '0 0 8px' }}>
              Podés cancelar tu suscripción en cualquier momento desde Configuración.
            </Text>
            <Text style={{ color: '#333350', fontSize: '10px', margin: 0 }}>
              © 2026 Respawn Social ·{' '}
              <Link href="https://respawnsocial.gg/terms" style={{ color: '#333350' }}>Términos</Link>
              {' · '}
              <Link href="https://respawnsocial.gg/privacy" style={{ color: '#333350' }}>Privacidad</Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

const body: React.CSSProperties = {
  fontFamily: "'Segoe UI', Arial, sans-serif",
  margin: 0,
  padding: '20px 0',
}
const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  backgroundColor: '#111120',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
  overflow: 'hidden',
}
