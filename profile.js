// profile.js — Respawn Social v2 — Supabase

const LEVEL_NAMES = ["Novato","Aprendiz","Jugador","Veterano","Elite","Leyenda","Máster","Campeón"];
const GAME_ICONS  = {"valorant":"🔫","minecraft":"⛏","league of legends":"⚔","fortnite":"🏗","apex":"🎯","cs2":"💣","overwatch":"🎮","default":"🕹"};

const ACHIEVEMENTS = [
  { icon:"📝", name:"Primera Sangre",   desc:"Publicá tu primer post",          xp:10,  check: d => d.postCount >= 1         },
  { icon:"🔥", name:"En Racha",         desc:"Publicá 10 posts",                xp:50,  check: d => d.postCount >= 10        },
  { icon:"💬", name:"Sin Parar",        desc:"Publicá 50 posts",                xp:150, check: d => d.postCount >= 50        },
  { icon:"🌟", name:"Influencer",       desc:"Publicá 100 posts",               xp:300, check: d => d.postCount >= 100       },
  { icon:"🤝", name:"Sociable",         desc:"Seguí a alguien",                 xp:15,  check: d => d.followingCount >= 1    },
  { icon:"👥", name:"Networker",        desc:"Seguí a 10 personas",             xp:40,  check: d => d.followingCount >= 10   },
  { icon:"⭐", name:"Popular",          desc:"Conseguí 3 seguidores",           xp:30,  check: d => d.followersCount >= 3    },
  { icon:"🎤", name:"Famoso",           desc:"Conseguí 10 seguidores",          xp:80,  check: d => d.followersCount >= 10   },
  { icon:"👑", name:"Leyenda Social",   desc:"Conseguí 50 seguidores",          xp:250, check: d => d.followersCount >= 50   },
  { icon:"💜", name:"Querido",          desc:"Recibí 5 likes",                  xp:25,  check: d => d.likesReceived >= 5     },
  { icon:"❤️", name:"Muy Querido",      desc:"Recibí 50 likes",                 xp:80,  check: d => d.likesReceived >= 50    },
  { icon:"💎", name:"Viral",            desc:"Recibí 200 likes",                xp:200, check: d => d.likesReceived >= 200   },
  { icon:"💬", name:"Comentarista",     desc:"Recibí 3 comentarios",            xp:20,  check: d => d.commentsCount >= 3     },
  { icon:"🗣",  name:"Debate Master",   desc:"Recibí 20 comentarios",           xp:60,  check: d => d.commentsCount >= 20    },
  { icon:"🐍", name:"Snake Master",     desc:"Superá Snake",                    xp:50,  check: d => d.maxLevel >= 2          },
  { icon:"🏓", name:"Pong Pro",         desc:"Ganá en Pong",                    xp:50,  check: d => d.maxLevel >= 3          },
  { icon:"🧱", name:"Block Breaker",    desc:"Superá Breakout",                 xp:50,  check: d => d.maxLevel >= 4          },
  { icon:"☄",  name:"Astronauta",       desc:"Superá Asteroids",                xp:75,  check: d => d.maxLevel >= 5          },
  { icon:"🐦", name:"Flappy Bird",      desc:"Superá Flappy",                   xp:75,  check: d => d.maxLevel >= 6          },
  { icon:"🟪", name:"Tetris God",       desc:"Superá Tetris",                   xp:75,  check: d => d.maxLevel >= 7          },
  { icon:"👾", name:"Space Cadet",      desc:"Superá Space Invaders",           xp:100, check: d => d.maxLevel >= 8          },
  { icon:"🏃", name:"Dino Runner",      desc:"Superá Dino Runner",              xp:100, check: d => d.maxLevel >= 9          },
  { icon:"🎮", name:"Arcade Master",    desc:"Completá todo el Arcade",         xp:500, check: d => d.maxLevel >= 9          },
  { icon:"🌈", name:"Completo",         desc:"Bio + 3 juegos favoritos",        xp:30,  check: d => d.hasBioAndGames         },
  { icon:"🏆", name:"Competidor",       desc:"Inscribite en un torneo",         xp:50,  check: d => d.tournamentsJoined >= 1 },
  { icon:"🎪", name:"Organizador",      desc:"Creá un torneo",                  xp:150, check: d => d.tournamentsCreated >= 1},
  { icon:"📨", name:"Primer Mensaje",   desc:"Enviá tu primer DM",              xp:15,  check: d => d.dmsSent >= 1           },
  { icon:"⚡", name:"Primer Nivel",     desc:"Llegá a LVL 2",                   xp:20,  check: d => d.lvl >= 2               },
  { icon:"🚀", name:"En Ascenso",       desc:"Llegá a LVL 5",                   xp:100, check: d => d.lvl >= 5               },
  { icon:"💠", name:"Coleccionista",    desc:"Desbloqueá 20 logros",            xp:500, check: d => d.unlockedCount >= 20    },
];

function el(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function calcXP(d) { return d.postCount*10+d.followingCount*5+d.followersCount*8+d.likesReceived*3+d.commentsCount*4+(d.maxLevel-1)*50; }
function xpLevel(total) { let l=1,r=total; while(r>=l*100){r-=l*100;l++;} return {level:l,current:r,needed:l*100,total}; }
function calcStreak(posts) {
  if(!posts.length) return 0;
  const today=new Date(); today.setHours(0,0,0,0);
  const days=new Set();
  posts.forEach(p=>{const d=new Date(p.created_at);d.setHours(0,0,0,0);days.add(d.getTime());});
  let s=0,check=today.getTime();
  while(days.has(check)){s++;check-=86400000;}
  return s;
}

// ── Estado global ──
let currentUser   = null;
let viewingUser   = null;  // el perfil que se está viendo (puede ser otro)
let isOwnProfile  = true;

// ── Init ──
async function init() {
  currentUser = await sbRequireAuth();
  if (!currentUser) return;

  // Detectar si se está viendo el perfil de otra persona
  const params       = new URLSearchParams(window.location.search);
  const targetUsername = params.get("user");

  if (targetUsername && targetUsername !== currentUser.username) {
    // Modo vista — perfil ajeno
    isOwnProfile = false;
    viewingUser  = await sbGetProfile(targetUsername);
    if (!viewingUser) {
      document.body.innerHTML = `<div style="text-align:center;padding:80px;font-family:var(--font-mono);color:var(--text-muted);">Usuario no encontrado.</div>`;
      return;
    }
    // Ocultar botones de edición
    const editBtn = document.querySelector('.btn-edit-profile');
    if (editBtn) editBtn.style.display = 'none';
    const editModal = el('editModal');
    if (editModal) editModal.style.display = 'none';
    const nowPlayingCard = el('nowPlayingCard');
    if (nowPlayingCard) nowPlayingCard.style.display = 'none';
    const historyCard = el('historyCard');
    if (historyCard) historyCard.style.display = 'none';
  } else {
    // Modo propio
    isOwnProfile = true;
    viewingUser  = currentUser;
  }

  await renderProfile();
}

// ── MODAL EDITAR ──
window.openEdit = function() {
  el("editBio").value    = currentUser.bio   || "";
  el("editGame1").value  = (currentUser.games||[])[0] || "";
  el("editGame2").value  = (currentUser.games||[])[1] || "";
  el("editGame3").value  = (currentUser.games||[])[2] || "";
  el("editModal").classList.add("open");
};
window.closeEdit = function() { el("editModal").classList.remove("open"); };
window.saveEdit  = async function() {
  const bio   = el("editBio").value.trim();
  const games = [el("editGame1").value.trim(), el("editGame2").value.trim(), el("editGame3").value.trim()].filter(Boolean);
  try {
    const updated = await sbUpdateProfile(currentUser.id, { bio, games });
    currentUser = { ...currentUser, bio, games };
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    window.closeEdit();
    await renderProfile();
  } catch(e) { alert("Error al guardar: " + e.message); }
};
el("editModal").addEventListener("click", e => { if(e.target===el("editModal")) window.closeEdit(); });

// ── RENDER PRINCIPAL ──
async function renderProfile() {
  const target = viewingUser; // el usuario cuyo perfil vemos

  // Cargar datos frescos de Supabase
  const [profile, followingRows, followersRows, posts, tournamentsData] = await Promise.all([
    sbGetProfile(target.username),
    sbGetFollowing(target.id),
    sbGetFollowers(target.id),
    sbGetPosts(),
    sbGetTournaments(),
  ]);

  if (!profile) return;

  // Sync maxLevel solo si es perfil propio
  const localMaxLevel = parseInt(localStorage.getItem("maxLevel")) || 1;
  const maxLevel = isOwnProfile
    ? Math.max(profile.max_level || 1, localMaxLevel)
    : (profile.max_level || 1);

  if (isOwnProfile && maxLevel > (profile.max_level || 1)) {
    await sbUpdateMaxLevel(currentUser.id, maxLevel);
  }

  const userPosts      = posts.filter(p => p.user_id === target.id);
  const followingCount = followingRows.length;
  const followersCount = followersRows.length;
  const likesReceived  = userPosts.reduce((s,p) => s + (p.likes||[]).length, 0);
  const commentsCount  = userPosts.reduce((s,p) => s + (p.comments||[]).length, 0);
  const tournamentsJoined  = tournamentsData.filter(t => (t.tournament_players||[]).some(p=>p.user_id===target.id)).length;
  const tournamentsCreated = tournamentsData.filter(t => t.creator_id === target.id).length;
  const dmsSent = 0; // solo aplica para perfil propio

  const totalXP = calcXP({ postCount:userPosts.length, followingCount, followersCount, likesReceived, commentsCount, maxLevel });
  const lvl     = xpLevel(totalXP);
  const lvlName = LEVEL_NAMES[Math.min(lvl.level-1, LEVEL_NAMES.length-1)];
  const streak  = calcStreak(userPosts);

  const data = {
    postCount: userPosts.length, followingCount, followersCount,
    likesReceived, commentsCount, maxLevel, streak,
    hasBioAndGames: !!(profile.bio && (profile.games||[]).length >= 3),
    hasBio: !!profile.bio, lvl: lvl.level,
    tournamentsJoined, tournamentsCreated, dmsSent,
    unlockedCount: 0
  };
  data.unlockedCount = ACHIEVEMENTS.filter((a,i) => i < ACHIEVEMENTS.length-1 && a.check(data)).length;

  // ── Info básica ──
  const avatarEl = el("profileAvatar");
  if (avatarEl) { avatarEl.src = ""; avatarEl.src = profile.avatar; }
  if (el("profileDisplayName")) el("profileDisplayName").textContent = profile.username;
  if (el("profileHandle"))      el("profileHandle").textContent = `@${profile.username}`;
  // Email solo visible en perfil propio
  if (el("profileEmail"))       el("profileEmail").textContent  = isOwnProfile ? `· ${currentUser.email || ""}` : "";
  if (el("profileBio"))         el("profileBio").textContent    = profile.bio || (isOwnProfile ? "Sin bio todavía. ¡Editá tu perfil!" : "Sin bio.");

  const games = profile.games || [];
  if (el("profileGames")) {
    el("profileGames").innerHTML = games.length
      ? games.map(g => { const icon=GAME_ICONS[g.toLowerCase()]||GAME_ICONS.default; return `<span class="game-tag">${icon} ${g}</span>`; }).join("")
      : isOwnProfile ? `<span class="game-tag" style="cursor:pointer;opacity:0.5;" onclick="openEdit()">+ Agregar juegos</span>` : "";
  }

  // Botón seguir/dejar de seguir en perfil ajeno
  const actionsEl = el("profileActions") || document.querySelector(".profile-actions");
  if (actionsEl && !isOwnProfile) {
    const myFollowing   = await sbGetFollowing(currentUser.id);
    const alreadyFollow = myFollowing.some(u => u.id === target.id);
    actionsEl.innerHTML = alreadyFollow
      ? `<button class="btn-edit-profile" style="border-color:var(--purple);color:var(--purple);" onclick="profileToggleFollow()">✓ Siguiendo</button>
         <button class="btn-edit-profile" onclick="window.location.href='messages.html'" style="margin-left:8px;">💬 Mensaje</button>`
      : `<button class="btn btn-edit-profile" style="background:var(--cyan);color:#000;border-color:var(--cyan);" onclick="profileToggleFollow()">+ Seguir</button>
         <button class="btn-edit-profile" onclick="window.location.href='messages.html'" style="margin-left:8px;">💬 Mensaje</button>`;
  }

  // ── Stats ──
  if (el("postsCount"))     el("postsCount").textContent     = userPosts.length;
  if (el("followingCount")) el("followingCount").textContent = followingCount;
  if (el("followersCount")) el("followersCount").textContent = followersCount;
  if (el("likesCount"))     el("likesCount").textContent     = likesReceived;
  if (el("streakCount"))    el("streakCount").textContent    = streak;
  if (el("postsBadge"))     el("postsBadge").textContent     = userPosts.length;

  // ── XP ──
  if (el("levelBadge"))    el("levelBadge").textContent    = `LVL ${lvl.level}`;
  if (el("xpLevelLabel"))  el("xpLevelLabel").textContent  = `Nivel ${lvl.level} — ${lvlName}`;
  if (el("xpNext"))        el("xpNext").textContent        = `${lvl.current} / ${lvl.needed} XP · ${totalXP} total`;
  if (el("xpFill"))        el("xpFill").style.width        = `${Math.round(lvl.current/lvl.needed*100)}%`;
  if (el("bannerRank"))    el("bannerRank").textContent     = `🎮 ${lvlName.toUpperCase()} ${lvl.level}`;

  // Milestones
  if (el("xpMilestones")) {
    const ms = [{n:1,nm:"Novato"},{n:2,nm:"Aprendiz"},{n:3,nm:"Jugador"},{n:4,nm:"Veterano"},{n:5,nm:"Elite"},{n:6,nm:"Leyenda"},{n:7,nm:"Máster"},{n:8,nm:"Campeón"}];
    el("xpMilestones").innerHTML = ms.map(m => {
      const cls = m.n < lvl.level ? "milestone reached" : m.n === lvl.level ? "milestone current" : "milestone";
      return `<div class="${cls}"><span class="milestone-num">${m.n}</span><span class="milestone-name">${m.nm}</span></div>`;
    }).join("");
  }

  // ── Arcade stats ──
  const statusText = (cleared, pending) => cleared ? "SUPERADO" : pending ? "PENDIENTE" : "🔒";
  if (el("snakeStatNum"))    { el("snakeStatNum").textContent    = statusText(maxLevel>=2, true);           el("snakeStatNum").style.fontSize="14px"; }
  if (el("pongStatNum"))     { el("pongStatNum").textContent     = statusText(maxLevel>=3, maxLevel>=2);    el("pongStatNum").style.fontSize="14px"; }
  if (el("breakoutStatNum")) { el("breakoutStatNum").textContent = statusText(maxLevel>=4, maxLevel>=3);    el("breakoutStatNum").style.fontSize="14px"; }

  // ── Logros ──
  const unlocked = ACHIEVEMENTS.filter(a => a.check(data)).length;
  if (el("achCounter")) el("achCounter").textContent = `(${unlocked}/${ACHIEVEMENTS.length})`;
  if (el("achievementsGrid")) {
    el("achievementsGrid").innerHTML = ACHIEVEMENTS.map(a => {
      const ok = a.check(data);
      return `<div class="achievement ${ok?"unlocked":"locked"}"><span class="ach-icon">${a.icon}</span><span class="ach-name">${a.name}</span><span class="ach-desc">${a.desc}</span></div>`;
    }).join("");
  }

  // ── Posts propios ──
  renderPosts(userPosts);

  // ── LFG ──
  renderLFG(profile, maxLevel);

  // ── Seguidores ──
  renderFriends(followersRows, followingRows);
}

// ── LFG ──
function renderLFG(profile, maxLevel) {
  const lfgEl = el("lfgList");
  if (!lfgEl) return;
  const games = profile.games || [];
  const items = [];
  if (maxLevel >= 1) items.push({ game:"Snake",  mode:"Arcade", icon:"🐍" });
  if (maxLevel >= 2) items.push({ game:"Pong",   mode:"1v1",    icon:"🏓" });
  games.slice(0,2).forEach(g => items.push({ game:g, mode:"Ranked", icon:GAME_ICONS[g.toLowerCase()]||"🎮" }));
  if (!items.length) { lfgEl.innerHTML = `<p style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);">Jugá en el arcade para crear grupos.</p>`; return; }
  lfgEl.innerHTML = items.slice(0,3).map(item => `
    <div class="lfg-item">
      <div class="lfg-top">
        <span style="font-size:18px;">${item.icon}</span>
        <span class="lfg-game">${item.game}</span>
        <span class="lfg-mode">${item.mode}</span>
        <span class="lfg-slots">1/5</span>
      </div>
      <div class="lfg-avatars">
        <div class="lfg-avatar">${profile.avatar?`<img src="${profile.avatar}" width="28" height="28" style="image-rendering:pixelated;border-radius:6px;">`:"👤"}</div>
        <div class="lfg-avatar empty">+</div>
        <div class="lfg-avatar empty">+</div>
      </div>
      <button class="btn-join">UNIRSE AL GRUPO</button>
    </div>`).join("");
}

// ── SEGUIDORES ──
function renderFriends(followers, following) {
  const el2 = el("friendsList");
  if (!el2) return;
  const followingIds = following.map(u => u.id);
  if (!followers.length) { el2.innerHTML = `<p style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);padding:8px 0;">Todavía no tenés seguidores.</p>`; return; }
  el2.innerHTML = followers.slice(0,6).map(f => {
    const isF = followingIds.includes(f.id);
    return `<div class="friend-row">
      <div class="friend-av-wrap">
        <div class="friend-av">${f.avatar?`<img src="${f.avatar}" width="34" height="34" style="border-radius:8px;image-rendering:pixelated;">`:"👤"}</div>
        <div class="friend-dot on"></div>
      </div>
      <div class="friend-info">
        <div class="friend-name">@${esc(f.username)}</div>
        <div class="friend-act">${esc(f.bio||"Jugando en Respawn")}</div>
      </div>
      ${isF
        ? `<button class="btn-unfollow-xs" onclick="toggleFollow('${f.id}','${f.username}')">Siguiendo</button>`
        : `<button class="btn-unfollow-xs" style="border-color:var(--cyan);color:var(--cyan);" onclick="toggleFollow('${f.id}','${f.username}')">Seguir</button>`}
    </div>`;
  }).join("");
}

// ── FOLLOW desde perfil ajeno ──
window.profileToggleFollow = async function() {
  try {
    await sbToggleFollow(currentUser.id, viewingUser.id);
    await renderProfile(); // re-renderizar para actualizar botón
  } catch(e) { console.error(e); }
};

// ── FOLLOW desde lista de seguidores ──
window.toggleFollow = async function(targetId, targetUsername) {
  if (targetId === currentUser.id) return;
  try {
    await sbToggleFollow(currentUser.id, targetId);
    await renderProfile();
  } catch(e) { console.error(e); }
};

// ── POSTS ──
function renderPosts(posts) {
  const container = el("userPostsContainer");
  if (!container) return;
  if (!posts.length) {
    container.innerHTML = `<div class="posts-empty"><span class="posts-empty-icon">🎮</span><p>Todavía no publicaste nada.<br><a href="feed.html">Volvé al feed</a>.</p></div>`;
    return;
  }
  container.innerHTML = posts.map(post => {
    const likes    = post.likes || [];
    const comments = post.comments || [];
    const isLiked  = likes.some(l => l.user_id === currentUser.id);
    const cmtCount = comments.length;
    const cmtsHTML = comments.map(c => {
      const isAuth = c.user_id === currentUser.id;
      return `<div class="comment">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="font-size:14px;line-height:1.5;">
            <span style="font-family:var(--font-display);font-size:11px;color:var(--purple);">@${esc(c.username)}</span>
            <span style="color:var(--text-primary);margin-left:6px;">${esc(c.content)}</span>
          </div>
          ${isAuth ? `<button class="delete-comment-btn" onclick="handleDeleteComment(${c.id},${post.id})">✕</button>` : ""}
        </div>
      </div>`;
    }).join("");
    const date = new Date(post.created_at).toLocaleString("es-AR");
    return `<div class="post">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${post.avatar||'avatar1.png'}" width="36" height="36" style="border-radius:8px;image-rendering:pixelated;border:1px solid var(--border-default);">
          <div>
            <div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--text-primary);">@${esc(post.username)}</div>
            <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);">${date}</div>
          </div>
        </div>
        <button class="delete-post-btn" onclick="handleDeletePost(${post.id})">Borrar</button>
      </div>
      <p style="margin:10px 0;line-height:1.6;color:var(--text-primary);font-size:15px;">${esc(post.content)}</p>
      <div class="post-footer">
        <button class="like-btn ${isLiked?"voted":""}" onclick="handlePostLike(${post.id})">♥ ${likes.length}</button>
        <span>${cmtCount} comentario${cmtCount!==1?"s":""}</span>
      </div>
      <div class="comment-form">
        <input type="text" id="commentInput-${post.id}" data-post-id="${post.id}" class="comment-input" placeholder="Comentar...">
        <button class="comment-btn" onclick="handleComment(${post.id})">›</button>
      </div>
      ${cmtsHTML ? `<div class="comments-section"><div class="comments-list">${cmtsHTML}</div></div>` : ""}
    </div>`;
  }).join("");
}

// ── INTERACCIONES ──
window.handlePostLike = async function(postId) {
  try { await sbToggleLike(postId, currentUser.id); await renderProfile(); } catch(e) { console.error(e); }
};
window.handleComment = async function(postId) {
  const input   = document.getElementById(`commentInput-${postId}`);
  const content = input ? input.value.trim() : "";
  if (!content) return;
  try {
    await sbAddComment(postId, currentUser.id, currentUser.username, currentUser.avatar, content);
    if (input) input.value = "";
    await renderProfile();
  } catch(e) { console.error(e); }
};
window.handleDeletePost = async function(postId) {
  if (!confirm("¿Borrar esta publicación?")) return;
  try { await sbDeletePost(postId, currentUser.id); await renderProfile(); } catch(e) { console.error(e); }
};
window.handleDeleteComment = async function(commentId, postId) {
  if (!confirm("¿Borrar este comentario?")) return;
  try { await sbDeleteComment(commentId, currentUser.id); await renderProfile(); } catch(e) { console.error(e); }
};
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.classList.contains("comment-input")) {
    const id = parseInt(e.target.getAttribute("data-post-id"));
    if (id) handleComment(id);
  }
});

init();