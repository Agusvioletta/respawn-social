'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

const REASONS = [
  'Spam o publicidad no deseada',
  'Acoso o bullying',
  'Contenido inapropiado o violento',
  'Información falsa',
  'Suplantación de identidad',
  'Discurso de odio',
  'Otro',
]

interface Props {
  type: 'post' | 'clip' | 'user'
  targetId: number | string   // post_id / clip_id / user_id
  targetName?: string         // username o título para mostrar
  onClose: () => void
}

export function ReportModal({ type, targetId, targetName, onClose }: Props) {
  const user = useAuthStore(s => s.user)
  const supabase = createClient()

  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason || !user) return
    setLoading(true)
    setError('')
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, unknown> = {
        reporter_id: user.id,
        reason,
        details: details.trim() || null,
      }
      if (type === 'post')  payload.post_id          = Number(targetId)
      if (type === 'clip')  payload.clip_id          = Number(targetId)
      if (type === 'user')  payload.reported_user_id = String(targetId)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbErr } = await (supabase as any).from('reports').insert(payload)
      if (dbErr) throw dbErr
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al enviar el reporte.')
    } finally {
      setLoading(false)
    }
  }

  const typeLabel = type === 'post' ? 'publicación' : type === 'clip' ? 'clip' : 'usuario'

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(7,7,15,0.85)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '24px',
        width: '100%', maxWidth: '420px',
      }}>
        {!done ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 800, letterSpacing: '2px', color: 'var(--pink)', margin: 0 }}>
                🚩 REPORTAR {typeLabel.toUpperCase()}
              </h2>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', padding: 0 }}>✕</button>
            </div>

            {targetName && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Reportando: <span style={{ color: 'var(--text-secondary)' }}>{targetName}</span>
              </p>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                  MOTIVO *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {REASONS.map(r => (
                    <label key={r} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                      background: reason === r ? 'rgba(255,79,123,0.08)' : 'transparent',
                      border: `1px solid ${reason === r ? 'rgba(255,79,123,0.3)' : 'transparent'}`,
                      transition: 'all 0.15s',
                    }}>
                      <input
                        type="radio" name="reason" value={r}
                        checked={reason === r}
                        onChange={() => setReason(r)}
                        style={{ accentColor: 'var(--pink)' }}
                      />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)' }}>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>
                  DETALLES ADICIONALES (OPCIONAL)
                </label>
                <textarea
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="Describí el problema con más detalle..."
                  maxLength={500}
                  rows={3}
                  style={{
                    width: '100%', background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '8px 12px',
                    fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-primary)',
                    outline: 'none', resize: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {error && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--pink)', margin: 0 }}>⚠ {error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !reason}
                style={{
                  background: loading || !reason ? 'transparent' : 'rgba(255,79,123,0.1)',
                  border: `1px solid ${loading || !reason ? 'var(--border)' : 'var(--pink)'}`,
                  borderRadius: '8px', padding: '10px',
                  fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
                  color: loading || !reason ? 'var(--text-muted)' : 'var(--pink)',
                  cursor: loading || !reason ? 'not-allowed' : 'pointer',
                  letterSpacing: '1px', transition: 'all 0.15s',
                }}
              >
                {loading ? 'Enviando...' : 'ENVIAR REPORTE'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: 'var(--cyan)', letterSpacing: '1px', marginBottom: '8px' }}>
              REPORTE ENVIADO
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              Gracias por ayudar a mantener la comunidad. Revisaremos tu reporte a la brevedad.
            </p>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '8px 24px',
                fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
