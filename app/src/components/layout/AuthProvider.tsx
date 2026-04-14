'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

/**
 * Rehidrata el authStore desde la sesión activa de Supabase.
 * Usa onAuthStateChange (INITIAL_SESSION) en vez de getSession(),
 * que puede colgarse indefinidamente si Supabase no responde.
 * Timeout de seguridad de 5s por si INITIAL_SESSION nunca llega.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Timeout de seguridad: si después de 5s no cargó, mostramos igual
    const timeout = setTimeout(() => setReady(true), 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null)
        clearTimeout(timeout)
        setReady(true)
        return
      }

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
      } finally {
        clearTimeout(timeout)
        setReady(true)
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!ready) return (
    <div style={{ minHeight: '100vh', background: 'var(--void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '2px' }}>
        RESPAWN...
      </div>
    </div>
  )

  return <>{children}</>
}
