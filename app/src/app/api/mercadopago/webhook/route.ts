import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// MP manda el plan_id en la suscripción — lo usamos para saber el tier
const TIER_FROM_PLAN: Record<string, 'pro' | 'elite'> = {
  [process.env.MP_PLAN_PRO_MONTHLY   ?? '']: 'pro',
  [process.env.MP_PLAN_PRO_YEARLY    ?? '']: 'pro',
  [process.env.MP_PLAN_ELITE_MONTHLY ?? '']: 'elite',
  [process.env.MP_PLAN_ELITE_YEARLY  ?? '']: 'elite',
}

export async function POST(req: NextRequest) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) {
    return NextResponse.json({ error: 'No configurado.' }, { status: 503 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // MP puede mandar el evento como query param o en el body
  const url    = new URL(req.url)
  const topic  = url.searchParams.get('topic') ?? url.searchParams.get('type')
  const dataId = url.searchParams.get('id') ?? url.searchParams.get('data.id')

  // También puede venir en el body JSON
  let bodyId: string | null = null
  let bodyTopic: string | null = null
  try {
    const body = await req.json() as { type?: string; data?: { id?: string }; action?: string }
    bodyTopic = body.type ?? null
    bodyId    = body.data?.id ?? null
  } catch { /* body vacío o no JSON */ }

  const eventTopic = topic ?? bodyTopic
  const eventId    = dataId ?? bodyId

  // Solo procesamos eventos de preapproval (suscripciones)
  if (eventTopic !== 'preapproval' || !eventId) {
    return NextResponse.json({ received: true })
  }

  try {
    // Obtener los detalles de la suscripción desde MP
    const res = await fetch(`https://api.mercadopago.com/preapproval/${eventId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      console.error('[MP webhook] No se pudo obtener preapproval:', eventId)
      return NextResponse.json({ received: true })
    }

    const sub = await res.json() as {
      id: string
      status: string            // 'authorized' | 'paused' | 'cancelled' | 'pending'
      external_reference: string // = supabase user id
      preapproval_plan_id: string
      next_payment_date?: string
    }

    const userId = sub.external_reference
    if (!userId) {
      console.warn('[MP webhook] Sin external_reference en sub:', sub.id)
      return NextResponse.json({ received: true })
    }

    if (sub.status === 'authorized') {
      const tier = TIER_FROM_PLAN[sub.preapproval_plan_id] ?? 'pro'
      await supabase.from('profiles').update({
        premium_tier:           tier,
        stripe_subscription_id: sub.id,   // reutilizamos la columna para el ID de MP
        premium_since:          new Date().toISOString(),
        premium_until:          sub.next_payment_date ?? null,
      }).eq('id', userId)

    } else if (sub.status === 'cancelled' || sub.status === 'paused') {
      await supabase.from('profiles').update({
        premium_tier:           'free',
        stripe_subscription_id: null,
        premium_until:          null,
      }).eq('id', userId)
    }

  } catch (e) {
    console.error('[MP webhook] Error:', e)
  }

  // Siempre respondemos 200 para que MP no reintente
  return NextResponse.json({ received: true })
}
