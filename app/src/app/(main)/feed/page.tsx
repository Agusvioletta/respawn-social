import { getPosts } from '@/lib/supabase/queries/posts'
import { FeedList } from '@/components/social/FeedList'
import { FeedSidebar } from '@/components/social/FeedSidebar'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Feed' }

export default async function FeedPage() {
  let initialPosts: Awaited<ReturnType<typeof getPosts>> = []
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    initialPosts = await getPosts(30, 0, user?.id)
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
      <aside className="hidden xl:block sidebar-scroll" style={{
        width: '280px', flexShrink: 0,
        position: 'sticky', top: '24px',
        maxHeight: 'calc(100vh - 48px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        alignSelf: 'flex-start',
      }}>
        <FeedSidebar />
      </aside>
    </div>
  )
}
