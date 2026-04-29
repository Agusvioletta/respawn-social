import { Navbar } from '@/components/layout/Navbar'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types/database'

// Server Component — carga el usuario en el servidor para que Zustand
// lo tenga desde el primer render del cliente (sin flash de null → user)
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  let initialUser: (Profile & { email: string }) | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) initialUser = { ...profile, email: user.email! }
    }
  } catch {
    // Si falla la carga del servidor, AuthProvider lo maneja client-side
  }

  return (
    <AuthProvider initialUser={initialUser}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--void)' }}>
        <Navbar />
        <main style={{ flex: 1, minWidth: 0, paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))', paddingTop: '52px' }} className="md:ml-64 md:pb-0 md:pt-0">
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
