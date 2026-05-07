'use client'

import { useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useAuthGateStore } from '@/stores/authGateStore'

/**
 * Hook para "interacciones con auth opcional".
 *
 * Uso:
 *   const { requireAuth } = useAuthGate()
 *   <button onClick={() => requireAuth(handleLike)}>♥</button>
 *
 * Si el usuario está logueado → ejecuta la acción normalmente.
 * Si no → abre el modal de AuthGate (sin redirigir ni interrumpir el browse).
 */
export function useAuthGate() {
  const user     = useAuthStore((s) => s.user)
  const showGate = useAuthGateStore((s) => s.show)

  const requireAuth = useCallback(
    (action: (() => void) | (() => Promise<void>)) => {
      if (user) {
        action()
      } else {
        showGate()
      }
    },
    [user, showGate],
  )

  return { requireAuth, isLoggedIn: !!user }
}
