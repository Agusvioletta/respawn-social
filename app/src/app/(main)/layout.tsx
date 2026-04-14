import { Navbar } from '@/components/layout/Navbar'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { LiveTicker } from '@/components/layout/LiveTicker'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--void)' }}>
        <Navbar />
        <main style={{
          flex: 1,
          minWidth: 0,
          paddingBottom: '80px',
          display: 'flex',
          flexDirection: 'column',
        }}
          className="md:ml-64"
        >
          <LiveTicker />
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
