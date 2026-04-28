'use client'

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ background: '#07070F', margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'monospace', textAlign: 'center', padding: '24px' }}>
        <div style={{ fontSize: '80px', fontWeight: 900, color: '#FF4F7B', marginBottom: '16px' }}>500</div>
        <p style={{ color: '#9090B0', marginBottom: '32px', fontSize: '14px', lineHeight: 1.6 }}>
          Error crítico de la aplicación. Nuestro equipo fue notificado.
        </p>
        <button onClick={reset} style={{ padding: '10px 28px', borderRadius: '8px', background: 'transparent', border: '1px solid #FF4F7B', color: '#FF4F7B', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '1px' }}>
          REINTENTAR
        </button>
      </body>
    </html>
  )
}
