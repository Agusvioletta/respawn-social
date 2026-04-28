'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { ClipCard, ClipData } from '@/components/clips/ClipCard'

const GAMES = [
  'Valorant', 'Fortnite', 'CS2', 'League of Legends',
  'Apex Legends', 'Minecraft', 'GTA V', 'Rocket League',
  'Call of Duty', 'FIFA', 'Overwatch 2', 'Otro',
]

const GAME_FILTERS = ['Todos', 'Valorant', 'Fortnite', 'CS2', 'Apex Legends', 'Minecraft', 'Rocket League', 'Otro']
const PAGE_SIZE = 12

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapClip(c: any, userId: string | null): ClipData {
  return {
    id: c.id,
    user_id: c.user_id,
    username: c.username,
    avatar: c.avatar,
    title: c.title,
    game: c.game,
    video_url: c.video_url,
    thumbnail_url: c.thumbnail_url,
    views: c.views ?? 0,
    created_at: c.created_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    likes_count: c.clip_likes?.length ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    liked_by_me: userId ? (c.clip_likes ?? []).some((l: any) => l.user_id === userId) : false,
    comments_count: c.clip_comments?.length ?? 0,
  }
}

export default function ClipsPage() {
  const user = useAuthStore(s => s.user)
  const supabase = createClient()
  const router = useRouter()

  const [clips, setClips] = useState<ClipData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [gameFilter, setGameFilter] = useState<string | null>(null)

  // Upload modal
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', game: '', description: '' })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [toast, setToast] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)

  // ── Carga de clips ──────────────────────────────────────────────────────────
  async function fetchClips(offset: number, filter: string | null): Promise<ClipData[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      let q = sb
        .from('clips')
        .select('*, clip_likes(user_id), clip_comments(id)')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
      if (filter) q = q.eq('game', filter)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map((c: unknown) => mapClip(c, user?.id ?? null))
    } catch (e) {
      console.error('[Clips] Error al cargar:', e)
      return []
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchClips(0, gameFilter).then(data => {
      setClips(data)
      setHasMore(data.length === PAGE_SIZE)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameFilter, user?.id])

  async function handleLoadMore() {
    setLoadingMore(true)
    const more = await fetchClips(clips.length, gameFilter)
    setClips(prev => [...prev, ...more])
    setHasMore(more.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  // ── Like ────────────────────────────────────────────────────────────────────
  async function handleLike(clipId: number) {
    if (!user) { router.push('/login'); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const clip = clips.find(c => c.id === clipId)
    if (!clip) return
    const wasLiked = clip.liked_by_me
    setClips(prev => prev.map(c => c.id === clipId
      ? { ...c, liked_by_me: !wasLiked, likes_count: c.likes_count + (wasLiked ? -1 : 1) }
      : c
    ))
    try {
      if (wasLiked) {
        await sb.from('clip_likes').delete().eq('clip_id', clipId).eq('user_id', user.id)
      } else {
        await sb.from('clip_likes').insert({ clip_id: clipId, user_id: user.id })
      }
    } catch {
      // Revert
      setClips(prev => prev.map(c => c.id === clipId
        ? { ...c, liked_by_me: wasLiked, likes_count: c.likes_count + (wasLiked ? 1 : -1) }
        : c
      ))
    }
  }

  // ── Upload ──────────────────────────────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setUploadError('Solo se permiten archivos de video.')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('El archivo no puede superar los 50 MB.')
      return
    }
    setUploadFile(file)
    setUploadError('')
    if (uploadPreview) URL.revokeObjectURL(uploadPreview)
    setUploadPreview(URL.createObjectURL(file))
    // Reset input so same file can be reselected
    e.target.value = ''
  }

  function handleThumbSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('La miniatura debe ser una imagen.')
      return
    }
    setThumbFile(file)
    if (thumbPreview) URL.revokeObjectURL(thumbPreview)
    setThumbPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  function resetUploadForm() {
    setUploadFile(null)
    setThumbFile(null)
    if (uploadPreview) URL.revokeObjectURL(uploadPreview)
    if (thumbPreview) URL.revokeObjectURL(thumbPreview)
    setUploadPreview(null)
    setThumbPreview(null)
    setForm({ title: '', game: '', description: '' })
    setUploadError('')
    setUploadProgress(0)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadFile || !form.title.trim() || !user) return
    setUploading(true)
    setUploadError('')
    setUploadProgress(10)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const ext = uploadFile.name.split('.').pop() ?? 'mp4'
      const uuid = crypto.randomUUID()
      const videoPath = `${user.id}/${uuid}.${ext}`

      // 1. Upload del video
      setUploadProgress(15)
      const { error: uploadErr } = await sb.storage
        .from('clips')
        .upload(videoPath, uploadFile, { contentType: uploadFile.type, upsert: false })
      if (uploadErr) throw uploadErr
      setUploadProgress(65)

      const { data: { publicUrl: videoUrl } } = sb.storage.from('clips').getPublicUrl(videoPath)

      // 2. Upload de miniatura (opcional)
      let thumbnailUrl: string | null = null
      if (thumbFile) {
        const thumbExt = thumbFile.name.split('.').pop() ?? 'jpg'
        const thumbPath = `${user.id}/thumbs/${uuid}.${thumbExt}`
        const { error: thumbErr } = await sb.storage
          .from('clips')
          .upload(thumbPath, thumbFile, { contentType: thumbFile.type, upsert: false })
        if (!thumbErr) {
          const { data: { publicUrl } } = sb.storage.from('clips').getPublicUrl(thumbPath)
          thumbnailUrl = publicUrl
        }
      }
      setUploadProgress(80)

      // 3. Insertar registro
      const { data: newClip, error: insertErr } = await sb
        .from('clips')
        .insert({
          user_id:       user.id,
          username:      user.username,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          avatar:        (user as any).photo_url ?? user.avatar ?? null,
          title:         form.title.trim(),
          game:          form.game || null,
          description:   form.description.trim() || null,
          video_url:     videoUrl,
          thumbnail_url: thumbnailUrl,
          views:         0,
        })
        .select('*, clip_likes(user_id), clip_comments(id)')
        .single()
      if (insertErr) throw insertErr
      setUploadProgress(100)

      setClips(prev => [mapClip(newClip, user.id), ...prev])
      setShowUpload(false)
      resetUploadForm()
      showToast('🎬 ¡Clip publicado!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al subir. Intentá de nuevo.'
      setUploadError(msg)
    } finally {
      setUploading(false)
      if (!uploadError) setUploadProgress(0)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // ── Estilos reutilizables ───────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-muted)',
    letterSpacing: '1px',
    display: 'block',
    marginBottom: '6px',
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800,
            letterSpacing: '3px', color: 'var(--text-primary)', margin: 0,
          }}>
            🎬 CLIPS
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            // momentos épicos de la comunidad
          </p>
        </div>
        {user && (
          <button
            onClick={() => setShowUpload(true)}
            style={{
              background: 'var(--cyan-glow)', border: '1px solid var(--cyan)',
              borderRadius: 'var(--radius-md)', padding: '8px 18px',
              fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
              color: 'var(--cyan)', letterSpacing: '1px', cursor: 'pointer',
              boxShadow: '0 0 12px rgba(0,255,247,0.2)',
              transition: 'all var(--transition)',
            }}
          >
            + SUBIR CLIP
          </button>
        )}
      </div>

      {/* Filtros de juego */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {GAME_FILTERS.map(g => {
          const active = g === 'Todos' ? gameFilter === null : gameFilter === g
          return (
            <button
              key={g}
              onClick={() => setGameFilter(g === 'Todos' ? null : g)}
              style={{
                background: active ? 'var(--cyan-glow)' : 'transparent',
                border: `1px solid ${active ? 'var(--cyan)' : 'var(--border)'}`,
                borderRadius: '999px', padding: '4px 14px',
                fontFamily: 'var(--font-mono)', fontSize: '11px',
                color: active ? 'var(--cyan)' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all var(--transition)',
              }}
            >
              {g}
            </button>
          )
        })}
      </div>

      {/* Grid de clips */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
          Cargando clips...
        </div>
      ) : clips.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--text-muted)', letterSpacing: '1px', margin: '0 0 8px' }}>
            {gameFilter ? `No hay clips de ${gameFilter} todavía.` : 'Todavía no hay clips.'}
          </p>
          {user && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              ¡Sé el primero en subir uno!
            </p>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {clips.map(clip => (
            <ClipCard key={clip.id} clip={clip} onLike={handleLike} />
          ))}
        </div>
      )}

      {/* Ver más */}
      {hasMore && !loading && clips.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 32px',
              fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)',
              cursor: loadingMore ? 'not-allowed' : 'pointer',
              opacity: loadingMore ? 0.5 : 1,
              transition: 'all var(--transition)',
            }}
          >
            {loadingMore ? 'Cargando...' : 'Ver más clips'}
          </button>
        </div>
      )}

      {/* ── Modal de upload ─────────────────────────────────────────────────── */}
      {showUpload && (
        <div
          onClick={e => { if (e.target === e.currentTarget) { setShowUpload(false); resetUploadForm() } }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(7,7,15,0.88)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)', padding: '24px',
            width: '100%', maxWidth: '520px',
            maxHeight: '92vh', overflowY: 'auto',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 800,
                letterSpacing: '2px', color: 'var(--cyan)', margin: 0,
              }}>
                🎬 SUBIR CLIP
              </h2>
              <button
                onClick={() => { setShowUpload(false); resetUploadForm() }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', padding: 0 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Video picker */}
              {!uploadPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)',
                    padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                    transition: 'border-color var(--transition)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--cyan)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎮</div>
                  <p style={{
                    fontFamily: 'var(--font-display)', fontSize: '13px',
                    color: 'var(--text-secondary)', letterSpacing: '1px', margin: '0 0 6px',
                  }}>
                    SELECCIONÁ TU CLIP
                  </p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                    MP4, MOV, WebM — máx. 50 MB
                  </p>
                  <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <video
                    src={uploadPreview}
                    controls
                    muted
                    style={{ width: '100%', borderRadius: 'var(--radius-lg)', maxHeight: '240px', objectFit: 'contain', background: '#000' }}
                  />
                  <button
                    type="button"
                    onClick={() => { setUploadFile(null); if (uploadPreview) URL.revokeObjectURL(uploadPreview); setUploadPreview(null) }}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: 'rgba(0,0,0,0.75)', border: 'none', borderRadius: '50%',
                      width: '28px', height: '28px', cursor: 'pointer',
                      color: '#fff', fontSize: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >✕</button>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', margin: '6px 0 0' }}>
                    {uploadFile?.name} · {((uploadFile?.size ?? 0) / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              )}

              {/* Título */}
              <div>
                <label style={labelStyle}>TÍTULO *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Nombre del clip..."
                  maxLength={80}
                  required
                  style={inputStyle}
                />
              </div>

              {/* Juego */}
              <div>
                <label style={labelStyle}>JUEGO</label>
                <select
                  value={form.game}
                  onChange={e => setForm(f => ({ ...f, game: e.target.value }))}
                  style={{ ...inputStyle, color: form.game ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  <option value="">Sin juego</option>
                  {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label style={labelStyle}>DESCRIPCIÓN (OPCIONAL)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Contá qué pasó en el clip..."
                  maxLength={300}
                  rows={2}
                  style={{ ...inputStyle, resize: 'none' as const }}
                />
              </div>

              {/* Miniatura */}
              <div>
                <label style={labelStyle}>MINIATURA (OPCIONAL)</label>
                {!thumbPreview ? (
                  <button
                    type="button"
                    onClick={() => thumbInputRef.current?.click()}
                    style={{
                      background: 'transparent', border: '1px dashed var(--border)',
                      borderRadius: 'var(--radius-md)', padding: '10px 16px',
                      fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)',
                      cursor: 'pointer', width: '100%', textAlign: 'center',
                      transition: 'border-color var(--transition)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--cyan)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    + Agregar imagen de portada
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbPreview} alt="Miniatura" style={{ height: '60px', width: 'auto', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => { setThumbFile(null); if (thumbPreview) URL.revokeObjectURL(thumbPreview); setThumbPreview(null) }}
                      style={{
                        background: 'transparent', border: '1px solid rgba(255,79,123,0.4)',
                        borderRadius: 'var(--radius-sm)', padding: '4px 10px',
                        fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--pink)',
                        cursor: 'pointer',
                      }}
                    >
                      Quitar
                    </button>
                  </div>
                )}
                <input ref={thumbInputRef} type="file" accept="image/*" onChange={handleThumbSelect} style={{ display: 'none' }} />
              </div>

              {/* Progress bar */}
              {uploading && (
                <div>
                  <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${uploadProgress}%`,
                      background: 'linear-gradient(90deg, var(--cyan), var(--purple))',
                      borderRadius: '2px', transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', margin: '6px 0 0' }}>
                    {uploadProgress < 65 ? 'Subiendo video...' : uploadProgress < 85 ? 'Procesando...' : 'Guardando...'}
                    &nbsp;{uploadProgress}%
                  </p>
                </div>
              )}

              {uploadError && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--pink)', margin: 0 }}>
                  ⚠ {uploadError}
                </p>
              )}

              <button
                type="submit"
                disabled={uploading || !uploadFile || !form.title.trim()}
                style={{
                  background: uploading || !uploadFile || !form.title.trim()
                    ? 'var(--border)'
                    : 'var(--cyan-glow)',
                  border: `1px solid ${uploading || !uploadFile || !form.title.trim() ? 'var(--border)' : 'var(--cyan)'}`,
                  borderRadius: 'var(--radius-md)', padding: '12px',
                  fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
                  color: uploading || !uploadFile || !form.title.trim() ? 'var(--text-muted)' : 'var(--cyan)',
                  letterSpacing: '2px',
                  cursor: uploading || !uploadFile || !form.title.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all var(--transition)', width: '100%',
                }}
              >
                {uploading ? `SUBIENDO... ${uploadProgress}%` : 'PUBLICAR CLIP'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface)', border: '1px solid var(--cyan)',
          borderRadius: 'var(--radius-md)', padding: '10px 20px',
          fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--cyan)',
          zIndex: 200, boxShadow: '0 0 20px rgba(0,255,247,0.2)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
