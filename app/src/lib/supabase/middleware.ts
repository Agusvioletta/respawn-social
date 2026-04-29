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
    data: { user },
  } = await supabase.auth.getUser()

  // Rutas públicas que no requieren auth
  const publicRoutes = ['/login', '/signup', '/terms', '/privacy', '/forgot-password']
  const isPublicRoute =
    request.nextUrl.pathname === '/' ||
    publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))
  const isApiRoute  = request.nextUrl.pathname.startsWith('/api')
  // Rutas de auth que necesitan estar siempre accesibles (callback, reset)
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth') ||
                      request.nextUrl.pathname.startsWith('/reset-password')

  if (!user && !isPublicRoute && !isApiRoute && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Usuarios logueados no pueden volver al login/signup, pero sí a reset-password
  if (user && isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/feed'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
