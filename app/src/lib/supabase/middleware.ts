import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user ?? null

  const p = request.nextUrl.pathname

  // ── Rutas completamente públicas (auth / legal / landing) ─────────────────
  const isPublicRoute =
    p === '/' ||
    p.startsWith('/login') ||
    p.startsWith('/signup') ||
    p.startsWith('/terms') ||
    p.startsWith('/privacy') ||
    p.startsWith('/forgot-password') ||
    p.startsWith('/auth') ||
    p.startsWith('/reset-password')

  const isApiRoute = p.startsWith('/api')

  // ── Rutas de browse: accesibles sin login (solo lectura) ──────────────────
  // Cubren feed, explorar, perfiles, posts, clips, torneos, arcade, lfg, premium
  const isBrowseRoute =
    p.startsWith('/feed') ||
    p.startsWith('/explore') ||
    p.startsWith('/profile') ||
    p.startsWith('/post') ||
    p.startsWith('/clips') ||
    p.startsWith('/tournaments') ||
    p.startsWith('/arcade') ||
    p.startsWith('/lfg') ||
    p.startsWith('/premium')

  // ── Rutas privadas: requieren sesión ──────────────────────────────────────
  // /messages, /notifications, /settings, /onboarding son 100% personales
  const isPrivateRoute =
    p.startsWith('/messages') ||
    p.startsWith('/notifications') ||
    p.startsWith('/settings') ||
    p.startsWith('/onboarding')

  if (!user && isPrivateRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', p)   // volver después de login
    return NextResponse.redirect(url)
  }

  // Usuarios anónimos en rutas de browse → OK (sin redirect)
  if (!user && (isBrowseRoute || isPublicRoute || isApiRoute)) {
    return supabaseResponse
  }

  // Usuarios anónimos en rutas desconocidas → login
  if (!user && !isPublicRoute && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Usuarios logueados en /login o /signup → feed
  if (user && (p.startsWith('/login') || p.startsWith('/signup'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/feed'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
