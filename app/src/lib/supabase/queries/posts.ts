import { createClient } from '@/lib/supabase/server'

export interface PostWithMeta {
  id: number
  user_id: string
  username: string
  avatar: string | null
  content: string
  image_url: string | null
  created_at: string
  likes: { user_id: string }[]
  comments: {
    id: number
    user_id: string
    username: string
    avatar: string | null
    content: string
    parent_id: number | null
    created_at: string
  }[]
}

export async function getPosts(limit = 30, offset = 0): Promise<PostWithMeta[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('posts')
    .select(`
      id, user_id, username, avatar, content, image_url, created_at,
      likes(user_id),
      comments(id, user_id, username, avatar, content, parent_id, created_at)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data as PostWithMeta[]
}
