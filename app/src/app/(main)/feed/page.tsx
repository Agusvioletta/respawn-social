import { getPosts } from '@/lib/supabase/queries/posts'
import { FeedList } from '@/components/social/FeedList'
import { FeedSidebar } from '@/components/social/FeedSidebar'

export const metadata = { title: 'Feed' }

export default async function FeedPage() {
  let initialPosts: Awaited<ReturnType<typeof getPosts>> = []
  try {
    initialPosts = await getPosts(30)
  } catch {
    // Feed vacío si falla la carga inicial
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      {/* Main */}
      <main style={{ flex: 1, maxWidth: '640px', minWidth: 0 }}>
        <FeedList initialPosts={initialPosts} />
      </main>

      {/* Sidebar — oculto en mobile */}
      <aside className="hidden lg:block" style={{ width: '300px', flexShrink: 0, position: 'sticky', top: '24px' }}>
        <FeedSidebar />
      </aside>
    </div>
  )
}
