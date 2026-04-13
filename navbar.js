// navbar.js — Navbar compartida de Respawn Social
// Incluir con <script src="navbar.js"></script> antes del cierre de </body>
// El HTML de la página debe tener <nav id="globalNav"></nav> al inicio del body

(function() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return; // No logueado, no inyectar

  // Detectar página activa
  const page = location.pathname.split('/').pop() || 'feed.html';
  const isActive = (p) => page === p ? 'active' : '';

  const NAV_LINKS = [
    { href: 'feed.html',        label: 'Feed',       key: 'feed.html'        },
    { href: 'explore.html',     label: 'Explorar',   key: 'explore.html'     },
    { href: 'tournaments.html', label: 'Torneos',    key: 'tournaments.html' },
    { href: 'messages.html',    label: 'Mensajes',   key: 'messages.html'    },
    { href: 'profile.html',     label: 'Perfil',     key: 'profile.html'     },
    { href: 'gamemap.html',     label: 'Arcade',     key: 'gamemap.html'     },
  ];

  const linksHTML = NAV_LINKS.map(l =>
    `<a href="${l.href}" class="nav-link ${isActive(l.key)}">${l.label}</a>`
  ).join('');

  const navHTML = `
    <style>
      #globalNav {
        position: sticky; top: 0; z-index: 200;
        background: rgba(7,7,15,0.92); backdrop-filter: blur(16px);
        border-bottom: 1px solid var(--border-subtle);
        padding: 0 32px; display: flex; align-items: center;
        justify-content: space-between; height: 56px;
        font-family: var(--font-display);
      }
      #globalNav .gn-left  { display: flex; align-items: center; gap: 28px; }
      #globalNav .gn-right { display: flex; align-items: center; gap: 10px; }
      #globalNav .gn-brand { font-size: 18px; font-weight: 900; color: var(--cyan); letter-spacing: 3px; text-decoration: none; text-shadow: 0 0 16px rgba(0,255,247,0.6); white-space: nowrap; }
      #globalNav .gn-links { display: flex; gap: 2px; }
      #globalNav .nav-link { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--text-muted); text-decoration: none; padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid transparent; transition: all 0.2s; white-space: nowrap; }
      #globalNav .nav-link:hover  { color: var(--text-primary); border-color: var(--border-default); }
      #globalNav .nav-link.active { color: var(--cyan); border-color: rgba(0,255,247,0.3); background: rgba(0,255,247,0.06); }
      #globalNav .gn-icon-btn { width: 36px; height: 36px; border-radius: 50%; background: var(--bg-card); border: 1px solid var(--border-default); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 15px; position: relative; transition: border-color 0.2s; text-decoration: none; color: inherit; flex-shrink: 0; }
      #globalNav .gn-icon-btn:hover { border-color: var(--cyan); }
      #globalNav .gn-notif-dot { position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; background: var(--pink); border-radius: 50%; border: 2px solid var(--bg-void); display: none; }
      #globalNav .gn-btn-logout { background: transparent; border: 1px solid rgba(255,79,123,0.4); color: var(--pink); padding: 6px 14px; border-radius: var(--radius-md); font-family: var(--font-display); font-size: 11px; font-weight: 700; letter-spacing: 1px; cursor: pointer; transition: all 0.2s; }
      #globalNav .gn-btn-logout:hover { background: var(--pink-glow); border-color: var(--pink); }
      /* Notif panel */
      #gnNotifPanel { display:none;position:fixed;top:64px;right:16px;width:320px;background:var(--bg-card);border:1px solid var(--border-default);border-radius:var(--radius-lg);z-index:300;box-shadow:0 16px 48px rgba(0,0,0,0.7);overflow:hidden; }
      #gnNotifPanel .np-hd { padding:14px 16px;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between; }
      #gnNotifPanel .np-title { font-family:var(--font-display);font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:2px; }
      #gnNotifPanel .np-clear { background:transparent;border:none;font-family:var(--font-mono);font-size:11px;color:var(--text-muted);cursor:pointer;transition:color 0.2s; }
      #gnNotifPanel .np-clear:hover { color:var(--cyan); }
      #gnNotifList { max-height:360px;overflow-y:auto; }
      /* Now playing pill en navbar */
      #gnNowPlaying { display:none;align-items:center;gap:8px;background:rgba(0,255,247,0.06);border:1px solid rgba(0,255,247,0.2);border-radius:20px;padding:5px 14px;font-family:var(--font-display);font-size:10px;font-weight:700;color:var(--cyan);letter-spacing:0.5px;cursor:pointer;transition:all 0.2s;white-space:nowrap; }
      #gnNowPlaying:hover { background:rgba(0,255,247,0.12); }
      #gnNowPlaying .np-dot { width:6px;height:6px;border-radius:50%;background:var(--cyan);animation:npdot 1.2s ease-in-out infinite; }
      @keyframes npdot { 0%,100%{opacity:1}50%{opacity:0.3} }
      @media(max-width:900px) { #globalNav .gn-links { display:none; } }
    </style>
    <div class="gn-left">
      <a href="feed.html" class="gn-brand">RESPAWN</a>
      <nav class="gn-links">${linksHTML}</nav>
    </div>
    <div class="gn-right">
      <div id="gnNowPlaying" onclick="window.location.href='profile.html'">
        <div class="np-dot"></div>
        <span id="gnNowPlayingText">Jugando</span>
      </div>
      <button class="theme-toggle" id="gnThemeToggle" onclick="gnToggleTheme()" title="Cambiar tema">🌙</button>
      <div class="gn-icon-btn" id="gnNotifBtn" onclick="gnToggleNotifs()">
        🔔<div class="gn-notif-dot" id="gnNotifDot"></div>
      </div>
      <a href="messages.html" class="gn-icon-btn" id="gnMsgBtn" title="Mensajes" style="position:relative;">
        💬<div id="gnMsgDot" style="display:none;position:absolute;top:-3px;right:-3px;width:8px;height:8px;background:var(--cyan);border-radius:50%;border:2px solid var(--bg-void);"></div>
      </a>
      <a href="settings.html" class="gn-icon-btn" title="Configuración">⚙️</a>
      <a href="profile.html"  class="gn-icon-btn" id="gnAvatarBtn" title="Mi perfil"></a>
      <button class="gn-btn-logout" id="gnLogoutBtn">Salir</button>
    </div>

    <!-- Notif panel -->
    <div id="gnNotifPanel">
      <div class="np-hd">
        <span class="np-title">NOTIFICACIONES</span>
        <button class="np-clear" onclick="gnClearNotifs()">Limpiar</button>
      </div>
      <div id="gnNotifList"></div>
    </div>
  `;

  const nav = document.getElementById('globalNav');
  if (!nav) return;
  nav.innerHTML = navHTML;

  // Avatar
  const avBtn = document.getElementById('gnAvatarBtn');
  if (avBtn) avBtn.innerHTML = `<img src="${currentUser.avatar}" width="34" height="34" style="border-radius:50%;image-rendering:pixelated;border:2px solid var(--cyan-dim);display:block;" onerror="this.style.display='none'">`;

  // Logout
  document.getElementById('gnLogoutBtn').addEventListener('click', async () => {
    if (confirm('¿Cerrar sesión?')) {
      localStorage.removeItem('currentUser');
      // Cerrar sesión en Supabase también
      try {
        const lib = window.supabase || window.supabaseJs;
        if (lib) {
          const client = lib.createClient(
            'https://ajegcbzvviukuewqhqqb.supabase.co',
            'sb_publishable_Nqo7KTTik0nnWidf04yuGw_hDOP28Eq'
          );
          await client.auth.signOut();
        }
      } catch(e) { console.log('signOut error:', e); }
      window.location.href = 'index.html';
    }
  });

  // Aplicar preferencias de apariencia guardadas
  const savedTheme  = localStorage.getItem('theme');
  const savedAccent = localStorage.getItem('accentColor');
  const savedSize   = localStorage.getItem('fontSize');
  const savedAnims  = localStorage.getItem('animations');

  if (savedTheme === 'light' || savedTheme === 'midnight') {
    document.body.classList.add('light-mode');
    const tb = document.getElementById('gnThemeToggle');
    if (tb) tb.textContent = '☀️';
  }
  if (savedAccent) {
    document.documentElement.style.setProperty('--cyan', savedAccent);
    document.documentElement.style.setProperty('--cyan-dim', savedAccent);
  }
  if (savedSize) {
    const sizes = { sm:'13px', md:'15px', lg:'17px' };
    document.documentElement.style.setProperty('--font-size-body', sizes[savedSize] || '15px');
  }
  if (savedAnims === 'false') document.body.classList.add('reduce-motion');

  window.gnToggleTheme = function() {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    const btn = document.getElementById('gnThemeToggle');
    if (btn) btn.textContent = isLight ? '☀️' : '🌙';
  };

  // Now playing
  const nowPlaying = JSON.parse(localStorage.getItem('nowPlaying'));
  if (nowPlaying && nowPlaying.user === currentUser.username) {
    const pill = document.getElementById('gnNowPlaying');
    const txt  = document.getElementById('gnNowPlayingText');
    if (pill && txt) { txt.textContent = nowPlaying.game; pill.style.display = 'flex'; }
  }

  // ─── NOTIFICACIONES — Supabase ───────────────────────────────
  // Sonido de notificación (Web Audio API — sin archivos externos)
  function gnPlaySound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch(e) {}
  }

  // Obtener prefs de notificaciones
  function gnGetPrefs() {
    return JSON.parse(localStorage.getItem('notifPrefs') || '{}');
  }

  // IDs ya vistos (persistidos en localStorage)
  function gnGetSeenIds() {
    try { return new Set(JSON.parse(localStorage.getItem('notifs_seen_' + currentUser.username) || '[]')); }
    catch { return new Set(); }
  }
  function gnSaveSeenIds(set) {
    localStorage.setItem('notifs_seen_' + currentUser.username, JSON.stringify([...set]));
  }

  // IDs eliminados (limpiar bandeja)
  function gnGetClearedIds() {
    try { return new Set(JSON.parse(localStorage.getItem('notifs_cleared_' + currentUser.username) || '[]')); }
    catch { return new Set(); }
  }
  function gnSaveClearedIds(set) {
    localStorage.setItem('notifs_cleared_' + currentUser.username, JSON.stringify([...set]));
  }

  // Construir notificaciones desde Supabase
  async function gnFetchNotifs() {
    const prefs   = gnGetPrefs();
    const cleared = gnGetClearedIds();
    const notifs  = [];

    try {
      // Likes en mis posts
      if (prefs.like !== false) {
        const { data: myPosts } = await sb.from('posts')
          .select('id, content, likes(user_id, profiles(username))')
          .eq('user_id', currentUser.id);
        myPosts?.forEach(post => {
          post.likes?.forEach(l => {
            if (l.user_id !== currentUser.id) {
              const id = `like_${post.id}_${l.user_id}`;
              if (!cleared.has(id)) notifs.push({
                type:'like', from: l.profiles?.username || '?',
                text: `le dio ♥ a tu post: "${post.content.slice(0,24)}..."`,
                id, ts: post.id
              });
            }
          });
        });
      }

      // Comentarios en mis posts
      if (prefs.comment !== false) {
        const { data: myCmts } = await sb.from('comments')
          .select('id, user_id, username, content, created_at, posts!inner(user_id)')
          .eq('posts.user_id', currentUser.id)
          .neq('user_id', currentUser.id);
        myCmts?.forEach(c => {
          const id = `cmt_${c.id}`;
          if (!cleared.has(id)) notifs.push({
            type:'comment', from: c.username,
            text: `comentó: "${c.content.slice(0,28)}"`,
            id, ts: new Date(c.created_at).getTime()
          });
        });
      }

      // Nuevos seguidores
      if (prefs.follow !== false) {
        const { data: followers } = await sb.from('follows')
          .select('follower_id, created_at, profiles!follows_follower_id_fkey(username)')
          .eq('following_id', currentUser.id);
        followers?.forEach(f => {
          const id = `follow_${f.follower_id}`;
          if (!cleared.has(id)) notifs.push({
            type:'follow', from: f.profiles?.username || '?',
            text: 'empezó a seguirte',
            id, ts: new Date(f.created_at).getTime()
          });
        });
      }

      // Mensajes recibidos
      if (prefs.message !== false) {
        const { data: msgs } = await sb.from('messages')
          .select('id, from_id, content, created_at, profiles!messages_from_id_fkey(username)')
          .eq('to_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(10);
        msgs?.forEach(m => {
          const id = `msg_${m.id}`;
          if (!cleared.has(id)) notifs.push({
            type:'message', from: m.profiles?.username || '?',
            text: `te envió un mensaje: "${m.content.slice(0,28)}"`,
            id, ts: new Date(m.created_at).getTime()
          });
        });
      }

    } catch(e) { console.log('gnFetchNotifs error:', e); }

    return notifs.sort((a,b) => b.ts - a.ts).slice(0, 30);
  }

  // Verificar si hay nuevas y actualizar el dot
  async function gnCheckNew() {
    const notifs = await gnFetchNotifs();
    const seen   = gnGetSeenIds();
    const hasNew = notifs.some(n => !seen.has(n.id));
    const dot    = document.getElementById('gnNotifDot');
    if (dot) dot.style.display = hasNew ? 'block' : 'none';
    // Sonido si hay nuevas
    if (hasNew) {
      const prefs = gnGetPrefs();
      if (prefs.sound) gnPlaySound();
    }
    return notifs;
  }

  // Chequear al cargar
  gnCheckNew();

  // Chequear cada 30 segundos en background
  setInterval(gnCheckNew, 30000);

  window.gnToggleNotifs = async function() {
    const panel = document.getElementById('gnNotifPanel');
    const open  = panel.style.display !== 'none';
    panel.style.display = open ? 'none' : 'block';
    if (!open) {
      const list = document.getElementById('gnNotifList');
      list.innerHTML = `<div style="padding:24px;text-align:center;font-family:var(--font-mono);font-size:12px;color:var(--text-muted);">Cargando...</div>`;

      const notifs  = await gnFetchNotifs();
      const seen    = gnGetSeenIds();
      const cleared = gnGetClearedIds();

      // Marcar todas como vistas
      notifs.forEach(n => seen.add(n.id));
      gnSaveSeenIds(seen);
      const dot = document.getElementById('gnNotifDot');
      if (dot) dot.style.display = 'none';

      const colors = { like:'var(--pink)', comment:'var(--purple)', follow:'var(--cyan)', message:'var(--green, #4ade80)' };
      const icons  = { like:'♥', comment:'💬', follow:'👤', message:'✉' };

      list.innerHTML = notifs.length
        ? notifs.map(n => {
            const isNew = !seen.has(n.id);
            return `<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border-subtle);${isNew?'background:rgba(0,255,247,0.04);':''}" onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background='${isNew?'rgba(0,255,247,0.04)':'transparent'}'">
              <span style="color:${colors[n.type]||'var(--cyan)'};font-size:14px;margin-top:2px;flex-shrink:0;">${icons[n.type]||'🔔'}</span>
              <div style="flex:1;min-width:0;">
                <span style="font-family:var(--font-display);font-size:11px;font-weight:700;color:${colors[n.type]||'var(--cyan)'};">@${n.from}</span>
                <span style="font-family:var(--font-body);font-size:13px;color:var(--text-secondary);margin-left:5px;">${n.text}</span>
              </div>
            </div>`;
          }).join('')
        : `<div style="padding:32px 16px;text-align:center;font-family:var(--font-mono);font-size:13px;color:var(--text-muted);">🔔 Sin notificaciones</div>`;
    }
  };

  window.gnClearNotifs = async function() {
    // Guardar todos los IDs actuales como "eliminados" — no van a volver a aparecer
    const notifs  = await gnFetchNotifs();
    const cleared = gnGetClearedIds();
    notifs.forEach(n => cleared.add(n.id));
    gnSaveClearedIds(cleared);

    // También marcarlos como vistos
    const seen = gnGetSeenIds();
    notifs.forEach(n => seen.add(n.id));
    gnSaveSeenIds(seen);

    const list = document.getElementById('gnNotifList');
    if (list) list.innerHTML = `<div style="padding:32px 16px;text-align:center;font-family:var(--font-mono);font-size:13px;color:var(--text-muted);">🔔 Sin notificaciones</div>`;
    const d = document.getElementById('gnNotifDot');
    if (d) d.style.display = 'none';
  };

  // Cerrar panel al clickear afuera
  document.addEventListener('click', e => {
    const panel = document.getElementById('gnNotifPanel');
    const btn   = document.getElementById('gnNotifBtn');
    if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) panel.style.display = 'none';
  });

})();