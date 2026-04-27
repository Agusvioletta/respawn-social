'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { UserAvatar } from '@/components/ui/UserAvatar'

// Helper to check if we are currently on the /notifications page
function onNotifsPage() { return window.location.pathname.startsWith('/notifications') }

// ── Nav items ─────────────────────────────────────────────────────────────────
// Primarios: aparecen siempre en mobile bottom bar (máx 5 con el botón Más)
const PRIMARY_NAV = [
  { href: '/feed',     icon: '🏠', label: 'Feed'     },
  { href: '/explore',  icon: '🔍', label: 'Explorar' },
  { href: '/messages', icon: '💬', label: 'Mensajes' },
  { href: '/arcade',   icon: '🕹️', label: 'Arcade'   },
]

// Secundarios: van en el drawer "Más"
const SECONDARY_NAV = [
  { href: '/lfg',           icon: '🔎', label: 'LFG'           },
  { href: '/tournaments',   icon: '🏆', label: 'Torneos'       },
  { href: '/notifications', icon: '🔔', label: 'Notificaciones'},
  { href: '/settings',      icon: '⚙️', label: 'Configuración' },
]

// Desktop sidebar muestra todos
const ALL_NAV = [
  { href: '/feed',        icon: '🏠', label: 'Feed'        },
  { href: '/explore',     icon: '🔍', label: 'Explorar'    },
  { href: '/lfg',         icon: '🔎', label: 'LFG'         },
  { href: '/tournaments', icon: '🏆', label: 'Torneos'     },
  { href: '/arcade',      icon: '🕹️', label: 'Arcade'      },
  { href: '/messages',    icon: '💬', label: 'Mensajes'    },
]

// ── Sonido notificación ───────────────────────────────────────────────────────
function playMsgSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35)
  } catch { /* autoplay policy */ }
}

export function Navbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, setUser }                         = useAuthStore()
  const {
    unreadMessages, addUnread, clearUnread,
    unreadNotifs, setUnreadNotifs, addUnreadNotif, clearUnreadNotifs,
    lastNotifAt, setLastNotifAt,
  } = useNotificationStore()
  const supabase = createClient()
  const msgChannelRef        = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const notifChannelRef      = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const likesChannelRef      = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const myPostIdsRef         = useRef<Set<number>>(new Set())
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Cerrar drawer en cambio de ruta
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  // Limpiar badges al entrar a sus páginas
  useEffect(() => {
    if (pathname.startsWith('/messages'))     clearUnread()
    if (pathname.startsWith('/notifications')) {
      clearUnreadNotifs()
      setLastNotifAt(new Date().toISOString())
    }
  }, [pathname, clearUnread, clearUnreadNotifs, setLastNotifAt])

  // Contar notificaciones no leídas desde lastNotifAt al montar
  useEffect(() => {
    if (!user?.id) return
    async function countUnread() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any
        const since = lastNotifAt

        // Mis posts → para filtrar likes/comentarios
        const { data: myPosts } = await sb
          .from('posts').select('id').eq('user_id', user!.id)
        const postIds: number[] = (myPosts ?? []).map((p: { id: number }) => p.id)

        const queries: Promise<{ count: number | null }>[] = [
          // Nuevos seguidores
          sb.from('follows').select('*', { count: 'exact', head: true })
            .eq('following_id', user!.id).gte('created_at', since),
          // Solicitudes de seguimiento
          sb.from('follow_requests').select('*', { count: 'exact', head: true })
            .eq('to_id', user!.id).gte('created_at', since),
        ]

        if (postIds.length > 0) {
          // Comentarios en mis posts (excluyo los míos propios)
          queries.push(
            sb.from('comments').select('*', { count: 'exact', head: true })
              .in('post_id', postIds).gte('created_at', since).neq('user_id', user!.id)
          )
          // Likes en mis posts (excluyo los míos propios)
          queries.push(
            sb.from('likes').select('*', { count: 'exact', head: true })
              .in('post_id', postIds).gte('created_at', since).neq('user_id', user!.id)
          )
        }

        const results = await Promise.all(queries)
        const total = results.reduce((s, r) => s + (r.count ?? 0), 0)
        setUnreadNotifs(total)
      } catch { /* silently skip */ }
    }
    countUnread()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Suscripción global: mensajes nuevos
  useEffect(() => {
    if (!user?.id) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = (supabase as any)
      .channel(`navbar-msgs:${user.id}`)
      .on('postgres_changes' as any, {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `to_id=eq.${user.id}`,
      }, () => {
        if (!window.location.pathname.startsWith('/messages')) {
          addUnread(); playMsgSound()
        }
      })
      .subscribe()
    msgChannelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Suscripción global: notificaciones (nuevos seguidores + solicitudes)
  useEffect(() => {
    if (!user?.id) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = (supabase as any)
      .channel(`navbar-notifs:${user.id}`)
      .on('postgres_changes' as any, {
        event: 'INSERT', schema: 'public', table: 'follows',
        filter: `following_id=eq.${user.id}`,
      }, () => {
        if (!window.location.pathname.startsWith('/notifications')) addUnreadNotif()
      })
      .on('postgres_changes' as any, {
        event: 'INSERT', schema: 'public', table: 'follow_requests',
        filter: `to_id=eq.${user.id}`,
      }, () => {
        if (!window.location.pathname.startsWith('/notifications')) addUnreadNotif()
      })
      .subscribe()
    notifChannelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Cargar IDs de posts del usuario y suscribirse a likes/comentarios en tiempo real
  useEffect(() => {
    if (!user?.id) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    async function seedPostIds() {
      try {
        const { data } = await sb.from('posts').select('id').eq('user_id', user!.id)
        myPostIdsRef.current = new Set((data ?? []).map((p: { id: number }) => p.id))
      } catch { /* silently skip */ }
    }
    seedPostIds()

    const ch = sb
      .channel(`navbar-likes:${user.id}`)
      // Nuevo like en cualquier post → filtramos client-side
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'likes' }, (payload: any) => {
        if (
          payload.new.user_id !== user!.id &&
          myPostIdsRef.current.has(payload.new.post_id) &&
          !onNotifsPage()
        ) {
          addUnreadNotif()
        }
      })
      // Nuevo comentario en cualquier post → filtramos client-side
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'comments' }, (payload: any) => {
        if (
          payload.new.user_id !== user!.id &&
          myPostIdsRef.current.has(payload.new.post_id) &&
          !onNotifsPage()
        ) {
          addUnreadNotif()
        }
      })
      // Nuevo post del usuario → agregar al set local
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'posts',
        filter: `user_id=eq.${user.id}` }, (payload: any) => {
        myPostIdsRef.current.add(payload.new.id)
      })
      .subscribe()

    likesChannelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function handleLogout() {
    await supabase.auth.signOut(); setUser(null); router.push('/login')
  }

  // ── Estilos ──────────────────────────────────────────────────────────────
  const desktopNavItemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 14px', borderRadius: 'var(--radius-md)',
    background: active ? 'var(--cyan-glow)' : 'transparent',
    border: active ? '1px solid var(--cyan-border)' : '1px solid transparent',
    color: active ? 'var(--cyan)' : 'var(--text-secondary)',
    fontFamily: 'var(--font-display)', fontSize: '13px',
    fontWeight: active ? 700 : 500, letterSpacing: '1px',
    transition: 'all var(--transition)', cursor: 'pointer',
    textDecoration: 'none', outline: 'none',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none' as const,
  })

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <nav
        className="hidden md:flex"
        style={{
          width: '256px', height: '100vh', position: 'fixed', top: 0, left: 0,
          background: 'var(--deep)', borderRight: '1px solid var(--border)',
          flexDirection: 'column', padding: '24px 16px', zIndex: 50, overflowY: 'auto',
        }}
      >
        <Link href="/feed" style={{ textDecoration: 'none', marginBottom: '32px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, letterSpacing: '2px', color: 'var(--cyan)', textShadow: '0 0 20px rgba(0,255,247,0.4)' }}>RESPAWN</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>el lugar donde siempre volvés</div>
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {ALL_NAV.map((item) => {
            const isMessages = item.href === '/messages'
            const showBadge  = isMessages && unreadMessages > 0
            return (
              <Link key={item.href} href={item.href} style={{ ...desktopNavItemStyle(pathname.startsWith(item.href)), position: 'relative' }}>
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                {item.label}
                {showBadge && <BadgePill count={unreadMessages} />}
              </Link>
            )
          })}

          <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />

          {user && (
            <Link href={`/profile/${user.username}`} style={desktopNavItemStyle(pathname.startsWith('/profile'))}>
              <span style={{ fontSize: '18px' }}>👤</span>Perfil
            </Link>
          )}
          <Link href="/notifications" style={{ ...desktopNavItemStyle(pathname === '/notifications'), position: 'relative' }}>
            <span style={{ fontSize: '18px' }}>🔔</span>Notificaciones
            {unreadNotifs > 0 && <BadgePill count={unreadNotifs} />}
          </Link>
          <Link href="/settings" style={desktopNavItemStyle(pathname === '/settings')}>
            <span style={{ fontSize: '18px' }}>⚙️</span>Configuración
          </Link>
        </div>

        {user && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link href={`/profile/${user.username}`} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <UserAvatar avatar={user.avatar} photoUrl={(user as any).photo_url} username={user.username} size={36} />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>@{user.username}</div>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(user as any).now_playing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80', flexShrink: 0 }} />
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#4ade80', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{(user as any).now_playing}</span>
                    </div>
                  ) : (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>Nivel {user.max_level}</div>
                  )}
                </div>
              </div>
            </Link>
            <button onClick={handleLogout} style={{
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px',
              padding: '8px', cursor: 'pointer', letterSpacing: '1px', transition: 'all var(--transition)',
            }}>
              // salir
            </button>
          </div>
        )}
      </nav>

      {/* ── Mobile bottom bar ───────────────────────────────────────────────── */}
      <nav
        className="flex md:hidden"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'var(--deep)', borderTop: '1px solid var(--border)',
          alignItems: 'center', justifyContent: 'space-around',
          padding: '0 4px', zIndex: 60,
        }}
      >
        {/* 4 ítems primarios */}
        {PRIMARY_NAV.map((item) => {
          const active     = pathname.startsWith(item.href)
          const isMessages = item.href === '/messages'
          const showBadge  = isMessages && unreadMessages > 0
          return (
            <Link
              key={item.href} href={item.href}
              style={{ textDecoration: 'none', outline: 'none', WebkitTapHighlightColor: 'transparent', flex: 1 }}
            >
              <MobileNavItem icon={item.icon} label={item.label} active={active} badge={showBadge ? unreadMessages : 0} />
            </Link>
          )
        })}

        {/* Botón Más */}
        <button
          onClick={() => setDrawerOpen(v => !v)}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            WebkitTapHighlightColor: 'transparent', cursor: 'pointer',
            padding: 0,
          }}
        >
          <MobileNavItem
            icon={drawerOpen ? '✕' : '⋯'}
            label="Más"
            active={drawerOpen || SECONDARY_NAV.some(i => pathname.startsWith(i.href)) || pathname.startsWith('/profile')}
            badge={unreadNotifs}
            isMore
          />
        </button>
      </nav>

      {/* ── Drawer "Más" ────────────────────────────────────────────────────── */}
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="md:hidden"
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 55,
            background: 'rgba(7,7,15,0.7)', backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Sheet */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed', left: 0, right: 0, zIndex: 56,
          bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          borderRadius: '20px 20px 0 0',
          padding: '8px 0 12px',
          transform: drawerOpen ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 10px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border)' }} />
        </div>

        {/* Usuario info */}
        {user && (
          <Link href={`/profile/${user.username}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 20px 14px', borderBottom: '1px solid var(--border)', marginBottom: '6px',
            }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <UserAvatar avatar={user.avatar} photoUrl={(user as any).photo_url} username={user.username} size={40} />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>
                  @{user.username}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Nivel {user.max_level} · ver perfil →
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Items secundarios */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', padding: '0 12px' }}>
          {SECONDARY_NAV.map(item => {
            const active = pathname.startsWith(item.href)
            const isNotif = item.href === '/notifications'
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 14px', borderRadius: 'var(--radius-md)',
                  background: active ? 'var(--cyan-glow)' : 'transparent',
                  border: `1px solid ${active ? 'var(--cyan-border)' : 'transparent'}`,
                  transition: 'all var(--transition)', position: 'relative',
                }}>
                  <span style={{ fontSize: '18px', position: 'relative' }}>
                    {item.icon}
                    {isNotif && unreadNotifs > 0 && (
                      <span style={{
                        position: 'absolute', top: '-4px', right: '-8px',
                        minWidth: '16px', height: '16px', borderRadius: '999px',
                        background: 'var(--pink)', color: '#fff',
                        fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 900,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                      }}>
                        {unreadNotifs > 99 ? '99+' : unreadNotifs}
                      </span>
                    )}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: active ? 700 : 500,
                    color: active ? 'var(--cyan)' : 'var(--text-secondary)', letterSpacing: '0.5px',
                  }}>
                    {item.label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Logout */}
        {user && (
          <div style={{ padding: '10px 12px 0' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%', background: 'transparent',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                fontSize: '11px', letterSpacing: '1px', padding: '10px',
                cursor: 'pointer', transition: 'all var(--transition)',
              }}
            >
              // salir
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────
function MobileNavItem({ icon, label, active, badge, isMore }: {
  icon: string; label: string; active: boolean; badge: number; isMore?: boolean
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
      padding: '6px 0', position: 'relative',
      color: active ? (isMore ? 'var(--purple)' : 'var(--cyan)') : 'var(--text-muted)',
      transition: 'color var(--transition)', userSelect: 'none',
    }}>
      {/* Dot indicator cuando está activo */}
      {active && (
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '20px', height: '2px', borderRadius: '1px',
          background: isMore ? 'var(--purple)' : 'var(--cyan)',
          boxShadow: isMore ? '0 0 6px var(--purple)' : '0 0 6px var(--cyan)',
        }} />
      )}

      <span style={{ fontSize: '22px', position: 'relative', lineHeight: 1 }}>
        {icon}
        {badge > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-8px',
            minWidth: '16px', height: '16px', borderRadius: '999px',
            background: 'var(--pink)', color: '#fff',
            fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            boxShadow: '0 0 6px rgba(255,79,123,0.7)',
          }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>

      <span style={{
        fontFamily: 'var(--font-display)', fontSize: '9px',
        letterSpacing: '0.5px', fontWeight: active ? 700 : 400,
        lineHeight: 1,
      }}>
        {label.toUpperCase()}
      </span>
    </div>
  )
}

function BadgePill({ count }: { count: number }) {
  return (
    <span style={{
      marginLeft: 'auto', minWidth: '20px', height: '20px', borderRadius: '999px',
      background: 'var(--pink)', color: '#fff',
      fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 800,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
      boxShadow: '0 0 8px rgba(255,79,123,0.6)',
    }}>
      {count > 99 ? '99+' : count}
    </span>
  )
}
