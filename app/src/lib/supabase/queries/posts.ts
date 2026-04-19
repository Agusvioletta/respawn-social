import { createClient } from '@/lib/supabase/server'

export interface PostWithMeta {
  id: number
  user_id: string
  username: string
  avatar: string | null
  content: string
  image_url: string | null
  created_at: string
  post_type?: 'normal' | 'lfg'
  lfg_game?: string | null
  lfg_platform?: string | null
  lfg_slots?: number | null
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

export async function getPosts(limit = 30, offset = 0, currentUserId?: string): Promise<PostWithMeta[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // ── Determinar qué user_ids son visibles para currentUser ──────────────────
  // Regla: post visible si:
  //   1. El autor tiene privacy_posts = 'public' (o null/undefined)
  //   2. El autor es el propio currentUser
  //   3. El autor tiene privacy_posts = 'followers' Y currentUser lo sigue
  // Regla: post NO visible si:
  //   - privacy_posts = 'private' y no es el propio usuario
  //   - privacy_posts = 'followers' y no lo seguís

  let visibleUserIds: string[] | null = null // null = sin restricción (unauthenticated → solo públicos)

  if (currentUserId) {
    // Perfiles con privacidad restringida
    const { data: restrictedProfiles } = await sb
      .from('profiles')
      .select('id, privacy_posts')
      .in('privacy_posts', ['followers', 'private'])

    if (restrictedProfiles?.length) {
      // De los restringidos, ¿cuáles seguís?
      const restrictedIds = restrictedProfiles.map((p: { id: string }) => p.id)
      const { data: follows } = await sb
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId)
        .in('following_id', restrictedIds)

      const followingSet = new Set<string>((follows ?? []).map((f: { following_id: string }) => f.following_id))

      // Ids a excluir del feed:
      // - 'private' siempre (excepto si sos vos)
      // - 'followers' si no los seguís (excepto si sos vos)
      const excludedIds = restrictedProfiles
        .filter((p: { id: string; privacy_posts: string }) => {
          if (p.id === currentUserId) return false      // tus propios posts siempre visibles
          if (p.privacy_posts === 'private') return true // privado → excluir siempre
          if (p.privacy_posts === 'followers' && !followingSet.has(p.id)) return true // no seguís → excluir
          return false
        })
        .map((p: { id: string }) => p.id)

      visibleUserIds = excludedIds.length > 0 ? ['__excluded__', ...excludedIds] : null
      // Guardamos los excluidos; los filtramos en la query abajo
    }
  }

  // ── Query de posts ─────────────────────────────────────────────────────────
  let query = sb
    .from('posts')
    .select(`
      id, user_id, username, avatar, content, image_url, created_at,
      post_type, lfg_game, lfg_platform, lfg_slots,
      likes(user_id),
      comments(id, user_id, username, avatar, content, parent_id, created_at)
    `)
    .order('created_at', { ascending: false })

  // Si no estás autenticado, solo posts de perfiles públicos
  if (!currentUserId) {
    // Traer IDs de perfiles públicos
    const { data: publicProfiles } = await sb
      .from('profiles')
      .select('id')
      .or('privacy_posts.eq.public,privacy_posts.is.null')
    const publicIds = (publicProfiles ?? []).map((p: { id: string }) => p.id)
    if (publicIds.length > 0) query = query.in('user_id', publicIds)
    else return []
  } else if (visibleUserIds) {
    // Excluir los ids restringidos — visibleUserIds[0] es '__excluded__'
    const excludedIds = visibleUserIds.slice(1)
    if (excludedIds.length > 0) query = query.not('user_id', 'in', `(${excludedIds.join(',')})`)
  }

  const { data, error } = await query.range(offset, offset + limit - 1)
  if (error) throw error
  return data as PostWithMeta[]
}
