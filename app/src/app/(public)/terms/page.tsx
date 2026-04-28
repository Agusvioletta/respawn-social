import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Términos de Servicio' }

const SECTIONS = [
  {
    title: '1. Aceptación de los términos',
    content: `Al registrarte y usar Respawn Social ("la Plataforma"), aceptás estos Términos de Servicio. Si no estás de acuerdo, no uses la Plataforma. Nos reservamos el derecho de modificar estos términos en cualquier momento; los cambios se notificarán con 15 días de anticipación.`,
  },
  {
    title: '2. Elegibilidad',
    content: `Debés tener al menos 13 años para usar Respawn Social. Si tenés entre 13 y 18 años, necesitás el consentimiento de un padre o tutor. Al registrarte, confirmás que cumplís con estos requisitos de edad.`,
  },
  {
    title: '3. Cuenta de usuario',
    content: `Sos responsable de mantener la confidencialidad de tu contraseña y de todas las actividades que ocurran en tu cuenta. Notificanos inmediatamente de cualquier uso no autorizado. No podés transferir tu cuenta a otra persona. Nos reservamos el derecho de suspender cuentas que violen estos términos.`,
  },
  {
    title: '4. Conducta del usuario',
    content: `Está prohibido: publicar contenido ilegal, pornográfico o violento; acosar, amenazar o difamar a otros usuarios; hacer spam o publicidad no autorizada; crear cuentas falsas o suplantar identidades; intentar hackear o comprometer la seguridad de la Plataforma; publicar información personal de terceros sin su consentimiento.`,
  },
  {
    title: '5. Contenido generado por usuarios',
    content: `Al publicar contenido (posts, clips, comentarios), otorgás a Respawn Social una licencia no exclusiva, mundial y libre de regalías para usar, mostrar y distribuir dicho contenido dentro de la Plataforma. Seguís siendo el dueño de tu contenido. Sos responsable de que el contenido que publicás no infrinja derechos de terceros.`,
  },
  {
    title: '6. Suscripciones premium',
    content: `Los planes Pro y Elite son suscripciones de pago procesadas por Mercado Pago. Los cobros son automáticos según el período elegido (mensual o anual). Podés cancelar en cualquier momento desde tu configuración de cuenta; la cancelación es efectiva al fin del período vigente. No hacemos reembolsos por períodos parciales salvo obligación legal.`,
  },
  {
    title: '7. Propiedad intelectual',
    content: `La Plataforma, su diseño, código y contenido original son propiedad de Respawn Social. Queda prohibida la reproducción, distribución o modificación sin autorización expresa. El contenido de usuarios pertenece a sus respectivos creadores según lo descrito en la sección 5.`,
  },
  {
    title: '8. Limitación de responsabilidad',
    content: `Respawn Social no se hace responsable por daños indirectos, incidentales o consecuentes derivados del uso o imposibilidad de uso de la Plataforma. En ningún caso nuestra responsabilidad superará el monto pagado por el usuario en los últimos 12 meses.`,
  },
  {
    title: '9. Terminación',
    content: `Podemos suspender o terminar tu acceso a la Plataforma por violaciones a estos términos, con o sin previo aviso. Podés eliminar tu cuenta en cualquier momento desde Configuración. Tras la eliminación, tu contenido puede permanecer en nuestros sistemas por hasta 90 días por razones técnicas.`,
  },
  {
    title: '10. Ley aplicable',
    content: `Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa será resuelta ante los tribunales competentes de la Ciudad Autónoma de Buenos Aires.`,
  },
]

export default function TermsPage() {
  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px 80px' }}>
      <div style={{ marginBottom: '40px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--cyan)', letterSpacing: '3px', marginBottom: '12px' }}>
          // LEGAL
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '1px', marginBottom: '12px' }}>
          Términos de Servicio
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
          Última actualización: enero 2026
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {SECTIONS.map((s, i) => (
          <section key={i}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700,
              color: 'var(--cyan)', letterSpacing: '1px', marginBottom: '10px',
            }}>
              {s.title}
            </h2>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '15px',
              color: 'var(--text-secondary)', lineHeight: 1.75,
            }}>
              {s.content}
            </p>
          </section>
        ))}
      </div>

      <div style={{
        marginTop: '48px', padding: '20px', borderRadius: '12px',
        border: '1px solid var(--border)', background: 'var(--card)',
      }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          ¿Preguntas? Contactanos en{' '}
          <a href="mailto:soporte@respawnsocial.gg" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>
            soporte@respawnsocial.gg
          </a>
        </p>
      </div>
    </main>
  )
}
