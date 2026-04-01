// messages.js — Respawn Social v2 — Supabase

const EMOJIS = ["😀","😂","🥰","😎","🤔","😤","🔥","💜","🎮","🏆","⚡","👾","🐍","🏓","🧱","☄","🐦","🟪","✨","💀","🤙","👋","🎯","💬","❤️","🙌"];

function el(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

let currentUser  = null;
let activeConvId = null;
let realtimeCh   = null;
let allProfiles  = [];
let followingIds = [];  // IDs de usuarios que sigo

// ── Init ──
async function init() {
  currentUser = await sbRequireAuth();
  if (!currentUser) return;
  allProfiles = await sbGetAllProfiles();

  // Cargar follows para control de privacidad
  const followingRows = await sbGetFollowing(currentUser.id);
  followingIds = followingRows.map(u => u.id);

  // Si viene de un perfil con ?open=userId, abrir esa conv
  const params = new URLSearchParams(window.location.search);
  const openId = params.get("open");

  await renderConvList();

  if (openId) openConv(openId);
}

// ─────────────────────────────────────────
// PRIVACIDAD — puede este usuario escribirme?
// ─────────────────────────────────────────
function canReceiveDM(fromUserId) {
  const prefs   = JSON.parse(localStorage.getItem("privacyPrefs") || "{}");
  const setting = prefs.whoDM || "all";
  if (setting === "none")      return false;
  if (setting === "following") return followingIds.includes(fromUserId);
  return true; // "all"
}

// ─────────────────────────────────────────
// LISTA DE CONVERSACIONES
// Solo muestra conversaciones con mensajes reales
// ─────────────────────────────────────────
async function renderConvList(filter = "") {
  const list = el("convList");
  list.innerHTML = `<div style="padding:16px;font-family:var(--font-mono);font-size:12px;color:var(--text-muted);">Cargando...</div>`;

  // Traer todos los mensajes del usuario actual desde Supabase
  const { data: allMsgs } = await sb.from('messages')
    .select('*')
    .or(`from_id.eq.${currentUser.id},to_id.eq.${currentUser.id}`)
    .order('created_at', { ascending: false });

  if (!allMsgs || !allMsgs.length) {
    list.innerHTML = `<div style="padding:32px 16px;text-align:center;font-family:var(--font-mono);font-size:12px;color:var(--text-muted);">Sin conversaciones.<br>Entrá al perfil de alguien para escribirle.</div>`;
    return;
  }

  // Agrupar por conversación (el otro usuario)
  const convMap = {};
  allMsgs.forEach(m => {
    const otherId = m.from_id === currentUser.id ? m.to_id : m.from_id;
    if (!convMap[otherId] || new Date(m.created_at) > new Date(convMap[otherId].created_at)) {
      convMap[otherId] = m;
    }
  });

  // Filtrar por búsqueda si hay
  let convEntries = Object.entries(convMap);
  if (filter) {
    convEntries = convEntries.filter(([uid]) => {
      const u = allProfiles.find(p => p.id === uid);
      return u && u.username.toLowerCase().includes(filter.toLowerCase());
    });
  }

  if (!convEntries.length) {
    list.innerHTML = `<div style="padding:24px;text-align:center;font-family:var(--font-mono);font-size:12px;color:var(--text-muted);">Sin resultados.</div>`;
    return;
  }

  // Ordenar por más reciente
  convEntries.sort((a,b) => new Date(b[1].created_at) - new Date(a[1].created_at));

  list.innerHTML = convEntries.map(([otherId, lastMsg]) => {
    const user     = allProfiles.find(u => u.id === otherId);
    if (!user) return "";
    const isActive = activeConvId === otherId;
    const isMine   = lastMsg.from_id === currentUser.id;
    const preview  = (isMine ? "Vos: " : "") + lastMsg.content.slice(0, 30) + (lastMsg.content.length > 30 ? "..." : "");
    const time     = new Date(lastMsg.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
    return `
      <div class="conv-item ${isActive?"active":""}" onclick="openConv('${otherId}')">
        <div class="conv-av-wrap">
          <img src="${user.avatar||'avatar1.png'}" class="conv-av" alt="">
        </div>
        <div class="conv-info">
          <div class="conv-item-name">@${esc(user.username)}</div>
          <div class="conv-item-last">${esc(preview)}</div>
        </div>
        <div class="conv-meta">
          <span class="conv-time">${time}</span>
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

  await renderConvList(el("convSearchInput")?.value || "");

  // Chequear si puedo enviarle mensajes (privacidad del destinatario)
  // Solo bloquear si YO no lo sigo y él tiene restricción — por ahora usamos nuestra propia config
  const myPrivPrefs = JSON.parse(localStorage.getItem("privacyPrefs") || "{}");
  const canSend = myPrivPrefs.whoDM === "none" ? false : true;

  const panel = el("chatPanel");
  // En móvil: mostrar chat y ocultar lista
  const messagesPage = document.querySelector('.messages-page');
  if (messagesPage) messagesPage.classList.add('chat-open');

  panel.innerHTML = `
    <button class="mobile-back-btn" onclick="mobileBackToList()">← Volver</button>
    <div class="chat-header">
      <img src="${user.avatar||'avatar1.png'}" class="chat-header-av" alt="" style="cursor:pointer;" onclick="window.location.href='profile.html?user=${esc(user.username)}'">
      <div class="chat-header-info" style="cursor:pointer;" onclick="window.location.href='profile.html?user=${esc(user.username)}'">
        <div class="chat-header-name">@${esc(user.username)}</div>
        <div class="chat-header-status" style="color:var(--text-muted);font-size:11px;">Ver perfil →</div>
      </div>
      <div class="chat-header-actions">
        <div class="chat-action-btn" title="Invitar a jugar" onclick="sendGameInvite('${userId}')">🎮</div>
      </div>
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-input-area">
      <div class="chat-input-wrap" style="position:relative;">
        <textarea class="chat-input" id="chatInput" placeholder="Escribí un mensaje... (Enter para enviar)" rows="1" maxlength="500" ${!canSend?"disabled":""}></textarea>
        <button class="chat-emoji-btn" onclick="toggleEmojiPicker()" ${!canSend?"disabled":""}>😊</button>
        <div class="emoji-picker" id="emojiPicker">
          ${EMOJIS.map(e=>`<button class="emoji-pick-btn" onclick="insertEmoji('${e}')">${e}</button>`).join("")}
        </div>
      </div>
      <button class="chat-send-btn" onclick="sendMessage('${userId}')" ${!canSend?"disabled":""}>➤</button>
    </div>
    ${!canSend ? `<div style="text-align:center;font-family:var(--font-mono);font-size:12px;color:var(--text-muted);padding:8px;">Tus ajustes de privacidad no permiten enviar mensajes.</div>` : ""}`;

  await renderMessages(userId);

  const chatInput = el("chatInput");
  if (chatInput) {
    chatInput.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(userId); }
    });
  }

  // Realtime — suscripción Supabase
  if (realtimeCh) sbUnsubscribe(realtimeCh);
  realtimeCh = sbSubscribeMessages(currentUser.id, userId, async () => {
    await renderMessages(userId);
    await renderConvList(el("convSearchInput")?.value || "");
  });

  // Polling cada 3 segundos como fallback garantizado
  if (window._msgPollInterval) clearInterval(window._msgPollInterval);
  let lastMsgCount = 0;
  window._msgPollInterval = setInterval(async () => {
    // Solo pollear si el chat sigue abierto con este usuario
    if (activeConvId !== userId) { clearInterval(window._msgPollInterval); return; }
    const msgs = await sbGetMessages(currentUser.id, userId);
    if (msgs.length !== lastMsgCount) {
      lastMsgCount = msgs.length;
      const box = el("chatMessages");
      if (!box) return;
      const user2 = allProfiles.find(u => u.id === userId);
      let grouped = [];
      msgs.forEach((m, i) => {
        const prev = msgs[i-1];
        const diffMs = prev ? new Date(m.created_at) - new Date(prev.created_at) : Infinity;
        if (prev && prev.from_id === m.from_id && diffMs < 60000) grouped[grouped.length-1].msgs.push(m);
        else grouped.push({ from_id: m.from_id, msgs: [m] });
      });
      box.innerHTML = `<div class="msg-system">Inicio de la conversación</div>` +
        grouped.map(g => {
          const mine = g.from_id === currentUser.id;
          const avSrc = mine ? (currentUser.avatar||'avatar1.png') : (user2?.avatar||'avatar1.png');
          const bubblesHTML = g.msgs.map(m => `<div class="msg-bubble ${mine?"mine":"theirs"}">${esc(m.content)}</div>`).join("");
          const lastTs = new Date(g.msgs[g.msgs.length-1].created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
          return `<div class="msg-group ${mine?"mine":""}">
            <img src="${avSrc}" class="msg-av" alt="">
            <div class="msg-bubbles">${bubblesHTML}<div class="msg-meta">${lastTs}${mine?' <span style="color:var(--cyan);font-size:10px;">✓</span>':''}</div></div>
          </div>`;
        }).join("");
      box.scrollTop = box.scrollHeight;
    }
  }, 3000);

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

  let grouped = [];
  msgs.forEach((m, i) => {
    const prev  = msgs[i-1];
    const diffMs = prev ? new Date(m.created_at) - new Date(prev.created_at) : Infinity;
    if (prev && prev.from_id === m.from_id && diffMs < 60000) {
      grouped[grouped.length-1].msgs.push(m);
    } else {
      grouped.push({ from_id: m.from_id, msgs: [m] });
    }
  });

  box.innerHTML = `<div class="msg-system">Inicio de la conversación</div>` +
    grouped.map(g => {
      const mine       = g.from_id === currentUser.id;
      const avSrc      = mine ? (currentUser.avatar||'avatar1.png') : (user?.avatar||'avatar1.png');
      const bubblesHTML = g.msgs.map(m => `<div class="msg-bubble ${mine?"mine":"theirs"}">${esc(m.content)}</div>`).join("");
      const lastTs     = new Date(g.msgs[g.msgs.length-1].created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
      return `
        <div class="msg-group ${mine?"mine":""}">
          <img src="${avSrc}" class="msg-av" alt="">
          <div class="msg-bubbles">
            ${bubblesHTML}
            <div class="msg-meta">${lastTs}${mine?' <span style="color:var(--cyan);font-size:10px;">✓</span>':''}</div>
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

  // Verificar privacidad del receptor
  const targetProfile = allProfiles.find(u => u.id === toId);
  // (La privacidad del receptor se maneja desde el perfil — si llegaste acá es porque ya tenés la conv abierta)

  try {
    await sbSendMessage(currentUser.id, toId, content);
    input.value = "";
    await renderMessages(toId);
    await renderConvList(el("convSearchInput")?.value || "");
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
// Solo muestra usuarios que podés escribirles (seguidos o todos según config)
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
  const prefs   = JSON.parse(localStorage.getItem("privacyPrefs") || "{}");
  const setting = prefs.whoDM || "all";

  // Filtrar según privacidad propia
  let candidates = allProfiles.filter(u => u.id !== currentUser.id);
  if (setting === "following") candidates = candidates.filter(u => followingIds.includes(u.id));
  if (filter) candidates = candidates.filter(u => u.username.toLowerCase().includes(filter.toLowerCase()));
  candidates = candidates.slice(0, 10);

  el("newConvUserList").innerHTML = !candidates.length
    ? `<div style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);padding:8px;">${setting==="following"?"Solo podés escribirle a tus seguidos.":"Sin usuarios encontrados."}</div>`
    : candidates.map(u => `
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

function mobileBackToList() {
  const messagesPage = document.querySelector('.messages-page');
  if (messagesPage) messagesPage.classList.remove('chat-open');
  activeConvId = null;
  if (realtimeCh) { sbUnsubscribe(realtimeCh); realtimeCh = null; }
  if (window._msgPollInterval) { clearInterval(window._msgPollInterval); window._msgPollInterval = null; }
}

init();