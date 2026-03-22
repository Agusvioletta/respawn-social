// tournaments.js — Respawn Social v2

const currentUser     = JSON.parse(localStorage.getItem("currentUser"));
const currentUsername = currentUser ? currentUser.username : null;
if (!currentUser) window.location.href = "index.html";

const GAME_ICONS = {"valorant":"🔫","minecraft":"⛏","league of legends":"⚔","fortnite":"🏗","apex":"🎯","cs2":"💣","overwatch":"🎮","rocket league":"🚗","respawn arcade":"🕹","default":"🎮"};

function el(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

// ─────────────────────────────────────────
// DATA — Torneos de ejemplo + persistencia
// ─────────────────────────────────────────
function getSeedTournaments() {
  return [
    { id:"t1", name:"Respawn Open Cup", game:"Valorant",    format:"5v5",          maxPlayers:16, players:["user1","user2","user3","user4"],         prize:"500 XP + Badge Campeón", date:"2026-03-20", status:"live",     desc:"El primer torneo oficial de Respawn Social. Todos bienvenidos.",   creator:"respawn",  createdAt:Date.now()-100000 },
    { id:"t2", name:"Minecraft Build Wars", game:"Minecraft", format:"Free for All", maxPlayers:32, players:["user3","user5"],                         prize:"300 XP",                 date:"2026-03-25", status:"upcoming", desc:"Construí el mejor edificio en 30 minutos. El chat vota.",         creator:"respawn",  createdAt:Date.now()-80000  },
    { id:"t3", name:"1v1 LoL Challenge",  game:"League of Legends", format:"1v1",  maxPlayers:8,  players:["user2","user4","user6"],                   prize:"200 XP",                 date:"2026-03-28", status:"upcoming", desc:"Showmatch 1v1 mid lane, sin JG. Formato suizo.",                  creator:"respawn",  createdAt:Date.now()-60000  },
    { id:"t4", name:"Apex Royale #1",     game:"Apex",       format:"Battle Royale", maxPlayers:64, players:Array(20).fill(0).map((_,i)=>`u${i}`),    prize:"1000 XP + Título Apex King", date:"2026-03-15", status:"finished", desc:"El torneo de Battle Royale más grande de Respawn.",          creator:"respawn",  createdAt:Date.now()-200000 },
    { id:"t5", name:"CS2 1v1 Aim Duel",  game:"CS2",        format:"1v1",          maxPlayers:16, players:["user1","user7","user8","user9","user10"],  prize:"250 XP",                 date:"2026-04-01", status:"upcoming", desc:"Pistola única, headshot only. Primer a 10.",                     creator:"respawn",  createdAt:Date.now()-40000  },
    { id:"t6", name:"Arcade Masters",    game:"Respawn Arcade", format:"Free for All", maxPlayers:16, players:["user2","user5","user8"],               prize:"150 XP + Badge Arcade",  date:"2026-03-10", status:"finished", desc:"Máximo puntaje combinado en Snake + Pong + Breakout.",          creator:"respawn",  createdAt:Date.now()-300000 },
  ];
}

function getTournaments() {
  const saved   = JSON.parse(localStorage.getItem("tournaments")) || [];
  const seeded  = getSeedTournaments();
  // Merge: seeds primero, luego los creados por usuarios (que tienen IDs distintos)
  const seedIds = new Set(seeded.map(t=>t.id));
  const userCreated = saved.filter(t=>!seedIds.has(t.id));
  return [...seeded, ...userCreated];
}

function saveUserTournaments(t) {
  const saved   = JSON.parse(localStorage.getItem("tournaments")) || [];
  const seedIds = new Set(getSeedTournaments().map(x=>x.id));
  const userTs  = saved.filter(x=>!seedIds.has(x.id));
  userTs.push(t);
  localStorage.setItem("tournaments", JSON.stringify(userTs));
}

// ─────────────────────────────────────────
// HERO STATS
// ─────────────────────────────────────────
function renderHeroStats() {
  const ts      = getTournaments();
  const active  = ts.filter(t=>t.status==="live").length;
  const total   = ts.length;
  const players = new Set(ts.flatMap(t=>t.players||[])).size;

  el("heroStats").innerHTML = [
    ["🔴", active, "En vivo"],
    ["🏆", total,  "Torneos"],
    ["👾", players,"Competidores"],
  ].map(([icon,num,lbl]) => `
    <div class="hero-stat">
      <span class="hero-stat-num">${icon} ${num}</span>
      <span class="hero-stat-label">${lbl}</span>
    </div>`).join("");
}

// ─────────────────────────────────────────
// BUILD TOURNAMENT CARD
// ─────────────────────────────────────────
function buildCard(t) {
  const icon    = GAME_ICONS[t.game.toLowerCase()] || GAME_ICONS.default;
  const players = t.players || [];
  const pct     = Math.min(100, Math.round(players.length / t.maxPlayers * 100));
  const full    = players.length >= t.maxPlayers;
  const joined  = players.includes(currentUsername);
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];

  const statusLabels = {live:"🔴 EN VIVO", upcoming:"⏳ PRÓXIMO", finished:"✅ FINALIZADO"};
  const statusClass  = t.status;

  // Avatares de los 4 primeros jugadores reales
  const realPlayers = allUsers.filter(u => players.includes(u.username)).slice(0,4);
  const avatarsHTML = realPlayers.map(u =>
    `<img src="${u.avatar}" class="t-card-avatar" style="image-rendering:pixelated;">`
  ).join("") + (players.length > 4 ? `<div class="t-card-more">+${players.length-4}</div>` : "");

  let actionBtn = "";
  if (t.status === "live") {
    // Torneo en curso: si ya estás jugás, si no sos espectador
    actionBtn = joined
      ? `<button class="btn-join-tournament" style="background:rgba(255,79,123,0.15);color:var(--pink);border:1px solid rgba(255,79,123,0.4);cursor:default;" disabled>⚔ EN JUEGO</button>`
      : `<button class="btn-watch" onclick="watchTournament('${t.id}')">👁 ESPECTEAR</button>`;
  } else if (t.status === "upcoming") {
    actionBtn = joined
      ? `<button class="btn-join-tournament" disabled style="background:rgba(0,255,247,0.1);color:var(--cyan);border:1px solid var(--cyan);cursor:default;">✓ INSCRIPTO</button>`
      : full
        ? `<button class="btn-join-tournament" disabled>CUPOS LLENOS</button>`
        : `<button class="btn-join-tournament" onclick="joinTournament('${t.id}')">INSCRIBIRME</button>`;
  } else {
    // Finalizado
    actionBtn = `<button class="btn-watch" onclick="watchTournament('${t.id}')">📊 VER RESULTADOS</button>`;
  }

  return `
    <div class="t-card">
      <div class="t-card-header">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px;">
          <div class="t-card-status ${statusClass}">${statusLabels[t.status]||t.status}</div>
          <div class="t-card-prize" style="position:static;text-align:right;flex-shrink:0;">
            <span class="t-card-prize-num">${t.prize||"—"}</span>
            <span class="t-card-prize-label" style="display:block;">PREMIO</span>
          </div>
        </div>
        <div class="t-card-game">${icon} ${esc(t.game)}</div>
        <div class="t-card-name">${esc(t.name)}</div>
      </div>
      <div class="t-card-body">
        <div class="t-card-meta">
          <div class="t-card-meta-item"><span class="t-card-meta-label">Formato</span><span class="t-card-meta-value">${esc(t.format)}</span></div>
          <div class="t-card-meta-item"><span class="t-card-meta-label">Fecha</span><span class="t-card-meta-value">${t.date||"—"}</span></div>
        </div>
        <div class="t-card-players">
          <div class="t-card-players-label">Participantes</div>
          <div class="t-card-players-bar"><div class="t-card-players-fill" style="width:${pct}%"></div></div>
          <div class="t-card-players-count">${players.length} / ${t.maxPlayers} jugadores</div>
        </div>
        ${avatarsHTML ? `<div class="t-card-avatars">${avatarsHTML}</div>` : ""}
        ${actionBtn}
      </div>
    </div>`;
}

// ─────────────────────────────────────────
// RENDER GRIDS
// ─────────────────────────────────────────
function renderGrid(status, containerId) {
  const ts      = getTournaments().filter(t=>t.status===status);
  const container = el(containerId);
  if (!ts.length) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;font-family:var(--font-mono);font-size:13px;color:var(--text-muted);">Sin torneos ${status==="live"?"en vivo":status==="upcoming"?"próximos":"finalizados"} por ahora.</div>`;
    return;
  }
  container.innerHTML = ts.map(buildCard).join("");
}

function renderMyTournaments() {
  const ts        = getTournaments().filter(t => (t.players||[]).includes(currentUsername) || t.creator===currentUsername);
  const container = el("myTournamentsGrid");

  if (!ts.length) {
    container.innerHTML = `<div style="text-align:center;padding:48px;font-family:var(--font-mono);font-size:13px;color:var(--text-muted);">No estás inscripto en ningún torneo todavía.<br><span style="cursor:pointer;color:var(--cyan);" onclick="switchTab('proximos')">Explorá los próximos torneos →</span></div>`;
    return;
  }

  const resultMap = { live:"pending", upcoming:"pending", finished: null };
  container.innerHTML = ts.map(t => {
    const icon = GAME_ICONS[t.game.toLowerCase()] || GAME_ICONS.default;
    const isCreator = t.creator === currentUsername;
    // Simular resultado para torneos finalizados
    const result = t.status==="finished" ? (Math.random()>0.5?"win":"loss") : "pending";
    const resultText = t.status==="finished" ? (result==="win"?"🏆 GANADO":"💀 ELIMINADO") : (t.status==="live"?"⚔ EN JUEGO":"⏳ PENDIENTE");
    const resultClass = t.status==="finished" ? result : "pending";

    return `
      <div class="my-t-card">
        <span class="my-t-icon">${icon}</span>
        <div class="my-t-info">
          <div class="my-t-name">${esc(t.name)} ${isCreator?`<span style="font-size:10px;color:var(--purple);background:rgba(192,132,252,0.1);border:1px solid rgba(192,132,252,0.2);border-radius:20px;padding:1px 7px;margin-left:4px;">CREADOR</span>`:""}</div>
          <div class="my-t-meta">${icon} ${esc(t.game)} · ${esc(t.format)} · ${(t.players||[]).length}/${t.maxPlayers} jugadores · ${t.date||"—"}</div>
        </div>
        <div class="my-t-result ${resultClass}">${resultText}</div>
      </div>`;
  }).join("");
}

// ─────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────
window.joinTournament = function(id) {
  // Buscar en user-created primero
  const saved   = JSON.parse(localStorage.getItem("tournaments")) || [];
  const seeded  = getSeedTournaments();
  const seedIds = new Set(seeded.map(t=>t.id));

  // Si es seed, lo convertimos en user-editable
  let all = getTournaments();
  let t   = all.find(x=>x.id===id);
  if (!t) return;

  if ((t.players||[]).includes(currentUsername)) { alert("Ya estás inscripto en este torneo."); return; }
  if ((t.players||[]).length >= t.maxPlayers)    { alert("Los cupos están llenos."); return; }

  t.players = [...(t.players||[]), currentUsername];

  // Guardar en localStorage (sea seed o user-created)
  const allSaved = JSON.parse(localStorage.getItem("tournaments")) || [];
  const exists   = allSaved.findIndex(x=>x.id===id);
  if (exists !== -1) { allSaved[exists] = t; localStorage.setItem("tournaments", JSON.stringify(allSaved)); }
  else { allSaved.push(t); localStorage.setItem("tournaments", JSON.stringify(allSaved)); }

  showTournamentToast(`✓ ¡Te inscribiste en "${t.name}"!`);
  renderAll();
};

window.watchTournament = function(id) {
  const t = getTournaments().find(x=>x.id===id);
  if (t) showTournamentToast(`📡 Modo espectador para "${t.name}" — próximamente en vivo.`);
};

window.createTournament = function() {
  const name   = el("tName").value.trim();
  const game   = el("tGame").value;
  const format = el("tFormat").value;
  const maxP   = parseInt(el("tMaxPlayers").value);
  const date   = el("tDate").value;
  const prize  = el("tPrize").value.trim();
  const desc   = el("tDesc").value.trim();
  const errEl  = el("tError");

  if (!name)  { errEl.textContent="⚠ Ingresá un nombre."; return; }
  if (!game)  { errEl.textContent="⚠ Seleccioná un juego."; return; }
  if (!date)  { errEl.textContent="⚠ Seleccioná una fecha."; return; }
  errEl.textContent = "";

  const newT = {
    id:         "user-" + Date.now(),
    name, game, format, maxPlayers:maxP, prize, date, desc,
    players:    [currentUsername],
    status:     "upcoming",
    creator:    currentUsername,
    createdAt:  Date.now(),
  };

  saveUserTournaments(newT);
  el("tName").value=""; el("tGame").value=""; el("tDate").value=""; el("tPrize").value=""; el("tDesc").value="";
  showTournamentToast(`✓ Torneo "${newT.name}" creado correctamente.`);
  switchTab("proximos");
  renderAll();
};

// ─────────────────────────────────────────
// TABS
// ─────────────────────────────────────────
window.switchTab = function(id) {
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
  const tabEl   = el("tab-"+id);
  const panelEl = el("panel-"+id);
  if (tabEl)   tabEl.classList.add("active");
  if (panelEl) panelEl.classList.add("active");
};

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────
function showTournamentToast(msg) {
  let t = el("tToast");
  if (!t) {
    t = document.createElement("div");
    t.id = "tToast";
    t.style.cssText = "position:fixed;bottom:24px;right:24px;background:var(--bg-card);border:1px solid var(--pink);border-radius:var(--radius-md);padding:12px 20px;font-family:var(--font-mono);font-size:13px;color:var(--pink);z-index:999;box-shadow:0 8px 32px rgba(0,0,0,0.6);transform:translateY(80px);opacity:0;transition:all 0.3s ease;pointer-events:none;";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.transform = "translateY(0)"; t.style.opacity = "1";
  clearTimeout(window._tToastTimeout);
  window._tToastTimeout = setTimeout(()=>{ t.style.transform="translateY(80px)"; t.style.opacity="0"; }, 2800);
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
function renderAll() {
  renderHeroStats();
  renderGrid("live",     "activeGrid");
  renderGrid("upcoming", "upcomingGrid");
  renderGrid("finished", "finishedGrid");
  renderMyTournaments();
}

renderAll();
