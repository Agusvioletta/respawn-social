import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const dynamic = 'force-static'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await params
  const dim = sizeParam === '512' ? 512 : 192
  const radius      = Math.round(dim * 0.2)
  const letterSize  = Math.round(dim * 0.55)
  const tagSize     = Math.round(dim * 0.1)
  const ringSize    = Math.round(dim * 0.62)
  const ringRadius  = Math.round(dim * 0.31)

  return new ImageResponse(
    (
      <div style={{
        width: dim, height: dim,
        background: 'linear-gradient(135deg, #07070F 0%, #111120 100%)',
        borderRadius: radius,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: Math.round(dim * 0.02),
      }}>
        <div style={{
          position: 'absolute',
          width: ringSize, height: ringSize, borderRadius: ringRadius,
          background: 'transparent',
          border: `${Math.max(1, Math.round(dim * 0.01))}px solid rgba(0,255,247,0.25)`,
          boxShadow: `0 0 ${Math.round(dim * 0.15)}px rgba(0,255,247,0.12)`,
          display: 'flex',
        }} />
        <span style={{
          fontFamily: 'sans-serif',
          fontSize: letterSize, fontWeight: 900,
          color: '#00FFF7',
          textShadow: `0 0 ${Math.round(dim * 0.15)}px rgba(0,255,247,0.7)`,
          letterSpacing: -dim * 0.02,
          lineHeight: 1,
        }}>
          R
        </span>
        <span style={{
          fontFamily: 'sans-serif',
          fontSize: tagSize, fontWeight: 700,
          color: 'rgba(0,255,247,0.45)',
          letterSpacing: dim * 0.035,
          lineHeight: 1,
        }}>
          SPWN
        </span>
      </div>
    ),
    { width: dim, height: dim }
  )
}
