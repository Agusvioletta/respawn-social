'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/ui/UserAvatar'
import type { PostWithMeta } from '@/lib/supabase/queries/posts'

const MAX_CHARS = 280

const LFG_PLATFORMS = ['PC', 'PS5', 'PS4', 'Xbox', 'Nintendo Switch', 'Mobile', 'Cualquier plataforma']

interface PostComposerProps {
  onPost: (post: PostWithMeta) => void
}

export function PostComposer({ onPost }: PostComposerProps) {
  const user = useAuthStore((s) => s.user)
  const supabase = createClient()

  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // LFG mode
  const [isLFG, setIsLFG] = useState(false)
  const [lfgGame, setLfgGame] = useState('')
  const [lfgPlatform, setLfgPlatform] = useState('')
  const [lfgSlots, setLfgSlots] = useState(1)

  const charCount = content.length
  const isOverLimit = charCount > MAX_CHARS
  const counterColor = charCount > 270 ? 'var(--pink)' : charCount > 240 ? '#F59E0B' : 'var(--text-muted)'

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function toggleLFG() {
    setIsLFG((v) => !v)
    if (isLFG) { setLfgGame(''); setLfgPlatform(''); setLfgSlots(1) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if ((!content.trim() && !imageFile) || isOverLimit || !user) return
    if (isLFG && !lfgGame.trim()) { setError('// Indicá el juego para el post LFG.'); return }
    setLoading(true)
    setError('')

    try {
      let imageUrl: string | null = null

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: uploadError } = await (supabase.storage as any)
          .from('post-images')
          .upload(path, imageFile, { cacheControl: '3600', upsert: false })
        if (uploadError) throw uploadError
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: urlData } = (supabase.storage as any)
          .from('post-images')
          .getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }

      const payload: Record<string, unknown> = {
        user_id: user.id,
        username: user.username,
        avatar: user.avatar,
        content: content.trim(),
        image_url: imageUrl,
      }
      if (isLFG) {
        payload.post_type = 'lfg'
        payload.lfg_game = lfgGame.trim()
        payload.lfg_platform = lfgPlatform || null
        payload.lfg_slots = lfgSlots
      }

      // INSERT separado del SELECT — evita fallos de RLS si la política
      // de lectura no devuelve la fila recién insertada via .select().single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: postError } = await (supabase as any)
        .from('posts')
        .insert(payload)

      if (postError) throw postError

      // Fetch del post recién creado con likes/comments para el callback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: inserted } = await (supabase as any)
        .from('posts')
        .select('*, likes(user_id), comments(id, user_id, username, avatar, content, parent_id, created_at)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (inserted) onPost({ ...inserted, likes: inserted.likes ?? [], comments: inserted.comments ?? [] })
      setContent('')
      removeImage()
      if (isLFG) { setLfgGame(''); setLfgPlatform(''); setLfgSlots(1); setIsLFG(false) }

    } catch (err: unknown) {
      console.error('[PostComposer] Error al publicar:', err)
      let message = 'Error al publicar. Intentá de nuevo.'
      if (err instanceof Error) {
        message = err.message
      } else if (typeof err === 'object' && err !== null) {
        // Supabase devuelve objetos, no instancias de Error
        const e = err as { message?: string; details?: string; hint?: string; code?: string }
        message = e.message || e.details || JSON.stringify(err)
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  const inputStyle = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '7px 10px',
    color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
    fontSize: '12px', outline: 'none',
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--card)',
      border: `1px solid ${isLFG ? 'rgba(192,132,252,0.4)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      marginBottom: '16px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color var(--transition)',
      boxShadow: isLFG ? '0 0 20px rgba(192,132,252,0.08)' : 'none',
    }}>
      {/* Top gradient line — igual versión vieja */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: isLFG
          ? 'linear-gradient(90deg, var(--purple-dim), var(--cyan-dim), var(--pink-dim))'
          : 'linear-gradient(90deg, var(--cyan-dim), var(--purple-dim), var(--pink-dim))',
      }} />

      {/* LFG banner */}
      {isLFG && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.3)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px' }}>🔎</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: 'var(--purple)', letterSpacing: '1px' }}>
            LOOKING FOR GROUP
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            Buscás compañeros de juego
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <UserAvatar avatar={user.avatar} username={user.username} size={38} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e as unknown as React.FormEvent) }}
            placeholder={isLFG ? '¿Qué necesitás de tus compañeros? Nivel, horario, idioma...' : '¿Qué estás jugando?'}
            rows={3}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
              fontSize: '15px', lineHeight: '1.5', resize: 'none', width: '100%',
            }}
          />

          {/* LFG fields */}
          {isLFG && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>JUEGO *</div>
                <input
                  style={{ ...inputStyle, width: '100%' }}
                  placeholder="ej: Valorant"
                  value={lfgGame}
                  onChange={e => setLfgGame(e.target.value)}
                />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>PLATAFORMA</div>
                <select
                  style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
                  value={lfgPlatform}
                  onChange={e => setLfgPlatform(e.target.value)}
                >
                  <option value="">Cualquiera</option>
                  {LFG_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>LUGARES</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button type="button" onClick={() => setLfgSlots(s => Math.max(1, s - 1))} style={{ ...inputStyle, padding: '7px 10px', cursor: 'pointer', lineHeight: 1 }}>−</button>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: 'var(--purple)', minWidth: '20px', textAlign: 'center' }}>{lfgSlots}</span>
                  <button type="button" onClick={() => setLfgSlots(s => Math.min(9, s + 1))} style={{ ...inputStyle, padding: '7px 10px', cursor: 'pointer', lineHeight: 1 }}>+</button>
                </div>
              </div>
            </div>
          )}

          {/* Image preview */}
          {imagePreview && (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={imagePreview} alt="preview" style={{
                maxHeight: '200px', maxWidth: '100%',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                objectFit: 'cover',
              }} />
              <button type="button" onClick={removeImage} style={{
                position: 'absolute', top: '6px', right: '6px',
                background: 'rgba(0,0,0,0.7)', border: 'none',
                borderRadius: '50%', width: '24px', height: '24px',
                color: 'var(--text-primary)', cursor: 'pointer',
                fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                ✕
              </button>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(255,79,123,0.1)', border: '1px solid rgba(255,79,123,0.4)',
              borderRadius: 'var(--radius-sm)', padding: '8px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--pink)' }}>
                ⚠ {error}
              </span>
              <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'var(--pink)', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}>✕</button>
            </div>
          )}

          {/* Footer bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {/* LFG toggle */}
              <button type="button" onClick={toggleLFG} style={{
                background: isLFG ? 'rgba(192,132,252,0.15)' : 'transparent',
                border: `1px solid ${isLFG ? 'var(--purple)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)', color: isLFG ? 'var(--purple)' : 'var(--text-muted)',
                fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: isLFG ? 700 : 400,
                padding: '4px 10px', cursor: 'pointer', letterSpacing: '1px',
                transition: 'all var(--transition)',
              }}>
                🔎 LFG
              </button>

              {/* Image button */}
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)', fontSize: '11px',
                padding: '4px 10px', cursor: 'pointer',
                transition: 'all var(--transition)',
              }}>
                📎 imagen
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />

              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: counterColor }}>
                {charCount} / {MAX_CHARS}
              </span>
            </div>

            <button type="submit" disabled={loading || isOverLimit || (!content.trim() && !imageFile)}
              style={{
                background: isLFG ? 'rgba(192,132,252,0.15)' : 'transparent',
                border: `1px solid ${isLFG ? 'var(--purple)' : 'var(--cyan)'}`,
                borderRadius: 'var(--radius-md)',
                color: isLFG ? 'var(--purple)' : 'var(--cyan)',
                fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
                letterSpacing: '2px', padding: '6px 16px',
                cursor: (loading || isOverLimit) ? 'not-allowed' : 'pointer',
                opacity: (loading || isOverLimit || (!content.trim() && !imageFile)) ? 0.4 : 1,
                transition: 'all var(--transition)',
              }}>
              {loading ? '...' : isLFG ? 'BUSCAR EQUIPO' : 'PUBLICAR'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
