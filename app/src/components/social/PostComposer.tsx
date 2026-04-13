'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import type { PostWithMeta } from '@/lib/supabase/queries/posts'

const MAX_CHARS = 280

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if ((!content.trim() && !imageFile) || isOverLimit || !user) return
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: postError } = await (supabase as any)
        .from('posts')
        .insert({
          user_id: user.id,
          username: user.username,
          avatar: user.avatar,
          content: content.trim(),
          image_url: imageUrl,
        })
        .select()
        .single()

      if (postError) throw postError

      onPost({ ...data, likes: [], comments: [] })
      setContent('')
      removeImage()

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al publicar'
      setError(`// ${message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      marginBottom: '16px',
    }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Avatar */}
        <div style={{
          width: '38px', height: '38px', flexShrink: 0,
          borderRadius: '50%', background: 'var(--surface)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
        }}>
          {user.avatar === 'avatar1.png' ? '🧑‍💻' : '👾'}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e as unknown as React.FormEvent) }}
            placeholder="¿Qué estás jugando?"
            rows={3}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: '15px',
              lineHeight: '1.5',
              resize: 'none',
              width: '100%',
            }}
          />

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

          {/* Error */}
          {error && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--pink)', margin: 0 }}>
              {error}
            </p>
          )}

          {/* Footer bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Image button */}
              <button type="button" onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  padding: '4px 10px', cursor: 'pointer',
                  transition: 'all var(--transition)',
                }}>
                📎 imagen
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />

              {/* Char counter */}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: counterColor }}>
                {charCount} / {MAX_CHARS}
              </span>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading || isOverLimit || (!content.trim() && !imageFile)}
              style={{
                background: 'transparent',
                border: '1px solid var(--cyan)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--cyan)',
                fontFamily: 'var(--font-display)',
                fontSize: '11px', fontWeight: 700,
                letterSpacing: '2px',
                padding: '6px 16px',
                cursor: (loading || isOverLimit) ? 'not-allowed' : 'pointer',
                opacity: (loading || isOverLimit || (!content.trim() && !imageFile)) ? 0.4 : 1,
                transition: 'all var(--transition)',
              }}>
              {loading ? '...' : 'PUBLICAR'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
