import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  // Rate limit: max 3 emails de bienvenida por IP cada 10 minutos
  const ip = getClientIp(req)
  const rl = rateLimit(`email-welcome:${ip}`, { limit: 3, windowMs: 10 * 60_000 })
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes.' },
      { status: 429 }
    )
  }

  try {
    const { to, username } = await req.json() as { to?: string; username?: string }

    if (!to || !username) {
      return NextResponse.json({ error: 'Faltan campos.' }, { status: 400 })
    }

    await sendWelcomeEmail(to, username)
    return NextResponse.json({ sent: true })
  } catch (e) {
    console.error('[API/email/welcome]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
