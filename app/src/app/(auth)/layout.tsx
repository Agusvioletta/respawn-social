export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--void)' }}>
      {children}
    </main>
  )
}
