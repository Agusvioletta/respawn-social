'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

const NAV_ITEMS = [
  { href: '/feed',        icon: '🏠', label: 'Feed' },
  { href: '/explore',     icon: '🔍', label: 'Explorar' },
  { href: '/tournaments', icon: '🏆', label: 'Torneos' },
  { href: '/arcade',      icon: '🕹️', label: 'Arcade' },
  { href: '/messages',    icon: '💬', label: 'Mensajes' },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav style={{
        width: '256px',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        background: 'var(--deep)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        zIndex: 50,
      }}
        className="hidden md:flex"
      >
        {/* Logo */}
        <Link href="/feed" style={{ textDecoration: 'none', marginBottom: '32px' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '16px',
            fontWeight: 800,
            letterSpacing: '2px',
            color: 'var(--cyan)',
            textShadow: '0 0 20px rgba(0,255,247,0.4)',
          }}>
            RESPAWN
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-muted)',
            letterSpacing: '1px',
          }}>
            el lugar donde siempre volvés
          </div>
        </Link>

        {/* Nav items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: active ? 'var(--cyan-glow)' : 'transparent',
                  border: active ? '1px solid var(--cyan-border)' : '1px solid transparent',
                  color: active ? 'var(--cyan)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '13px',
                  fontWeight: active ? 700 : 500,
                  letterSpacing: '1px',
                  transition: 'all var(--transition)',
                  cursor: 'pointer',
                }}>
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            )
          })}
        </div>

        {/* User + logout */}
        {user && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link href={`/profile/${user.username}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}>
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '50%',
                  background: 'var(--surface)',
                  border: '1px solid var(--cyan-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}>
                  {user.avatar === 'avatar1.png' ? '🧑‍💻' : '👾'}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {user.username}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                    Nivel {user.max_level}
                  </div>
                </div>
              </div>
            </Link>
            <button onClick={handleLogout} style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              padding: '8px',
              cursor: 'pointer',
              letterSpacing: '1px',
              transition: 'all var(--transition)',
            }}>
              // salir
            </button>
          </div>
        )}
      </nav>

      {/* Mobile bottom nav */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'var(--deep)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px',
        zIndex: 50,
      }}
        className="flex md:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                color: active ? 'var(--cyan)' : 'var(--text-muted)',
                transition: 'color var(--transition)',
              }}>
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '8px',
                  letterSpacing: '1px',
                  fontWeight: active ? 700 : 400,
                }}>
                  {item.label.toUpperCase()}
                </span>
              </div>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
