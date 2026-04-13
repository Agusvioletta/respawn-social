// settings.js — Respawn Social v2 — Supabase

const LEVEL_NAMES = ["Novato","Aprendiz","Jugador","Veterano","Elite","Leyenda","Máster","Campeón"];

const ACHIEVEMENTS = [
  { icon:"📝", name:"Primera Sangre",  desc:"Publicá tu primer post",       xp:10,  check: d => d.postCount >= 1         },
  { icon:"🔥", name:"En Racha",        desc:"Publicá 10 posts",             xp:50,  check: d => d.postCount >= 10        },
  { icon:"💬", name:"Sin Parar",       desc:"Publicá 50 posts",             xp:150, check: d => d.postCount >= 50        },
  { icon:"🌟", name:"Influencer",      desc:"Publicá 100 posts",            xp:300, check: d => d.postCount >= 100       },
  { icon:"🤝", name:"Sociable",        desc:"Seguí a alguien",              xp:15,  check: d => d.followingCount >= 1    },
  { icon:"👥", name:"Networker",       desc:"Seguí a 10 personas",          xp:40,  check: d => d.followingCount >= 10   },
  { icon:"⭐", name:"Popular",         desc:"Conseguí 3 seguidores",        xp:30,  check: d => d.followersCount >= 3    },
  { icon:"🎤", name:"Famoso",          desc:"Conseguí 10 seguidores",       xp:80,  check: d => d.followersCount >= 10   },
  { icon:"👑", name:"Leyenda Social",  desc:"Conseguí 50 seguidores",       xp:250, check: d => d.followersCount >= 50   },
  { icon:"💜", name:"Querido",         desc:"Recibí 5 likes",               xp:25,  check: d => d.likesReceived >= 5     },
  { icon:"❤️", name:"Muy Querido",     desc:"Recibí 50 likes",              xp:80,  check: d => d.likesReceived >= 50    },
  { icon:"💎", name:"Viral",           desc:"Recibí 200 likes",             xp:200, check: d => d.likesReceived >= 200   },
  { icon:"💬", name:"Comentarista",    desc:"Recibí 3 comentarios",         xp:20,  check: d => d.commentsCount >= 3     },
  { icon:"🗣",  name:"Debate Master",  desc:"Recibí 20 comentarios",        xp:60,  check: d => d.commentsCount >= 20    },
  { icon:"🐍", name:"Snake Master",    desc:"Superá Snake",                 xp:50,  check: d => d.maxLevel >= 2          },
  { icon:"🏓", name:"Pong Pro",        desc:"Ganá en Pong",                 xp:50,  check: d => d.maxLevel >= 3          },
  { icon:"🧱", name:"Block Breaker",   desc:"Superá Breakout",              xp:50,  check: d => d.maxLevel >= 4          },
  { icon:"☄",  name:"Astronauta",      desc:"Superá Asteroids",             xp:75,  check: d => d.maxLevel >= 5          },
  { icon:"🐦", name:"Flappy Bird",     desc:"Superá Flappy",                xp:75,  check: d => d.maxLevel >= 6          },
  { icon:"🟪", name:"Tetris God",      desc:"Superá Tetris",                xp:75,  check: d => d.maxLevel >= 7          },
  { icon:"👾", name:"Space Cadet",     desc:"Superá Space Invaders",        xp:100, check: d => d.maxLevel >= 8          },
  { icon:"🏃", name:"Dino Runner",     desc:"Superá Dino Runner",           xp:100, check: d => d.maxLevel >= 9          },
  { icon:"🎮", name:"Arcade Master",   desc:"Completá todo el Arcade",      xp:500, check: d => d.maxLevel >= 9          },
  { icon:"🌈", name:"Completo",        desc:"Bio + 3 juegos favoritos",     xp:30,  check: d => d.hasBioAndGames         },
  { icon:"🏆", name:"Competidor",      desc:"Inscribite en un torneo",      xp:50,  check: d => d.tournamentsJoined >= 1 },
  { icon:"🎪", name:"Organizador",     desc:"Creá un torneo",               xp:150, check: d => d.tournamentsCreated >= 1},
  { icon:"📨", name:"Primer Mensaje",  desc:"Enviá tu primer DM",           xp:15,  check: d => d.dmsSent >= 1           },
  { icon:"⚡", name:"Primer Nivel",    desc:"Llegá a LVL 2",                xp:20,  check: d => d.lvl >= 2               },
  { icon:"🚀", name:"En Ascenso",      desc:"Llegá a LVL 5",                xp:100, check: d => d.lvl >= 5               },
  { icon:"💠", name:"Coleccionista",   desc:"Desbloqueá 20 logros",         xp:500, check: d => d.unlockedCount >= 20    },
];

const FAQ = [
  { q:"¿Cómo subo de nivel?",           a:"Publicando, consiguiendo likes, seguidores y completando juegos del arcade. Cada acción suma XP." },
  { q:"¿Cómo desbloqueo más juegos?",   a:"Completá el juego anterior en el mapa de aventura. Snake → Pong → Breakout → Asteroids → Flappy → Tetris → Space Invaders → Dino." },
  { q:"¿Se puede cambiar el avatar?",   a:"Por ahora elegís entre los avatares disponibles al registrarte. Próximamente habrá más." },
  { q:"¿Los datos se guardan en la nube?", a:"¡Sí! Usamos Supabase (PostgreSQL) como backend. Tus datos están seguros en la nube." },
  { q:"¿Cómo reporto un usuario?",      a:"Estamos trabajando en la función de reportes. Disponible próximamente." },
  { q:"¿Puedo borrar mi cuenta?",       a:"Sí, desde Configuración → Cuenta → Zona peligrosa → Eliminar cuenta." },
];

function el(id) { return document.getElementById(id); }

let currentUser = null;

// ── Init ──
async function init() {
  currentUser = await sbRequireAuth();
  if (!currentUser) return;

  const navAv = el("navAvatarBtn");
  if (navAv) navAv.innerHTML = `<img src="${currentUser.avatar}" width="34" height="34" style="border-radius:50%;image-rendering:pixelated;border:2px solid var(--cyan-dim);display:block;">`;

  // Cargar datos de Supabase
  const [followingRows, followersRows, posts, tournaments] = await Promise.all([
    sbGetFollowing(currentUser.id),
    sbGetFollowers(currentUser.id),
    sbGetPosts(),
    sbGetTournaments(),
  ]);

  const userPosts      = posts.filter(p => p.user_id === currentUser.id);
  const followingCount = followingRows.length;
  const followersCount = followersRows.length;
  const likesReceived  = userPosts.reduce((s,p)=>s+(p.likes||[]).length,0);
  const commentsCount  = userPosts.reduce((s,p)=>s+(p.comments||[]).length,0);
  const maxLevel       = Math.max(currentUser.max_level||1, parseInt(localStorage.getItem("maxLevel"))||1);
  const tournamentsJoined  = tournaments.filter(t=>(t.tournament_players||[]).some(p=>p.user_id===currentUser.id)).length;
  const tournamentsCreated = tournaments.filter(t=>t.creator_id===currentUser.id).length;
  const dmsSent = Object.keys(localStorage).filter(k=>k.startsWith('dm_')).reduce((s,k)=>{
    const msgs = JSON.parse(localStorage.getItem(k))||[];
    return s + msgs.filter(m=>m.from_id===currentUser.id).length;
  }, 0);

  // XP y nivel
  const totalXP = userPosts.length*10+followingCount*5+followersCount*8+likesReceived*3+commentsCount*4+(maxLevel-1)*50;
  let level=1, rem=totalXP;
  while(rem>=level*100){rem-=level*100;level++;}
  const lvlName = LEVEL_NAMES[Math.min(level-1, LEVEL_NAMES.length-1)];
  const pct = Math.round(rem/(level*100)*100);

  // Sidebar nav
  const navAvatarEl = el("navAvatar");
  if (navAvatarEl) { navAvatarEl.src=""; navAvatarEl.src=currentUser.avatar; }
  if (el("navUsername")) el("navUsername").textContent = "@"+currentUser.username;
  if (el("navLevel"))    el("navLevel").textContent    = `LVL ${level} · ${lvlName}`;
  if (el("navXpFill"))   el("navXpFill").style.width   = pct+"%";

  // Perfil fields
  if (el("sUsername")) el("sUsername").value = currentUser.username;
  if (el("sBio"))      el("sBio").value      = currentUser.bio  || "";
  if (el("sGame1"))    el("sGame1").value    = (currentUser.games||[])[0] || "";
  if (el("sGame2"))    el("sGame2").value    = (currentUser.games||[])[1] || "";
  if (el("sGame3"))    el("sGame3").value    = (currentUser.games||[])[2] || "";

  // Cuenta
  // Cuenta - obtener email directamente de Supabase auth
  const { data: { user: authUser } } = await sb.auth.getUser();
  const realEmail = authUser?.email || currentUser.email || "";
  if (el("sEmail")) el("sEmail").value = realEmail;
  if (el("sMemberSince") && currentUser.created_at) {
    el("sMemberSince").textContent = new Date(currentUser.created_at).toLocaleDateString("es-AR",{year:"numeric",month:"long",day:"numeric"});
  }

  // Logros
  const hasBioAndGames = !!(currentUser.bio && (currentUser.games||[]).length >= 3);
  const data = { postCount:userPosts.length, followingCount, followersCount, likesReceived, commentsCount, maxLevel,
    hasBioAndGames, lvl:level, tournamentsJoined, tournamentsCreated, dmsSent, unlockedCount:0 };
  data.unlockedCount = ACHIEVEMENTS.filter((a,i)=>i<ACHIEVEMENTS.length-1&&a.check(data)).length;

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
    const rows = [
      ["Posts publicados",        userPosts.length],
      ["Siguiendo",               followingCount],
      ["Seguidores",              followersCount],
      ["Likes recibidos",         likesReceived],
      ["Comentarios recibidos",   commentsCount],
      ["XP total",                totalXP],
      ["Nivel",                   `${level} — ${lvlName}`],
      ["Torneos inscripto",       tournamentsJoined],
      ["Torneos creados",         tournamentsCreated],
    ];
    el("statsTable").innerHTML = rows.map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join("");
  }

  if (el("arcadeStatsTable")) {
    const arcadeRows = [
      ["Nivel del arcade", maxLevel],
      ["Snake",            maxLevel>=2?"✓ Superado":"Pendiente"],
      ["Pong",             maxLevel>=3?"✓ Superado":maxLevel>=2?"Pendiente":"🔒 Bloqueado"],
      ["Breakout",         maxLevel>=4?"✓ Superado":maxLevel>=3?"Pendiente":"🔒 Bloqueado"],
      ["Asteroids",        maxLevel>=5?"✓ Superado":maxLevel>=4?"Pendiente":"🔒 Bloqueado"],
      ["Flappy",           maxLevel>=6?"✓ Superado":maxLevel>=5?"Pendiente":"🔒 Bloqueado"],
      ["Tetris",           maxLevel>=7?"✓ Superado":maxLevel>=6?"Pendiente":"🔒 Bloqueado"],
      ["Space Invaders",   maxLevel>=8?"✓ Superado":maxLevel>=7?"Pendiente":"🔒 Bloqueado"],
      ["Dino Runner",      maxLevel>=9?"✓ Superado":maxLevel>=8?"Pendiente":"🔒 Bloqueado"],
    ];
    el("arcadeStatsTable").innerHTML = arcadeRows.map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join("");
  }

  // Arcade section
  if (el("arcadeLevel"))    el("arcadeLevel").textContent    = `Nivel ${maxLevel}`;
  if (el("arcadeLevelDesc")) el("arcadeLevelDesc").textContent = maxLevel>=9?"¡Completaste todos!":"Completá el siguiente juego para avanzar.";

  // ── Sesión actual real ──
  const sessionDevice = el("sessionDevice");
  const sessionDetail = el("sessionDetail");
  if (sessionDevice && sessionDetail) {
    const ua = navigator.userAgent;
    const isMobile  = /Android|iPhone|iPad|iPod/i.test(ua);
    const isTablet  = /iPad|Android(?!.*Mobile)/i.test(ua);
    const browser   = /Chrome/i.test(ua) ? "Chrome" : /Firefox/i.test(ua) ? "Firefox" : /Safari/i.test(ua) ? "Safari" : /Edge/i.test(ua) ? "Edge" : "Navegador";
    const os        = /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : "SO desconocido";
    const device    = isMobile ? (isTablet ? "Tablet" : "Celular") : "Computadora";
    const icon      = isMobile ? (isTablet ? "📱" : "📱") : "💻";
    sessionDevice.textContent = `${device} · ${browser}`;
    sessionDetail.textContent = `${os} · Sesión iniciada: ${new Date(currentUser.created_at ? Date.now() : Date.now()).toLocaleString("es-AR")}`;
    const iconEl = sessionDevice.closest('.session-card')?.querySelector('.session-icon');
    if (iconEl) iconEl.textContent = icon;
  }

  // ── FAQ ──
  if (el("faqList")) {
    el("faqList").innerHTML = FAQ.map((f,i) => `
      <div style="border-bottom:1px solid var(--border-subtle);">
        <div onclick="toggleFaq(${i})" style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;cursor:pointer;user-select:none;">
          <span style="font-family:var(--font-body);font-size:15px;font-weight:600;color:var(--text-primary);">${f.q}</span>
          <span id="faqArrow${i}" style="color:var(--text-muted);font-size:18px;transition:transform 0.2s;">›</span>
        </div>
        <div id="faqAnswer${i}" style="display:none;padding:0 0 14px;font-family:var(--font-mono);font-size:13px;color:var(--text-secondary);line-height:1.6;">${f.a}</div>
      </div>`).join("");
  }
  loadNotifPrefs();
  initAppearancePrefs();
}

// ─────────────────────────────────────────
// NAVEGACIÓN
// ─────────────────────────────────────────
function showSection(id) {
  document.querySelectorAll(".settings-section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".settings-nav-item").forEach(item => item.classList.remove("active"));
  const sec = el("section-"+id); if (sec) sec.classList.add("active");
  event.currentTarget.classList.add("active");
  window.scrollTo({top:0, behavior:"smooth"});
}

// ─────────────────────────────────────────
// GUARDAR PERFIL
// ─────────────────────────────────────────
async function saveProfile() {
  const bio   = el("sBio").value.trim();
  const games = [el("sGame1").value.trim(), el("sGame2").value.trim(), el("sGame3").value.trim()].filter(Boolean);
  try {
    await sbUpdateProfile(currentUser.id, { bio, games });
    currentUser = { ...currentUser, bio, games };
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    showToast("✓ Perfil actualizado.");
  } catch(e) { showToast("⚠ Error: " + e.message, true); }
}

// ─────────────────────────────────────────
// GUARDAR CUENTA (email)
// ─────────────────────────────────────────
async function saveAccount() {
  const email = el("sEmail").value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast("⚠ Email inválido.", true); return; }
  try {
    // Supabase auth email update
    const { error } = await sb.auth.updateUser({ email });
    if (error) throw error;
    currentUser = { ...currentUser, email };
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    showToast("✓ Email actualizado. Revisá tu bandeja para confirmar.");
  } catch(e) { showToast("⚠ " + e.message, true); }
}

// ─────────────────────────────────────────
// CAMBIAR CONTRASEÑA
// ─────────────────────────────────────────
async function changePassword() {
  const newPass     = el("sNewPass").value;
  const confirmPass = el("sConfirmPass").value;
  if (newPass.length < 6)        { showToast("⚠ Mínimo 6 caracteres.", true); return; }
  if (newPass !== confirmPass)   { showToast("⚠ Las contraseñas no coinciden.", true); return; }
  try {
    const { error } = await sb.auth.updateUser({ password: newPass });
    if (error) throw error;
    el("sNewPass").value = ""; el("sConfirmPass").value = "";
    showToast("✓ Contraseña actualizada.");
  } catch(e) { showToast("⚠ " + e.message, true); }
}

// ─────────────────────────────────────────
// GUARDAR PRIVACIDAD
// ─────────────────────────────────────────
function savePrivacy() {
  const prefs = {
    publicProfile: el("tPublicProfile")?.checked,
    showEmail:     el("tShowEmail")?.checked,
    showActivity:  el("tShowActivity")?.checked,
    whoCanFollow:  el("sWhoCanFollow")?.value,
    whoCanComment: el("sWhoCanComment")?.value,
    whoDM:         el("sWhoDM")?.value,
  };
  localStorage.setItem("privacyPrefs", JSON.stringify(prefs));
  showToast("✓ Privacidad guardada.");
}

// ─────────────────────────────────────────
// ARCADE — resetear progreso
// ─────────────────────────────────────────
async function resetArcade() {
  if (!confirm("¿Reiniciar el progreso del arcade? Volvés al nivel 1.")) return;
  try {
    localStorage.setItem("maxLevel","1");
    await sbUpdateProfile(currentUser.id, { max_level: 1 });
    currentUser = { ...currentUser, max_level: 1 };
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    showToast("✓ Progreso del arcade reiniciado.");
    await init();
  } catch(e) { showToast("⚠ " + e.message, true); }
}

// ─────────────────────────────────────────
// ELIMINAR CUENTA
// ─────────────────────────────────────────
async function deleteAccount() {
  if (!confirm("⚠ Esta acción es PERMANENTE. ¿Eliminar tu cuenta?")) return;
  if (!confirm("Última oportunidad. Se borrarán todos tus datos.")) return;
  try {
    // Borrar perfil — el cascade borrará posts, likes, comments, follows
    await sb.from('profiles').delete().eq('id', currentUser.id);
    await sb.auth.signOut();
    localStorage.clear();
    window.location.href = "index.html";
  } catch(e) { showToast("⚠ " + e.message, true); }
}

// ─────────────────────────────────────────
// APARIENCIA — funcional
// ─────────────────────────────────────────
function selectTheme(card, theme) {
  document.querySelectorAll(".theme-card").forEach(c => c.classList.remove("active"));
  card.classList.add("active");
  document.body.classList.remove("light-mode");
  if (theme === "light" || theme === "midnight") document.body.classList.add("light-mode");
  localStorage.setItem("theme", theme);
  showToast(`✓ Tema "${card.querySelector(".theme-name").textContent}" aplicado.`);
}

function selectAccent(chip, color) {
  document.querySelectorAll(".color-chip").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  document.documentElement.style.setProperty("--cyan", color);
  document.documentElement.style.setProperty("--cyan-dim", color);
  localStorage.setItem("accentColor", color);
  showToast("✓ Color de acento aplicado.");
}

function initAppearancePrefs() {
  const theme    = localStorage.getItem("theme");
  const accent   = localStorage.getItem("accentColor");
  const fontSize = localStorage.getItem("fontSize") || "md";
  const scanline = localStorage.getItem("scanline") !== "false";
  const anims    = localStorage.getItem("animations") !== "false";
  const glow     = localStorage.getItem("glow") !== "false";

  // Marcar tema activo
  document.querySelectorAll(".theme-card").forEach(c => {
    const t = c.getAttribute("onclick")?.match(/'([^']+)'\)$/)?.[1];
    if (t === theme) { c.classList.add("active"); }
  });

  // Marcar color activo
  if (accent) {
    document.querySelectorAll(".color-chip").forEach(c => {
      if (c.getAttribute("onclick")?.includes(accent)) c.classList.add("active");
    });
  }

  // Setear toggles y selects
  const setCheck = (id, val) => { const el2 = el(id); if (el2) el2.checked = val; };
  const setVal   = (id, val) => { const el2 = el(id); if (el2) el2.value   = val; };
  setCheck("tScanline", scanline); setCheck("tAnimations", anims); setCheck("tGlow", glow);
  setVal("sFontSize", fontSize);

  // Listeners
  const on = (id, fn) => { const e = el(id); if (e) e.addEventListener("change", fn); };
  on("tScanline",   e => { localStorage.setItem("scanline",    e.target.checked); showToast(e.target.checked?"✓ Scanline activado.":"✓ Scanline desactivado."); });
  on("tAnimations", e => { localStorage.setItem("animations",  e.target.checked); document.body.classList.toggle("reduce-motion",!e.target.checked); showToast(e.target.checked?"✓ Animaciones activadas.":"✓ Animaciones desactivadas."); });
  on("tGlow",       e => { localStorage.setItem("glow",        e.target.checked); showToast(e.target.checked?"✓ Glow activado.":"✓ Glow desactivado."); });
  on("sFontSize",   e => {
    localStorage.setItem("fontSize", e.target.value);
    const sizes = { sm:"13px", md:"15px", lg:"17px" };
    document.documentElement.style.setProperty("--font-size-body", sizes[e.target.value]||"15px");
    showToast("✓ Tamaño actualizado.");
  });
}

// ─────────────────────────────────────────
// NOTIFICACIONES — guardar/cargar prefs
// ─────────────────────────────────────────
function saveNotifPrefs() {
  const prefs = {
    follow:  el("nFollow")?.checked  ?? true,
    like:    el("nLike")?.checked    ?? true,
    comment: el("nComment")?.checked ?? true,
    message: el("nMessage")?.checked ?? true,
    mention: el("nMention")?.checked ?? true,
    ach:     el("nAch")?.checked     ?? true,
    level:   el("nLevel")?.checked   ?? true,
    sound:   el("nSounds")?.checked  ?? false,
  };
  localStorage.setItem("notifPrefs", JSON.stringify(prefs));
  showToast("✓ Preferencias de notificaciones guardadas.");
}

function loadNotifPrefs() {
  const prefs = JSON.parse(localStorage.getItem("notifPrefs") || "{}");
  const set = (id, val, def) => { const e = el(id); if (e) e.checked = val ?? def; };
  set("nFollow",  prefs.follow,  true);
  set("nLike",    prefs.like,    true);
  set("nComment", prefs.comment, true);
  set("nMessage", prefs.message, true);
  set("nMention", prefs.mention, true);
  set("nAch",     prefs.ach,     true);
  set("nLevel",   prefs.level,   true);
  set("nSounds",  prefs.sound,   false);
}
// ─────────────────────────────────────────
function toggleFaq(i) {
  const answer = el("faqAnswer"+i);
  const arrow  = el("faqArrow"+i);
  const open   = answer.style.display !== "none";
  answer.style.display = open ? "none" : "block";
  arrow.style.transform = open ? "" : "rotate(90deg)";
}

// ─────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────
async function confirmLogout() {
  if (confirm("¿Cerrar sesión?")) {
    localStorage.removeItem("currentUser");
    try { await sb.auth.signOut(); } catch(e) {}
    window.location.href = "index.html";
  }
}

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────
let toastTimeout;
function showToast(msg, isError=false) {
  const t = el("toast");
  if (!t) return;
  t.textContent   = msg;
  t.style.borderColor = isError ? "var(--pink)" : "var(--cyan)";
  t.style.color       = isError ? "var(--pink)" : "var(--cyan)";
  t.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove("show"), 2800);
}

init();