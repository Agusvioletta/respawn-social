// settings.js — Respawn Social v2

const currentUser     = JSON.parse(localStorage.getItem("currentUser"));
const currentUsername = currentUser ? currentUser.username : null;
if (!currentUser) window.location.href = "index.html";

const LEVEL_NAMES = ["Novato","Aprendiz","Jugador","Veterano","Elite","Leyenda","Máster","Campeón"];
const ACHIEVEMENTS = [
  { icon:"📝", name:"Primera Sangre",   desc:"Publicar 1 vez",                  xp:10,  check: d => d.postCount >= 1         },
  { icon:"🔥", name:"En Racha",         desc:"Publicar 10 veces",                xp:50,  check: d => d.postCount >= 10        },
  { icon:"💬", name:"Sin Parar",        desc:"Publicar 50 veces",                xp:150, check: d => d.postCount >= 50        },
  { icon:"🌟", name:"Influencer",       desc:"Publicar 100 veces",               xp:300, check: d => d.postCount >= 100       },
  { icon:"🤝", name:"Sociable",         desc:"Seguir a alguien",                 xp:15,  check: d => d.followingCount >= 1    },
  { icon:"👥", name:"Networker",        desc:"Seguir a 10 personas",             xp:40,  check: d => d.followingCount >= 10   },
  { icon:"⭐", name:"Popular",          desc:"3 seguidores",                     xp:30,  check: d => d.followersCount >= 3    },
  { icon:"🎤", name:"Famoso",           desc:"10 seguidores",                    xp:80,  check: d => d.followersCount >= 10   },
  { icon:"👑", name:"Leyenda Social",   desc:"50 seguidores",                    xp:250, check: d => d.followersCount >= 50   },
  { icon:"💜", name:"Querido",          desc:"5 likes recibidos",                xp:25,  check: d => d.likesReceived >= 5     },
  { icon:"❤️", name:"Muy Querido",      desc:"50 likes recibidos",               xp:80,  check: d => d.likesReceived >= 50    },
  { icon:"💎", name:"Viral",            desc:"200 likes recibidos",              xp:200, check: d => d.likesReceived >= 200   },
  { icon:"💬", name:"Comentarista",     desc:"3 comentarios recibidos",          xp:20,  check: d => d.commentsCount >= 3     },
  { icon:"🗣",  name:"Debate Master",   desc:"20 comentarios recibidos",         xp:60,  check: d => d.commentsCount >= 20    },
  { icon:"🐍", name:"Snake Master",     desc:"Superar Snake",                    xp:50,  check: d => d.maxLevel >= 2          },
  { icon:"🏓", name:"Pong Pro",         desc:"Ganar en Pong",                    xp:50,  check: d => d.maxLevel >= 3          },
  { icon:"🧱", name:"Block Breaker",    desc:"Superar Breakout",                 xp:50,  check: d => d.maxLevel >= 4          },
  { icon:"☄",  name:"Astronauta",       desc:"Superar Asteroids",                xp:75,  check: d => d.maxLevel >= 5          },
  { icon:"🐦", name:"Flappy Bird",      desc:"Superar Flappy",                   xp:75,  check: d => d.maxLevel >= 6          },
  { icon:"🟪", name:"Tetris God",       desc:"Superar Tetris",                   xp:75,  check: d => d.maxLevel >= 7          },
  { icon:"👾", name:"Space Cadet",      desc:"Superar Space Invaders",           xp:100, check: d => d.maxLevel >= 8          },
  { icon:"🏃", name:"Dino Runner",      desc:"Superar Dino",                     xp:100, check: d => d.maxLevel >= 9          },
  { icon:"🎮", name:"Arcade Master",    desc:"Completar el Arcade",              xp:500, check: d => d.maxLevel >= 9          },
  { icon:"⚡", name:"Primer Nivel",     desc:"Llegar a LVL 2",                   xp:0,   check: d => { const t=d.postCount*10+d.followingCount*5+d.followersCount*8+d.likesReceived*3+d.commentsCount*4+(d.maxLevel-1)*50; return t>=100; } },
  { icon:"🚀", name:"En Ascenso",       desc:"Llegar a LVL 5",                   xp:0,   check: d => { let l=1,r=d.postCount*10+d.followingCount*5+d.followersCount*8+d.likesReceived*3+d.commentsCount*4+(d.maxLevel-1)*50; while(r>=l*100){r-=l*100;l++;} return l>=5; } },
  { icon:"🏆", name:"Élite",            desc:"Llegar a LVL 8",                   xp:0,   check: d => { let l=1,r=d.postCount*10+d.followingCount*5+d.followersCount*8+d.likesReceived*3+d.commentsCount*4+(d.maxLevel-1)*50; while(r>=l*100){r-=l*100;l++;} return l>=8; } },
  { icon:"🎯", name:"Early Adopter",    desc:"Ser de los primeros usuarios",     xp:200, check: d => d.userId <= 10           },
  { icon:"🌈", name:"Completo",         desc:"Bio + 3 juegos favoritos",         xp:30,  check: d => d.hasBioAndGames         },
  { icon:"🔄", name:"Fiel",             desc:"7 días de login seguidos",         xp:70,  check: d => d.loginStreak >= 7       },
  { icon:"🎪", name:"Platino",          desc:"Desbloquear 25 logros",            xp:1000,check: d => d.unlockedCount >= 25    },
];

const FAQ = [
  { q:"¿Cómo subo de nivel?",         a:"Publicando, consiguiendo likes, seguidores y completando juegos del arcade. Cada acción suma XP." },
  { q:"¿Cómo desbloqueo más juegos?", a:"Completá el juego anterior en el mapa de aventura. Snake → Pong → Breakout." },
  { q:"¿Se puede cambiar el avatar?", a:"Por ahora elegís entre los dos avatares disponibles al registrarte. Próximamente habrá más." },
  { q:"¿Los datos se guardan en la nube?", a:"Por ahora en localStorage del navegador. Próximamente migraremos a Firebase para tener datos en la nube." },
  { q:"¿Cómo reporto un usuario?",    a:"Estamos trabajando en la función de reportes. Disponible próximamente." },
  { q:"¿Puedo borrar mi cuenta?",     a:"Sí, desde Configuración → Cuenta → Zona peligrosa → Eliminar cuenta." },
];

function el(id) { return document.getElementById(id); }

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
function init() {
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const allPosts = JSON.parse(localStorage.getItem("posts")) || [];
  const userData = allUsers.find(u => u.username === currentUsername) || currentUser;
  const maxLevel = Math.max(parseInt(localStorage.getItem("maxLevel"))||1, userData.maxLevel||1);

  // Avatar navbar
  const navAv = el("navAvatarBtn");
  if (navAv) navAv.innerHTML = `<img src="${userData.avatar}" width="34" height="34" style="border-radius:50%;image-rendering:pixelated;border:2px solid var(--cyan-dim);display:block;">`;

  // XP
  const userPosts     = allPosts.filter(p => p.user === currentUsername);
  const followingCount = (userData.following||[]).length;
  const followersCount = (userData.followers||[]).length;
  const likesReceived  = userPosts.reduce((s,p)=>s+(p.likes||[]).length,0);
  const commentsCount  = userPosts.reduce((s,p)=>s+(p.comments||[]).length,0);
  const totalXP = userPosts.length*10 + followingCount*5 + followersCount*8 + likesReceived*3 + commentsCount*4 + (maxLevel-1)*50;

  let level=1, rem=totalXP;
  while(rem>=level*100){rem-=level*100;level++;}
  const lvlName = LEVEL_NAMES[Math.min(level-1, LEVEL_NAMES.length-1)];
  const pct = Math.round(rem/(level*100)*100);

  // Sidebar nav
  const navAvatarEl = el("navAvatar");
  if (navAvatarEl) { navAvatarEl.src=""; navAvatarEl.src=userData.avatar; }
  if (el("navUsername")) el("navUsername").textContent = "@"+userData.username;
  if (el("navLevel"))    el("navLevel").textContent    = `LVL ${level} · ${lvlName}`;
  if (el("navXpFill"))   el("navXpFill").style.width   = pct+"%";

  // Perfil fields
  if (el("sUsername")) el("sUsername").value = userData.username;
  if (el("sBio"))      el("sBio").value      = userData.bio  || "";
  if (el("sGame1"))    el("sGame1").value    = (userData.games||[])[0] || "";
  if (el("sGame2"))    el("sGame2").value    = (userData.games||[])[1] || "";
  if (el("sGame3"))    el("sGame3").value    = (userData.games||[])[2] || "";

  // Cuenta fields
  if (el("sEmail")) el("sEmail").value = userData.email || "";
  if (el("sMemberSince") && userData.createdAt) {
    el("sMemberSince").textContent = new Date(userData.createdAt).toLocaleDateString("es-AR",{year:"numeric",month:"long",day:"numeric"});
  }

  // Logros
  const hasBioAndGames = !!(userData.bio && userData.bio.trim() && (userData.games||[]).length >= 3);
  const allUsersForIdx = JSON.parse(localStorage.getItem("users")) || [];
  const userIdx        = allUsersForIdx.findIndex(u => u.username === currentUsername);
  const userId         = userIdx !== -1 ? userIdx + 1 : 999;
  const loginHistory   = JSON.parse(localStorage.getItem("loginHistory_" + currentUsername)) || [];
  let loginStreak = 0;
  const today2 = new Date(); today2.setHours(0,0,0,0);
  for(let i=0;i<30;i++){const d=new Date(today2.getTime()-i*86400000);if(loginHistory.includes(d.toDateString()))loginStreak++;else break;}
  const data = { postCount:userPosts.length, followingCount, followersCount, likesReceived, commentsCount, maxLevel, hasBioAndGames, userId, loginStreak, unlockedCount:0 };
  data.unlockedCount = ACHIEVEMENTS.filter((a,i) => i < ACHIEVEMENTS.length-1 && a.check(data)).length;
  const unlocked = ACHIEVEMENTS.filter(a=>a.check(data)).length;
  if (el("achSubtitle")) el("achSubtitle").textContent = `${unlocked} / ${ACHIEVEMENTS.length} desbloqueados`;
  if (el("achFullGrid")) {
    el("achFullGrid").innerHTML = ACHIEVEMENTS.map(a => {
      const ok = a.check(data);
      return `<div class="ach-card ${ok?"unlocked":"locked"}">
        <span class="ach-card-icon">${a.icon}</span>
        <span class="ach-card-name">${a.name}</span>
        <span class="ach-card-desc">${a.desc}</span>
        <span class="ach-card-xp">+${a.xp} XP</span>
      </div>`;
    }).join("");
  }

  // Estadísticas
  if (el("statsTable")) {
    const streak = calcStreak(userPosts);
    const rows = [
      ["Posts publicados",    userPosts.length],
      ["Siguiendo",           followingCount],
      ["Seguidores",          followersCount],
      ["Likes recibidos",     likesReceived],
      ["Comentarios recibidos", commentsCount],
      ["Días de racha",       streak],
      ["XP total",            totalXP],
      ["Nivel",               `${level} — ${lvlName}`],
    ];
    el("statsTable").innerHTML = rows.map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join("");
  }

  if (el("arcadeStatsTable")) {
    const arcadeRows = [
      ["Nivel del arcade", maxLevel],
      ["Snake",    maxLevel>=2?"✓ Superado":"Pendiente"],
      ["Pong",     maxLevel>=3?"✓ Superado":maxLevel>=2?"Pendiente":"🔒 Bloqueado"],
      ["Breakout", maxLevel>=4?"✓ Superado":maxLevel>=3?"Pendiente":"🔒 Bloqueado"],
    ];
    el("arcadeStatsTable").innerHTML = arcadeRows.map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join("");
  }

  // Arcade section
  const arcadeLevelNames = ["—","Snake","Pong","Breakout","Completado"];
  if (el("arcadeLevel")) el("arcadeLevel").textContent = `Nivel ${maxLevel}`;
  if (el("arcadeLevelDesc")) el("arcadeLevelDesc").textContent = maxLevel >= 4 ? "¡Completaste todos los juegos!" : `Siguiente: ${arcadeLevelNames[maxLevel] || "—"}`;

  // Notif badge
  const notifs = buildNotifs(allPosts, userData);
  if (el("notifBadge")) { el("notifBadge").style.display = notifs.length ? "inline" : "none"; }

  // FAQ
  if (el("faqList")) {
    el("faqList").innerHTML = FAQ.map((f,i) => `
      <div style="border-bottom:1px solid var(--border-subtle);padding:0 0 0 0;">
        <div onclick="toggleFaq(${i})" style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;cursor:pointer;user-select:none;">
          <span style="font-family:var(--font-body);font-size:15px;font-weight:600;color:var(--text-primary);">${f.q}</span>
          <span id="faqArrow${i}" style="color:var(--text-muted);font-size:18px;transition:transform 0.2s;">›</span>
        </div>
        <div id="faqAnswer${i}" style="display:none;padding:0 0 14px;font-family:var(--font-mono);font-size:13px;color:var(--text-secondary);line-height:1.6;">${f.a}</div>
      </div>`).join("");
  }
}

function calcStreak(posts) {
  if (!posts.length) return 0;
  const today = new Date(); today.setHours(0,0,0,0);
  const days = new Set();
  posts.forEach(p => { const d=new Date(p.id); d.setHours(0,0,0,0); days.add(d.getTime()); });
  let streak=0, check=today.getTime();
  while(days.has(check)){streak++;check-=86400000;}
  return streak;
}

function buildNotifs(allPosts, userData) {
  const notifs = [];
  allPosts.filter(p=>p.user===userData.username).forEach(post=>{
    (post.likes||[]).forEach(l=>{ if(l!==currentUsername) notifs.push({type:"like"}); });
    (post.comments||[]).forEach(c=>{ if(c.user!==currentUsername) notifs.push({type:"comment"}); });
  });
  (userData.followers||[]).forEach(()=>notifs.push({type:"follow"}));
  return notifs;
}

// ─────────────────────────────────────────
// NAVEGACIÓN ENTRE SECCIONES
// ─────────────────────────────────────────
function showSection(id) {
  // Secciones
  document.querySelectorAll(".settings-section").forEach(s => s.classList.remove("active"));
  const sec = el("section-"+id);
  if (sec) sec.classList.add("active");

  // Nav items
  document.querySelectorAll(".settings-nav-item").forEach(item => item.classList.remove("active"));
  event.currentTarget.classList.add("active");

  // Scroll top
  window.scrollTo({top:0, behavior:"smooth"});
}

// ─────────────────────────────────────────
// GUARDAR PERFIL
// ─────────────────────────────────────────
function saveProfile() {
  const bio   = el("sBio").value.trim();
  const games = [el("sGame1").value.trim(), el("sGame2").value.trim(), el("sGame3").value.trim()].filter(Boolean);

  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const idx = allUsers.findIndex(u => u.username === currentUsername);
  if (idx !== -1) { allUsers[idx].bio=bio; allUsers[idx].games=games; localStorage.setItem("users", JSON.stringify(allUsers)); }
  const me = JSON.parse(localStorage.getItem("currentUser"));
  if (me) { me.bio=bio; me.games=games; localStorage.setItem("currentUser", JSON.stringify(me)); }
  showToast("✓ Perfil actualizado correctamente.");
}

// ─────────────────────────────────────────
// GUARDAR CUENTA
// ─────────────────────────────────────────
function saveAccount() {
  const email = el("sEmail").value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast("⚠ Email inválido.", true); return; }
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const idx = allUsers.findIndex(u => u.username === currentUsername);
  if (idx !== -1) { allUsers[idx].email=email; localStorage.setItem("users", JSON.stringify(allUsers)); }
  const me = JSON.parse(localStorage.getItem("currentUser"));
  if (me) { me.email=email; localStorage.setItem("currentUser", JSON.stringify(me)); }
  showToast("✓ Email actualizado.");
}

function changePassword() {
  const oldPass     = el("sOldPass").value;
  const newPass     = el("sNewPass").value;
  const confirmPass = el("sConfirmPass").value;

  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const userData = allUsers.find(u => u.username === currentUsername);

  if (!userData || userData.password !== oldPass) { showToast("⚠ Contraseña actual incorrecta.", true); return; }
  if (newPass.length < 6) { showToast("⚠ La nueva contraseña debe tener al menos 6 caracteres.", true); return; }
  if (newPass !== confirmPass) { showToast("⚠ Las contraseñas no coinciden.", true); return; }

  const idx = allUsers.findIndex(u => u.username === currentUsername);
  allUsers[idx].password = newPass;
  localStorage.setItem("users", JSON.stringify(allUsers));
  const me = JSON.parse(localStorage.getItem("currentUser"));
  if (me) { me.password=newPass; localStorage.setItem("currentUser", JSON.stringify(me)); }

  el("sOldPass").value = ""; el("sNewPass").value = ""; el("sConfirmPass").value = "";
  showToast("✓ Contraseña actualizada.");
}

// ─────────────────────────────────────────
// GUARDAR PRIVACIDAD
// ─────────────────────────────────────────
function savePrivacy() {
  const prefs = {
    publicProfile: el("tPublicProfile").checked,
    showEmail:     el("tShowEmail").checked,
    showActivity:  el("tShowActivity").checked,
    whoCanFollow:  el("sWhoCanFollow").value,
    whoCanComment: el("sWhoCanComment").value,
    whoDM:         el("sWhoDM").value,
    recommend:     el("tRecommend").checked,
    searchHistory: el("tSearchHistory").checked,
  };
  localStorage.setItem("privacyPrefs", JSON.stringify(prefs));
  showToast("✓ Configuración de privacidad guardada.");
}

// ─────────────────────────────────────────
// ARCADE
// ─────────────────────────────────────────
function resetArcade() {
  if (!confirm("¿Reiniciar el progreso del arcade? Vas a volver al nivel 1.")) return;
  localStorage.setItem("maxLevel", "1");
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const idx = allUsers.findIndex(u => u.username === currentUsername);
  if (idx !== -1) { allUsers[idx].maxLevel=1; localStorage.setItem("users", JSON.stringify(allUsers)); }
  const me = JSON.parse(localStorage.getItem("currentUser"));
  if (me) { me.maxLevel=1; localStorage.setItem("currentUser", JSON.stringify(me)); }
  showToast("✓ Progreso del arcade reiniciado.");
  init();
}

// ─────────────────────────────────────────
// APARIENCIA
// ─────────────────────────────────────────
function selectTheme(card, theme) {
  document.querySelectorAll(".theme-card").forEach(c => c.classList.remove("active"));
  card.classList.add("active");
  showToast(`✓ Tema "${card.querySelector(".theme-name").textContent}" aplicado.`);
}

function selectAccent(chip, color) {
  document.querySelectorAll(".color-chip").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  document.documentElement.style.setProperty("--cyan", color);
  showToast("✓ Color de acento aplicado.");
}

// ─────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────
function toggleFaq(i) {
  const answer = el("faqAnswer"+i);
  const arrow  = el("faqArrow"+i);
  const open   = answer.style.display !== "none";
  answer.style.display = open ? "none" : "block";
  arrow.style.transform = open ? "" : "rotate(90deg)";
}

// ─────────────────────────────────────────
// LOGOUT / DELETE
// ─────────────────────────────────────────
function confirmLogout() {
  if (confirm("¿Cerrar sesión?")) {
    localStorage.removeItem("currentUser");
    window.location.href = "index.html";
  }
}

function deleteAccount() {
  if (!confirm("⚠ Esta acción es PERMANENTE. ¿Estás seguro de que querés eliminar tu cuenta?")) return;
  if (!confirm("Última oportunidad. Se borrarán todos tus datos, posts y progreso.")) return;
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const allPosts = JSON.parse(localStorage.getItem("posts")) || [];
  localStorage.setItem("users", JSON.stringify(allUsers.filter(u => u.username !== currentUsername)));
  localStorage.setItem("posts", JSON.stringify(allPosts.filter(p => p.user !== currentUsername)));
  localStorage.removeItem("currentUser");
  localStorage.removeItem("maxLevel");
  window.location.href = "index.html";
}

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────
let toastTimeout;
function showToast(msg, isError = false) {
  const t = el("toast");
  t.textContent = msg;
  t.style.borderColor = isError ? "var(--pink)" : "var(--cyan)";
  t.style.color       = isError ? "var(--pink)" : "var(--cyan)";
  t.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove("show"), 2800);
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
init();