import { ImageResponse } from 'next/og'

export const size        = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: 32, height: 32,
        background: 'linear-gradient(135deg, #07070F 0%, #0B0B14 100%)',
        borderRadius: 7,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1.5px solid rgba(0,255,247,0.4)',
        boxShadow: '0 0 8px rgba(0,255,247,0.3)',
      }}>
        <span style={{
          fontFamily: 'sans-serif',
          fontSize: 20, fontWeight: 900,
          color: '#00FFF7',
          textShadow: '0 0 6px rgba(0,255,247,0.8)',
          letterSpacing: -1,
          lineHeight: 1,
        }}>
          R
        </span>
      </div>
    ),
    { ...size }
  )
}
