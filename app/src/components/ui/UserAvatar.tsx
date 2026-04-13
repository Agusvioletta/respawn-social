import Image from 'next/image'

interface UserAvatarProps {
  avatar: string | null
  username: string
  size?: number
}

export function UserAvatar({ avatar, username, size = 38 }: UserAvatarProps) {
  const src = avatar === 'avatar1.png' || avatar === 'avatar2.png'
    ? `/${avatar}`
    : avatar || '/avatar1.png'

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
