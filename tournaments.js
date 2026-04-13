// tournaments.js — Respawn Social v2 — Supabase

const GAME_ICONS = {"valorant":"🔫","minecraft":"⛏","league of legends":"⚔","fortnite":"🏗","apex":"🎯","cs2":"💣","overwatch":"🎮","rocket league":"🚗","respawn arcade":"🕹","default":"🎮"};

function el(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

let currentUser  = null;
let allProfiles  = [];
let tournaments  = [];

// ── Init ──
async function init() {
  currentUser = await sbRequireAuth();
  if (!currentUser) return;
  allProfiles = await sbGetAllProfiles();
  await renderAll();
}

// ─────────────────────────────────────────
// HERO STATS
// ─────────────────────────────────────────
function renderHeroStats() {
  const active  = tournaments.filter(t => t.status === "live").length;
  const players = new Set(tournaments.flatMap(t => (t.tournament_players||[]).map(p=>p.user_id))).size;
  el("heroStats").innerHTML = [
    ["🔴", active,          "En vivo"],
    ["🏆", tournaments.length, "Torneos"],
    ["👾", players,         "Competidores"],
  ].map(([icon,num,lbl]) => `
    <div class="hero-stat">
      <span class="hero-stat-num">${icon} ${num}</span>
      <span class="hero-stat-label">${lbl}</span>
    </div>`).join("");
}

// ─────────────────────────────────────────
// BUILD CARD
// ─────────────────────────────────────────
function buildCard(t) {
  const icon    = GAME_ICONS[t.game.toLowerCase()] || GAME_ICONS.default;
  const players = t.tournament_players || [];
  const pct     = Math.min(100, Math.round(players.length / t.max_players * 100));
  const full    = players.length >= t.max_players;
  const joined  = players.some(p => p.user_id === currentUser.id);

  const statusLabels = { live:"🔴 EN VIVO", upcoming:"⏳ PRÓXIMO", finished:"✅ FINALIZADO" };

  // Avatares de jugadores reales
  const realPlayers = allProfiles.filter(u => players.some(p => p.user_id === u.id)).slice(0,4);
  const avatarsHTML = realPlayers.map(u =>
    `<img src="${u.avatar||'avatar1.png'}" class="t-card-avatar" style="image-rendering:pixelated;">`
  ).join("") + (players.length > 4 ? `<div class="t-card-more">+${players.length-4}</div>` : "");

  let actionBtn = "";
  if (t.status === "live") {
    actionBtn = joined
      ? `<button class="btn-join-tournament" style="background:rgba(255,79,123,0.15);color:var(--pink);border:1px solid rgba(255,79,123,0.4);cursor:default;" disabled>⚔ EN JUEGO</button>`
      : `<button class="btn-watch" onclick="watchTournament(${t.id})">👁 ESPECTEAR</button>`;
  } else if (t.status === "upcoming") {
    actionBtn = joined
      ? `<button class="btn-join-tournament" disabled style="background:rgba(0,255,247,0.1);color:var(--cyan);border:1px solid var(--cyan);cursor:default;">✓ INSCRIPTO</button>`
      : full
        ? `<button class="btn-join-tournament" disabled>CUPOS LLENOS</button>`
        : `<button class="btn-join-tournament" onclick="joinTournament(${t.id})">INSCRIBIRME</button>`;
  } else {
    actionBtn = `<button class="btn-watch" onclick="watchTournament(${t.id})">📊 VER RESULTADOS</button>`;
  }

  const date = t.date ? new Date(t.date).toLocaleDateString("es-AR") : "—";

  return `
    <div class="t-card">
      <div class="t-card-header">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px;">
          <div class="t-card-status ${t.status}">${statusLabels[t.status]||t.status}</div>
          <div class="t-card-prize" style="text-align:right;flex-shrink:0;">
            <span class="t-card-prize-num">${esc(t.prize||"—")}</span>
            <span class="t-card-prize-label" style="display:block;">PREMIO</span>
          </div>
        </div>
        <div class="t-card-game">${icon} ${esc(t.game)}</div>
        <div class="t-card-name">${esc(t.name)}</div>
      </div>
      <div class="t-card-body">
        <div class="t-card-meta">
          <div class="t-card-meta-item"><span class="t-card-meta-label">Formato</span><span class="t-card-meta-value">${esc(t.format)}</span></div>
          <div class="t-card-meta-item"><span class="t-card-meta-label">Fecha</span><span class="t-card-meta-value">${date}</span></div>
        </div>
        <div class="t-card-players">
          <div class="t-card-players-label">Participantes</div>
          <div class="t-card-players-bar"><div class="t-card-players-fill" style="width:${pct}%"></div></div>
          <div class="t-card-players-count">${players.length} / ${t.max_players} jugadores</div>
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
  const ts = tournaments.filter(t => t.status === status);
  const container = el(containerId);
  if (!ts.length) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;font-family:var(--font-mono);font-size:13px;color:var(--text-muted);">Sin torneos ${status==="live"?"en vivo":status==="upcoming"?"próximos":"finalizados"} por ahora.</div>`;
    return;
  }
  container.innerHTML = ts.map(buildCard).join("");
}

function renderMyTournaments() {
  const mine = tournaments.filter(t =>
    (t.tournament_players||[]).some(p => p.user_id === currentUser.id) || t.creator_id === currentUser.id
  );
  const container = el("myTournamentsGrid");
  if (!mine.length) {
    container.innerHTML = `<div style="text-align:center;padding:48px;font-family:var(--font-mono);font-size:13px;color:var(--text-muted);">No estás inscripto en ningún torneo.<br><span style="cursor:pointer;color:var(--cyan);" onclick="switchTab('proximos')">Explorá los próximos →</span></div>`;
    return;
  }
  container.innerHTML = mine.map(t => {
    const icon      = GAME_ICONS[t.game.toLowerCase()] || GAME_ICONS.default;
    const isCreator = t.creator_id === currentUser.id;
    const resultText = t.status === "live" ? "⚔ EN JUEGO" : t.status === "upcoming" ? "⏳ PENDIENTE" : "✅ FINALIZADO";
    const resultClass = t.status === "live" ? "pending" : t.status === "upcoming" ? "pending" : "win";
    return `
      <div class="my-t-card">
        <span class="my-t-icon">${icon}</span>
        <div class="my-t-info">
          <div class="my-t-name">${esc(t.name)} ${isCreator?`<span style="font-size:10px;color:var(--purple);background:rgba(192,132,252,0.1);border:1px solid rgba(192,132,252,0.2);border-radius:20px;padding:1px 7px;margin-left:4px;">CREADOR</span>`:""}</div>
          <div class="my-t-meta">${icon} ${esc(t.game)} · ${esc(t.format)} · ${(t.tournament_players||[]).length}/${t.max_players} jugadores</div>
        </div>
        <div class="my-t-result ${resultClass}">${resultText}</div>
      </div>`;
  }).join("");
}

// ─────────────────────────────────────────
// ACCIONES
// ─────────────────────────────────────────
window.joinTournament = async function(id) {
  const t = tournaments.find(x => x.id === id);
  if (!t) return;
  if ((t.tournament_players||[]).some(p => p.user_id === currentUser.id)) { alert("Ya estás inscripto."); return; }
  if ((t.tournament_players||[]).length >= t.max_players) { alert("Cupos llenos."); return; }
  try {
    await sbJoinTournament(id, currentUser.id);
    showToast(`✓ ¡Te inscribiste en "${t.name}"!`);
    tournaments = await sbGetTournaments();
    renderAll();
  } catch(e) { showToast("Error al inscribirse: " + e.message); }
};

window.watchTournament = function(id) {
  const t = tournaments.find(x => x.id === id);
  if (t) showToast(`📡 Modo espectador para "${t.name}" — próximamente.`);
};

window.createTournament = async function() {
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

  try {
    await sbCreateTournament(currentUser.id, { name, game, format, maxPlayers:maxP, prize, description:desc, date });
    el("tName").value=""; el("tGame").value=""; el("tDate").value=""; el("tPrize").value=""; el("tDesc").value="";
    showToast(`✓ Torneo "${name}" creado.`);
    tournaments = await sbGetTournaments();
    switchTab("proximos");
    renderAll();
  } catch(e) { errEl.textContent="⚠ " + e.message; }
};

// ─────────────────────────────────────────
// TABS
// ─────────────────────────────────────────
window.switchTab = function(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  const tabEl   = el("tab-"+id);
  const panelEl = el("panel-"+id);
  if (tabEl)   tabEl.classList.add("active");
  if (panelEl) panelEl.classList.add("active");
};

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────
function showToast(msg) {
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
  window._tToastTimeout = setTimeout(() => { t.style.transform="translateY(80px)"; t.style.opacity="0"; }, 2800);
}

// ─────────────────────────────────────────
// RENDER ALL
// ─────────────────────────────────────────
async function renderAll() {
  renderHeroStats();
  renderGrid("live",     "activeGrid");
  renderGrid("upcoming", "upcomingGrid");
  renderGrid("finished", "finishedGrid");
  renderMyTournaments();
}

init();
