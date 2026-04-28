'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { UserAvatar } from '@/components/ui/UserAvatar'

export interface ClipData {
  id: number
  user_id: string
  username: string
  avatar: string | null
  title: string
  game: string | null
  video_url: string
  thumbnail_url: string | null
  views: number
  created_at: string
  likes_count: number
  comments_count: number
  liked_by_me: boolean
}

export function ClipCard({
  clip,
  onLike,
}: {
  clip: ClipData
  onLike: (id: number) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  function handleMouseEnter() {
    videoRef.current?.play().catch(() => {})
    setPlaying(true)
  }

  function handleMouseLeave() {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    setPlaying(false)
  }

  function fmtViews(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
    return String(n)
  }

  function relTime(iso: string) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000
    if (s < 60) return 'ahora'
    if (s < 3600) return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    if (s < 604800) return `${Math.floor(s / 86400)}d`
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  }

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,255,247,0.3)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Video thumbnail / preview */}
      <Link href={`/clips/${clip.id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div
          style={{ position: 'relative', paddingTop: '56.25%', background: '#000', cursor: 'pointer' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <video
            ref={videoRef}
            src={clip.video_url}
            poster={clip.thumbnail_url ?? undefined}
            muted
            loop
            playsInline
            preload="none"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
            }}
          />

          {/* Play overlay */}
          {!playing && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.35)',
              transition: 'opacity 0.2s',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(0,255,247,0.12)',
                border: '2px solid var(--cyan)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)',
                boxShadow: '0 0 20px rgba(0,255,247,0.3)',
              }}>
                <span style={{ color: 'var(--cyan)', fontSize: '18px', marginLeft: '3px' }}>▶</span>
              </div>
            </div>
          )}

          {/* Game tag */}
          {clip.game && (
            <div style={{
              position: 'absolute', top: '8px', left: '8px',
              background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
              borderRadius: '4px', padding: '2px 8px',
              fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cyan)',
              border: '1px solid rgba(0,255,247,0.25)',
              letterSpacing: '0.5px',
            }}>
              {clip.game}
            </div>
          )}

          {/* Views badge */}
          <div style={{
            position: 'absolute', bottom: '8px', right: '8px',
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            borderRadius: '4px', padding: '2px 8px',
            fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)',
          }}>
            👁 {fmtViews(clip.views)}
          </div>
        </div>
      </Link>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px' }}>
        <Link href={`/clips/${clip.id}`} style={{ textDecoration: 'none' }}>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600,
            color: 'var(--text-primary)', letterSpacing: '0.5px',
            margin: '0 0 8px',
            display: '-webkit-box',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            WebkitLineClamp: 2 as any,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {clip.title}
          </p>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link
            href={`/profile/${clip.username}`}
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}
          >
            <UserAvatar avatar={clip.avatar} username={clip.username} size={22} />
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              @{clip.username}
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '8px' }}>
            <button
              onClick={(e) => { e.preventDefault(); onLike(clip.id) }}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: 'var(--font-mono)', fontSize: '11px',
                color: clip.liked_by_me ? 'var(--pink)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: '3px',
                transition: 'color 0.15s',
              }}
            >
              {clip.liked_by_me ? '❤️' : '🤍'} {clip.likes_count}
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              💬 {clip.comments_count}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
              {relTime(clip.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
