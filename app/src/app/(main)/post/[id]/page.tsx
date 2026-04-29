import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PostPageClient from './PostPageClient'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const base = {
    title: 'Post — Respawn Social',
    openGraph: { title: 'Post — Respawn Social', siteName: 'Respawn Social' },
  }

  if (!/^\d+$/.test(id)) return base

  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('posts')
      .select('content, username, image_url, avatar')
      .eq('id', id)
      .single()

    if (!data) return base

    const title       = `@${data.username} en Respawn Social`
    const description = data.content
      ? data.content.slice(0, 160).replace(/\n/g, ' ')
      : `Post de @${data.username}`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        siteName: 'Respawn Social',
        images: data.image_url
          ? [{ url: data.image_url, alt: `Post de @${data.username}` }]
          : [{ url: '/og-default.png', alt: 'Respawn Social' }],
      },
      twitter: {
        card: data.image_url ? 'summary_large_image' : 'summary',
        title,
        description,
      },
    }
  } catch {
    return base
  }
}

export default function PostPage() {
  return <PostPageClient />
}
