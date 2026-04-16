'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import type { Profile } from '@/lib/types/database'

interface AuthProviderProps {
  children: React.ReactNode
  // Usuario precargado desde el servidor (layout.tsx)
  // Permite inicializar Zustand antes del primer render del cliente
  initialUser?: (Profile & { email: string }) | null
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const setUser = useAuthStore((s) => s.setUser)
  const fetchingRef = useRef<string | null>(null)

  // Inicializar Zustand de forma síncrona con el usuario del servidor.
  // Corre durante el render (antes de que los hijos lean el store), usando
  // un ref para que solo ejecute una vez.
  const initializedRef = useRef(false)
  if (!initializedRef.current) {
    initializedRef.current = true
    if (initialUser && !useAuthStore.getState().user) {
      // Mutación directa del store de Zustand — seguro fuera de hooks
      useAuthStore.setState({ user: initialUser })
    }
  }

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    // Por las dudas: si por algún motivo el init del render no funcionó,
    // aplicar el usuario inicial aquí también
    if (initialUser && !useAuthStore.getState().user) {
      setUser(initialUser)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null)
        fetchingRef.current = null
        return
      }

      // Si el mismo usuario ya está cargado en el store, no refetchear.
      // Cubre TOKEN_REFRESHED, SIGNED_IN por reconexión de Realtime,
      // INITIAL_SESSION duplicado, y cualquier otro evento.
      const currentUser = useAuthStore.getState().user
      if (currentUser?.id === session.user.id) return

      // Prevenir fetches concurrentes para el mismo usuario
      if (fetchingRef.current === session.user.id) return
      fetchingRef.current = session.user.id

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (profile && mounted) setUser({ ...profile, email: session.user.email! })
      } catch (e) {
        console.error('[AuthProvider]', e)
      } finally {
        if (fetchingRef.current === session.user.id) fetchingRef.current = null
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}
