import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const stripeKey       = process.env.STRIPE_SECRET_KEY
  const webhookSecret   = process.env.STRIPE_WEBHOOK_SECRET
  const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe no configurado.' }, { status: 503 })
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe')
  const stripe = new Stripe(stripeKey, { apiVersion: '2025-03-31.basil' })
  const supabase = createClient(supabaseUrl, supabaseService)

  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (e) {
    console.error('[Stripe webhook] Firma inválida:', e)
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 400 })
  }

  const PRICE_IDS: Record<string, 'pro' | 'elite'> = {
    [process.env.STRIPE_PRICE_PRO_MONTHLY   ?? '']: 'pro',
    [process.env.STRIPE_PRICE_PRO_YEARLY    ?? '']: 'pro',
    [process.env.STRIPE_PRICE_ELITE_MONTHLY ?? '']: 'elite',
    [process.env.STRIPE_PRICE_ELITE_YEARLY  ?? '']: 'elite',
  }

  switch (event.type) {

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object
      const userId = sub.metadata?.supabase_user_id
      if (!userId) break
      const priceId = sub.items?.data?.[0]?.price?.id ?? ''
      const tier = PRICE_IDS[priceId] ?? 'pro'
      const periodEnd = new Date((sub.current_period_end ?? 0) * 1000).toISOString()
      await supabase.from('profiles').update({
        premium_tier:           tier,
        stripe_subscription_id: sub.id,
        premium_since:          new Date().toISOString(),
        premium_until:          periodEnd,
      }).eq('id', userId)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const userId = sub.metadata?.supabase_user_id
      if (!userId) break
      await supabase.from('profiles').update({
        premium_tier:           'free',
        stripe_subscription_id: null,
        premium_until:          null,
      }).eq('id', userId)
      break
    }

    case 'checkout.session.completed': {
      const session = event.data.object
      const userId = session.metadata?.supabase_user_id
      const tier   = (session.metadata?.tier ?? 'pro') as 'pro' | 'elite'
      if (!userId) break
      const { data: prof } = await supabase.from('profiles').select('premium_tier').eq('id', userId).single()
      if ((prof as { premium_tier?: string } | null)?.premium_tier === 'free') {
        await supabase.from('profiles').update({
          premium_tier:  tier,
          premium_since: new Date().toISOString(),
        }).eq('id', userId)
      }
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
