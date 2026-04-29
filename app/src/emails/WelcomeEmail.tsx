import {
  Body, Container, Head, Heading, Hr, Html,
  Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface Props {
  username: string
}

export function WelcomeEmail({ username }: Props) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Bienvenido a Respawn Social, @{username} 🎮</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Logo */}
          <Section style={logoSection}>
            <Heading style={logo}>RESPAWN</Heading>
            <Text style={tagline}>el lugar donde siempre volvés</Text>
          </Section>

          <Hr style={hr} />

          {/* Greeting */}
          <Section style={section}>
            <Heading style={h1}>¡Bienvenido, @{username}! 🎮</Heading>
            <Text style={text}>
              Tu cuenta en Respawn Social está lista. Sos parte de la comunidad gamer en español.
            </Text>
          </Section>

          {/* Features */}
          <Section style={featuresSection}>
            {[
              { icon: '🏠', title: 'Feed Social', desc: 'Publicá, seguí gamers y chequeá qué está pasando.' },
              { icon: '🏆', title: 'Torneos', desc: 'Inscribite en torneos o creá el tuyo propio.' },
              { icon: '🕹️', title: 'Arcade', desc: '8 juegos retro integrados para ganar XP y subir de nivel.' },
              { icon: '🎬', title: 'Clips', desc: 'Subí tus mejores momentos y compartílos con la comunidad.' },
            ].map((f) => (
              <Section key={f.title} style={featureItem}>
                <Text style={featureIcon}>{f.icon}</Text>
                <Section style={featureText}>
                  <Text style={featureTitle}>{f.title}</Text>
                  <Text style={featureDesc}>{f.desc}</Text>
                </Section>
              </Section>
            ))}
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Link href="https://respawnsocial.gg/feed" style={ctaButton}>
              IR AL FEED →
            </Link>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              Si no creaste esta cuenta, podés ignorar este email.
            </Text>
            <Text style={footerLinks}>
              <Link href="https://respawnsocial.gg/terms" style={footerLink}>Términos</Link>
              {' · '}
              <Link href="https://respawnsocial.gg/privacy" style={footerLink}>Privacidad</Link>
              {' · '}
              <Link href="https://respawnsocial.gg" style={footerLink}>respawnsocial.gg</Link>
            </Text>
            <Text style={footerCopy}>© 2026 Respawn Social</Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const body: React.CSSProperties = {
  backgroundColor: '#07070F',
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
const logoSection: React.CSSProperties = {
  padding: '28px 32px 20px',
  textAlign: 'center',
}
const logo: React.CSSProperties = {
  color: '#00FFF7',
  fontSize: '28px',
  fontWeight: 900,
  letterSpacing: '4px',
  margin: 0,
  textShadow: '0 0 20px rgba(0,255,247,0.4)',
}
const tagline: React.CSSProperties = {
  color: '#555570',
  fontSize: '11px',
  letterSpacing: '1px',
  margin: '4px 0 0',
  fontFamily: 'monospace',
}
const hr: React.CSSProperties = {
  borderColor: 'rgba(255,255,255,0.07)',
  margin: '0',
}
const section: React.CSSProperties = {
  padding: '32px 32px 24px',
}
const h1: React.CSSProperties = {
  color: '#E8E8F0',
  fontSize: '22px',
  fontWeight: 700,
  margin: '0 0 12px',
}
const text: React.CSSProperties = {
  color: '#9090B0',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: 0,
}
const featuresSection: React.CSSProperties = {
  padding: '0 32px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}
const featureItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  padding: '12px 16px',
  backgroundColor: '#161628',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.05)',
  marginBottom: '8px',
}
const featureIcon: React.CSSProperties = {
  fontSize: '22px',
  margin: '0',
  lineHeight: 1,
  flexShrink: 0,
}
const featureText: React.CSSProperties = {
  flex: 1,
}
const featureTitle: React.CSSProperties = {
  color: '#E8E8F0',
  fontSize: '13px',
  fontWeight: 700,
  margin: '0 0 2px',
}
const featureDesc: React.CSSProperties = {
  color: '#555570',
  fontSize: '12px',
  margin: 0,
  lineHeight: 1.5,
}
const ctaSection: React.CSSProperties = {
  padding: '8px 32px 32px',
  textAlign: 'center',
}
const ctaButton: React.CSSProperties = {
  display: 'inline-block',
  padding: '13px 36px',
  backgroundColor: 'rgba(0,255,247,0.1)',
  color: '#00FFF7',
  textDecoration: 'none',
  borderRadius: '10px',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '2px',
  border: '1px solid #00FFF7',
}
const footerSection: React.CSSProperties = {
  padding: '20px 32px',
  textAlign: 'center',
  backgroundColor: '#0B0B14',
}
const footerText: React.CSSProperties = {
  color: '#555570',
  fontSize: '11px',
  margin: '0 0 8px',
}
const footerLinks: React.CSSProperties = {
  color: '#555570',
  fontSize: '11px',
  margin: '0 0 8px',
}
const footerLink: React.CSSProperties = {
  color: '#555570',
  textDecoration: 'underline',
}
const footerCopy: React.CSSProperties = {
  color: '#333350',
  fontSize: '10px',
  margin: 0,
}
