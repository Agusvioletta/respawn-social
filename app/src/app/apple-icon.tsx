import { ImageResponse } from 'next/og'

export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: 180, height: 180,
        background: 'linear-gradient(135deg, #07070F 0%, #111120 100%)',
        borderRadius: 40,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 4,
      }}>
        {/* Glow ring */}
        <div style={{
          position: 'absolute',
          width: 110, height: 110, borderRadius: '50%',
          background: 'transparent',
          border: '2px solid rgba(0,255,247,0.25)',
          boxShadow: '0 0 30px rgba(0,255,247,0.15), inset 0 0 30px rgba(0,255,247,0.05)',
          display: 'flex',
        }} />
        <span style={{
          fontFamily: 'sans-serif',
          fontSize: 96, fontWeight: 900,
          color: '#00FFF7',
          textShadow: '0 0 30px rgba(0,255,247,0.7)',
          letterSpacing: -4,
          lineHeight: 1,
        }}>
          R
        </span>
        <span style={{
          fontFamily: 'sans-serif',
          fontSize: 18, fontWeight: 700,
          color: 'rgba(0,255,247,0.5)',
          letterSpacing: 6,
          lineHeight: 1,
        }}>
          SPWN
        </span>
      </div>
    ),
    { ...size }
  )
}
