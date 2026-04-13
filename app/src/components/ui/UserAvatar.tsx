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

  return (
    <Image
      src={src}
      alt={`Avatar de ${username}`}
      width={size}
      height={size}
      style={{
        borderRadius: '50%',
        border: '1px solid var(--border)',
        objectFit: 'cover',
        imageRendering: 'pixelated',
        flexShrink: 0,
      }}
    />
  )
}
