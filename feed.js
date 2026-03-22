// feed.js — Respawn Social v2

// PWA Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

const currentUser     = JSON.parse(localStorage.getItem("currentUser"));
const currentUsername = currentUser ? currentUser.username : null;
if (!currentUser) window.location.href = "index.html";

const LEVEL_NAMES = ["Novato","Aprendiz","Jugador","Veterano","Elite","Leyenda","Máster","Campeón"];
const GAME_ICONS  = {"valorant":"🔫","minecraft":"⛏","league of legends":"⚔","fortnite":"🏗","apex":"🎯","cs2":"💣","overwatch":"🎮","rocket league":"🚗","among us":"🔪","terraria":"⚒","default":"🕹"};

function el(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function calcXP(u, posts) {
  const userPosts = posts.filter(p => p.user === u.username);
  return userPosts.length*10 + (u.following||[]).length*5 + (u.followers||[]).length*8 +
         userPosts.reduce((s,p)=>(p.likes||[]).length+s,0)*3 + ((u.maxLevel||1)-1)*50;
}
function xpLevel(total) {
  let level=1, rem=total;
  while(rem>=level*100){rem-=level*100;level++;}
  return {level, current:rem, needed:level*100};
}

// ─────────────────────────────────────────
// INIT — composer
// ─────────────────────────────────────────
(function initComposer() {
  const av = el("composerAvatar");
  if (av) { av.src = ""; av.src = currentUser.avatar; }
  const un = el("composerUsername");
  if (un) un.textContent = "@" + currentUsername;
})();

// ─────────────────────────────────────────
// CHAR COUNTER
// ─────────────────────────────────────────
el("postContent").addEventListener("input", function() {
  const len = this.value.length;
  const c   = el("charCounter");
  c.textContent = `${len} / 280`;
  c.className   = "char-counter" + (len > 270 ? " danger" : len > 240 ? " warn" : "");
});

// ─────────────────────────────────────────
// CREAR POST
// ─────────────────────────────────────────
el("postBtn").addEventListener("click", () => {
  const content = el("postContent").value.trim();
  if (!content) return;
  const posts = JSON.parse(localStorage.getItem("posts")) || [];
  posts.unshift({ id: Date.now(), user: currentUsername, avatar: currentUser.avatar, content, date: new Date().toLocaleString("es-AR"), likes: [], comments: [] });
  localStorage.setItem("posts", JSON.stringify(posts));
  el("postContent").value = "";
  el("charCounter").textContent = "0 / 280";
  el("charCounter").className   = "char-counter";
  renderAll();
});

el("postContent").addEventListener("keydown", e => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) el("postBtn").click();
});

// ─────────────────────────────────────────
// INTERACCIONES DE POSTS
// ─────────────────────────────────────────
window.handlePostLike = function(postId) {
  const posts = JSON.parse(localStorage.getItem("posts")) || [];
  const post  = posts.find(p => p.id === postId); if (!post) return;
  post.likes  = post.likes || [];
  const i = post.likes.indexOf(currentUsername);
  if (i===-1) post.likes.push(currentUsername); else post.likes.splice(i,1);
  localStorage.setItem("posts", JSON.stringify(posts)); renderPosts();
};

window.handleComment = function(postId) {
  const input   = document.getElementById(`commentInput-${postId}`);
  const content = input ? input.value.trim() : ""; if (!content) return;
  const posts   = JSON.parse(localStorage.getItem("posts")) || [];
  const post    = posts.find(p => p.id === postId); if (!post) return;
  post.comments = post.comments || [];
  post.comments.push({ id: Date.now(), user: currentUsername, avatar: currentUser.avatar, content, date: new Date().toLocaleString("es-AR"), likes: [] });
  localStorage.setItem("posts", JSON.stringify(posts)); renderPosts();
};

window.deletePost = function(postId) {
  if (!confirm("¿Borrar esta publicación?")) return;
  let posts = JSON.parse(localStorage.getItem("posts")) || [];
  localStorage.setItem("posts", JSON.stringify(posts.filter(p => p.id !== postId)));
  renderPosts();
};

window.deleteComment = function(postId, commentId) {
  if (!confirm("¿Borrar este comentario?")) return;
  const posts = JSON.parse(localStorage.getItem("posts")) || [];
  const post  = posts.find(p => p.id === postId); if (!post) return;
  post.comments = (post.comments||[]).filter(c => c.id !== commentId);
  localStorage.setItem("posts", JSON.stringify(posts)); renderPosts();
};

window.handleCommentLike = function(postId, commentId) {
  const posts   = JSON.parse(localStorage.getItem("posts")) || [];
  const post    = posts.find(p => p.id === postId); if (!post) return;
  const comment = (post.comments||[]).find(c => c.id === commentId); if (!comment) return;
  comment.likes = comment.likes || [];
  const i = comment.likes.indexOf(currentUsername);
  if (i===-1) comment.likes.push(currentUsername); else comment.likes.splice(i,1);
  localStorage.setItem("posts", JSON.stringify(posts)); renderPosts();
};

window.toggleFollow = function(targetUsername) {
  if (targetUsername === currentUsername) return;
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const me     = allUsers.find(u => u.username === currentUsername);
  const target = allUsers.find(u => u.username === targetUsername);
  if (!me || !target) return;
  me.following     = me.following     || [];
  target.followers = target.followers || [];
  const isF = me.following.includes(targetUsername);
  if (isF) { me.following = me.following.filter(u=>u!==targetUsername); target.followers = target.followers.filter(u=>u!==currentUsername); }
  else { me.following.push(targetUsername); target.followers.push(currentUsername); }
  localStorage.setItem("users", JSON.stringify(allUsers));
  localStorage.setItem("currentUser", JSON.stringify(me));
  renderAll();
};

document.addEventListener("keydown", e => {
  if (e.key==="Enter" && e.target.classList.contains("comment-input")) {
    const id = parseInt(e.target.id.replace("commentInput-",""));
    if (id) handleComment(id);
  }
});

// ─────────────────────────────────────────
// FORMAT CONTENT — hashtags + menciones
// ─────────────────────────────────────────
function formatContent(text) {
  return esc(text)
    .replace(/#(\w+)/g, '<span class="post-content-hashtag" onclick="searchHashtag(\'$1\')">#$1</span>')
    .replace(/@(\w+)/g, '<span class="post-content-mention">@$1</span>');
}

window.searchHashtag = function(tag) {
  localStorage.setItem("exploreSearch", tag);
  window.location.href = "explore.html";
};

// ─────────────────────────────────────────
// BUILD POST HTML
// ─────────────────────────────────────────
function buildPostHTML(post, me) {
  const isLiked    = (post.likes||[]).includes(currentUsername);
  const likeCount  = (post.likes||[]).length;
  const cmtCount   = (post.comments||[]).length;
  const isFollowing = (me.following||[]).includes(post.user);

  // Game tag — detectar juegos mencionados en el post
  const content = post.content.toLowerCase();
  let gameTag = "";
  for (const [game, icon] of Object.entries(GAME_ICONS)) {
    if (game !== "default" && content.includes(game)) {
      gameTag = `<span class="post-game-tag">${icon} ${game.charAt(0).toUpperCase()+game.slice(1)}</span>`;
      break;
    }
  }
  // También detectar juegos del perfil del autor
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const author   = allUsers.find(u => u.username === post.user);
  if (!gameTag && author && (author.games||[]).length) {
    const g    = author.games[0];
    const icon = GAME_ICONS[g.toLowerCase()] || GAME_ICONS.default;
    gameTag = `<span class="post-game-tag">${icon} ${g}</span>`;
  }

  // Acción en header
  let headerAction = post.user === currentUsername
    ? `<button class="delete-post-btn" onclick="deletePost(${post.id})">Borrar</button>`
    : isFollowing
      ? `<button class="btn-unfollow-sm" onclick="toggleFollow('${post.user}')">Siguiendo</button>`
      : `<button class="btn btn-follow-sm" onclick="toggleFollow('${post.user}')">Seguir</button>`;

  const commentsHTML = (post.comments||[]).map(c => {
    const liked  = (c.likes||[]).includes(currentUsername);
    const isAuth = c.user === currentUsername;
    return `<div class="comment">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div style="font-size:14px;line-height:1.5;">
          <span style="font-family:var(--font-display);font-size:11px;color:var(--purple);letter-spacing:0.5px;">@${c.user}</span>
          <span style="color:var(--text-primary);margin-left:6px;">${esc(c.content)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
          <button class="like-comment-btn ${liked?"voted":""}" onclick="handleCommentLike(${post.id},${c.id})">♥ ${(c.likes||[]).length}</button>
          ${isAuth?`<button class="delete-comment-btn" onclick="deleteComment(${post.id},${c.id})">✕</button>`:""}
        </div>
      </div>
    </div>`;
  }).join("");

  return `<div class="post">
    <div class="post-header">
      <div class="post-author">
        <img src="${post.avatar}" alt="" class="post-av">
        <div class="post-author-info">
          <span class="post-author-name">@${post.user}${gameTag}</span>
          <span class="post-date">${post.date}</span>
        </div>
      </div>
      ${headerAction}
    </div>
    <p>${formatContent(post.content)}</p>
    <div class="post-footer">
      <div class="post-actions">
        <button class="like-btn ${isLiked?"voted":""}" onclick="handlePostLike(${post.id})">♥ ${likeCount}</button>
      </div>
      <span>${cmtCount} comentario${cmtCount!==1?"s":""}</span>
    </div>
    <div class="comment-form">
      <input type="text" id="commentInput-${post.id}" class="comment-input" placeholder="Comentar...">
      <button class="comment-btn" onclick="handleComment(${post.id})">›</button>
    </div>
    ${commentsHTML?`<div class="comments-section"><div class="comments-list">${commentsHTML}</div></div>`:""}
  </div>`;
}

// ─────────────────────────────────────────
// RENDER POSTS
// ─────────────────────────────────────────
function renderPosts() {
  const posts    = JSON.parse(localStorage.getItem("posts")) || [];
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const me       = allUsers.find(u => u.username === currentUsername) || currentUser;
  const container = el("postsContainer");

  if (!posts.length) {
    container.innerHTML = `<div class="empty-feed"><span class="empty-feed-icon">🎮</span><h3>Sin posts todavía</h3><p>Sé el primero en publicar algo.</p></div>`;
    return;
  }
  container.innerHTML = posts.map(p => buildPostHTML(p, me)).join("");
}

// ─────────────────────────────────────────
// RENDER SIDEBAR
// ─────────────────────────────────────────
function renderSidebar() {
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const allPosts = JSON.parse(localStorage.getItem("posts")) || [];
  const me       = allUsers.find(u => u.username === currentUsername) || currentUser;
  const maxLevel = Math.max(parseInt(localStorage.getItem("maxLevel"))||1, me.maxLevel||1);

  // ── Mini perfil ──
  const sbAv = el("sidebarAvatar");
  if (sbAv) { sbAv.src = ""; sbAv.src = me.avatar; }
  if (el("sidebarUsername")) el("sidebarUsername").textContent = "@" + me.username;

  const totalXP = calcXP(me, allPosts);
  const lvl     = xpLevel(totalXP);
  const lvlName = LEVEL_NAMES[Math.min(lvl.level-1, LEVEL_NAMES.length-1)];
  if (el("sidebarLevel"))  el("sidebarLevel").textContent  = `LVL ${lvl.level} · ${lvlName}`;
  if (el("sidebarXpFill")) el("sidebarXpFill").style.width = `${Math.round(lvl.current/lvl.needed*100)}%`;

  const userPosts = allPosts.filter(p => p.user === currentUsername);
  if (el("sbPosts"))     el("sbPosts").textContent     = userPosts.length;
  if (el("sbFollowing")) el("sbFollowing").textContent = (me.following||[]).length;
  if (el("sbFollowers")) el("sbFollowers").textContent = (me.followers||[]).length;

  // ── Siguiendo ──
  const followingEl = el("followingList");
  const followed    = allUsers.filter(u => (me.following||[]).includes(u.username));
  followingEl.innerHTML = !followed.length
    ? `<p class="sidebar-empty">Aún no seguís a nadie.</p>`
    : followed.map(u => `
        <div class="user-item">
          <div class="user-info">
            <img src="${u.avatar}" class="user-av" alt="">
            <div><div class="user-name">@${u.username}</div><div class="user-bio-mini">${u.bio||"Jugando en Respawn"}</div></div>
          </div>
          <button class="btn-unfollow-xs" onclick="toggleFollow('${u.username}')">Siguiendo</button>
        </div>`).join("");

  // ── Descubrir ──
  const discoverEl  = el("discoverUsers");
  const toDiscover  = allUsers.filter(u => u.username!==currentUsername && !(me.following||[]).includes(u.username)).slice(0,5);
  discoverEl.innerHTML = !toDiscover.length
    ? `<p class="sidebar-empty">No hay usuarios nuevos.</p>`
    : toDiscover.map(u => `
        <div class="user-item">
          <div class="user-info">
            <img src="${u.avatar}" class="user-av" alt="">
            <div><div class="user-name">@${u.username}</div><div class="user-bio-mini">${u.bio||"Jugando en Respawn"}</div></div>
          </div>
          <button class="btn btn-follow-xs" onclick="toggleFollow('${u.username}')">Seguir</button>
        </div>`).join("");

  // ── Arcade ──
  const gamesList = el("gamesList");
  if (gamesList) {
    const maxLevel = Math.max(parseInt(localStorage.getItem("maxLevel"))||1, me.maxLevel||1);
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
    gamesList.innerHTML = games.map(g => {
      const unlocked = maxLevel >= g.level;
      return unlocked
        ? `<a href="${g.path}" class="game-link">
            <span class="game-link-icon">${g.icon}</span>
            <div class="game-link-info">
              <span class="game-link-name" style="color:${g.color};">${g.name}</span>
              <span class="game-link-status">Desbloqueado · Jugar ahora</span>
            </div>
           </a>`
        : `<div class="game-link" style="opacity:0.4;cursor:not-allowed;">
            <span class="game-link-icon">🔒</span>
            <div class="game-link-info">
              <span class="game-link-name">${g.name}</span>
              <span class="game-link-status">Bloqueado · Completá el anterior</span>
            </div>
           </div>`;
    }).join("");
  }

  // ── Trending tags ──
  const trendingEl = el("trendingTags");
  if (trendingEl) {
    // Extraer juegos/tags mencionados en todos los posts
    const tagCounts = {};
    allPosts.forEach(p => {
      Object.keys(GAME_ICONS).forEach(game => {
        if (game !== "default" && p.content.toLowerCase().includes(game)) {
          tagCounts[game] = (tagCounts[game]||0) + 1;
        }
      });
      // Tags de perfiles
      allUsers.forEach(u => (u.games||[]).forEach(g => { tagCounts[g.toLowerCase()] = (tagCounts[g.toLowerCase()]||0) + 1; }));
    });

    const sorted = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const defaults = ["Gaming","FPS","RPG","Indie","Co-op","PvP"];

    const tags = sorted.length
      ? sorted.map(([tag, count]) => ({ tag, count, hot: count >= 2 }))
      : defaults.map(t => ({ tag: t, count: 0, hot: false }));

    trendingEl.innerHTML = tags.map(({tag,count,hot}) => {
      const icon = GAME_ICONS[tag.toLowerCase()] || "🎮";
      return `<span class="trending-tag ${hot?"hot":""}">${icon} ${tag.charAt(0).toUpperCase()+tag.slice(1)}${count>1?` <span style="opacity:0.6;font-size:9px;">${count}</span>`:""}</span>`;
    }).join("");
  }

  // Dot de notificaciones
  updateNotifDot(allPosts, me);
}

// ─────────────────────────────────────────
// NOTIFICACIONES
// ─────────────────────────────────────────
function buildNotifs(allPosts, userData) {
  const notifs = [];
  allPosts.filter(p => p.user === userData.username).forEach(post => {
    (post.likes||[]).forEach(liker => {
      if (liker !== currentUsername) notifs.push({ type:"like", from:liker, text:`le dio ♥ a tu post: "${post.content.slice(0,28)}..."`, time:post.id });
    });
    (post.comments||[]).forEach(c => {
      if (c.user !== currentUsername) notifs.push({ type:"comment", from:c.user, text:`comentó: "${c.content.slice(0,28)}"`, time:c.id });
    });
  });
  (userData.followers||[]).forEach(f => notifs.push({ type:"follow", from:f, text:"empezó a seguirte", time:0 }));
  return notifs.sort((a,b)=>b.time-a.time).slice(0,20);
}

function updateNotifDot(allPosts, me) {
  const dot    = el("navNotifDot");
  const notifs = buildNotifs(allPosts, me);
  if (dot) dot.style.display = notifs.length ? "block" : "none";
}

window.toggleNotifs = function() {
  const panel = el("notifPanel");
  const open  = panel.style.display !== "none";
  panel.style.display = open ? "none" : "block";
  if (!open) {
    const allPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const allUsers = JSON.parse(localStorage.getItem("users")) || [];
    const me       = allUsers.find(u => u.username === currentUsername) || currentUser;
    const notifs   = buildNotifs(allPosts, me);
    const list     = el("notifList");
    if (!notifs.length) {
      list.innerHTML = `<div style="padding:32px 16px;text-align:center;font-family:var(--font-mono);font-size:13px;color:var(--text-muted);">🔔 Sin notificaciones nuevas</div>`;
      return;
    }
    const icons  = {like:"♥",comment:"💬",follow:"👤"};
    const colors = {like:"var(--pink)",comment:"var(--purple)",follow:"var(--cyan)"};
    list.innerHTML = notifs.map(n => `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border-subtle);cursor:default;" onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background='transparent'">
        <span style="font-size:15px;color:${colors[n.type]};flex-shrink:0;margin-top:2px;">${icons[n.type]}</span>
        <div><span style="font-family:var(--font-display);font-size:11px;font-weight:700;color:${colors[n.type]};">@${n.from}</span>
        <span style="font-family:var(--font-body);font-size:13px;color:var(--text-secondary);margin-left:5px;">${n.text}</span></div>
      </div>`).join("");
  }
};

window.clearNotifs = function() {
  el("notifList").innerHTML = `<div style="padding:32px 16px;text-align:center;font-family:var(--font-mono);font-size:13px;color:var(--text-muted);">🔔 Sin notificaciones nuevas</div>`;
  if (el("navNotifDot")) el("navNotifDot").style.display = "none";
};

document.addEventListener("click", e => {
  const panel = el("notifPanel");
  const btn   = el("notifBtn");
  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) panel.style.display = "none";
});

// ─────────────────────────────────────────
// RENDER ALL
// ─────────────────────────────────────────
function renderAll() { renderPosts(); renderSidebar(); }

renderAll();
