'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { UserAvatar } from '@/components/ui/UserAvatar'

const NAV_ITEMS = [
  { href: '/feed',        icon: '🏠', label: 'Feed' },
  { href: '/explore',     icon: '🔍', label: 'Explorar' },
  { href: '/lfg',         icon: '🔎', label: 'LFG' },
  { href: '/tournaments', icon: '🏆', label: 'Torneos' },
  { href: '/arcade',      icon: '🕹️', label: 'Arcade' },
  { href: '/messages',    icon: '💬', label: 'Mensajes' },
]

// ── Sonido de notificación con Web Audio API ──────────────────────────────────
function playMsgSound() {
  try {
    const ctx = new AudioContext()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
  } catch { /* autoplay policy puede bloquear antes de interacción */ }
}

export function Navbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, setUser } = useAuthStore()
  const { unreadMessages, addUnread, clearUnread } = useNotificationStore()
  const supabase = createClient()
  const msgChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ── Limpiar badge cuando el usuario está en /messages ─────────────────────
  useEffect(() => {
    if (pathname.startsWith('/messages')) clearUnread()
  }, [pathname, clearUnread])

  // ── Suscripción global: mensajes nuevos para este usuario ─────────────────
  useEffect(() => {
    if (!user?.id) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = (supabase as any)
      .channel(`navbar-msgs:${user.id}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `to_id=eq.${user.id}`,
        },
        () => {
          // Solo notificar si no estás dentro de /messages
          if (!window.location.pathname.startsWith('/messages')) {
            addUnread()
            playMsgSound()
          }
        }
      )
      .subscribe()

    msgChannelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

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
    outline: 'none',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none' as const,
  })

  return (
    <>
      {/* Desktop sidebar */}
      <nav style={{
        width: '256px', height: '100vh', position: 'fixed', top: 0, left: 0,
        background: 'var(--deep)', borderRight: '1px solid var(--border)',
        flexDirection: 'column', padding: '24px 16px', zIndex: 50, overflowY: 'auto',
      }}
        className="hidden md:flex"
      >
        {/* Logo */}
        <Link href="/feed" style={{ textDecoration: 'none', marginBottom: '32px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, letterSpacing: '2px', color: 'var(--cyan)', textShadow: '0 0 20px rgba(0,255,247,0.4)' }}>
            RESPAWN
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>
            el lugar donde siempre volvés
          </div>
        </Link>

        {/* Nav items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const isMessages = item.href === '/messages'
            const showBadge  = isMessages && unreadMessages > 0
            return (
              <Link key={item.href} href={item.href} style={{ ...navItemStyle(pathname.startsWith(item.href)), position: 'relative' }}>
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                {item.label}
                {showBadge && (
                  <span style={{
                    marginLeft: 'auto',
                    minWidth: '20px', height: '20px',
                    borderRadius: '999px',
                    background: 'var(--pink)',
                    color: '#fff',
                    fontFamily: 'var(--font-display)',
                    fontSize: '10px',
                    fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 5px',
                    boxShadow: '0 0 8px rgba(255,79,123,0.6)',
                    animation: 'pulse-dot 1.5s ease-in-out infinite',
                  }}>
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </Link>
            )
          })}

          <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />

          {user && (
            <Link href={`/profile/${user.username}`} style={navItemStyle(pathname.startsWith('/profile'))}>
              <span style={{ fontSize: '18px' }}>👤</span>
              Perfil
            </Link>
          )}
          <Link href="/notifications" style={navItemStyle(pathname === '/notifications')}>
            <span style={{ fontSize: '18px' }}>🔔</span>
            Notificaciones
          </Link>
          <Link href="/settings" style={navItemStyle(pathname === '/settings')}>
            <span style={{ fontSize: '18px' }}>⚙️</span>
            Configuración
          </Link>
        </div>

        {/* User info + logout */}
        {user && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link href={`/profile/${user.username}`} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
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

      {/* Mobile bottom nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: '64px',
        background: 'var(--deep)', borderTop: '1px solid var(--border)',
        alignItems: 'center', justifyContent: 'space-around',
        padding: '0 8px', zIndex: 50,
      }}
        className="flex md:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const active     = pathname.startsWith(item.href)
          const isMessages = item.href === '/messages'
          const showBadge  = isMessages && unreadMessages > 0
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none', outline: 'none', WebkitTapHighlightColor: 'transparent' }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                padding: '6px 10px', borderRadius: 'var(--radius-md)',
                color: active ? 'var(--cyan)' : 'var(--text-muted)',
                transition: 'color var(--transition)', userSelect: 'none',
                position: 'relative',
              }}>
                <span style={{ fontSize: '20px', position: 'relative' }}>
                  {item.icon}
                  {showBadge && (
                    <span style={{
                      position: 'absolute', top: '-4px', right: '-8px',
                      minWidth: '16px', height: '16px', borderRadius: '999px',
                      background: 'var(--pink)', color: '#fff',
                      fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 3px',
                      boxShadow: '0 0 6px rgba(255,79,123,0.7)',
                    }}>
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </span>
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
