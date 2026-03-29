// post.js — Vista individual de post con hilos

function esc(s) { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function el(id) { return document.getElementById(id); }
function formatContent(text) {
  return esc(text)
    .replace(/#(\w+)/g,'<span style="color:var(--cyan);">#$1</span>')
    .replace(/@(\w+)/g,'<span style="color:var(--purple);">@$1</span>');
}

let currentUser = null;
let post        = null;
let postId      = null;

// ── Init ──────────────────────────────────────────
async function init() {
  currentUser = await sbRequireAuth();
  if (!currentUser) return;

  const params = new URLSearchParams(window.location.search);
  postId = parseInt(params.get("id"));
  if (!postId) { el("postContent").innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted);font-family:var(--font-mono);">Post no encontrado.</div>`; return; }

  await renderPost();
}

// ── Cargar post + comentarios ──────────────────────
async function loadPostData() {
  const { data: postData } = await sb.from('posts')
    .select('*, likes(user_id), comments(id, user_id, username, avatar, content, image_url, created_at, parent_id, likes:comment_likes(user_id))')
    .eq('id', postId)
    .single();
  return postData;
}

// ── Render principal ───────────────────────────────
async function renderPost() {
  post = await loadPostData();
  if (!post) {
    el("postContent").innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted);font-family:var(--font-mono);">Post no encontrado.</div>`;
    return;
  }

  document.title = `@${post.username} — Respawn`;

  const likes    = post.likes    || [];
  const comments = post.comments || [];
  const isLiked  = likes.some(l => l.user_id === currentUser.id);
  const isOwn    = post.user_id === currentUser.id;
  const date     = new Date(post.created_at).toLocaleString("es-AR", { dateStyle:"long", timeStyle:"short" });

  // Solo comentarios de primer nivel (sin parent)
  const topComments = comments.filter(c => !c.parent_id);
  const replies     = comments.filter(c => c.parent_id);

  el("postContent").innerHTML = `
    <!-- Post principal -->
    <div class="post-main">
      <div class="post-main-author">
        <img src="${post.avatar||'avatar1.png'}" class="post-main-av" onclick="window.location.href='profile.html?user=${esc(post.username)}'">
        <div>
          <div class="post-main-name" onclick="window.location.href='profile.html?user=${esc(post.username)}'">@${esc(post.username)}</div>
          <div class="post-main-date">${date}</div>
        </div>
        ${isOwn ? `<button onclick="deleteThisPost()" style="margin-left:auto;background:none;border:none;font-family:var(--font-mono);font-size:11px;color:var(--text-muted);cursor:pointer;" onmouseover="this.style.color='var(--pink)'" onmouseout="this.style.color='var(--text-muted)'">Borrar</button>` : ""}
      </div>
      ${post.content ? `<div class="post-main-content">${formatContent(post.content)}</div>` : ""}
      ${post.image_url ? `<img src="${post.image_url}" class="post-main-image" onclick="window.open('${post.image_url}','_blank')">` : ""}
      <div class="post-main-stats">
        <div class="post-stat"><strong>${likes.length}</strong> likes</div>
        <div class="post-stat"><strong>${topComments.length}</strong> comentarios</div>
      </div>
      <div class="post-main-actions">
        <button class="like-btn ${isLiked?"voted":""}" onclick="likePost()"  id="likeBtn">♥ ${likes.length}</button>
      </div>
    </div>

    <!-- Composer de comentario -->
    <div class="comment-composer">
      <div class="comment-composer-top">
        <img src="${currentUser.avatar||'avatar1.png'}" class="comment-composer-av">
        <textarea class="input comment-composer-input" id="commentInput" placeholder="Comentá este post..." rows="2" maxlength="500"></textarea>
      </div>
      <img id="cmtImgPreview" class="cmt-img-preview">
      <div class="comment-composer-footer">
        <label for="cmtImgInput" style="cursor:pointer;font-size:16px;opacity:0.6;transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6" title="Agregar imagen">🖼</label>
        <input type="file" id="cmtImgInput" accept="image/*" style="display:none;" onchange="previewCmtImg(this)">
        <button class="btn" style="margin:0;padding:8px 20px;" onclick="submitComment()">COMENTAR</button>
      </div>
    </div>

    <!-- Hilo de comentarios -->
    <div class="thread-label">💬 COMENTARIOS</div>
    <div id="threadContainer">
      ${topComments.length
        ? topComments.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).map(c => buildCommentHTML(c, replies)).join("")
        : `<div style="text-align:center;padding:32px;font-family:var(--font-mono);font-size:12px;color:var(--text-muted);">Sin comentarios. ¡Sé el primero!</div>`}
    </div>`;
}

// ── Build comentario HTML ──────────────────────────
function buildCommentHTML(c, allReplies) {
  const likes    = c.likes || [];
  const isLiked  = likes.some(l => l.user_id === currentUser.id);
  const isOwn    = c.user_id === currentUser.id;
  const myReplies = allReplies.filter(r => r.parent_id === c.id);
  const date     = new Date(c.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});

  return `
    <div class="comment-card" id="cmt-${c.id}">
      <div class="comment-header">
        <img src="${c.avatar||'avatar1.png'}" class="comment-av" onclick="window.location.href='profile.html?user=${esc(c.username)}'">
        <span class="comment-author" onclick="window.location.href='profile.html?user=${esc(c.username)}'">@${esc(c.username)}</span>
        <span class="comment-date">${date}</span>
        ${isOwn ? `<button class="comment-delete-btn" onclick="deleteComment(${c.id})">✕ borrar</button>` : ""}
      </div>
      <div class="comment-content">${formatContent(c.content)}</div>
      ${c.image_url ? `<img src="${c.image_url}" class="comment-image" onclick="window.open('${c.image_url}','_blank')">` : ""}
      <div class="comment-actions">
        <button class="comment-like-btn ${isLiked?"voted":""}" id="clike-${c.id}" onclick="likeComment(${c.id})">♥ ${likes.length}</button>
        <button class="comment-reply-btn" onclick="toggleReplyComposer(${c.id})">↩ Responder</button>
        ${myReplies.length ? `<button class="show-replies-btn" id="showreplies-${c.id}" onclick="toggleReplies(${c.id})">Ver ${myReplies.length} respuesta${myReplies.length!==1?"s":""}</button>` : ""}
      </div>

      <!-- Composer de respuesta inline -->
      <div class="reply-composer" id="replyComposer-${c.id}">
        <input type="text" id="replyInput-${c.id}" placeholder="Respondé a @${esc(c.username)}..." maxlength="280">
        <div class="reply-composer-footer">
          <button style="background:none;border:none;font-family:var(--font-mono);font-size:11px;color:var(--text-muted);cursor:pointer;" onclick="toggleReplyComposer(${c.id})">Cancelar</button>
          <button class="btn" style="margin:0;padding:6px 16px;font-size:11px;" onclick="submitReply(${c.id})">RESPONDER</button>
        </div>
      </div>

      <!-- Respuestas (ocultas por default) -->
      <div class="replies-section" id="replies-${c.id}" style="display:none;">
        ${myReplies.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).map(r => buildReplyHTML(r)).join("")}
      </div>
    </div>`;
}

function buildReplyHTML(r) {
  const isOwn = r.user_id === currentUser.id;
  const date  = new Date(r.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
  return `
    <div class="reply-card" id="reply-${r.id}">
      <div class="reply-header">
        <img src="${r.avatar||'avatar1.png'}" class="reply-av" onclick="window.location.href='profile.html?user=${esc(r.username)}'">
        <span class="reply-author" onclick="window.location.href='profile.html?user=${esc(r.username)}'">@${esc(r.username)}</span>
        <span class="reply-date">${date}</span>
        ${isOwn ? `<button style="background:none;border:none;font-size:10px;color:var(--text-muted);cursor:pointer;margin-left:4px;" onclick="deleteComment(${r.id})">✕</button>` : ""}
      </div>
      <div class="reply-content">${formatContent(r.content)}</div>
    </div>`;
}

// ── Like post ─────────────────────────────────────
async function likePost() {
  await sbToggleLike(postId, currentUser.id);
  const { data } = await sb.from('likes').select('user_id').eq('post_id', postId);
  const liked    = (data||[]).some(l => l.user_id === currentUser.id);
  const btn      = el("likeBtn");
  if (btn) {
    btn.textContent = `♥ ${(data||[]).length}`;
    btn.className   = `like-btn ${liked?"voted":""}`;
  }
}

// ── Like comentario ───────────────────────────────
async function likeComment(commentId) {
  // Toggle en tabla comment_likes
  const { data: existing } = await sb.from('comment_likes')
    .select('id').eq('comment_id', commentId).eq('user_id', currentUser.id).maybeSingle();
  if (existing) {
    await sb.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', currentUser.id);
  } else {
    await sb.from('comment_likes').insert({ comment_id: commentId, user_id: currentUser.id });
  }
  const { count } = await sb.from('comment_likes').select('*',{count:'exact',head:true}).eq('comment_id', commentId);
  const btn = el(`clike-${commentId}`);
  if (btn) {
    btn.textContent = `♥ ${count||0}`;
    btn.className   = `comment-like-btn ${!existing?"voted":""}`;
  }
}

// ── Toggle respuestas ─────────────────────────────
function toggleReplies(commentId) {
  const box = el(`replies-${commentId}`);
  const btn = el(`showreplies-${commentId}`);
  if (!box) return;
  const open = box.style.display !== "none";
  box.style.display = open ? "none" : "block";
  if (btn) btn.textContent = open ? btn.textContent.replace("Ocultar","Ver") : btn.textContent.replace("Ver","Ocultar");
}

// ── Toggle reply composer ─────────────────────────
function toggleReplyComposer(commentId) {
  const composer = el(`replyComposer-${commentId}`);
  if (!composer) return;
  composer.classList.toggle("open");
  if (composer.classList.contains("open")) el(`replyInput-${commentId}`)?.focus();
}

// ── Submit comentario ─────────────────────────────
let cmtImageFile = null;

window.previewCmtImg = function(input) {
  const file = input.files[0];
  if (!file) return;
  cmtImageFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const img = el("cmtImgPreview");
    if (img) { img.src = e.target.result; img.style.display = "block"; }
  };
  reader.readAsDataURL(file);
};

async function submitComment() {
  const input   = el("commentInput");
  const content = input?.value.trim() || "";
  if (!content && !cmtImageFile) return;

  let imageUrl = null;
  if (cmtImageFile) imageUrl = await sbUploadImage(cmtImageFile, currentUser.id);

  await sbAddComment(postId, currentUser.id, currentUser.username, currentUser.avatar, content, null, imageUrl);
  if (input) input.value = "";
  cmtImageFile = null;
  const img = el("cmtImgPreview");
  if (img) { img.src=""; img.style.display="none"; }
  await renderPost();
}

// ── Submit respuesta ──────────────────────────────
async function submitReply(parentId) {
  const input   = el(`replyInput-${parentId}`);
  const content = input?.value.trim() || "";
  if (!content) return;
  await sbAddComment(postId, currentUser.id, currentUser.username, currentUser.avatar, content, parentId);
  if (input) input.value = "";
  const composer = el(`replyComposer-${parentId}`);
  if (composer) composer.classList.remove("open");
  await renderPost();
  // Mostrar respuestas automáticamente
  const box = el(`replies-${parentId}`);
  if (box) box.style.display = "block";
}

// ── Borrar comentario ─────────────────────────────
async function deleteComment(commentId) {
  if (!confirm("¿Borrar este comentario?")) return;
  await sbDeleteComment(commentId, currentUser.id);
  await renderPost();
}

// ── Borrar post ───────────────────────────────────
async function deleteThisPost() {
  if (!confirm("¿Borrar esta publicación?")) return;
  await sbDeletePost(postId, currentUser.id);
  window.location.href = "feed.html";
}

init();