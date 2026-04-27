import Image from 'next/image'

interface UserAvatarProps {
  avatar: string | null
  username: string
  size?: number
  /** Foto real subida por el usuario — tiene prioridad sobre el pixel avatar */
  photoUrl?: string | null
}

export function UserAvatar({ avatar, username, size = 38, photoUrl }: UserAvatarProps) {
  // photoUrl (foto real) tiene prioridad; fallback a avatar (pixel) o avatar1
  const resolveAvatar = (a: string | null) =>
    !a ? '/avatar1.png'
    : a.startsWith('http') || a.startsWith('/') ? a
    : `/${a}`

  const src = photoUrl ? photoUrl : resolveAvatar(avatar)

  // Foto real (URL https = Supabase Storage) → círculo, sin pixelado
  // Pixel avatar (path local /avatar*.png)   → cuadrado redondeado, pixelado
  const isRealPhoto = src.startsWith('http')

  return (
    <Image
      src={src}
      alt={`Avatar de ${username}`}
      width={size}
      height={size}
      style={{
        borderRadius: isRealPhoto ? '50%' : '8px',
        border: '1px solid var(--border)',
        objectFit: 'cover',
        imageRendering: isRealPhoto ? 'auto' : 'pixelated',
        flexShrink: 0,
      }}
    />
  )
}
