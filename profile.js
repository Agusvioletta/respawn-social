// profile.js — Respawn Social v2 — Full Gaming Profile

const currentUser     = JSON.parse(localStorage.getItem("currentUser"));
const currentUsername = currentUser ? currentUser.username : null;
if (!currentUser) window.location.href = "index.html";

const LEVEL_NAMES = ["Novato","Aprendiz","Jugador","Veterano","Elite","Leyenda","Máster","Campeón"];
const GAME_ICONS  = {"valorant":"🔫","minecraft":"⛏","league of legends":"⚔","fortnite":"🏗","apex":"🎯","cs2":"💣","overwatch":"🎮","default":"🕹"};

const ACHIEVEMENTS = [
  // ── SOCIAL — Publicaciones ──
  { icon:"📝", name:"Primera Sangre",    cat:"Social",  rarity:"común",      desc:"Publicá tu primer post",                  xp:10,  check: d => d.postCount >= 1          },
  { icon:"🔥", name:"En Racha",          cat:"Social",  rarity:"común",      desc:"Publicá 10 posts",                        xp:30,  check: d => d.postCount >= 10         },
  { icon:"💬", name:"Sin Parar",         cat:"Social",  rarity:"raro",       desc:"Publicá 25 posts",                        xp:80,  check: d => d.postCount >= 25         },
  { icon:"📢", name:"Cronista",          cat:"Social",  rarity:"raro",       desc:"Publicá 50 posts",                        xp:150, check: d => d.postCount >= 50         },
  { icon:"🌟", name:"Influencer",        cat:"Social",  rarity:"épico",      desc:"Publicá 100 posts",                       xp:300, check: d => d.postCount >= 100        },
  { icon:"🗞",  name:"Periodista Gamer", cat:"Social",  rarity:"legendario", desc:"Publicá 250 posts",                       xp:800, check: d => d.postCount >= 250        },
  // ── SOCIAL — Seguidores ──
  { icon:"🤝", name:"Sociable",          cat:"Social",  rarity:"común",      desc:"Seguí a alguien",                         xp:15,  check: d => d.followingCount >= 1     },
  { icon:"👥", name:"Networker",         cat:"Social",  rarity:"común",      desc:"Seguí a 10 personas",                     xp:40,  check: d => d.followingCount >= 10    },
  { icon:"🌐", name:"Conector",          cat:"Social",  rarity:"raro",       desc:"Seguí a 25 personas",                     xp:90,  check: d => d.followingCount >= 25    },
  { icon:"⭐", name:"Popular",           cat:"Social",  rarity:"común",      desc:"Conseguí 3 seguidores",                   xp:30,  check: d => d.followersCount >= 3     },
  { icon:"🎤", name:"Famoso",            cat:"Social",  rarity:"raro",       desc:"Conseguí 10 seguidores",                  xp:80,  check: d => d.followersCount >= 10    },
  { icon:"📡", name:"Viral",             cat:"Social",  rarity:"épico",      desc:"Conseguí 25 seguidores",                  xp:200, check: d => d.followersCount >= 25    },
  { icon:"👑", name:"Leyenda Social",    cat:"Social",  rarity:"legendario", desc:"Conseguí 50 seguidores",                  xp:500, check: d => d.followersCount >= 50    },
  // ── SOCIAL — Likes ──
  { icon:"💜", name:"Querido",           cat:"Social",  rarity:"común",      desc:"Recibí 5 likes",                          xp:25,  check: d => d.likesReceived >= 5      },
  { icon:"❤️",  name:"Muy Querido",       cat:"Social",  rarity:"común",      desc:"Recibí 20 likes",                         xp:60,  check: d => d.likesReceived >= 20     },
  { icon:"💎", name:"Adorado",           cat:"Social",  rarity:"raro",       desc:"Recibí 50 likes",                         xp:120, check: d => d.likesReceived >= 50     },
  { icon:"🔮", name:"Fenómeno",          cat:"Social",  rarity:"épico",      desc:"Recibí 200 likes",                        xp:350, check: d => d.likesReceived >= 200    },
  { icon:"✨", name:"Intocable",         cat:"Social",  rarity:"legendario", desc:"Recibí 500 likes",                        xp:900, check: d => d.likesReceived >= 500    },
  // ── SOCIAL — Comentarios ──
  { icon:"💬", name:"Comentarista",      cat:"Social",  rarity:"común",      desc:"Recibí 3 comentarios",                    xp:20,  check: d => d.commentsCount >= 3      },
  { icon:"🗣",  name:"Debate Master",    cat:"Social",  rarity:"raro",       desc:"Recibí 20 comentarios",                   xp:70,  check: d => d.commentsCount >= 20     },
  { icon:"🎙",  name:"Centro de Atención",cat:"Social", rarity:"épico",      desc:"Recibí 50 comentarios",                   xp:180, check: d => d.commentsCount >= 50     },
  // ── GAMING — Arcade ──
  { icon:"🐍", name:"Snake Master",      cat:"Arcade",  rarity:"común",      desc:"Superá Snake",                            xp:50,  check: d => d.maxLevel >= 2           },
  { icon:"🏓", name:"Pong Pro",          cat:"Arcade",  rarity:"común",      desc:"Ganá en Pong",                            xp:50,  check: d => d.maxLevel >= 3           },
  { icon:"🧱", name:"Block Breaker",     cat:"Arcade",  rarity:"común",      desc:"Superá Breakout",                         xp:50,  check: d => d.maxLevel >= 4           },
  { icon:"☄",  name:"Astronauta",        cat:"Arcade",  rarity:"raro",       desc:"Superá Asteroids",                        xp:75,  check: d => d.maxLevel >= 5           },
  { icon:"🐦", name:"Ave Libre",         cat:"Arcade",  rarity:"raro",       desc:"Superá Flappy",                           xp:75,  check: d => d.maxLevel >= 6           },
  { icon:"🟪", name:"Tetris God",        cat:"Arcade",  rarity:"épico",      desc:"Superá Tetris",                           xp:100, check: d => d.maxLevel >= 7           },
  { icon:"👾", name:"Space Cadet",       cat:"Arcade",  rarity:"épico",      desc:"Superá Space Invaders",                   xp:100, check: d => d.maxLevel >= 8           },
  { icon:"🏃", name:"Dino Runner",       cat:"Arcade",  rarity:"épico",      desc:"Superá Dino Runner",                      xp:100, check: d => d.maxLevel >= 9           },
  { icon:"🎮", name:"Arcade Master",     cat:"Arcade",  rarity:"legendario", desc:"Completá todo el Arcade",                 xp:1000,check: d => d.maxLevel >= 9           },
  // ── GAMING — Racha ──
  { icon:"📅", name:"Constante",         cat:"Gaming",  rarity:"común",      desc:"Publicá 3 días seguidos",                 xp:40,  check: d => d.streak >= 3            },
  { icon:"🗓",  name:"Dedicado",         cat:"Gaming",  rarity:"raro",       desc:"Publicá 7 días seguidos",                 xp:100, check: d => d.streak >= 7            },
  { icon:"🏅", name:"Comprometido",      cat:"Gaming",  rarity:"épico",      desc:"Publicá 30 días seguidos",                xp:400, check: d => d.streak >= 30           },
  { icon:"💫", name:"Sin Días Libres",   cat:"Gaming",  rarity:"legendario", desc:"Publicá 100 días seguidos",               xp:2000,check: d => d.streak >= 100          },
  // ── XP & NIVELES ──
  { icon:"⚡", name:"Primer Nivel",      cat:"Nivel",   rarity:"común",      desc:"Llegá a LVL 2",                           xp:20,  check: d => d.lvl >= 2               },
  { icon:"🚀", name:"En Ascenso",        cat:"Nivel",   rarity:"común",      desc:"Llegá a LVL 4",                           xp:50,  check: d => d.lvl >= 4               },
  { icon:"💥", name:"Imparable",         cat:"Nivel",   rarity:"raro",       desc:"Llegá a LVL 6",                           xp:120, check: d => d.lvl >= 6               },
  { icon:"🔱", name:"Élite",             cat:"Nivel",   rarity:"épico",      desc:"Llegá a LVL 8 (Campeón)",                 xp:300, check: d => d.lvl >= 8               },
  // ── PERFIL ──
  { icon:"🌈", name:"Completo",          cat:"Perfil",  rarity:"común",      desc:"Agregá bio y 3 juegos favoritos",         xp:30,  check: d => d.hasBioAndGames          },
  { icon:"🎭", name:"Identidad",         cat:"Perfil",  rarity:"común",      desc:"Configurá tu perfil",                     xp:20,  check: d => d.hasBio                  },
  { icon:"🎯", name:"Early Adopter",     cat:"Especial",rarity:"legendario", desc:"Ser de los primeros 10 usuarios",         xp:500, check: d => d.userIndex <= 10        },
  // ── MENSAJES ──
  { icon:"📨", name:"Primer Mensaje",    cat:"Social",  rarity:"común",      desc:"Enviá tu primer DM",                      xp:15,  check: d => d.dmsSent >= 1           },
  { icon:"📬", name:"Comunicativo",      cat:"Social",  rarity:"raro",       desc:"Enviá 50 DMs",                            xp:60,  check: d => d.dmsSent >= 50          },
  // ── TORNEOS ──
  { icon:"🏆", name:"Competidor",        cat:"Torneos", rarity:"raro",       desc:"Inscribite en un torneo",                 xp:50,  check: d => d.tournamentsJoined >= 1  },
  { icon:"🥇", name:"Campeón",           cat:"Torneos", rarity:"épico",      desc:"Ganá un torneo",                          xp:300, check: d => d.tournamentsWon >= 1    },
  { icon:"🎪", name:"Organizador",       cat:"Torneos", rarity:"épico",      desc:"Creá un torneo",                          xp:150, check: d => d.tournamentsCreated >= 1 },
  // ── META ──
  { icon:"💠", name:"Coleccionista",     cat:"Meta",    rarity:"épico",      desc:"Desbloqueá 20 logros",                    xp:500, check: d => d.unlockedCount >= 20    },
  { icon:"🌌", name:"Perfeccionista",    cat:"Meta",    rarity:"legendario", desc:"Desbloqueá 35 logros",                    xp:2000,check: d => d.unlockedCount >= 35    },
  { icon:"🎖",  name:"PLATINO",          cat:"Meta",    rarity:"legendario", desc:"Desbloqueá todos los logros",             xp:9999,check: d => d.unlockedCount >= 47    },
];

function calcXP(d) {
  return d.postCount*10 + d.followingCount*5 + d.followersCount*8 +
         d.likesReceived*3 + d.commentsCount*4 + (d.maxLevel-1)*50;
}
function xpLevel(total) {
  let level=1, rem=total;
  while(rem>=level*100){rem-=level*100;level++;}
  return {level,current:rem,needed:level*100,total};
}
function calcStreak(posts) {
  if(!posts.length) return 0;
  const today=new Date(); today.setHours(0,0,0,0);
  const days=new Set();
  posts.forEach(p=>{const d=new Date(p.id);d.setHours(0,0,0,0);days.add(d.getTime());});
  let streak=0,check=today.getTime();
  while(days.has(check)){streak++;check-=86400000;}
  return streak;
}
function el(id){return document.getElementById(id);}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

// ── Edit Modal ──
window.openEdit=function(){
  const allUsers=JSON.parse(localStorage.getItem("users"))||[];
  const ud=allUsers.find(u=>u.username===currentUsername)||currentUser;
  el("editBio").value=(ud.bio||"");
  el("editGame1").value=(ud.games||[])[0]||"";
  el("editGame2").value=(ud.games||[])[1]||"";
  el("editGame3").value=(ud.games||[])[2]||"";
  el("editModal").classList.add("open");
};
window.closeEdit=function(){el("editModal").classList.remove("open");};
window.saveEdit=function saveEdit(){
  const bio=el("editBio").value.trim();
  const games=[el("editGame1").value.trim(),el("editGame2").value.trim(),el("editGame3").value.trim()].filter(Boolean);
  const allUsers=JSON.parse(localStorage.getItem("users"))||[];
  const idx=allUsers.findIndex(u=>u.username===currentUsername);
  if(idx!==-1){allUsers[idx].bio=bio;allUsers[idx].games=games;localStorage.setItem("users",JSON.stringify(allUsers));}
  const me=JSON.parse(localStorage.getItem("currentUser"));
  if(me){me.bio=bio;me.games=games;localStorage.setItem("currentUser",JSON.stringify(me));}
  closeEdit(); renderProfile();
}
el("editModal").addEventListener("click",e=>{if(e.target===el("editModal"))closeEdit();});

// ── Render ──
function renderProfile(){
  const allUsers=JSON.parse(localStorage.getItem("users"))||[];
  const allPosts=JSON.parse(localStorage.getItem("posts"))||[];
  const userData=allUsers.find(u=>u.username===currentUsername)||currentUser;

  const maxLevel=Math.max(parseInt(localStorage.getItem("maxLevel"))||1,userData.maxLevel||1);
  if(maxLevel>(userData.maxLevel||1)){
    userData.maxLevel=maxLevel;
    const idx=allUsers.findIndex(u=>u.username===userData.username);
    if(idx!==-1){allUsers[idx].maxLevel=maxLevel;localStorage.setItem("users",JSON.stringify(allUsers));}
    const me=JSON.parse(localStorage.getItem("currentUser"));
    if(me){me.maxLevel=maxLevel;localStorage.setItem("currentUser",JSON.stringify(me));}
  }

  const userPosts=allPosts.filter(p=>p.user===userData.username);
  const followingCount=(userData.following||[]).length;
  const followersCount=(userData.followers||[]).length;
  const likesReceived=userPosts.reduce((s,p)=>s+(p.likes||[]).length,0);
  const commentsCount=userPosts.reduce((s,p)=>s+(p.comments||[]).length,0);

  // Propiedades especiales para logros
  const hasBioAndGames = !!(userData.bio && userData.bio.trim() && (userData.games||[]).length >= 3);
  const allUsersForIdx = JSON.parse(localStorage.getItem("users")) || [];
  const userIdx        = allUsersForIdx.findIndex(u => u.username === currentUsername);
  const userId         = userIdx !== -1 ? userIdx + 1 : 999;

  // Login streak desde localStorage
  const loginHistory = JSON.parse(localStorage.getItem("loginHistory_" + currentUsername)) || [];
  let loginStreak = 0;
  const today2 = new Date(); today2.setHours(0,0,0,0);
  for(let i=0; i<30; i++) {
    const d = new Date(today2.getTime() - i*86400000);
    if(loginHistory.includes(d.toDateString())) loginStreak++;
    else break;
  }
  // Registrar login de hoy
  if(!loginHistory.includes(today2.toDateString())) {
    loginHistory.push(today2.toDateString());
    localStorage.setItem("loginHistory_" + currentUsername, JSON.stringify(loginHistory.slice(-60)));
  }

  const data={postCount:userPosts.length,followingCount,followersCount,likesReceived,commentsCount,maxLevel,hasBioAndGames,userId,loginStreak,unlockedCount:0};
  // Calcular unlockedCount antes del platino
  data.unlockedCount = ACHIEVEMENTS.filter((a,i) => i < ACHIEVEMENTS.length-1 && a.check(data)).length;

  const avatarEl = el("profileAvatar");
  avatarEl.src = "";
  avatarEl.src = userData.avatar || "avatar1.png";
  avatarEl.onerror = () => { avatarEl.style.display = "none"; };
  el("profileDisplayName").textContent=userData.username;
  el("profileHandle").textContent=`@${userData.username}`;
  el("profileEmail").textContent=`· ${userData.email}`;
  el("profileBio").textContent=userData.bio||"Sin bio todavía. ¡Editá tu perfil!";

  const games=userData.games||[];
  el("profileGames").innerHTML=games.length
    ?games.map(g=>{const icon=GAME_ICONS[g.toLowerCase()]||GAME_ICONS.default;return`<span class="game-tag">${icon} ${g}</span>`;}).join("")
    :`<span class="game-tag" style="cursor:pointer;opacity:0.5;" onclick="openEdit()">+ Agregar juegos</span>`;

  el("postsCount").textContent=userPosts.length;
  el("followingCount").textContent=followingCount;
  el("followersCount").textContent=followersCount;
  el("likesCount").textContent=likesReceived;
  el("postsBadge").textContent=userPosts.length;
  el("streakCount").textContent=calcStreak(userPosts);

  const totalXP=calcXP(data);
  const lvl=xpLevel(totalXP);
  const lvlName=LEVEL_NAMES[Math.min(lvl.level-1,LEVEL_NAMES.length-1)];
  el("levelBadge").textContent=`LVL ${lvl.level}`;
  el("xpLevelLabel").textContent=`Nivel ${lvl.level} — ${lvlName}`;
  el("xpNext").textContent=`${lvl.current} / ${lvl.needed} XP  ·  ${totalXP} total`;
  el("xpFill").style.width=`${Math.round(lvl.current/lvl.needed*100)}%`;
  el("bannerRank").textContent=`🎮 ${lvlName.toUpperCase()} ${lvl.level}`;

  const milestones=[{n:1,nm:"Novato"},{n:2,nm:"Aprendiz"},{n:3,nm:"Jugador"},{n:4,nm:"Veterano"},{n:5,nm:"Elite"},{n:6,nm:"Leyenda"},{n:7,nm:"Máster"},{n:8,nm:"Campeón"}];
  el("xpMilestones").innerHTML=milestones.map(m=>{
    const cls=m.n<lvl.level?"milestone reached":m.n===lvl.level?"milestone current":"milestone";
    return`<div class="${cls}"><span class="milestone-num">${m.n}</span><span class="milestone-name">${m.nm}</span></div>`;
  }).join("");

  const statusText=(cleared,pending,locked)=>cleared?"SUPERADO":pending?"PENDIENTE":"🔒";
  const fs="font-size:14px;";
  el("snakeStatNum").textContent=statusText(maxLevel>=2,true,false);    el("snakeStatNum").style.cssText=fs;
  el("pongStatNum").textContent=statusText(maxLevel>=3,maxLevel>=2,false);  el("pongStatNum").style.cssText=fs;
  el("breakoutStatNum").textContent=statusText(maxLevel>=4,maxLevel>=3,false); el("breakoutStatNum").style.cssText=fs;

  // Logros
  const unlocked=ACHIEVEMENTS.filter(a=>a.check(data)).length;
  el("achCounter").textContent=`(${unlocked}/${ACHIEVEMENTS.length})`;
  el("achievementsGrid").innerHTML=ACHIEVEMENTS.map(a=>{
    const ok=a.check(data);
    return`<div class="achievement ${ok?"unlocked":"locked"}"><span class="ach-icon">${a.icon}</span><span class="ach-name">${a.name}</span><span class="ach-desc">${a.desc}</span></div>`;
  }).join("");

  renderPosts(userPosts);
  renderLFG(userData,allUsers,maxLevel);
  renderFriends(userData,allUsers);
}

function renderLFG(userData,allUsers,maxLevel){
  const games=userData.games||[];
  const items=[];
  if(maxLevel>=1) items.push({game:"Snake",mode:"Arcade",slots:1,icon:"🐍"});
  if(maxLevel>=2) items.push({game:"Pong",mode:"1v1",slots:1,icon:"🏓"});
  games.slice(0,2).forEach(g=>{items.push({game:g,mode:"Ranked",slots:3,icon:GAME_ICONS[g.toLowerCase()]||"🎮"});});
  if(!items.length){el("lfgList").innerHTML=`<p style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);padding:8px 0;">Jugá en el arcade para crear grupos.</p>`;return;}
  el("lfgList").innerHTML=items.slice(0,3).map(item=>{
    const filled=`<div class="lfg-avatar">${userData.avatar?`<img src="${userData.avatar}" width="28" height="28" style="image-rendering:pixelated;border-radius:6px;">`:"👤"}</div>`;
    const empty=Array(Math.min(item.slots,4)).fill(0).map(()=>`<div class="lfg-avatar empty">+</div>`).join("");
    return`<div class="lfg-item"><div class="lfg-top"><span style="font-size:18px;">${item.icon}</span><span class="lfg-game">${item.game}</span><span class="lfg-mode">${item.mode}</span><span class="lfg-slots">1/${1+item.slots}</span></div><div class="lfg-avatars">${filled}${empty}</div><button class="btn-join">UNIRSE AL GRUPO</button></div>`;
  }).join("");
}

function renderFriends(userData,allUsers){
  const followers=allUsers.filter(u=>(userData.followers||[]).includes(u.username));
  el("followersOnline").textContent=followers.length?`${followers.length} online`:"";
  if(!followers.length){el("friendsList").innerHTML=`<p style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);padding:8px 0;">Todavía no tenés seguidores.</p>`;return;}
  el("friendsList").innerHTML=followers.slice(0,6).map(f=>{
    const isFollowing=(userData.following||[]).includes(f.username);
    return`<div class="friend-row">
      <div class="friend-av-wrap">
        <div class="friend-av">${f.avatar?`<img src="${f.avatar}" width="34" height="34" style="border-radius:8px;image-rendering:pixelated;">`:"👤"}</div>
        <div class="friend-dot on"></div>
      </div>
      <div class="friend-info">
        <div class="friend-name">@${f.username}</div>
        <div class="friend-act">${f.bio||"Jugando en Respawn"}</div>
      </div>
      ${isFollowing
        ?`<button class="btn-unfollow-xs" onclick="toggleFollow('${f.username}')">Siguiendo</button>`
        :`<button class="btn-unfollow-xs" style="border-color:var(--cyan);color:var(--cyan);" onclick="toggleFollow('${f.username}')">Seguir</button>`}
    </div>`;
  }).join("");
}

window.toggleFollow=function(target){
  if(target===currentUsername)return;
  const allUsers=JSON.parse(localStorage.getItem("users"))||[];
  const me=allUsers.find(u=>u.username===currentUsername);
  const tgt=allUsers.find(u=>u.username===target);
  if(!me||!tgt)return;
  me.following=me.following||[];tgt.followers=tgt.followers||[];
  const isF=me.following.includes(target);
  if(isF){me.following=me.following.filter(u=>u!==target);tgt.followers=tgt.followers.filter(u=>u!==currentUsername);}
  else{me.following.push(target);tgt.followers.push(currentUsername);}
  localStorage.setItem("users",JSON.stringify(allUsers));
  localStorage.setItem("currentUser",JSON.stringify(me));
  renderProfile();
};

function renderPosts(posts){
  const container=el("userPostsContainer");
  if(!posts.length){container.innerHTML=`<div class="posts-empty"><span class="posts-empty-icon">🎮</span><p>Todavía no publicaste nada.<br><a href="feed.html">Volvé al feed</a> y contale algo.</p></div>`;return;}
  container.innerHTML=posts.map(post=>{
    const isLiked=(post.likes||[]).includes(currentUsername);
    const likeCount=(post.likes||[]).length;
    const cmtCount=(post.comments||[]).length;
    const cmtsHTML=(post.comments||[]).map(c=>{
      const liked=(c.likes||[]).includes(currentUsername);
      const isAuth=c.user===currentUsername;
      return`<div class="comment"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;"><div style="font-size:14px;line-height:1.5;"><span style="font-family:var(--font-display);font-size:11px;color:var(--purple);letter-spacing:0.5px;">@${c.user}</span><span style="color:var(--text-primary);margin-left:6px;">${esc(c.content)}</span></div><div style="display:flex;align-items:center;gap:4px;flex-shrink:0;"><button class="like-comment-btn ${liked?"voted":""}" onclick="handleCommentLike(${post.id},${c.id})">♥ ${(c.likes||[]).length}</button>${isAuth?`<button class="delete-comment-btn" onclick="deleteComment(${post.id},${c.id})">✕</button>`:""}</div></div></div>`;
    }).join("");
    return`<div class="post"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;"><div style="display:flex;align-items:center;gap:10px;"><img src="${post.avatar}" width="36" height="36" style="border-radius:8px;image-rendering:pixelated;border:1px solid var(--border-default);"><div><div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--text-primary);letter-spacing:0.5px;">@${post.user}</div><div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);">${post.date}</div></div></div><button class="delete-post-btn" onclick="deletePost(${post.id})">Borrar</button></div><p style="margin:10px 0;line-height:1.6;color:var(--text-primary);font-size:15px;">${esc(post.content)}</p><div class="post-footer"><button class="like-btn ${isLiked?"voted":""}" onclick="handlePostLike(${post.id})">♥ ${likeCount}</button><span>${cmtCount} comentario${cmtCount!==1?"s":""}</span></div><div class="comment-form"><input type="text" id="commentInput-${post.id}" class="comment-input" placeholder="Comentar..."><button class="comment-btn" onclick="handleComment(${post.id})">›</button></div>${cmtsHTML?`<div class="comments-section"><div class="comments-list">${cmtsHTML}</div></div>`:""}</div>`;
  }).join("");
}

window.handlePostLike=function(id){const posts=JSON.parse(localStorage.getItem("posts"))||[];const post=posts.find(p=>p.id===id);if(!post)return;post.likes=post.likes||[];const i=post.likes.indexOf(currentUsername);if(i===-1)post.likes.push(currentUsername);else post.likes.splice(i,1);localStorage.setItem("posts",JSON.stringify(posts));renderProfile();};
window.handleComment=function(id){const input=document.getElementById(`commentInput-${id}`);const text=input?input.value.trim():"";if(!text)return;const posts=JSON.parse(localStorage.getItem("posts"))||[];const post=posts.find(p=>p.id===id);if(!post)return;post.comments=post.comments||[];post.comments.push({id:Date.now(),user:currentUsername,avatar:currentUser.avatar,content:text,date:new Date().toLocaleString("es-AR"),likes:[]});localStorage.setItem("posts",JSON.stringify(posts));renderProfile();};
window.deletePost=function(id){if(!confirm("¿Borrar esta publicación?"))return;const posts=JSON.parse(localStorage.getItem("posts"))||[];localStorage.setItem("posts",JSON.stringify(posts.filter(p=>p.id!==id)));renderProfile();};
window.deleteComment=function(postId,commentId){if(!confirm("¿Borrar este comentario?"))return;const posts=JSON.parse(localStorage.getItem("posts"))||[];const post=posts.find(p=>p.id===postId);if(!post)return;post.comments=(post.comments||[]).filter(c=>c.id!==commentId);localStorage.setItem("posts",JSON.stringify(posts));renderProfile();};
window.handleCommentLike=function(postId,commentId){const posts=JSON.parse(localStorage.getItem("posts"))||[];const post=posts.find(p=>p.id===postId);if(!post)return;const comment=(post.comments||[]).find(c=>c.id===commentId);if(!comment)return;comment.likes=comment.likes||[];const i=comment.likes.indexOf(currentUsername);if(i===-1)comment.likes.push(currentUsername);else comment.likes.splice(i,1);localStorage.setItem("posts",JSON.stringify(posts));renderProfile();};
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.classList.contains("comment-input")){const id=parseInt(e.target.id.replace("commentInput-",""));if(id)handleComment(id);}});

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

function renderNotifPanel() {
  const allPosts = JSON.parse(localStorage.getItem("posts"))||[];
  const allUsers = JSON.parse(localStorage.getItem("users"))||[];
  const userData = allUsers.find(u=>u.username===currentUsername)||currentUser;
  const notifs   = buildNotifs(allPosts, userData);
  const dot      = el("navNotifDot");
  if (dot) dot.style.display = notifs.length ? "block" : "none";
  if (!notifs.length) {
    el("notifList").innerHTML = `<div style="padding:32px 16px;text-align:center;font-family:var(--font-mono);font-size:13px;color:var(--text-muted);">🔔 Sin notificaciones nuevas</div>`;
    return;
  }
  const icons  = {like:"♥",comment:"💬",follow:"👤"};
  const colors = {like:"var(--pink)",comment:"var(--purple)",follow:"var(--cyan)"};
  el("notifList").innerHTML = notifs.map(n=>`
    <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border-subtle);cursor:default;" onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background='transparent'">
      <span style="font-size:15px;color:${colors[n.type]};flex-shrink:0;margin-top:2px;">${icons[n.type]}</span>
      <div><span style="font-family:var(--font-display);font-size:11px;font-weight:700;color:${colors[n.type]};">@${n.from}</span>
      <span style="font-family:var(--font-body);font-size:13px;color:var(--text-secondary);margin-left:5px;">${n.text}</span></div>
    </div>`).join("");
}

window.toggleNotifs = function() {
  const panel = el("notifPanel");
  const open  = panel.style.display !== "none";
  panel.style.display = open ? "none" : "block";
  if (!open) renderNotifPanel();
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

renderProfile();