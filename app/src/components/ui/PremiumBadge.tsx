'use client'

interface PremiumBadgeProps {
  tier: string | null | undefined
  size?: 'sm' | 'md'
}

export function PremiumBadge({ tier, size = 'sm' }: PremiumBadgeProps) {
  if (!tier || tier === 'free') return null

  const isElite = tier === 'elite'
  const fontSize = size === 'sm' ? '9px' : '11px'
  const padding  = size === 'sm' ? '1px 6px' : '2px 10px'

  if (isElite) {
    return (
      <span style={{
        fontFamily: 'var(--font-display)', fontSize, fontWeight: 700,
        letterSpacing: '1px', padding,
        background: 'linear-gradient(90deg, rgba(255,215,0,0.15), rgba(255,165,0,0.15))',
        border: '1px solid rgba(255,215,0,0.5)',
        borderRadius: '20px', color: '#FFD700',
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        animation: 'elite-shimmer 3s ease infinite',
        flexShrink: 0,
      }}>
        👑 ELITE
        <style>{`
          @keyframes elite-shimmer {
            0%, 100% { box-shadow: 0 0 4px rgba(255,215,0,0.2); }
            50% { box-shadow: 0 0 10px rgba(255,215,0,0.5), 0 0 20px rgba(255,215,0,0.2); }
          }
        `}</style>
      </span>
    )
  }

  return (
    <span style={{
      fontFamily: 'var(--font-display)', fontSize, fontWeight: 700,
      letterSpacing: '1px', padding,
      background: 'var(--cyan-glow)',
      border: '1px solid var(--cyan-border)',
      borderRadius: '20px', color: 'var(--cyan)',
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      flexShrink: 0,
    }}>
      ⚡ PRO
    </span>
  )
}
