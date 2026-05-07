'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useAuthGateStore } from '@/stores/authGateStore'

/**
 * Modal / bottom-sheet que aparece cuando un usuario anónimo
 * intenta hacer una interacción que requiere cuenta.
 *
 * Se abre via useAuthGate() → requireAuth() desde cualquier componente.
 */
export function AuthGateModal() {
  const open = useAuthGateStore((s) => s.open)
  const hide = useAuthGateStore((s) => s.hide)

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') hide() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, hide])

  // Bloquear scroll cuando está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={hide}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(7,7,15,0.75)',
          backdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.15s ease',
        }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Crear cuenta para continuar"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 201,
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          borderRadius: '24px 24px 0 0',
          padding: '32px 24px 40px',
          animation: 'slideUp 0.22s cubic-bezier(0.4,0,0.2,1)',
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border)' }} />
        </div>

        {/* Icono */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '40px', lineHeight: 1 }}>🎮</span>
        </div>

        {/* Título */}
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '22px',
          fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: '1px',
          textAlign: 'center',
          marginBottom: '10px',
        }}>
          ¡Unite a Respawn!
        </h2>

        {/* Descripción */}
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          lineHeight: 1.6,
          marginBottom: '28px',
        }}>
          Para interactuar necesitás una cuenta.{' '}
          <span style={{ color: 'var(--cyan)' }}>Es gratis</span> y tardás menos de un minuto.
        </p>

        {/* Acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link
            href="/signup"
            onClick={hide}
            style={{
              display: 'block',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--cyan)',
              color: 'var(--void)',
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '1.5px',
              textAlign: 'center',
              textDecoration: 'none',
              boxShadow: '0 0 24px rgba(0,255,247,0.35)',
            }}
          >
            CREAR CUENTA GRATIS
          </Link>

          <Link
            href="/login"
            onClick={hide}
            style={{
              display: 'block',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '1px',
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            Ya tengo cuenta — Iniciar sesión
          </Link>
        </div>

        {/* Dismiss */}
        <button
          onClick={hide}
          style={{
            display: 'block',
            width: '100%',
            marginTop: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '1px',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          // seguir viendo sin cuenta
        </button>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  )
}
