// supabase.js — Respawn Social Backend v2
// Cargado como <script> normal — sin ES modules
// El cliente de Supabase viene del CDN cargado antes de este archivo

const SUPABASE_URL  = 'https://ajegcbzvviukuewqhqqb.supabase.co';
const SUPABASE_ANON = 'sb_publishable_Nqo7KTTik0nnWidf04yuGw_hDOP28Eq';

// Inicializar cliente
// unpkg expone window.supabase = { createClient, ... }
// Intentamos distintas formas según cómo el CDN lo exponga
let _sbCreateClient;
if (window.supabase && typeof window.supabase.createClient === 'function') {
  _sbCreateClient = window.supabase.createClient;
} else if (window.supabaseJs && typeof window.supabaseJs.createClient === 'function') {
  _sbCreateClient = window.supabaseJs.createClient;
} else {
  // Último recurso: buscar en todas las propiedades de window
  for (const key of Object.keys(window)) {
    if (window[key] && typeof window[key].createClient === 'function') {
      _sbCreateClient = window[key].createClient;
      break;
    }
  }
}

if (!_sbCreateClient) {
  document.body.innerHTML = '<div style="color:#FF4F7B;font-family:monospace;padding:40px;font-size:16px;">Error cargando Supabase. Recargá la página.</div>';
  throw new Error('Supabase createClient no encontrado');
}

const sb = _sbCreateClient(SUPABASE_URL, SUPABASE_ANON);

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────

async function sbSignUp(email, password, username, avatar) {
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  // Crear perfil
  const { error: pe } = await sb.from('profiles')
    .insert({ id: data.user.id, username, avatar, bio: '', games: [], max_level: 1 });
  if (pe) throw pe;
  return data.user;
}

async function sbLogin(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function sbLogout() {
  await sb.auth.signOut();
  localStorage.removeItem('currentUser');
  window.location.href = 'index.html';
}

async function sbGetSession() {
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

async function sbGetCurrentUser() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
  return profile ? { ...profile, authId: user.id } : null;
}

async function sbRequireAuth() {
  const user = await sbGetCurrentUser();
  if (!user) window.location.href = 'index.html';
  return user;
}

// Guardar usuario en localStorage como caché (para acceso rápido sin await)
function cacheCurrentUser(profile, email) {
  localStorage.setItem('currentUser', JSON.stringify({
    ...profile,
    email,
    // Compatibilidad con código viejo que lee estos campos
    username:  profile.username,
    avatar:    profile.avatar,
    bio:       profile.bio,
    games:     profile.games || [],
    maxLevel:  profile.max_level || 1,
    following: [],   // se cargan aparte con getFollowing
    followers: [],
  }));
}

// ─────────────────────────────────────────
// PERFILES
// ─────────────────────────────────────────

async function sbGetProfile(username) {
  const { data } = await sb.from('profiles').select('*').eq('username', username).single();
  return data;
}

async function sbGetAllProfiles() {
  const { data } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
  return data || [];
}

async function sbUpdateProfile(userId, updates) {
  const { data, error } = await sb.from('profiles').update(updates).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

async function sbUpdateMaxLevel(userId, level) {
  const { data: current } = await sb.from('profiles').select('max_level').eq('id', userId).single();
  if (current && current.max_level >= level) return;
  await sb.from('profiles').update({ max_level: level }).eq('id', userId);
}

// ─────────────────────────────────────────
// POSTS
// ─────────────────────────────────────────

async function sbGetPosts() {
  const { data } = await sb
    .from('posts')
    .select('*, likes(user_id), comments(id, user_id, username, avatar, content, created_at)')
    .order('created_at', { ascending: false })
    .limit(60);
  return data || [];
}

async function sbCreatePost(userId, username, avatar, content) {
  const { data, error } = await sb.from('posts')
    .insert({ user_id: userId, username, avatar, content }).select().single();
  if (error) throw error;
  return data;
}

async function sbDeletePost(postId, userId) {
  const { error } = await sb.from('posts').delete().eq('id', postId).eq('user_id', userId);
  if (error) throw error;
}

// ─────────────────────────────────────────
// LIKES
// ─────────────────────────────────────────

async function sbToggleLike(postId, userId) {
  const { data: existing } = await sb.from('likes')
    .select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
  if (existing) {
    await sb.from('likes').delete().eq('post_id', postId).eq('user_id', userId);
    return false;
  } else {
    await sb.from('likes').insert({ post_id: postId, user_id: userId });
    return true;
  }
}

// ─────────────────────────────────────────
// COMENTARIOS
// ─────────────────────────────────────────

async function sbAddComment(postId, userId, username, avatar, content) {
  const { data, error } = await sb.from('comments')
    .insert({ post_id: postId, user_id: userId, username, avatar, content })
    .select().single();
  if (error) throw error;
  return data;
}

async function sbDeleteComment(commentId, userId) {
  const { error } = await sb.from('comments').delete()
    .eq('id', commentId).eq('user_id', userId);
  if (error) throw error;
}

// ─────────────────────────────────────────
// FOLLOWS
// ─────────────────────────────────────────

async function sbToggleFollow(followerId, followingId) {
  const { data: existing } = await sb.from('follows')
    .select('follower_id').eq('follower_id', followerId).eq('following_id', followingId).maybeSingle();
  if (existing) {
    await sb.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId);
    return false;
  } else {
    await sb.from('follows').insert({ follower_id: followerId, following_id: followingId });
    return true;
  }
}

async function sbGetFollowing(userId) {
  const { data } = await sb.from('follows')
    .select('profiles!follows_following_id_fkey(*)')
    .eq('follower_id', userId);
  return data ? data.map(f => f.profiles) : [];
}

async function sbGetFollowers(userId) {
  const { data } = await sb.from('follows')
    .select('profiles!follows_follower_id_fkey(*)')
    .eq('following_id', userId);
  return data ? data.map(f => f.profiles) : [];
}

async function sbIsFollowing(followerId, followingId) {
  const { data } = await sb.from('follows')
    .select('follower_id').eq('follower_id', followerId).eq('following_id', followingId).maybeSingle();
  return !!data;
}

// ─────────────────────────────────────────
// MENSAJES
// ─────────────────────────────────────────

async function sbGetMessages(userId, otherUserId) {
  const { data } = await sb.from('messages')
    .select('*')
    .or(`and(from_id.eq.${userId},to_id.eq.${otherUserId}),and(from_id.eq.${otherUserId},to_id.eq.${userId})`)
    .order('created_at', { ascending: true });
  return data || [];
}

async function sbSendMessage(fromId, toId, content) {
  const { data, error } = await sb.from('messages')
    .insert({ from_id: fromId, to_id: toId, content }).select().single();
  if (error) throw error;
  // Broadcast al canal para que el receptor lo reciba en tiempo real
  const key = [fromId, toId].sort().join('_');
  try {
    await sb.channel(`dm_${key}_broadcast`).send({
      type: 'broadcast', event: 'new_message', payload: data
    });
  } catch(e) {} // ignorar si el canal no existe
  return data;
}

function sbSubscribeMessages(userId, otherUserId, callback) {
  const key = [userId, otherUserId].sort().join('_');
  // Usar broadcast channel — no requiere replication habilitada
  const channel = sb.channel(`dm_${key}_${Date.now()}`)
    .on('broadcast', { event: 'new_message' }, payload => {
      if (payload.payload?.to_id === userId) callback(payload.payload);
    })
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `to_id=eq.${userId}`
    }, payload => callback(payload.new))
    .subscribe();
  return channel;
}

function sbUnsubscribe(channel) {
  if (channel) sb.removeChannel(channel);
}

// ─────────────────────────────────────────
// TORNEOS
// ─────────────────────────────────────────

async function sbGetTournaments() {
  const { data } = await sb.from('tournaments')
    .select('*, tournament_players(user_id)')
    .order('created_at', { ascending: false });
  return data || [];
}

async function sbCreateTournament(creatorId, t) {
  const { data, error } = await sb.from('tournaments').insert({
    creator_id: creatorId, name: t.name, game: t.game,
    format: t.format, max_players: t.maxPlayers,
    prize: t.prize, description: t.description,
    date: t.date, status: 'upcoming'
  }).select().single();
  if (error) throw error;
  await sb.from('tournament_players').insert({ tournament_id: data.id, user_id: creatorId });
  return data;
}

async function sbJoinTournament(tournamentId, userId) {
  const { error } = await sb.from('tournament_players')
    .insert({ tournament_id: tournamentId, user_id: userId });
  if (error) throw error;
}

async function sbLeaveTournament(tournamentId, userId) {
  await sb.from('tournament_players')
    .delete().eq('tournament_id', tournamentId).eq('user_id', userId);
}

// ─────────────────────────────────────────
// NOTIFICACIONES
// ─────────────────────────────────────────

async function sbGetNotifications(userId) {
  const [postsRes, followersRes] = await Promise.all([
    sb.from('posts')
      .select('id, content, likes(user_id, profiles(username)), comments(id, user_id, username, content)')
      .eq('user_id', userId),
    sb.from('follows')
      .select('follower_id, profiles!follows_follower_id_fkey(username)')
      .eq('following_id', userId)
  ]);

  const notifs = [];

  postsRes.data?.forEach(post => {
    post.likes?.forEach(like => {
      if (like.user_id !== userId)
        notifs.push({ type: 'like', from: like.profiles?.username || '?',
          text: `le dio ♥ a tu post: "${post.content.slice(0, 28)}..."`,
          id: `like_${post.id}_${like.user_id}` });
    });
    post.comments?.forEach(c => {
      if (c.user_id !== userId)
        notifs.push({ type: 'comment', from: c.username,
          text: `comentó: "${c.content.slice(0, 28)}"`,
          id: `cmt_${c.id}` });
    });
  });

  followersRes.data?.forEach(f =>
    notifs.push({ type: 'follow', from: f.profiles?.username || '?',
      text: 'empezó a seguirte', id: `follow_${f.follower_id}` })
  );

  return notifs;
}