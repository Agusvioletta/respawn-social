import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPremiumEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// MP manda el plan_id en la suscripción — lo usamos para saber el tier
// Filtramos strings vacíos para evitar que planes desconocidos matcheen
function buildTierMap(): Record<string, 'pro' | 'elite'> {
  const entries: [string, 'pro' | 'elite'][] = [
    [process.env.MP_PLAN_PRO_MONTHLY   ?? '', 'pro'],
    [process.env.MP_PLAN_PRO_YEARLY    ?? '', 'pro'],
    [process.env.MP_PLAN_ELITE_MONTHLY ?? '', 'elite'],
    [process.env.MP_PLAN_ELITE_YEARLY  ?? '', 'elite'],
  ]
  return Object.fromEntries(entries.filter(([k]) => k.length > 0))
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
      external_reference?: string
      payer_email?: string
      preapproval_plan_id: string
      next_payment_date?: string
    }

    // Identificar al usuario: primero por external_reference, luego por email
    let userId: string | null = sub.external_reference ?? null

    if (!userId && sub.payer_email) {
      const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const match = data?.users?.find((u: { email?: string; id: string }) => u.email === sub.payer_email)
      if (match) userId = match.id
    }

    if (!userId) {
      console.warn('[MP webhook] No se pudo identificar al usuario para sub:', sub.id)
      return NextResponse.json({ received: true })
    }

    const TIER_FROM_PLAN = buildTierMap()

    if (sub.status === 'authorized') {
      // Sin fallback: si el plan no está en el mapa, no actualizamos
      const tier = TIER_FROM_PLAN[sub.preapproval_plan_id]
      if (!tier) {
        console.error('[MP webhook] Plan desconocido, no se actualiza tier:', sub.preapproval_plan_id)
        return NextResponse.json({ received: true })
      }
      const { error: dbError } = await supabase.from('profiles').update({
        premium_tier:           tier,
        stripe_subscription_id: sub.id,
        premium_since:          new Date().toISOString(),
        premium_until:          sub.next_payment_date ?? null,
      }).eq('id', userId)
      if (dbError) {
        console.error('[MP webhook] Error al actualizar perfil:', dbError)
        // Retornar 500 para que MP reintente
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }

      // Enviar email de confirmación premium (fire-and-forget)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .single()

        // Obtener email del usuario desde auth
        const { data: authUser } = await supabase.auth.admin.getUserById(userId)
        const userEmail = authUser?.user?.email ?? sub.payer_email

        if (userEmail && profile?.username) {
          const planName = tier === 'elite' ? 'Elite' : 'Pro'
          await sendPremiumEmail(userEmail, profile.username, tier, planName)
        }
      } catch (emailErr) {
        console.error('[MP webhook] Error enviando email premium:', emailErr)
        // No fallamos el webhook por esto
      }

    } else if (sub.status === 'cancelled' || sub.status === 'paused') {
      const { error: dbError } = await supabase.from('profiles').update({
        premium_tier:           'free',
        stripe_subscription_id: null,
        premium_until:          null,
        name_color:             null,  // limpiar color de nombre al cancelar
      }).eq('id', userId)
      if (dbError) {
        console.error('[MP webhook] Error al resetear perfil:', dbError)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }
    }

  } catch (e) {
    console.error('[MP webhook] Error inesperado:', e)
    // Retornar 500 para que MP reintente en caso de error inesperado
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
