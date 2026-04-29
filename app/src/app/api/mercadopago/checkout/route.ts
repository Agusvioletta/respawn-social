import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

// IDs de planes creados en Mercado Pago (preapproval_plan)
const PLAN_IDS = {
  pro:   { monthly: process.env.MP_PLAN_PRO_MONTHLY   ?? '', yearly: process.env.MP_PLAN_PRO_YEARLY   ?? '' },
  elite: { monthly: process.env.MP_PLAN_ELITE_MONTHLY ?? '', yearly: process.env.MP_PLAN_ELITE_YEARLY ?? '' },
}

export async function POST(req: NextRequest) {
  // Rate limit: max 10 intentos de checkout por IP por minuto
  const ip = getClientIp(req)
  const rl = rateLimit(`checkout:${ip}`, { limit: 10, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá un momento.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) {
    return NextResponse.json({ error: 'Mercado Pago no configurado.' }, { status: 503 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verificar sesión
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 })
  }

  const { tier, billing } = await req.json() as { tier: 'pro' | 'elite'; billing: 'monthly' | 'yearly' }
  const planId = PLAN_IDS[tier]?.[billing]

  if (!planId) {
    return NextResponse.json({ error: 'Plan no configurado todavía. Volvé pronto.' }, { status: 400 })
  }

  // Obtener el init_point del plan desde MP
  // El usuario completa la suscripción directo en el checkout de MP (no se puede hacer server-side)
  const res = await fetch(`https://api.mercadopago.com/preapproval_plan/${planId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  })

  const plan = await res.json() as { init_point?: string; message?: string }

  if (!res.ok || !plan.init_point) {
    console.error('[MP checkout] No se pudo obtener el plan:', plan)
    return NextResponse.json({ error: plan.message ?? 'Error al obtener el plan.' }, { status: 500 })
  }

  return NextResponse.json({ url: plan.init_point })
}
