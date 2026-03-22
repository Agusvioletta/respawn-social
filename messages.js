// messages.js — Respawn Social v2

const currentUser     = JSON.parse(localStorage.getItem("currentUser"));
const currentUsername = currentUser ? currentUser.username : null;
if (!currentUser) window.location.href = "index.html";

function el(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function now()  { return new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}); }
function convKey(a,b) { return "dm_" + [a,b].sort().join("_"); }

const EMOJIS = ["😀","😂","🥰","😎","🤔","😤","🔥","💜","🎮","🏆","⚡","👾","🐍","🏓","🧱","☄","🐦","🟪","✨","💀","🤙","👋","🎯","💬","❤️","🙌"];

let activeConv = null;

// ─────────────────────────────────────────
// CONVERSATIONS LIST
// ─────────────────────────────────────────
function getConversations() {
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const others   = allUsers.filter(u => u.username !== currentUsername);
  const convs    = [];

  others.forEach(u => {
    const key  = convKey(currentUsername, u.username);
    const msgs = JSON.parse(localStorage.getItem(key)) || [];
    const last = msgs[msgs.length - 1];
    convs.push({ user: u, key, msgs, last });
  });

  // Sort: convs with messages first (by time), then the rest
  return convs.sort((a,b) => {
    if (a.last && b.last) return b.last.ts - a.last.ts;
    if (a.last) return -1;
    if (b.last) return 1;
    return a.user.username.localeCompare(b.user.username);
  });
}

function renderConvList(filter = "") {
  const convs = getConversations();
  const list  = el("convList");
  const filtered = filter
    ? convs.filter(c => c.user.username.toLowerCase().includes(filter.toLowerCase()))
    : convs;

  if (!filtered.length) {
    list.innerHTML = `<div style="padding:24px;text-align:center;font-family:var(--font-mono);font-size:12px;color:var(--text-muted);">Sin conversaciones.<br>Hacé click en + para empezar.</div>`;
    return;
  }

  list.innerHTML = filtered.map(c => {
    const isActive = activeConv === c.key;
    const unread   = 0; // simplificado — en real se marcarían los no leídos
    const lastText = c.last
      ? (c.last.from === currentUsername ? `Vos: ${c.last.text.slice(0,30)}` : c.last.text.slice(0,30)) + (c.last.text.length > 30 ? "..." : "")
      : "Sin mensajes aún";
    const lastTime = c.last ? new Date(c.last.ts).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}) : "";

    return `
      <div class="conv-item ${isActive?"active":""}" onclick="openConv('${c.user.username}')">
        <div class="conv-av-wrap">
          <img src="${c.user.avatar}" class="conv-av" alt="">
          <div class="conv-online-dot"></div>
        </div>
        <div class="conv-info">
          <div class="conv-item-name">@${esc(c.user.username)}</div>
          <div class="conv-item-last">${esc(lastText)}</div>
        </div>
        <div class="conv-meta">
          ${lastTime ? `<span class="conv-time">${lastTime}</span>` : ""}
          ${unread ? `<div class="conv-unread">${unread}</div>` : ""}
        </div>
      </div>`;
  }).join("");
}

function filterConvs(val) { renderConvList(val); }

// ─────────────────────────────────────────
// OPEN CONVERSATION
// ─────────────────────────────────────────
function openConv(username) {
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const user     = allUsers.find(u => u.username === username);
  if (!user) return;

  activeConv = convKey(currentUsername, username);
  renderConvList(el("convSearchInput").value);

  const panel = el("chatPanel");
  panel.innerHTML = `
    <div class="chat-header">
      <img src="${user.avatar}" class="chat-header-av" alt="">
      <div class="chat-header-info">
        <div class="chat-header-name">@${esc(user.username)}</div>
        <div class="chat-header-status">● Online ahora</div>
      </div>
      <div class="chat-header-actions">
        <div class="chat-action-btn" title="Ver perfil" onclick="window.location.href='profile.html'">👤</div>
        <div class="chat-action-btn" title="Invitar a jugar" onclick="sendGameInvite('${username}')">🎮</div>
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
      <button class="chat-send-btn" onclick="sendMessage('${username}')">➤</button>
    </div>`;

  renderMessages(username);

  // Enter sends, Shift+Enter new line
  el("chatInput").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(username); }
  });

  // Close emoji picker on outside click
  document.addEventListener("click", e => {
    const picker = el("emojiPicker");
    if (picker && !picker.contains(e.target) && e.target.className !== "chat-emoji-btn") {
      picker.classList.remove("open");
    }
  });
}

function renderMessages(username) {
  const msgs   = JSON.parse(localStorage.getItem(activeConv)) || [];
  const box    = el("chatMessages");
  if (!box) return;

  if (!msgs.length) {
    box.innerHTML = `
      <div class="msg-system">Inicio de tu conversación con @${esc(username)}</div>
      <div class="msg-system">🔒 Los mensajes son privados</div>`;
    return;
  }

  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const them     = allUsers.find(u => u.username === username);

  // Group consecutive messages from same sender
  let grouped = [];
  msgs.forEach((m, i) => {
    const prev = msgs[i-1];
    if (prev && prev.from === m.from && m.ts - prev.ts < 60000) {
      grouped[grouped.length-1].msgs.push(m);
    } else {
      grouped.push({ from: m.from, msgs: [m] });
    }
  });

  box.innerHTML = `<div class="msg-system">Inicio de la conversación</div>` +
    grouped.map(g => {
      const mine  = g.from === currentUsername;
      const avSrc = mine ? currentUser.avatar : (them?.avatar || "avatar1.png");
      const bubblesHTML = g.msgs.map(m => `
        <div class="msg-bubble ${mine?"mine":"theirs"}">${esc(m.text)}</div>`).join("");
      const lastTs = new Date(g.msgs[g.msgs.length-1].ts).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
      return `
        <div class="msg-group ${mine?"mine":""}">
          <img src="${avSrc}" class="msg-av" alt="">
          <div class="msg-bubbles">
            ${bubblesHTML}
            <div class="msg-meta">${lastTs}</div>
          </div>
        </div>`;
    }).join("");

  // Scroll to bottom
  box.scrollTop = box.scrollHeight;
}

// ─────────────────────────────────────────
// SEND MESSAGE
// ─────────────────────────────────────────
function sendMessage(toUsername) {
  const input = el("chatInput");
  const text  = input ? input.value.trim() : "";
  if (!text) return;

  const msgs = JSON.parse(localStorage.getItem(activeConv)) || [];
  msgs.push({ from: currentUsername, to: toUsername, text, ts: Date.now() });
  localStorage.setItem(activeConv, JSON.stringify(msgs));

  input.value = "";
  input.style.height = "auto";
  renderMessages(toUsername);
  renderConvList(el("convSearchInput").value);

  // Mostrar indicador "visto" después de 1s — sin respuestas automáticas
  // Las respuestas las maneja el otro usuario real cuando abra su app
  setTimeout(() => {
    const box = el("chatMessages");
    if (!box) return;
    // Agregar tick de "enviado"
    const lastBubble = box.querySelector(".msg-group.mine:last-of-type .msg-meta");
    if (lastBubble && !lastBubble.querySelector(".msg-tick")) {
      lastBubble.innerHTML += ' <span class="msg-tick" style="color:var(--cyan);font-size:10px;">✓</span>';
    }
  }, 800);
}

function sendGameInvite(toUsername) {
  const msgs = JSON.parse(localStorage.getItem(activeConv)) || [];
  msgs.push({ from: currentUsername, to: toUsername, text: "🎮 Te invito a jugar en el Arcade de Respawn! → gamemap.html", ts: Date.now() });
  localStorage.setItem(activeConv, JSON.stringify(msgs));
  renderMessages(toUsername);
  renderConvList();
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
// NEW CONVERSATION MODAL
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
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const others   = allUsers
    .filter(u => u.username !== currentUsername && (!filter || u.username.toLowerCase().includes(filter.toLowerCase())))
    .slice(0,10);

  el("newConvUserList").innerHTML = !others.length
    ? `<div style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);padding:8px;">Sin usuarios encontrados.</div>`
    : others.map(u => `
        <div class="user-pick" onclick="startNewConv('${u.username}')">
          <img src="${u.avatar}" class="user-pick-av" alt="">
          <div>
            <div class="user-pick-name">@${esc(u.username)}</div>
            <div class="user-pick-bio">${esc(u.bio||"Jugando en Respawn")}</div>
          </div>
        </div>`).join("");
}

function startNewConv(username) {
  closeNewConv();
  openConv(username);
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
renderConvList();