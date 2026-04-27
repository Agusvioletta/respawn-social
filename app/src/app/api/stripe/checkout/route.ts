import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PRICE_IDS = {
  pro:   { monthly: process.env.STRIPE_PRICE_PRO_MONTHLY   ?? '', yearly: process.env.STRIPE_PRICE_PRO_YEARLY   ?? '' },
  elite: { monthly: process.env.STRIPE_PRICE_ELITE_MONTHLY ?? '', yearly: process.env.STRIPE_PRICE_ELITE_YEARLY ?? '' },
}

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe no configurado.' }, { status: 503 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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
  const priceId = PRICE_IDS[tier]?.[billing]

  if (!priceId) {
    return NextResponse.json({ error: 'Plan no configurado en Stripe todavía.' }, { status: 400 })
  }

  // Import dinámico para no romper el build sin stripe instalado
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe')
  const stripe = new Stripe(stripeKey, { apiVersion: '2025-03-31.basil' })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, username')
    .eq('id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let customerId = (profile as any)?.stripe_customer_id as string | undefined
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id, username: (profile as { username?: string })?.username ?? '' },
    })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://respawnsocial.vercel.app'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/premium/cancel`,
    subscription_data: {
      metadata: { supabase_user_id: user.id, tier, billing },
    },
    metadata: { supabase_user_id: user.id, tier, billing },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
