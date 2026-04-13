'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

/**
 * Rehidrata el authStore desde la sesión activa de Supabase.
 * Sin esto, al refrescar la página el user siempre queda null.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    const supabase = createClient()

    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setUser(null); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profile) setUser({ ...profile, email: session.user.email! })
    }

    loadSession()

    // Mantener sincronizado cuando el usuario inicia/cierra sesión en otra pestaña
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null); return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      if (profile) setUser({ ...profile, email: session.user.email! })
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}
