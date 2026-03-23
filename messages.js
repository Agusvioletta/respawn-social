// messages.js — Respawn Social v2 — Supabase

const EMOJIS = ["😀","😂","🥰","😎","🤔","😤","🔥","💜","🎮","🏆","⚡","👾","🐍","🏓","🧱","☄","🐦","🟪","✨","💀","🤙","👋","🎯","💬","❤️","🙌"];

function el(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

let currentUser  = null;
let activeConvId = null;   // user_id del otro usuario
let realtimeCh   = null;   // canal de realtime activo
let allProfiles  = [];

// ── Init ──
async function init() {
  currentUser = await sbRequireAuth();
  if (!currentUser) return;
  allProfiles = await sbGetAllProfiles();
  await renderConvList();
}

// ─────────────────────────────────────────
// LISTA DE CONVERSACIONES
// ─────────────────────────────────────────
async function renderConvList(filter = "") {
  const list = el("convList");
  list.innerHTML = `<div style="padding:16px;font-family:var(--font-mono);font-size:12px;color:var(--text-muted);">Cargando...</div>`;

  // Buscar todos los perfiles con quienes hay mensajes
  const others = allProfiles.filter(u => u.id !== currentUser.id);
  const filtered = filter
    ? others.filter(u => u.username.toLowerCase().includes(filter.toLowerCase()))
    : others;

  if (!filtered.length) {
    list.innerHTML = `<div style="padding:24px;text-align:center;font-family:var(--font-mono);font-size:12px;color:var(--text-muted);">Sin usuarios.<br>Hacé click en + para empezar.</div>`;
    return;
  }

  // Cargar último mensaje de cada conversación
  const convsWithLast = await Promise.all(filtered.map(async u => {
    const msgs = await sbGetMessages(currentUser.id, u.id);
    const last  = msgs[msgs.length - 1];
    return { user: u, last, count: msgs.length };
  }));

  // Ordenar: con mensajes primero
  convsWithLast.sort((a,b) => {
    if (a.last && b.last) return new Date(b.last.created_at) - new Date(a.last.created_at);
    if (a.last) return -1;
    if (b.last) return 1;
    return a.user.username.localeCompare(b.user.username);
  });

  list.innerHTML = convsWithLast.map(c => {
    const isActive = activeConvId === c.user.id;
    const lastText = c.last
      ? (c.last.from_id === currentUser.id ? `Vos: ${c.last.content.slice(0,28)}` : c.last.content.slice(0,28)) + (c.last.content.length > 28 ? "..." : "")
      : "Sin mensajes aún";
    const lastTime = c.last ? new Date(c.last.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}) : "";

    return `
      <div class="conv-item ${isActive?"active":""}" onclick="openConv('${c.user.id}')">
        <div class="conv-av-wrap">
          <img src="${c.user.avatar||'avatar1.png'}" class="conv-av" alt="">
          <div class="conv-online-dot"></div>
        </div>
        <div class="conv-info">
          <div class="conv-item-name">@${esc(c.user.username)}</div>
          <div class="conv-item-last">${esc(lastText)}</div>
        </div>
        <div class="conv-meta">
          ${lastTime ? `<span class="conv-time">${lastTime}</span>` : ""}
        </div>
      </div>`;
  }).join("");
}

// ─────────────────────────────────────────
// ABRIR CONVERSACIÓN
// ─────────────────────────────────────────
async function openConv(userId) {
  activeConvId = userId;
  const user = allProfiles.find(u => u.id === userId);
  if (!user) return;

  // Actualizar lista para marcar activo
  await renderConvList(el("convSearchInput").value);

  const panel = el("chatPanel");
  panel.innerHTML = `
    <div class="chat-header">
      <img src="${user.avatar||'avatar1.png'}" class="chat-header-av" alt="">
      <div class="chat-header-info">
        <div class="chat-header-name">@${esc(user.username)}</div>
        <div class="chat-header-status">● Online</div>
      </div>
      <div class="chat-header-actions">
        <div class="chat-action-btn" title="Ver perfil" onclick="window.location.href='profile.html'">👤</div>
        <div class="chat-action-btn" title="Invitar a jugar" onclick="sendGameInvite('${userId}')">🎮</div>
      </div>
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-input-area">
      <div class="chat-input-wrap" style="position:relative;">
        <textarea class="chat-input" id="chatInput" placeholder="Escribí un mensaje... (Enter para enviar)" rows="1" maxlength="500"></textarea>
        <button class="chat-emoji-btn" onclick="toggleEmojiPicker()">😊</button>
        <div class="emoji-picker" id="emojiPicker">
          ${EMOJIS.map(e=>`<button class="emoji-pick-btn" onclick="insertEmoji('${e}')">${e}</button>`).join("")}
        </div>
      </div>
      <button class="chat-send-btn" onclick="sendMessage('${userId}')">➤</button>
    </div>`;

  await renderMessages(userId);

  // Enter envía
  el("chatInput").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(userId); }
  });

  // Suscribirse a mensajes en tiempo real
  if (realtimeCh) sbUnsubscribe(realtimeCh);
  realtimeCh = sbSubscribeMessages(currentUser.id, userId, async (newMsg) => {
    await renderMessages(userId);
    await renderConvList(el("convSearchInput").value);
  });

  // Cerrar emoji picker al clickear afuera
  document.addEventListener("click", e => {
    const picker = el("emojiPicker");
    if (picker && !picker.contains(e.target) && !e.target.classList.contains("chat-emoji-btn")) {
      picker.classList.remove("open");
    }
  });
}

// ─────────────────────────────────────────
// RENDER MENSAJES
// ─────────────────────────────────────────
async function renderMessages(userId) {
  const msgs = await sbGetMessages(currentUser.id, userId);
  const box  = el("chatMessages");
  if (!box) return;

  const user = allProfiles.find(u => u.id === userId);

  if (!msgs.length) {
    box.innerHTML = `
      <div class="msg-system">Inicio de tu conversación con @${esc(user?.username||"")}</div>
      <div class="msg-system">🔒 Los mensajes son privados</div>`;
    return;
  }

  // Agrupar mensajes consecutivos del mismo emisor
  let grouped = [];
  msgs.forEach((m, i) => {
    const prev = msgs[i-1];
    const diffMs = prev ? new Date(m.created_at) - new Date(prev.created_at) : Infinity;
    if (prev && prev.from_id === m.from_id && diffMs < 60000) {
      grouped[grouped.length-1].msgs.push(m);
    } else {
      grouped.push({ from_id: m.from_id, msgs: [m] });
    }
  });

  box.innerHTML = `<div class="msg-system">Inicio de la conversación</div>` +
    grouped.map(g => {
      const mine  = g.from_id === currentUser.id;
      const avSrc = mine ? (currentUser.avatar||'avatar1.png') : (user?.avatar||'avatar1.png');
      const bubblesHTML = g.msgs.map(m => `<div class="msg-bubble ${mine?"mine":"theirs"}">${esc(m.content)}</div>`).join("");
      const lastTs = new Date(g.msgs[g.msgs.length-1].created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
      return `
        <div class="msg-group ${mine?"mine":""}">
          <img src="${avSrc}" class="msg-av" alt="">
          <div class="msg-bubbles">
            ${bubblesHTML}
            <div class="msg-meta">${lastTs}${mine?' <span class="msg-tick" style="color:var(--cyan);font-size:10px;">✓</span>':''}</div>
          </div>
        </div>`;
    }).join("");

  box.scrollTop = box.scrollHeight;
}

// ─────────────────────────────────────────
// ENVIAR MENSAJE
// ─────────────────────────────────────────
async function sendMessage(toId) {
  const input   = el("chatInput");
  const content = input ? input.value.trim() : "";
  if (!content) return;
  try {
    await sbSendMessage(currentUser.id, toId, content);
    input.value = "";
    await renderMessages(toId);
    await renderConvList(el("convSearchInput").value);
  } catch(e) { console.error(e); }
}

async function sendGameInvite(toId) {
  try {
    await sbSendMessage(currentUser.id, toId, "🎮 Te invito a jugar en el Arcade de Respawn! → gamemap.html");
    await renderMessages(toId);
  } catch(e) { console.error(e); }
}

// ─────────────────────────────────────────
// EMOJI PICKER
// ─────────────────────────────────────────
function toggleEmojiPicker() {
  const p = el("emojiPicker");
  if (p) p.classList.toggle("open");
}
function insertEmoji(e) {
  const input = el("chatInput");
  if (input) { input.value += e; input.focus(); }
}

// ─────────────────────────────────────────
// MODAL NUEVA CONVERSACIÓN
// ─────────────────────────────────────────
function openNewConv() {
  el("newConvModal").classList.add("open");
  el("newConvSearch").value = "";
  renderNewConvUsers("");
}
function closeNewConv() { el("newConvModal").classList.remove("open"); }
el("newConvModal").addEventListener("click", e => { if(e.target===el("newConvModal")) closeNewConv(); });

function filterNewConvUsers(val) { renderNewConvUsers(val); }
function renderNewConvUsers(filter) {
  const others = allProfiles
    .filter(u => u.id !== currentUser.id && (!filter || u.username.toLowerCase().includes(filter.toLowerCase())))
    .slice(0,10);
  el("newConvUserList").innerHTML = !others.length
    ? `<div style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);padding:8px;">Sin usuarios encontrados.</div>`
    : others.map(u => `
        <div class="user-pick" onclick="startNewConv('${u.id}')">
          <img src="${u.avatar||'avatar1.png'}" class="user-pick-av" alt="">
          <div>
            <div class="user-pick-name">@${esc(u.username)}</div>
            <div class="user-pick-bio">${esc(u.bio||"Jugando en Respawn")}</div>
          </div>
        </div>`).join("");
}

function startNewConv(userId) {
  closeNewConv();
  openConv(userId);
}

function filterConvs(val) { renderConvList(val); }

init();