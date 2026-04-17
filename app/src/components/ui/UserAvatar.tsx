import Image from 'next/image'

interface UserAvatarProps {
  avatar: string | null
  username: string
  size?: number
}

export function UserAvatar({ avatar, username, size = 38 }: UserAvatarProps) {
  // Soporta: URL completa (storage), '/avatar1.png', 'avatar1.png', null
  const src = !avatar
    ? '/avatar1.png'
    : avatar.startsWith('http') || avatar.startsWith('/')
      ? avatar
      : `/${avatar}`

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
