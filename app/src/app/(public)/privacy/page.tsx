import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Política de Privacidad' }

const SECTIONS = [
  {
    title: '1. Qué información recopilamos',
    content: `Recopilamos: información que proporcionás al registrarte (nombre de usuario, email, avatar); contenido que publicás (posts, comentarios, clips, mensajes); datos de uso (páginas visitadas, funciones utilizadas, timestamps); información técnica (tipo de dispositivo, navegador, dirección IP). No recopilamos datos de pago directamente — éstos son procesados por Mercado Pago.`,
  },
  {
    title: '2. Cómo usamos tu información',
    content: `Usamos tu información para: proveer y mejorar los servicios de la Plataforma; personalizar tu experiencia (feed, recomendaciones); enviarte notificaciones y emails relevantes; detectar y prevenir fraude, spam y violaciones de los Términos; cumplir obligaciones legales; procesar pagos a través de nuestros proveedores de pago.`,
  },
  {
    title: '3. Compartir información',
    content: `No vendemos tu información personal a terceros. Podemos compartir datos con: proveedores de servicios que nos ayudan a operar la Plataforma (hosting, analytics, emails); cuando sea requerido por ley o proceso judicial; en caso de fusión, adquisición o venta de activos (con previo aviso). Tu perfil público (username, avatar, bio) es visible para todos los usuarios.`,
  },
  {
    title: '4. Almacenamiento y seguridad',
    content: `Tus datos se almacenan en servidores de Supabase (infraestructura en la nube con altos estándares de seguridad). Implementamos medidas técnicas y organizacionales para proteger tu información. Sin embargo, ningún sistema es 100% seguro; te recomendamos usar una contraseña segura y única.`,
  },
  {
    title: '5. Cookies y tecnologías similares',
    content: `Usamos cookies esenciales para mantener tu sesión activa. No usamos cookies de seguimiento publicitario de terceros. Podés controlar las cookies desde la configuración de tu navegador, aunque esto puede afectar la funcionalidad de la Plataforma.`,
  },
  {
    title: '6. Tus derechos',
    content: `Tenés derecho a: acceder a tus datos personales; corregir información inexacta; solicitar la eliminación de tu cuenta y datos; exportar tu información; oponerte al procesamiento de tus datos. Para ejercer estos derechos, contactanos en el email indicado abajo.`,
  },
  {
    title: '7. Menores de edad',
    content: `No recopilamos conscientemente datos de menores de 13 años. Si descubrimos que hemos recopilado datos de un menor, los eliminaremos inmediatamente. Si sos padre/madre y creés que tu hijo registró una cuenta, contactanos.`,
  },
  {
    title: '8. Retención de datos',
    content: `Conservamos tus datos mientras tu cuenta esté activa. Al eliminar tu cuenta, tus datos personales se eliminan en 90 días. Algunos datos pueden conservarse por períodos más largos para cumplir obligaciones legales o resolver disputas.`,
  },
  {
    title: '9. Cambios a esta política',
    content: `Podemos actualizar esta política ocasionalmente. Te notificaremos de cambios significativos por email o mediante un aviso destacado en la Plataforma. El uso continuado de la Plataforma tras los cambios implica aceptación de la nueva política.`,
  },
]

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px 80px' }}>
      <div style={{ marginBottom: '40px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--cyan)', letterSpacing: '3px', marginBottom: '12px' }}>
          // LEGAL
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '1px', marginBottom: '12px' }}>
          Política de Privacidad
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
          Responsable: Respawn Social · Contacto privacidad:{' '}
          <a href="mailto:privacidad@respawnsocial.gg" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>
            privacidad@respawnsocial.gg
          </a>
        </p>
      </div>
    </main>
  )
}
