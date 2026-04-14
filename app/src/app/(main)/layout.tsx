import { Navbar } from '@/components/layout/Navbar'
import { AuthProvider } from '@/components/layout/AuthProvider'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--void)' }}>
        <Navbar />
        <main style={{
          flex: 1,
          minWidth: 0,
          paddingBottom: '80px',
        }}
          className="md:ml-64"
        >
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
