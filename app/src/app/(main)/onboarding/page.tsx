'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

const GAMES = [
  'Valorant', 'Fortnite', 'CS2', 'League of Legends', 'Apex Legends',
  'Minecraft', 'GTA V', 'Rocket League', 'Call of Duty', 'FIFA',
  'Overwatch 2', 'Dota 2', 'Pokémon', 'Zelda', 'Otro',
]

const STEPS = ['Juegos favoritos', 'Tu perfil', '¡Listo!']

export default function OnboardingPage() {
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [selectedGames, setSelectedGames] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [nowPlaying, setNowPlaying] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleGame(game: string) {
    setSelectedGames(prev =>
      prev.includes(game) ? prev.filter(g => g !== game) : prev.length < 5 ? [...prev, game] : prev
    )
  }

  async function handleFinish() {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbErr } = await (supabase as any).from('profiles').update({
        bio: bio.trim() || null,
        games: selectedGames.length > 0 ? selectedGames : null,
        now_playing: nowPlaying.trim() || null,
      }).eq('id', user.id)
      if (dbErr) throw dbErr
      setStep(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const progressWidth = `${((step + 1) / STEPS.length) * 100}%`

  return (
    <div style={{
      maxWidth: '560px', margin: '0 auto', padding: '40px 20px 80px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 900, color: 'var(--cyan)', letterSpacing: '2px', marginBottom: '8px' }}>
          BIENVENIDO, @{user?.username ?? '...'}
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
          // Completá tu perfil para ganar XP extra
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          {STEPS.map((s, i) => (
            <span key={i} style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '1px',
              color: i <= step ? 'var(--cyan)' : 'var(--text-muted)',
            }}>
              {s}
            </span>
          ))}
        </div>
        <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: progressWidth,
            background: 'linear-gradient(90deg, var(--cyan), var(--purple))',
            borderRadius: '2px', transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* ── Step 0: Juegos ────────────────────────────────────────────────── */}
      {step === 0 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '1px', marginBottom: '8px' }}>
            ¿Qué juegos jugás?
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Elegí hasta 5 juegos favoritos
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
            {GAMES.map(g => {
              const selected = selectedGames.includes(g)
              return (
                <button
                  key={g}
                  onClick={() => toggleGame(g)}
                  style={{
                    padding: '8px 16px', borderRadius: '999px',
                    background: selected ? 'rgba(0,255,247,0.1)' : 'transparent',
                    border: `1px solid ${selected ? 'var(--cyan)' : 'var(--border)'}`,
                    fontFamily: 'var(--font-mono)', fontSize: '12px',
                    color: selected ? 'var(--cyan)' : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {g}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              {selectedGames.length}/5 seleccionados
            </span>
            <button
              onClick={() => setStep(1)}
              style={{
                padding: '10px 28px', borderRadius: '8px',
                background: 'rgba(0,255,247,0.1)', border: '1px solid var(--cyan)',
                fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
                color: 'var(--cyan)', cursor: 'pointer', letterSpacing: '1px',
              }}
            >
              SIGUIENTE →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 1: Bio + now playing ─────────────────────────────────────── */}
      {step === 1 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '1px', marginBottom: '8px' }}>
            Contanos sobre vos
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Todo es opcional, podés completarlo después desde Configuración
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>
                BIO
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Describite en pocas palabras..."
                maxLength={160}
                rows={3}
                style={{
                  width: '100%', background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '10px 14px',
                  fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)',
                  outline: 'none', resize: 'none', boxSizing: 'border-box',
                }}
              />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '4px' }}>
                {bio.length}/160
              </div>
            </div>

            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>
                ¿QUÉ ESTÁS JUGANDO AHORA?
              </label>
              <input
                type="text"
                value={nowPlaying}
                onChange={e => setNowPlaying(e.target.value)}
                placeholder="Ej: Valorant, Ranked"
                maxLength={50}
                style={{
                  width: '100%', background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '10px 14px',
                  fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-primary)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {error && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--pink)', marginBottom: '16px' }}>
              ⚠ {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setStep(0)}
              style={{
                padding: '10px 20px', borderRadius: '8px',
                background: 'transparent', border: '1px solid var(--border)',
                fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              ← Atrás
            </button>
            <button
              onClick={handleFinish}
              disabled={saving}
              style={{
                padding: '10px 28px', borderRadius: '8px',
                background: saving ? 'var(--border)' : 'rgba(0,255,247,0.1)',
                border: `1px solid ${saving ? 'var(--border)' : 'var(--cyan)'}`,
                fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
                color: saving ? 'var(--text-muted)' : 'var(--cyan)',
                cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '1px',
              }}
            >
              {saving ? 'Guardando...' : 'FINALIZAR →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Done ──────────────────────────────────────────────────── */}
      {step === 2 && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎮</div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 900,
            color: 'var(--cyan)', letterSpacing: '2px', marginBottom: '12px',
          }}>
            ¡LISTO, GAMER!
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '40px' }}>
            Tu perfil está configurado. Ganaste +50 XP de bienvenida.<br />
            Ahora explorá el feed, sumate a un torneo o jugá en el arcade.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '280px', margin: '0 auto' }}>
            {[
              { href: '/feed', label: '🏠 IR AL FEED', primary: true },
              { href: '/arcade', label: '🕹️ JUGAR EN EL ARCADE', primary: false },
              { href: '/tournaments', label: '🏆 VER TORNEOS', primary: false },
            ].map(btn => (
              <a
                key={btn.href}
                href={btn.href}
                style={{
                  padding: '12px', borderRadius: '10px', textDecoration: 'none',
                  background: btn.primary ? 'rgba(0,255,247,0.1)' : 'transparent',
                  border: `1px solid ${btn.primary ? 'var(--cyan)' : 'var(--border)'}`,
                  fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
                  color: btn.primary ? 'var(--cyan)' : 'var(--text-muted)',
                  letterSpacing: '1px', display: 'block', textAlign: 'center',
                  transition: 'opacity 0.15s',
                }}
              >
                {btn.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
