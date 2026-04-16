'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

/**
 * Rehidrata el authStore desde la sesión activa de Supabase en background.
 * NO bloquea el render — la app carga inmediatamente.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null)
        return
      }

      // Si el mismo usuario ya está cargado en el store, no volver a fetchear
      // el perfil. Cubre TOKEN_REFRESHED, SIGNED_IN por reconexión de Realtime,
      // INITIAL_SESSION duplicado, USER_UPDATED, etc. — todos causaban re-renders
      // innecesarios que reseteaban el loading state de todas las páginas.
      const currentUser = useAuthStore.getState().user
      if (currentUser?.id === session.user.id) return

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (profile) setUser({ ...profile, email: session.user.email! })
      } catch (e) {
        console.error('[AuthProvider]', e)
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}
