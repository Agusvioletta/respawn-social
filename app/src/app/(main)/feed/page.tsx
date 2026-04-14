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
    <div style={{ padding: '24px 24px 24px 24px', display: 'flex', gap: '24px', alignItems: 'flex-start', maxWidth: '960px' }}>
      {/* Main feed */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <FeedList initialPosts={initialPosts} />
      </div>

      {/* Sidebar — oculto en mobile/tablet */}
      <aside className="hidden xl:block" style={{ width: '280px', flexShrink: 0, position: 'sticky', top: '24px' }}>
        <FeedSidebar />
      </aside>
    </div>
  )
}
