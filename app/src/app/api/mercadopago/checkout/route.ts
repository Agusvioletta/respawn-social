import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// IDs de planes creados en Mercado Pago (preapproval_plan)
// Los creás una vez en MP Dashboard o via API y pegás los IDs acá
const PLAN_IDS = {
  pro:   { monthly: process.env.MP_PLAN_PRO_MONTHLY   ?? '', yearly: process.env.MP_PLAN_PRO_YEARLY   ?? '' },
  elite: { monthly: process.env.MP_PLAN_ELITE_MONTHLY ?? '', yearly: process.env.MP_PLAN_ELITE_YEARLY ?? '' },
}

export async function POST(req: NextRequest) {
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

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://respawnsocial.vercel.app'

  // Crear suscripción (preapproval) en MP
  // El usuario es redirigido a init_point para completar el pago
  const body = {
    preapproval_plan_id: planId,
    reason: `Respawn ${tier === 'pro' ? 'Pro' : 'Elite'} — ${billing === 'monthly' ? 'Mensual' : 'Anual'}`,
    external_reference: user.id,   // lo usamos en el webhook para identificar al usuario
    payer_email: user.email,
    back_url: `${origin}/premium/success`,
    auto_recurring: {
      // Estos valores se heredan del plan, pero MP los requiere en algunos casos
      // Si tu plan ya los tiene definidos, MP los ignora
    },
  }

  const res = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `${user.id}-${tier}-${billing}-${Date.now()}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json() as { init_point?: string; message?: string; error?: string }

  if (!res.ok || !data.init_point) {
    console.error('[MP checkout]', data)
    return NextResponse.json({ error: data.message ?? 'Error al crear la suscripción.' }, { status: 500 })
  }

  return NextResponse.json({ url: data.init_point })
}
