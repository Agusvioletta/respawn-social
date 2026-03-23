// explore.js — Respawn Social v2 — Supabase

const GAME_ICONS = {"valorant":"🔫","minecraft":"⛏","league of legends":"⚔","fortnite":"🏗","apex":"🎯","cs2":"💣","overwatch":"🎮","rocket league":"🚗","among us":"🔪","terraria":"⚒","genshin":"🌸","elden ring":"⚔","hollow knight":"🦋","stardew valley":"🌾","default":"🕹"};
const GAME_LIST  = ["Valorant","Minecraft","League of Legends","Fortnite","Apex","CS2","Overwatch","Rocket League","Among Us","Terraria","Genshin","Elden Ring","Hollow Knight","Stardew Valley"];

function el(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

let currentUser = null;
let allProfiles = [];
let allPosts    = [];
let followingIds = [];

// ── Init ──
async function init() {
  currentUser = await sbRequireAuth();
  if (!currentUser) return;

  // Cargar todo en paralelo
  [allProfiles, allPosts] = await Promise.all([sbGetAllProfiles(), sbGetPosts()]);

  const followingRows = await sbGetFollowing(currentUser.id);
  followingIds = followingRows.map(u => u.id);

  // Si viene de un hashtag del feed
  const savedSearch = localStorage.getItem("exploreSearch");
  if (savedSearch) {
    el("searchInput").value = savedSearch;
    localStorage.removeItem("exploreSearch");
    doSearch();
  }

  renderAll();
}

// ─────────────────────────────────────────
// QUICK TAGS
// ─────────────────────────────────────────
function renderQuickTags() {
  const counts = {};
  allPosts.forEach(p => {
    GAME_LIST.forEach(g => { if (p.content.toLowerCase().includes(g.toLowerCase())) counts[g] = (counts[g]||0)+1; });
  });
  allProfiles.forEach(u => (u.games||[]).forEach(g => { counts[g] = (counts[g]||0)+1; }));

  const top  = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([g])=>g);
  const tags = top.length ? top : GAME_LIST.slice(0,6);

  el("quickTags").innerHTML = tags.map(t =>
    `<span class="search-tag" onclick="quickSearch('${t}')">${GAME_ICONS[t.toLowerCase()]||"🎮"} ${t}</span>`
  ).join("");
}

// ─────────────────────────────────────────
// BÚSQUEDA
// ─────────────────────────────────────────
function quickSearch(term) { el("searchInput").value = term; doSearch(); }
function liveSearch(val) { if (val.length < 2) { clearSearch(); return; } doSearch(); }

function doSearch() {
  const query = el("searchInput").value.trim().toLowerCase();
  if (!query) { clearSearch(); return; }

  const matchUsers = allProfiles.filter(u =>
    u.id !== currentUser.id &&
    (u.username.toLowerCase().includes(query) ||
     (u.bio||"").toLowerCase().includes(query) ||
     (u.games||[]).some(g => g.toLowerCase().includes(query)))
  );
  const matchPosts = allPosts.filter(p =>
    p.content.toLowerCase().includes(query) ||
    p.username.toLowerCase().includes(query)
  ).slice(0,5);

  const resultsEl = el("searchResults");
  const bodyEl    = el("searchResultsBody");
  const titleEl   = el("searchResultsTitle");
  resultsEl.classList.add("visible");

  const total = matchUsers.length + matchPosts.length;
  titleEl.textContent = `${total} resultado${total!==1?"s":""} para "${el("searchInput").value.trim()}"`;

  if (!total) {
    bodyEl.innerHTML = `<div class="no-results">Sin resultados.<br><span style="opacity:0.6;font-size:12px;">Probá con otro nombre o juego.</span></div>`;
    return;
  }

  let html = "";
  if (matchUsers.length) {
    html += `<div style="font-family:var(--font-display);font-size:9px;font-weight:700;color:var(--text-muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Usuarios (${matchUsers.length})</div>`;
    html += matchUsers.map(u => buildUserCard(u)).join("");
  }
  if (matchPosts.length) {
    if (matchUsers.length) html += `<div style="margin:16px 0;border-top:1px solid var(--border-subtle);padding-top:16px;font-family:var(--font-display);font-size:9px;font-weight:700;color:var(--text-muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Posts (${matchPosts.length})</div>`;
    html += matchPosts.map(p => buildExplorePost(p)).join("");
  }
  bodyEl.innerHTML = html;
}

function clearSearch() {
  el("searchResults").classList.remove("visible");
  el("searchInput").value = "";
}

// ─────────────────────────────────────────
// USUARIOS DESTACADOS
// ─────────────────────────────────────────
function renderFeaturedUsers() {
  const others = allProfiles
    .filter(u => u.id !== currentUser.id)
    .map(u => ({
      ...u,
      score: (allPosts.filter(p=>p.user_id===u.id).length)*2
    }))
    .sort((a,b) => b.score - a.score);

  if (el("userCountLabel")) el("userCountLabel").textContent = `${others.length} gamers`;

  if (!others.length) {
    el("featuredUsers").innerHTML = `<div class="no-results" style="padding:24px 0;">No hay otros usuarios aún.</div>`;
    return;
  }
  el("featuredUsers").innerHTML = others.slice(0,6).map(u => buildUserCard(u)).join("");
}

function buildUserCard(u) {
  const isFollowing = followingIds.includes(u.id);
  const gameTagsHTML = (u.games||[]).slice(0,2).map(g =>
    `<span class="user-card-game-tag">${GAME_ICONS[g.toLowerCase()]||"🎮"} ${g}</span>`
  ).join("");
  return `
    <div class="user-card">
      <div class="user-card-av-wrap">
        <img src="${u.avatar||'avatar1.png'}" alt="" class="user-card-av">
        <div class="user-card-online"></div>
      </div>
      <div class="user-card-info">
        <div class="user-card-name">@${esc(u.username)}</div>
        <div class="user-card-bio">${esc(u.bio||"Jugando en Respawn")}</div>
        ${gameTagsHTML ? `<div class="user-card-games">${gameTagsHTML}</div>` : ""}
      </div>
      ${isFollowing
        ? `<button class="btn-unfollow-card" onclick="exToggleFollow('${u.id}')">Siguiendo</button>`
        : `<button class="btn btn-follow-card" onclick="exToggleFollow('${u.id}')">Seguir</button>`}
    </div>`;
}

// ─────────────────────────────────────────
// POSTS RECIENTES
// ─────────────────────────────────────────
function renderRecentPosts() {
  const recent = allPosts.slice(0,8);
  if (!recent.length) {
    el("recentPosts").innerHTML = `<div class="no-results" style="padding:24px 0;">Sin posts todavía.</div>`;
    return;
  }
  el("recentPosts").innerHTML = recent.map(p => buildExplorePost(p)).join("");
}

function buildExplorePost(p) {
  const likes = (p.likes||[]).length;
  const cmts  = (p.comments||[]).length;
  const date  = new Date(p.created_at).toLocaleString("es-AR");
  return `
    <div class="explore-post">
      <div class="explore-post-header">
        <img src="${p.avatar||'avatar1.png'}" alt="" class="explore-post-av">
        <span class="explore-post-author">@${esc(p.username)}</span>
        <span class="explore-post-date">${date}</span>
      </div>
      <div class="explore-post-content">${esc(p.content.slice(0,120))}${p.content.length>120?"...":""}</div>
      <div class="explore-post-meta">
        <span>♥ ${likes}</span>
        <span>💬 ${cmts}</span>
      </div>
    </div>`;
}

// ─────────────────────────────────────────
// TRENDING GAMES
// ─────────────────────────────────────────
function renderTrendingGames() {
  const counts = {};
  allPosts.forEach(p => { GAME_LIST.forEach(g => { if (p.content.toLowerCase().includes(g.toLowerCase())) counts[g] = (counts[g]||0)+2; }); });
  allProfiles.forEach(u => (u.games||[]).forEach(g => { counts[g] = (counts[g]||0)+1; }));
  if (!Object.keys(counts).length) { GAME_LIST.forEach((g,i) => { counts[g] = Math.max(1, 10-i); }); }

  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,7);
  const max    = sorted[0]?.[1] || 1;

  el("trendingGames").innerHTML = sorted.map(([game,count],i) => {
    const icon = GAME_ICONS[game.toLowerCase()] || "🎮";
    const pct  = Math.round(count/max*100);
    return `
      <div class="trending-game">
        <span class="trending-game-rank ${i<3?"top":""}">${i+1}</span>
        <span class="trending-game-icon">${icon}</span>
        <div class="trending-game-info">
          <div class="trending-game-name">${game}</div>
          <div class="trending-game-count">${count} mención${count!==1?"es":""}</div>
        </div>
        <div class="trending-game-bar"><div class="trending-game-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join("");
}

// ─────────────────────────────────────────
// COMMUNITY STATS
// ─────────────────────────────────────────
function renderCommunityStats() {
  const totalLikes = allPosts.reduce((s,p)=>s+(p.likes||[]).length,0);
  const totalCmts  = allPosts.reduce((s,p)=>s+(p.comments||[]).length,0);
  const rows = [
    ["👾 Gamers registrados", allProfiles.length],
    ["📝 Posts totales",      allPosts.length],
    ["♥ Likes totales",       totalLikes],
    ["💬 Comentarios",        totalCmts],
    ["🕹 Juegos disponibles", "8 (más pronto)"],
  ];
  el("communityStats").innerHTML = rows.map(([k,v],i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;${i<rows.length-1?"border-bottom:1px solid var(--border-subtle);":""}">
      <span style="font-family:var(--font-body);font-size:13px;color:var(--text-secondary);">${k}</span>
      <span style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--cyan);">${v}</span>
    </div>`).join("");
}

// ─────────────────────────────────────────
// NUEVOS USUARIOS
// ─────────────────────────────────────────
function renderNewUsers() {
  const newest = [...allProfiles]
    .filter(u => u.id !== currentUser.id)
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0,3);

  if (!newest.length) { el("newUsers").innerHTML = `<div style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);padding:8px 0;">Sin nuevos usuarios.</div>`; return; }

  el("newUsers").innerHTML = newest.map(u => {
    const isF = followingIds.includes(u.id);
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle);">
        <div style="position:relative;flex-shrink:0;">
          <img src="${u.avatar||'avatar1.png'}" width="36" height="36" style="border-radius:8px;image-rendering:pixelated;border:2px solid var(--purple-dim);display:block;">
          <div style="position:absolute;top:-4px;right:-4px;background:var(--purple);color:#fff;font-family:var(--font-display);font-size:7px;font-weight:900;border-radius:20px;padding:1px 5px;">NEW</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:var(--font-display);font-size:12px;font-weight:700;color:var(--text-primary);">@${esc(u.username)}</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(u.bio||"Recién llegado a Respawn")}</div>
        </div>
        ${isF
          ? `<button class="btn-unfollow-card" onclick="exToggleFollow('${u.id}')">Siguiendo</button>`
          : `<button class="btn btn-follow-card" onclick="exToggleFollow('${u.id}')">Seguir</button>`}
      </div>`;
  }).join("");
}

// ─────────────────────────────────────────
// FOLLOW
// ─────────────────────────────────────────
window.exToggleFollow = async function(targetId) {
  if (targetId === currentUser.id) return;
  try {
    await sbToggleFollow(currentUser.id, targetId);
    const followingRows = await sbGetFollowing(currentUser.id);
    followingIds = followingRows.map(u => u.id);
    renderAll();
    if (el("searchInput").value.trim()) doSearch();
  } catch(e) { console.error(e); }
};

// ─────────────────────────────────────────
// RENDER ALL
// ─────────────────────────────────────────
function renderAll() {
  renderFeaturedUsers();
  renderRecentPosts();
  renderTrendingGames();
  renderCommunityStats();
  renderNewUsers();
  renderQuickTags();
}

init();