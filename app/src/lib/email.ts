import { Resend } from 'resend'
import { render } from '@react-email/components'
import { WelcomeEmail } from '@/emails/WelcomeEmail'
import { PremiumEmail } from '@/emails/PremiumEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Respawn Social <noreply@respawnsocial.gg>'

export async function sendWelcomeEmail(to: string, username: string) {
  try {
    const html = await render(WelcomeEmail({ username }))
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `¡Bienvenido a Respawn Social, @${username}! 🎮`,
      html,
    })
    if (error) console.error('[Email] sendWelcome error:', error)
  } catch (e) {
    console.error('[Email] sendWelcome exception:', e)
  }
}

export async function sendPremiumEmail(
  to: string,
  username: string,
  tier: 'pro' | 'elite',
  planName: string,
) {
  try {
    const html = await render(PremiumEmail({ username, tier, planName }))
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `${tier === 'elite' ? '👑 Elite' : '⚡ Pro'} activado en Respawn Social`,
      html,
    })
    if (error) console.error('[Email] sendPremium error:', error)
  } catch (e) {
    console.error('[Email] sendPremium exception:', e)
  }
}
