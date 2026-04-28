import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Respawn Social — El lugar donde siempre volvés',
  description: 'La red social definitiva para gamers. Feed, torneos, arcade integrado, clips, mensajes y más. Comunidad gamer en español.',
  openGraph: {
    title: 'Respawn Social',
    description: 'La red social definitiva para gamers en español.',
    type: 'website',
  },
}

const FEATURES = [
  {
    icon: '🏠',
    title: 'Feed Social',
    desc: 'Posts, likes y comentarios en tiempo real. Hashtags, menciones y reacciones al estilo gamer.',
    color: 'var(--cyan)',
  },
  {
    icon: '🏆',
    title: 'Torneos',
    desc: 'Organizá y participá en torneos con brackets automáticos, seguimiento de resultados y rankings.',
    color: '#F59E0B',
  },
  {
    icon: '🎬',
    title: 'Clips',
    desc: 'Subí y compartí tus mejores momentos. Feed de clips con likes, comentarios y filtros por juego.',
    color: 'var(--pink)',
  },
  {
    icon: '🕹️',
    title: 'Arcade',
    desc: '8 juegos retro integrados con sistema de XP, niveles y leaderboards globales.',
    color: 'var(--purple)',
  },
  {
    icon: '💬',
    title: 'Mensajes',
    desc: 'Chat privado con indicador de escritura, mensajes de voz, llamadas y desafíos de juegos.',
    color: '#4ADE80',
  },
  {
    icon: '⚡',
    title: 'Premium',
    desc: 'Planes Pro y Elite: más caracteres, torneos propios, color de nombre y estadísticas avanzadas.',
    color: '#F59E0B',
  },
]

const STATS = [
  { value: '8', label: 'Juegos en el arcade' },
  { value: '∞', label: 'Torneos posibles' },
  { value: '100%', label: 'Hecho para gamers' },
  { value: 'Free', label: 'Para empezar' },
]

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--void)', minHeight: '100vh', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600&family=Share+Tech+Mono&display=swap');
        :root {
          --void: #07070F; --deep: #0B0B14; --surface: #111120; --card: #161628;
          --cyan: #00FFF7; --pink: #FF4F7B; --purple: #C084FC;
          --text-primary: #E8E8F0; --text-secondary: #9090B0; --text-muted: #555570;
          --border: rgba(255,255,255,0.07);
          --font-display: 'Orbitron', sans-serif;
          --font-body: 'Rajdhani', sans-serif;
          --font-mono: 'Share Tech Mono', monospace;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .hero-glow {
          position: absolute; border-radius: 50%; filter: blur(120px); pointer-events: none;
        }
        .feature-card:hover { border-color: rgba(0,255,247,0.3) !important; transform: translateY(-2px); }
        .feature-card { transition: all 0.2s ease; }
        .cta-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .cta-btn { transition: all 0.15s ease; }
        .nav-link:hover { color: var(--cyan) !important; }
        .nav-link { transition: color 0.15s; }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes scan {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 0.5; }
          90% { opacity: 0.5; }
          100% { transform: translateY(1000%); opacity: 0; }
        }
        @keyframes grid-pulse {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.06; }
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(7,7,15,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 900, color: 'var(--cyan)', letterSpacing: '2px', textShadow: '0 0 20px rgba(0,255,247,0.5)' }}>
          RESPAWN
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/login" className="nav-link cta-btn" style={{
            padding: '7px 18px', borderRadius: '8px',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
            color: 'var(--text-secondary)', textDecoration: 'none', letterSpacing: '1px',
          }}>
            ENTRAR
          </Link>
          <Link href="/signup" className="cta-btn" style={{
            padding: '7px 18px', borderRadius: '8px',
            background: 'rgba(0,255,247,0.1)', border: '1px solid var(--cyan)',
            fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
            color: 'var(--cyan)', textDecoration: 'none', letterSpacing: '1px',
            boxShadow: '0 0 12px rgba(0,255,247,0.15)',
          }}>
            REGISTRARSE
          </Link>
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', padding: '100px 24px 80px', textAlign: 'center', overflow: 'hidden' }}>
        {/* Background glows */}
        <div className="hero-glow" style={{ width: '600px', height: '600px', background: 'rgba(0,255,247,0.07)', top: '-200px', left: '50%', transform: 'translateX(-50%)' }} />
        <div className="hero-glow" style={{ width: '400px', height: '400px', background: 'rgba(255,79,123,0.05)', bottom: '-100px', right: '10%' }} />
        {/* Scan line */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, rgba(0,255,247,0.4), transparent)', animation: 'scan 6s linear infinite' }} />
        </div>
        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(0,255,247,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,247,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          animation: 'grid-pulse 4s ease-in-out infinite',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-block',
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            color: 'var(--cyan)', letterSpacing: '3px',
            border: '1px solid rgba(0,255,247,0.25)',
            padding: '4px 16px', borderRadius: '999px',
            background: 'rgba(0,255,247,0.06)',
            marginBottom: '28px',
          }}>
            // BIENVENIDO AL RESPAWN
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 900,
            fontSize: 'clamp(40px, 8vw, 96px)',
            lineHeight: 1, letterSpacing: '-1px',
            marginBottom: '16px',
          }}>
            <span style={{ color: 'var(--text-primary)' }}>RESPAWN </span>
            <span style={{ color: 'var(--cyan)', textShadow: '0 0 40px rgba(0,255,247,0.5)' }}>SOCIAL</span>
          </h1>

          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 3vw, 22px)',
            color: 'var(--text-secondary)', letterSpacing: '4px',
            marginBottom: '32px', fontWeight: 400,
          }}>
            EL LUGAR DONDE SIEMPRE VOLVÉS
          </p>

          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '16px',
            color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 48px',
            lineHeight: 1.7,
          }}>
            La red social definitiva para gamers. Feed, torneos, arcade, clips, mensajes y más. Todo en un solo lugar.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" className="cta-btn" style={{
              padding: '14px 36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(0,255,247,0.15), rgba(0,255,247,0.05))',
              border: '1px solid var(--cyan)',
              fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
              color: 'var(--cyan)', textDecoration: 'none', letterSpacing: '2px',
              boxShadow: '0 0 24px rgba(0,255,247,0.2)',
            }}>
              CREAR CUENTA GRATIS
            </Link>
            <Link href="/login" className="cta-btn" style={{
              padding: '14px 36px', borderRadius: '10px',
              background: 'transparent', border: '1px solid var(--border)',
              fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
              color: 'var(--text-secondary)', textDecoration: 'none', letterSpacing: '2px',
            }}>
              YA TENGO CUENTA
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 80px' }}>
        <div style={{
          maxWidth: '800px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1px', background: 'var(--border)',
          border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden',
        }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              background: 'var(--card)', padding: '28px 24px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 900, color: 'var(--cyan)', textShadow: '0 0 20px rgba(0,255,247,0.3)', letterSpacing: '-1px' }}>
                {s.value}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', marginTop: '6px' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--cyan)', letterSpacing: '3px', marginBottom: '12px' }}>
              // FEATURES
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '1px' }}>
              TODO LO QUE UN GAMER NECESITA
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card" style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '16px', padding: '24px',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '14px' }}>{f.icon}</div>
                <h3 style={{
                  fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700,
                  color: f.color, letterSpacing: '1px', marginBottom: '8px',
                }}>
                  {f.title}
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ───────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>
        <div className="hero-glow" style={{ width: '500px', height: '500px', background: 'rgba(192,132,252,0.08)', top: '-200px', left: '50%', transform: 'translateX(-50%)' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 5vw, 44px)',
            fontWeight: 900, letterSpacing: '2px', marginBottom: '16px',
          }}>
            <span style={{ color: 'var(--text-primary)' }}>LISTO PARA EL </span>
            <span style={{ color: 'var(--pink)', textShadow: '0 0 30px rgba(255,79,123,0.4)' }}>RESPAWN</span>
            <span style={{ color: 'var(--text-primary)' }}>?</span>
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--text-muted)', marginBottom: '36px', lineHeight: 1.6 }}>
            Gratis para siempre. Sin tarjeta de crédito. Únite en 30 segundos.
          </p>
          <Link href="/signup" className="cta-btn" style={{
            display: 'inline-block', padding: '16px 48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(255,79,123,0.2), rgba(192,132,252,0.1))',
            border: '1px solid var(--pink)',
            fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700,
            color: 'var(--pink)', textDecoration: 'none', letterSpacing: '2px',
            boxShadow: '0 0 24px rgba(255,79,123,0.2)',
          }}>
            EMPEZAR AHORA →
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '32px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '2px' }}>
          RESPAWN SOCIAL
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          {[
            { href: '/terms', label: 'Términos' },
            { href: '/privacy', label: 'Privacidad' },
            { href: '/login', label: 'Iniciar sesión' },
            { href: '/signup', label: 'Registrarse' },
          ].map(l => (
            <Link key={l.href} href={l.href} className="nav-link" style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: 'var(--text-muted)', textDecoration: 'none', letterSpacing: '0.5px',
            }}>
              {l.label}
            </Link>
          ))}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
          © 2026 Respawn Social
        </div>
      </footer>
    </div>
  )
}
