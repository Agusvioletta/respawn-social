// explore.js — Respawn Social v2

const currentUser     = JSON.parse(localStorage.getItem("currentUser"));
const currentUsername = currentUser ? currentUser.username : null;
if (!currentUser) window.location.href = "index.html";

const GAME_ICONS = {"valorant":"🔫","minecraft":"⛏","league of legends":"⚔","fortnite":"🏗","apex":"🎯","cs2":"💣","overwatch":"🎮","rocket league":"🚗","among us":"🔪","terraria":"⚒","genshin":"🌸","elden ring":"⚔","hollow knight":"🦋","stardew valley":"🌾","default":"🕹"};
const GAME_LIST  = ["Valorant","Minecraft","League of Legends","Fortnite","Apex","CS2","Overwatch","Rocket League","Among Us","Terraria","Genshin","Elden Ring","Hollow Knight","Stardew Valley"];

function el(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

// ─────────────────────────────────────────
// QUICK TAGS
// ─────────────────────────────────────────
function renderQuickTags() {
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const allPosts = JSON.parse(localStorage.getItem("posts")) || [];

  // Contar juegos mencionados
  const counts = {};
  allPosts.forEach(p => {
    GAME_LIST.forEach(g => { if (p.content.toLowerCase().includes(g.toLowerCase())) counts[g] = (counts[g]||0)+1; });
  });
  allUsers.forEach(u => (u.games||[]).forEach(g => { counts[g] = (counts[g]||0)+1; }));

  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([g])=>g);
  const tags = top.length ? top : GAME_LIST.slice(0,6);

  el("quickTags").innerHTML = tags.map(t =>
    `<span class="search-tag" onclick="quickSearch('${t}')">${GAME_ICONS[t.toLowerCase()]||"🎮"} ${t}</span>`
  ).join("");
}

// ─────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────
function quickSearch(term) {
  el("searchInput").value = term;
  doSearch();
}

function liveSearch(val) {
  if (val.length < 2) { clearSearch(); return; }
  doSearch();
}

function doSearch() {
  const query = el("searchInput").value.trim().toLowerCase();
  if (!query) { clearSearch(); return; }

  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const allPosts = JSON.parse(localStorage.getItem("posts")) || [];
  const me       = allUsers.find(u => u.username === currentUsername) || currentUser;

  const matchUsers = allUsers.filter(u =>
    u.username !== currentUsername &&
    (u.username.toLowerCase().includes(query) ||
     (u.bio||"").toLowerCase().includes(query) ||
     (u.games||[]).some(g => g.toLowerCase().includes(query)))
  );
  const matchPosts = allPosts.filter(p =>
    p.content.toLowerCase().includes(query) ||
    p.user.toLowerCase().includes(query)
  ).slice(0,5);

  const resultsEl = el("searchResults");
  const bodyEl    = el("searchResultsBody");
  const titleEl   = el("searchResultsTitle");
  resultsEl.classList.add("visible");

  const total = matchUsers.length + matchPosts.length;
  titleEl.textContent = `${total} resultado${total!==1?"s":""} para "${el("searchInput").value.trim()}"`;

  if (!total) {
    bodyEl.innerHTML = `<div class="no-results">Sin resultados para "${esc(el("searchInput").value.trim())}".<br><span style="opacity:0.6;font-size:12px;">Probá con otro nombre o juego.</span></div>`;
    return;
  }

  let html = "";

  if (matchUsers.length) {
    html += `<div style="font-family:var(--font-display);font-size:9px;font-weight:700;color:var(--text-muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Usuarios (${matchUsers.length})</div>`;
    html += matchUsers.map(u => buildUserCard(u, me)).join("");
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
// FEATURED USERS
// ─────────────────────────────────────────
function renderFeaturedUsers() {
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const allPosts = JSON.parse(localStorage.getItem("posts")) || [];
  const me       = allUsers.find(u => u.username === currentUsername) || currentUser;

  // Ordenar por seguidores + posts (los más activos)
  const others = allUsers
    .filter(u => u.username !== currentUsername)
    .map(u => ({ ...u, score: (u.followers||[]).length*3 + allPosts.filter(p=>p.user===u.username).length*2 }))
    .sort((a,b) => b.score - a.score);

  el("userCountLabel").textContent = `${others.length} gamers`;

  if (!others.length) {
    el("featuredUsers").innerHTML = `<div class="no-results" style="padding:24px 0;">No hay otros usuarios aún.<br><span style="opacity:0.6;font-size:12px;">Invitá a tus amigos a Respawn.</span></div>`;
    return;
  }

  el("featuredUsers").innerHTML = others.slice(0,6).map(u => buildUserCard(u, me)).join("");
}

function buildUserCard(u, me) {
  const isFollowing = (me.following||[]).includes(u.username);
  const gameTagsHTML = (u.games||[]).slice(0,2).map(g =>
    `<span class="user-card-game-tag">${GAME_ICONS[g.toLowerCase()]||"🎮"} ${g}</span>`
  ).join("");

  return `
    <div class="user-card">
      <div class="user-card-av-wrap">
        <img src="${u.avatar}" alt="" class="user-card-av">
        <div class="user-card-online"></div>
      </div>
      <div class="user-card-info">
        <div class="user-card-name">@${esc(u.username)}</div>
        <div class="user-card-bio">${esc(u.bio||"Jugando en Respawn")}</div>
        ${gameTagsHTML ? `<div class="user-card-games">${gameTagsHTML}</div>` : ""}
      </div>
      ${isFollowing
        ? `<button class="btn-unfollow-card" onclick="exToggleFollow('${u.username}')">Siguiendo</button>`
        : `<button class="btn btn-follow-card" onclick="exToggleFollow('${u.username}')">Seguir</button>`
      }
    </div>`;
}

// ─────────────────────────────────────────
// RECENT POSTS
// ─────────────────────────────────────────
function renderRecentPosts() {
  const allPosts = JSON.parse(localStorage.getItem("posts")) || [];
  const recent   = allPosts.slice(0, 8);

  if (!recent.length) {
    el("recentPosts").innerHTML = `<div class="no-results" style="padding:24px 0;">Sin posts todavía.<br><span style="opacity:0.6;font-size:12px;">Sé el primero en publicar algo.</span></div>`;
    return;
  }

  el("recentPosts").innerHTML = recent.map(p => buildExplorePost(p)).join("");
}

function buildExplorePost(p) {
  const likes = (p.likes||[]).length;
  const cmts  = (p.comments||[]).length;
  return `
    <div class="explore-post">
      <div class="explore-post-header">
        <img src="${p.avatar}" alt="" class="explore-post-av">
        <span class="explore-post-author">@${esc(p.user)}</span>
        <span class="explore-post-date">${p.date}</span>
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
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const allPosts = JSON.parse(localStorage.getItem("posts")) || [];
  const counts   = {};

  allPosts.forEach(p => { GAME_LIST.forEach(g => { if (p.content.toLowerCase().includes(g.toLowerCase())) counts[g] = (counts[g]||0)+2; }); });
  allUsers.forEach(u => (u.games||[]).forEach(g => { counts[g] = (counts[g]||0)+1; }));

  // Defaults si no hay datos
  if (!Object.keys(counts).length) {
    GAME_LIST.forEach((g,i) => { counts[g] = Math.floor(Math.random()*10) + 1; });
  }

  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,7);
  const max    = sorted[0]?.[1] || 1;

  el("trendingGames").innerHTML = sorted.map(([game, count], i) => {
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
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const allPosts = JSON.parse(localStorage.getItem("posts")) || [];
  const totalLikes = allPosts.reduce((s,p)=>s+(p.likes||[]).length,0);
  const totalCmts  = allPosts.reduce((s,p)=>s+(p.comments||[]).length,0);

  const rows = [
    ["👾 Gamers registrados", allUsers.length],
    ["📝 Posts totales",      allPosts.length],
    ["♥ Likes totales",       totalLikes],
    ["💬 Comentarios",        totalCmts],
    ["🕹 Juegos disponibles", "3 (más pronto)"],
  ];

  el("communityStats").innerHTML = rows.map(([k,v]) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle);">
      <span style="font-family:var(--font-body);font-size:13px;color:var(--text-secondary);">${k}</span>
      <span style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--cyan);">${v}</span>
    </div>`).join("").replace(/border-bottom[^"]*"[^>]*>[^<]*<\/div>\s*$/, ">").replace(/border-bottom:1px solid var\(--border-subtle\);">([^<]*<\/span>[^<]*<\/span>[^<]*<\/div>\s*)$/, ">$1");

  el("communityStats").innerHTML = rows.map(([k,v],i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;${i<rows.length-1?"border-bottom:1px solid var(--border-subtle);":""}">
      <span style="font-family:var(--font-body);font-size:13px;color:var(--text-secondary);">${k}</span>
      <span style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--cyan);">${v}</span>
    </div>`).join("");
}

// ─────────────────────────────────────────
// NEW USERS
// ─────────────────────────────────────────
function renderNewUsers() {
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const me       = allUsers.find(u => u.username === currentUsername) || currentUser;
  const newest   = [...allUsers].reverse().filter(u => u.username !== currentUsername).slice(0,3);

  if (!newest.length) { el("newUsers").innerHTML = `<div style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);padding:8px 0;">Sin nuevos usuarios.</div>`; return; }

  el("newUsers").innerHTML = newest.map(u => {
    const isF = (me.following||[]).includes(u.username);
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle);">
        <div style="position:relative;flex-shrink:0;">
          <img src="${u.avatar}" width="36" height="36" style="border-radius:8px;image-rendering:pixelated;border:2px solid var(--purple-dim);display:block;">
          <div style="position:absolute;top:-4px;right:-4px;background:var(--purple);color:#fff;font-family:var(--font-display);font-size:7px;font-weight:900;border-radius:20px;padding:1px 5px;">NEW</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:var(--font-display);font-size:12px;font-weight:700;color:var(--text-primary);">@${esc(u.username)}</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(u.bio||"Recién llegado a Respawn")}</div>
        </div>
        ${isF
          ? `<button class="btn-unfollow-card" onclick="exToggleFollow('${u.username}')">Siguiendo</button>`
          : `<button class="btn btn-follow-card" onclick="exToggleFollow('${u.username}')">Seguir</button>`
        }
      </div>`;
  }).join("");
}

// ─────────────────────────────────────────
// TOGGLE FOLLOW
// ─────────────────────────────────────────
window.exToggleFollow = function(targetUsername) {
  if (targetUsername === currentUsername) return;
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const me     = allUsers.find(u => u.username === currentUsername);
  const target = allUsers.find(u => u.username === targetUsername);
  if (!me || !target) return;
  me.following     = me.following     || [];
  target.followers = target.followers || [];
  const isF = me.following.includes(targetUsername);
  if (isF) { me.following = me.following.filter(u=>u!==targetUsername); target.followers = target.followers.filter(u=>u!==currentUsername); }
  else      { me.following.push(targetUsername); target.followers.push(currentUsername); }
  localStorage.setItem("users", JSON.stringify(allUsers));
  localStorage.setItem("currentUser", JSON.stringify(me));
  renderAll();
  if (el("searchInput").value.trim()) doSearch();
};

function renderAll() {
  renderFeaturedUsers();
  renderTrendingGames();
  renderCommunityStats();
  renderNewUsers();
  renderRecentPosts();
  renderQuickTags();
}

renderAll();

// Auto-search si venimos de un hashtag del feed
const savedSearch = localStorage.getItem("exploreSearch");
if (savedSearch) {
  localStorage.removeItem("exploreSearch");
  el("searchInput").value = savedSearch;
  doSearch();
}
