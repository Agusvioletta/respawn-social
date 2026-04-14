'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'

const NAV_ITEMS = [
  { href: '/feed',        icon: '🏠', label: 'Feed' },
  { href: '/explore',     icon: '🔍', label: 'Explorar' },
  { href: '/lfg',         icon: '🔎', label: 'LFG' },
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

  const navItemStyle = (active: boolean) => ({
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
    textDecoration: 'none',
  })

  return (
    <>
      {/* Desktop sidebar — display controlado por Tailwind (hidden md:flex), NO poner display en style */}
      <nav style={{
        width: '256px',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        background: 'var(--deep)',
        borderRight: '1px solid var(--border)',
        flexDirection: 'column',
        padding: '24px 16px',
        zIndex: 50,
        overflowY: 'auto',
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
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} style={navItemStyle(pathname.startsWith(item.href))}>
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {/* Separador */}
          <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />

          {/* Perfil */}
          {user && (
            <Link href={`/profile/${user.username}`} style={navItemStyle(pathname.startsWith('/profile'))}>
              <span style={{ fontSize: '18px' }}>👤</span>
              Perfil
            </Link>
          )}

          {/* Notificaciones */}
          <Link href="/notifications" style={navItemStyle(pathname === '/notifications')}>
            <span style={{ fontSize: '18px' }}>🔔</span>
            Notificaciones
          </Link>

          {/* Configuración */}
          <Link href="/settings" style={navItemStyle(pathname === '/settings')}>
            <span style={{ fontSize: '18px' }}>⚙️</span>
            Configuración
          </Link>
        </div>

        {/* User info + logout */}
        {user && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link href={`/profile/${user.username}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              }}>
                <UserAvatar avatar={user.avatar} username={user.username} size={36} />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    @{user.username}
                  </div>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(user as any).now_playing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80', flexShrink: 0 }} />
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#4ade80', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(user as any).now_playing}
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                      Nivel {user.max_level}
                    </div>
                  )}
                </div>
              </div>
            </Link>
            <button onClick={handleLogout} style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              padding: '8px', cursor: 'pointer', letterSpacing: '1px',
              transition: 'all var(--transition)',
            }}>
              // salir
            </button>
          </div>
        )}
      </nav>

      {/* Mobile bottom nav — display controlado por Tailwind (flex md:hidden), NO poner display en style */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'var(--deep)',
        borderTop: '1px solid var(--border)',
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
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                padding: '6px 10px', borderRadius: 'var(--radius-md)',
                color: active ? 'var(--cyan)' : 'var(--text-muted)',
                transition: 'color var(--transition)',
              }}>
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '8px', letterSpacing: '1px', fontWeight: active ? 700 : 400 }}>
                  {item.label.toUpperCase()}
                </span>
              </div>
            </Link>
          )
        })}
        {user && (
          <Link href={`/profile/${user.username}`} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              padding: '6px 10px', borderRadius: 'var(--radius-md)',
              color: pathname.startsWith('/profile') ? 'var(--cyan)' : 'var(--text-muted)',
            }}>
              <span style={{ fontSize: '20px' }}>👤</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '8px', letterSpacing: '1px' }}>PERFIL</span>
            </div>
          </Link>
        )}
      </nav>
    </>
  )
}
