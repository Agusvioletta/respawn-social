import { Navbar } from '@/components/layout/Navbar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--void)' }}>
      <Navbar />
      <main style={{
        flex: 1,
        marginLeft: '0',
        paddingBottom: '80px', // espacio para mobile bottom nav
      }}
        className="md:ml-64"
      >
        {children}
      </main>
    </div>
  )
}
