// feed.js — Respawn Social v2 — Supabase backend

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});

// ── Estado global ──────────────────────────────────
let currentUser  = null;
let allProfiles  = [];
let allPosts     = [];
let cachedFollowingIds = [];

const LEVEL_NAMES = ["Novato","Aprendiz","Jugador","Veterano","Elite","Leyenda","Máster","Campeón"];
const GAME_ICONS  = {"valorant":"🔫","minecraft":"⛏","league of legends":"⚔","fortnite":"🏗","apex":"🎯","cs2":"💣","overwatch":"🎮","rocket league":"🚗","among us":"🔪","terraria":"⚒","default":"🕹"};

function el(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function xpLevel(total) { let l=1,r=total; while(r>=l*100){r-=l*100;l++;} return {level:l,current:r,needed:l*100}; }
function formatContent(text) {
  return esc(text)
    .replace(/#(\w+)/g, '<span class="post-content-hashtag" onclick="searchHashtag(\'$1\')">#$1</span>')
    .replace(/@(\w+)/g, '<span class="post-content-mention">@$1</span>');
}
window.searchHashtag = tag => { localStorage.setItem("exploreSearch", tag); window.location.href = "explore.html"; };

// ── Init ───────────────────────────────────────────
async function init() {
  currentUser = await sbRequireAuth(); // redirige a login si no hay sesión
  if (!currentUser) return;

  // Composer
  const av = el("composerAvatar");
  if (av) { av.src = ""; av.src = currentUser.avatar; }
  const un = el("composerUsername");
  if (un) un.textContent = "@" + currentUser.username;

  // Char counter
  el("postContent").addEventListener("input", function() {
    const len = this.value.length;
    const c   = el("charCounter");
    c.textContent = `${len} / 280`;
    c.className   = "char-counter" + (len > 270 ? " danger" : len > 240 ? " warn" : "");
  });

  // Ctrl+Enter publica
  el("postContent").addEventListener("keydown", e => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) el("postBtn").click();
  });

  // Enter en comentario
  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.classList.contains("comment-input")) {
      const id = parseInt(e.target.getAttribute("data-post-id"));
      if (id) handleComment(id);
    }
  });

  await renderAll();

  // Realtime — actualizar posts cuando alguien publica
  const { createClient } = window.supabase;
  sb.channel('posts_feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => renderPosts())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => renderPosts())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => renderPosts())
    .subscribe();
}

// ── IMAGEN ─────────────────────────────────────────
let selectedImageFile = null;

window.previewImage = function(input) {
  const file = input.files[0];
  if (!file) return;
  selectedImageFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    el("imagePreviewImg").src = e.target.result;
    el("imagePreview").style.display = "block";
  };
  reader.readAsDataURL(file);
};

window.removeImage = function() {
  selectedImageFile = null;
  el("imagePreview").style.display = "none";
  el("imagePreviewImg").src = "";
  el("imageInput").value = "";
};

// ── CREAR POST ─────────────────────────────────────
el("postBtn").addEventListener("click", async () => {
  const content = el("postContent").value.trim();
  if (!content && !selectedImageFile) return;
  const btn = el("postBtn");
  btn.textContent = "..."; btn.disabled = true;
  try {
    let imageUrl = null;
    if (selectedImageFile) {
      imageUrl = await sbUploadImage(selectedImageFile, currentUser.id);
    }
    await sbCreatePost(currentUser.id, currentUser.username, currentUser.avatar, content, imageUrl);
    el("postContent").value = "";
    el("charCounter").textContent = "0 / 280";
    el("charCounter").className   = "char-counter";
    window.removeImage();
    await renderPosts();
  } catch(e) { console.error(e); alert("Error al publicar: " + e.message); }
  btn.textContent = "PUBLICAR"; btn.disabled = false;
});

// ── LIKES — optimistic update ──────────────────────
window.handlePostLike = async function(postId) {
  // 1. Actualizar UI inmediatamente sin esperar Supabase
  const post = allPosts.find(p => p.id === postId);
  if (!post) return;
  post.likes = post.likes || [];
  const idx = post.likes.findIndex(l => l.user_id === currentUser.id);
  if (idx === -1) {
    post.likes.push({ user_id: currentUser.id });
  } else {
    post.likes.splice(idx, 1);
  }
  // Re-renderizar solo ese post
  updatePostDOM(postId);
  // 2. Sincronizar con Supabase en background
  try { await sbToggleLike(postId, currentUser.id); }
  catch(e) { console.error(e); await renderPosts(); } // revertir si falla
};

// ── COMENTARIOS — optimistic update ────────────────
window.handleComment = async function(postId) {
  const input   = document.getElementById(`commentInput-${postId}`);
  const content = input ? input.value.trim() : "";
  if (!content) return;
  // 1. Actualizar UI inmediatamente
  const post = allPosts.find(p => p.id === postId);
  if (!post) return;
  if (input) input.value = "";
  const tempComment = {
    id: Date.now(), user_id: currentUser.id,
    username: currentUser.username, avatar: currentUser.avatar,
    content, created_at: new Date().toISOString()
  };
  post.comments = [...(post.comments||[]), tempComment];
  updatePostDOM(postId);
  // 2. Sincronizar con Supabase en background
  try {
    const real = await sbAddComment(postId, currentUser.id, currentUser.username, currentUser.avatar, content);
    // Reemplazar comment temporal con el real
    const i = post.comments.findIndex(c => c.id === tempComment.id);
    if (i !== -1 && real) post.comments[i] = real;
    updatePostDOM(postId);
  } catch(e) { console.error(e); await renderPosts(); }
};

// ── BORRAR POST ────────────────────────────────────
window.deletePost = async function(postId) {
  if (!confirm("¿Borrar esta publicación?")) return;
  // Optimistic: sacar del DOM inmediatamente
  allPosts = allPosts.filter(p => p.id !== postId);
  const postEl = document.querySelector(`[data-post-id="${postId}"]`);
  if (postEl) postEl.remove();
  try { await sbDeletePost(postId, currentUser.id); }
  catch(e) { console.error(e); await renderPosts(); }
};

// ── BORRAR COMENTARIO ──────────────────────────────
window.deleteComment = async function(commentId, postId) {
  if (!confirm("¿Borrar este comentario?")) return;
  const post = allPosts.find(p => p.id === postId);
  if (post) post.comments = (post.comments||[]).filter(c => c.id !== commentId);
  updatePostDOM(postId);
  try { await sbDeleteComment(commentId, currentUser.id); }
  catch(e) { console.error(e); await renderPosts(); }
};

// ── FOLLOW — optimistic update ─────────────────────
window.toggleFollow = async function(targetUsername) {
  if (targetUsername === currentUser.username) return;
  const target = allProfiles.find(u => u.username === targetUsername);
  if (!target) return;

  // Actualizar caché de followingIds optimistamente
  const wasFollowing = cachedFollowingIds.includes(target.id);
  if (wasFollowing) {
    cachedFollowingIds = cachedFollowingIds.filter(id => id !== target.id);
  } else {
    cachedFollowingIds = [...cachedFollowingIds, target.id];
  }

  // Actualizar TODOS los botones de ese usuario en el DOM inmediatamente
  document.querySelectorAll(`[data-follow-username="${targetUsername}"]`).forEach(btn => {
    if (!wasFollowing) {
      btn.textContent = 'Siguiendo';
      btn.className   = 'btn-unfollow-sm';
    } else {
      btn.textContent = 'Seguir';
      btn.className   = 'btn btn-follow-sm';
    }
  });

  try {
    await sbToggleFollow(currentUser.id, target.id);
    await renderSidebar();
  } catch(e) {
    // Revertir si falla
    if (wasFollowing) cachedFollowingIds = [...cachedFollowingIds, target.id];
    else cachedFollowingIds = cachedFollowingIds.filter(id => id !== target.id);
    console.error(e);
    await renderPosts();
  }
};

// ── UPDATE SOLO UN POST EN EL DOM ──────────────────
function updatePostDOM(postId) {
  const post    = allPosts.find(p => p.id === postId);
  if (!post) return;
  const oldEl   = document.querySelector(`[data-post-id="${postId}"]`);
  if (!oldEl) return;
  // Guardar el valor del input de comentario antes de reemplazar
  const inputEl  = document.getElementById(`commentInput-${postId}`);
  const inputVal = inputEl ? inputEl.value : "";
  const newHTML = buildPostHTML(post, cachedFollowingIds);
  const tmp     = document.createElement('div');
  tmp.innerHTML = newHTML;
  const newEl   = tmp.firstElementChild;
  oldEl.replaceWith(newEl);
  // Restaurar input
  const newInput = document.getElementById(`commentInput-${postId}`);
  if (newInput && inputVal) newInput.value = inputVal;
}

// ── BUILD POST HTML ────────────────────────────────
function buildPostHTML(post, followingIds) {
  const likes      = post.likes    || [];
  const comments   = post.comments || [];
  const likeIds    = likes.map(l => l.user_id);
  const isLiked    = likeIds.includes(currentUser.id);
  const likeCount  = likes.length;
  const cmtCount   = comments.length;
  const isOwn      = post.user_id === currentUser.id;
  const isFollowing = followingIds.includes(post.user_id);

  // Game tag
  const contentLow = (post.content||"").toLowerCase();
  let gameTag = "";
  for (const [game, icon] of Object.entries(GAME_ICONS)) {
    if (game !== "default" && contentLow.includes(game)) {
      gameTag = `<span class="post-game-tag">${icon} ${game.charAt(0).toUpperCase()+game.slice(1)}</span>`;
      break;
    }
  }

  // Header action
  let headerAction = isOwn
    ? `<button class="delete-post-btn" onclick="event.stopPropagation();deletePost(${post.id})">Borrar</button>`
    : isFollowing
      ? `<button class="btn-unfollow-sm" data-follow-username="${esc(post.username)}" onclick="event.stopPropagation();toggleFollow('${esc(post.username)}')">Siguiendo</button>`
      : `<button class="btn btn-follow-sm" data-follow-username="${esc(post.username)}" onclick="event.stopPropagation();toggleFollow('${esc(post.username)}')">Seguir</button>`;

  const date = new Date(post.created_at).toLocaleString("es-AR");

  // Imagen si existe
  const imageHTML = post.image_url
    ? `<img src="${post.image_url}" class="post-image" alt="imagen" onclick="event.stopPropagation();window.open('${post.image_url}','_blank')">`
    : "";

  return `<div class="post" data-post-id="${post.id}" onclick="openPost(${post.id})" style="cursor:pointer;">
    <div class="post-header">
      <div class="post-author">
        <img src="${post.avatar||'avatar1.png'}" alt="" class="post-av" onclick="event.stopPropagation();window.location.href='profile.html?user=${esc(post.username)}'">
        <div class="post-author-info">
          <span class="post-author-name" onclick="event.stopPropagation();window.location.href='profile.html?user=${esc(post.username)}'">@${esc(post.username)}${gameTag}</span>
          <span class="post-date">${date}</span>
        </div>
      </div>
      ${headerAction}
    </div>
    ${post.content ? `<p class="post-content-text">${formatContent(post.content)}</p>` : ""}
    ${imageHTML}
    <div class="post-footer">
      <div class="post-actions">
        <button class="like-btn ${isLiked?"voted":""}" onclick="event.stopPropagation();handlePostLike(${post.id})">♥ ${likeCount}</button>
        <button class="view-thread-btn" onclick="event.stopPropagation();openPost(${post.id})">💬 ${cmtCount} comentario${cmtCount!==1?"s":""}</button>
      </div>
      <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);">Click para ver →</span>
    </div>
  </div>`;
}

window.openPost = function(postId) {
  window.location.href = `post.html?id=${postId}`;
};

// ── RENDER POSTS ───────────────────────────────────
async function renderPosts() {
  const container = el("postsContainer");
  container.innerHTML = `<div style="text-align:center;padding:40px;font-family:var(--font-mono);font-size:13px;color:var(--text-muted);">Cargando posts...</div>`;

  allPosts = await sbGetPosts();

  const followingRows    = await sbGetFollowing(currentUser.id);
  cachedFollowingIds     = followingRows.map(u => u.id);

  if (!allPosts.length) {
    container.innerHTML = `<div class="empty-feed"><span class="empty-feed-icon">🎮</span><h3>Sin posts todavía</h3><p>Sé el primero en publicar algo.</p></div>`;
    return;
  }
  container.innerHTML = allPosts.map(p => buildPostHTML(p, cachedFollowingIds)).join("");
}

// ── RENDER SIDEBAR ─────────────────────────────────
async function renderSidebar() {
  allProfiles = await sbGetAllProfiles();
  const me    = allProfiles.find(u => u.id === currentUser.id) || currentUser;

  // Mini perfil
  const sbAv = el("sidebarAvatar");
  if (sbAv) { sbAv.src = ""; sbAv.src = me.avatar; }
  if (el("sidebarUsername")) el("sidebarUsername").textContent = "@" + me.username;

  // XP (calculada con datos de Supabase)
  const myPosts  = allPosts.filter(p => p.user_id === me.id);
  const myLikes  = myPosts.reduce((s,p)=>s+(p.likes||[]).length,0);
  const myCmts   = myPosts.reduce((s,p)=>s+(p.comments||[]).length,0);

  const followingRows = await sbGetFollowing(me.id);
  const followersRows = await sbGetFollowers(me.id);
  const followingIds  = followingRows.map(u => u.id);

  const totalXP = myPosts.length*10 + followingRows.length*5 + followersRows.length*8 + myLikes*3 + myCmts*4 + ((me.max_level||1)-1)*50;
  const lvl     = xpLevel(totalXP);
  const lvlName = LEVEL_NAMES[Math.min(lvl.level-1, LEVEL_NAMES.length-1)];

  if (el("sidebarLevel"))  el("sidebarLevel").textContent  = `LVL ${lvl.level} · ${lvlName}`;
  if (el("sidebarXpFill")) el("sidebarXpFill").style.width = `${Math.round(lvl.current/lvl.needed*100)}%`;
  if (el("sbPosts"))     el("sbPosts").textContent     = myPosts.length;
  if (el("sbFollowing")) el("sbFollowing").textContent = followingRows.length;
  if (el("sbFollowers")) el("sbFollowers").textContent = followersRows.length;

  // Siguiendo
  const followingEl = el("followingList");
  followingEl.innerHTML = !followingRows.length
    ? `<p class="sidebar-empty">Aún no seguís a nadie.</p>`
    : followingRows.map(u => `
        <div class="user-item">
          <div class="user-info">
            <img src="${u.avatar}" class="user-av" alt="">
            <div><div class="user-name">@${esc(u.username)}</div><div class="user-bio-mini">${esc(u.bio||"Jugando en Respawn")}</div></div>
          </div>
          <button class="btn-unfollow-xs" onclick="toggleFollow('${u.username}')">Siguiendo</button>
        </div>`).join("");

  // Descubrir
  const discoverEl = el("discoverUsers");
  const toDiscover = allProfiles.filter(u => u.id !== me.id && !followingIds.includes(u.id)).slice(0,5);
  discoverEl.innerHTML = !toDiscover.length
    ? `<p class="sidebar-empty">No hay usuarios nuevos.</p>`
    : toDiscover.map(u => `
        <div class="user-item">
          <div class="user-info">
            <img src="${u.avatar}" class="user-av" alt="">
            <div><div class="user-name">@${esc(u.username)}</div><div class="user-bio-mini">${esc(u.bio||"Jugando en Respawn")}</div></div>
          </div>
          <button class="btn btn-follow-xs" onclick="toggleFollow('${u.username}')">Seguir</button>
        </div>`).join("");

  // Arcade
  const gamesList = el("gamesList");
  if (gamesList) {
    const maxLevel = me.max_level || 1;
    const games = [
      { name:"Snake",         path:"snake.html",         icon:"🐍", level:1, color:"#00FFF7" },
      { name:"Pong",          path:"pong.html",          icon:"🏓", level:2, color:"#FF4F7B" },
      { name:"Breakout",      path:"breakout.html",      icon:"🧱", level:3, color:"#C084FC" },
      { name:"Asteroids",     path:"asteroids.html",     icon:"☄",  level:4, color:"#FFB800" },
      { name:"Flappy",        path:"flappy.html",        icon:"🐦", level:5, color:"#4ade80" },
      { name:"Tetris",        path:"tetris.html",        icon:"🟪", level:6, color:"#a78bfa" },
      { name:"Dino Runner",   path:"dino.html",          icon:"🦕", level:7, color:"#FF8C00" },
      { name:"Space Invaders",path:"spaceinvaders.html", icon:"👾", level:8, color:"#4ade80" },
    ];
    gamesList.innerHTML = games.map(g => g.level <= maxLevel
      ? `<a href="${g.path}" class="game-link"><span class="game-link-icon">${g.icon}</span><div class="game-link-info"><span class="game-link-name" style="color:${g.color};">${g.name}</span><span class="game-link-status">Desbloqueado · Jugar ahora</span></div></a>`
      : `<div class="game-link" style="opacity:0.4;cursor:not-allowed;"><span class="game-link-icon">🔒</span><div class="game-link-info"><span class="game-link-name">${g.name}</span><span class="game-link-status">Bloqueado</span></div></div>`
    ).join("");
  }

  // Trending tags
  const trendingEl = el("trendingTags");
  if (trendingEl) {
    const tagCounts = {};
    allPosts.forEach(p => {
      Object.keys(GAME_ICONS).forEach(game => {
        if (game !== "default" && p.content.toLowerCase().includes(game))
          tagCounts[game] = (tagCounts[game]||0) + 1;
      });
    });
    allProfiles.forEach(u => (u.games||[]).forEach(g => {
      tagCounts[g.toLowerCase()] = (tagCounts[g.toLowerCase()]||0) + 1;
    }));
    const sorted   = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const defaults = ["Gaming","FPS","RPG","Indie","Co-op","PvP"];
    const tags = sorted.length ? sorted.map(([tag,count])=>({tag,count,hot:count>=2})) : defaults.map(t=>({tag:t,count:0,hot:false}));
    trendingEl.innerHTML = tags.map(({tag,count,hot}) => {
      const icon = GAME_ICONS[tag.toLowerCase()]||"🎮";
      return `<span class="trending-tag ${hot?"hot":""}">${icon} ${tag.charAt(0).toUpperCase()+tag.slice(1)}${count>1?` <span style="opacity:0.6;font-size:9px;">${count}</span>`:""}</span>`;
    }).join("");
  }
}

// ── RENDER ALL ─────────────────────────────────────
async function renderAll() {
  await Promise.all([renderPosts(), renderSidebar()]);
}

init();