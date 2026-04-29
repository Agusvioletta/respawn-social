import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProfilePageClient from './ProfilePageClient'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const base = {
    title: `@${username} — Respawn Social`,
    openGraph: { title: `@${username} — Respawn Social`, siteName: 'Respawn Social' },
  }

  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('profiles')
      .select('username, bio, photo_url, avatar, max_level')
      .eq('username', username)
      .single()

    if (!data) return base

    const LEVEL_NAMES = ['Novato','Aprendiz','Jugador','Veterano','Elite','Leyenda','Máster','Campeón']
    const levelName   = LEVEL_NAMES[(data.max_level ?? 1) - 1] ?? 'Novato'
    const title       = `@${data.username} · ${levelName} — Respawn Social`
    const description = data.bio
      ? data.bio.slice(0, 160)
      : `Conocé el perfil de @${data.username} en Respawn Social, la red social para gamers.`
    const image = data.photo_url ?? null

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'profile',
        siteName: 'Respawn Social',
        images: image
          ? [{ url: image, alt: `@${data.username}` }]
          : [{ url: '/og-default.png', alt: 'Respawn Social' }],
      },
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        title,
        description,
      },
    }
  } catch {
    return base
  }
}

export default function ProfilePage() {
  return <ProfilePageClient />
}
