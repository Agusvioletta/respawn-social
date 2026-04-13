import { getPosts } from '@/lib/supabase/queries/posts'
import { FeedList } from '@/components/social/FeedList'

export const metadata = { title: 'Feed' }

export default async function FeedPage() {
  let initialPosts: Awaited<ReturnType<typeof getPosts>> = []
  try {
    initialPosts = await getPosts(30)
  } catch {
    // Si falla la carga inicial, mostramos feed vacío y el client carga por realtime
  }

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '16px',
        letterSpacing: '3px',
        color: 'var(--text-muted)',
        marginBottom: '20px',
        fontWeight: 700,
      }}>
        FEED
      </h1>
      <FeedList initialPosts={initialPosts} />
    </div>
  )
}
