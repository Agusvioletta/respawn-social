import { Resend } from 'resend'
import { render } from '@react-email/components'
import { WelcomeEmail } from '@/emails/WelcomeEmail'
import { PremiumEmail } from '@/emails/PremiumEmail'

// Lazy init — no instanciar a nivel de módulo para no romper el build de Vercel
// cuando RESEND_API_KEY todavía no está disponible en el entorno de compilación.
function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? '')
}

const FROM = 'Respawn Social <noreply@respawnsocial.gg>'

// Emails desactivados temporalmente hasta verificar dominio propio.
// Para reactivar: configurar RESEND_API_KEY en Vercel y verificar el
// dominio en resend.com, luego eliminar los returns anticipados.

export async function sendWelcomeEmail(_to: string, _username: string) {
  if (!process.env.RESEND_API_KEY) return
  // TODO: reactivar cuando haya dominio verificado
}

export async function sendPremiumEmail(
  _to: string,
  _username: string,
  _tier: 'pro' | 'elite',
  _planName: string,
) {
  if (!process.env.RESEND_API_KEY) return
  // TODO: reactivar cuando haya dominio verificado
}
