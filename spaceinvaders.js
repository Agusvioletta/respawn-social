// spaceinvaders.js — Respawn Social v2

const canvas  = document.getElementById('si-board');
const ctx     = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const W = canvas.width, H = canvas.height;
const WIN_SCORE = 500;

function el(id) { return document.getElementById(id); }

// ── Constantes ──────────────────────────────────────
const ALIEN_ROWS = 3, ALIEN_COLS = 8;
const ALIEN_W = 38, ALIEN_H = 28, ALIEN_PAD = 12;
const ALIEN_TYPES = [
  { rows:[0],    pts:30, color:'#FF4F7B' },
  { rows:[1],    pts:20, color:'#C084FC' },
  { rows:[2],    pts:10, color:'#4ade80' },
];

// ── Estado ─────────────────────────────────────────
let ship, aliens, bullets, alienBullets, shields;
let score, lives, wave, running, gameEnded, overlayGoMap;
let alienDir, alienTimer, alienSpeed, ufoTimer, ufo;
const keys = {};

// ── Controles ──────────────────────────────────────
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if ([' ', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
  if (!running && !gameEnded) { startGame(); return; }
  if (gameEnded && e.key === 'Enter') {
    if (overlayGoMap) window.location.href = 'gamemap.html';
    else initGame();
    return;
  }
  if (e.key === ' ' && running) playerShoot();
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

// ── Build aliens ────────────────────────────────────
function buildAliens() {
  const list   = [];
  const startX = Math.max(20, (W - ALIEN_COLS * (ALIEN_W + ALIEN_PAD)) / 2);
  for (let r = 0; r < ALIEN_ROWS; r++) {
    const type = ALIEN_TYPES.find(t => t.rows.includes(r)) || ALIEN_TYPES[2];
    for (let c = 0; c < ALIEN_COLS; c++) {
      list.push({
        x: startX + c * (ALIEN_W + ALIEN_PAD),
        y: 50 + r * (ALIEN_H + ALIEN_PAD),
        alive: true, type, frame: 0
      });
    }
  }
  return list;
}

// ── Build shields ───────────────────────────────────
function buildShields() {
  const list = [];
  [80, 195, 310, 420].forEach(sx => {
    for (let bx = 0; bx < 4; bx++) {
      for (let by = 0; by < 3; by++) {
        list.push({ x: sx + bx * 12, y: H - 110 + by * 12, w: 10, h: 10, hp: 3 });
      }
    }
  });
  return list;
}

// ── Init ────────────────────────────────────────────
function initGame() {
  ship       = { x: W / 2, y: H - 40, w: 36, h: 22, speed: 5 };
  bullets    = [];
  alienBullets = [];
  score = 0; lives = 3; wave = 1;
  running = false; gameEnded = false; overlayGoMap = false;
  alienDir = 1; alienTimer = 0; alienSpeed = 60;
  ufoTimer = 0; ufo = null;
  aliens  = buildAliens();
  shields = buildShields();
  updateHUD();
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div style="font-family:var(--font-display);font-size:20px;font-weight:900;color:#4ade80;letter-spacing:2px;">SPACE INVADERS</div>
    <div style="font-family:var(--font-mono);font-size:13px;color:var(--text-secondary);">Cualquier tecla para empezar</div>`;
  draw();
}

function updateHUD() {
  el('score').textContent = score;
  el('lives').textContent = '♥'.repeat(Math.max(0, lives)) || '💀';
  el('wave').textContent  = wave;
}

// ── Shoot ────────────────────────────────────────────
let lastShot = 0;
function playerShoot() {
  if (Date.now() - lastShot < 250) return;
  lastShot = Date.now();
  bullets.push({ x: ship.x, y: ship.y - 14, vy: -11, w: 3, h: 14 });
}

// ── Update ───────────────────────────────────────────
function update() {
  if (!running) return;

  // Nave
  if (keys['ArrowLeft']  && ship.x > 24)    ship.x -= ship.speed;
  if (keys['ArrowRight'] && ship.x < W - 24) ship.x += ship.speed;

  // Balas del jugador
  bullets.forEach(b => { b.y += b.vy; });
  bullets = bullets.filter(b => b.y > 0);

  // Balas alienígenas
  alienBullets.forEach(b => { b.y += b.vy; });
  alienBullets = alienBullets.filter(b => b.y < H);

  // Movimiento de aliens
  alienTimer++;
  if (alienTimer >= alienSpeed) {
    alienTimer = 0;
    const alive = aliens.filter(a => a.alive);
    if (!alive.length) return;

    const rightmost = Math.max(...alive.map(a => a.x + ALIEN_W));
    const leftmost  = Math.min(...alive.map(a => a.x));

    if      (alienDir ===  1 && rightmost > W - 20) { alienDir = -1; aliens.forEach(a => { a.y += 10; }); }
    else if (alienDir === -1 && leftmost  < 20)      { alienDir =  1; aliens.forEach(a => { a.y += 10; }); }

    aliens.forEach(a => { if (a.alive) { a.x += alienDir * 14; a.frame = 1 - a.frame; } });

    // Disparar — máximo 1 bala, 3% de chance
    if (alienBullets.length < 1 && Math.random() < 0.03) {
      const bottom = alive.filter(a => !alive.find(b => b.x === a.x && b.y > a.y));
      if (bottom.length) {
        const s = bottom[Math.floor(Math.random() * bottom.length)];
        alienBullets.push({ x: s.x + ALIEN_W / 2, y: s.y + ALIEN_H, vy: 2.5, w: 3, h: 12 });
      }
    }
  }

  // UFO
  ufoTimer++;
  if (ufoTimer > 500 && !ufo && Math.random() < 0.005) { ufo = { x: -30, y: 28, vx: 2 }; ufoTimer = 0; }
  if (ufo) { ufo.x += ufo.vx; if (ufo.x > W + 40) ufo = null; }

  // Bala jugador vs alien
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    let hit = false;
    for (let ai = 0; ai < aliens.length; ai++) {
      const a = aliens[ai];
      if (!a.alive) continue;
      if (b.x > a.x && b.x < a.x + ALIEN_W && b.y > a.y && b.y < a.y + ALIEN_H) {
        a.alive = false;
        score += a.type.pts;
        updateHUD();
        alienSpeed = Math.max(20, alienSpeed - 0.4);
        hit = true;
        break;
      }
    }
    // vs UFO
    if (!hit && ufo && b.x > ufo.x && b.x < ufo.x + 40 && b.y > ufo.y && b.y < ufo.y + 20) {
      score += 100; updateHUD(); ufo = null; hit = true;
    }
    // vs escudos
    if (!hit) {
      for (let si = shields.length - 1; si >= 0; si--) {
        const s = shields[si];
        if (b.x > s.x && b.x < s.x + s.w && b.y > s.y && b.y < s.y + s.h) {
          s.hp--; if (s.hp <= 0) shields.splice(si, 1);
          hit = true; break;
        }
      }
    }
    if (hit) bullets.splice(bi, 1);
  }

  // Bala alien vs jugador y escudos
  for (let bi = alienBullets.length - 1; bi >= 0; bi--) {
    const b = alienBullets[bi];
    let hit = false;
    if (Math.abs(b.x - ship.x) < 20 && b.y > ship.y - 14 && b.y < ship.y + 12) {
      lives--; updateHUD(); ship.x = W / 2;
      if (lives <= 0) { gameOver(); return; }
      hit = true;
    }
    if (!hit) {
      for (let si = shields.length - 1; si >= 0; si--) {
        const s = shields[si];
        if (b.x > s.x && b.x < s.x + s.w && b.y > s.y && b.y < s.y + s.h) {
          s.hp--; if (s.hp <= 0) shields.splice(si, 1);
          hit = true; break;
        }
      }
    }
    if (hit) alienBullets.splice(bi, 1);
  }

  // Aliens llegan a la nave → game over
  if (aliens.some(a => a.alive && a.y + ALIEN_H > ship.y - 16)) { gameOver(); return; }

  // Wave completa → nueva oleada
  if (!aliens.some(a => a.alive)) {
    wave++;
    el('wave').textContent = wave;
    alienSpeed    = Math.max(30, 60 - (wave - 1) * 5);
    alienBullets  = [];
    aliens        = buildAliens();
    shields       = buildShields();
  }

  // Victoria
  if (score >= WIN_SCORE && !gameEnded) gameWin();
}

// ── Draw ─────────────────────────────────────────────
function draw() {
  ctx.fillStyle = '#07070F';
  ctx.fillRect(0, 0, W, H);

  // Estrellas
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  [[30,18],[110,55],[240,12],[370,75],[455,38],[75,145],[315,175],[18,198],[468,218]].forEach(([x,y]) => {
    ctx.beginPath(); ctx.arc(x, y, 0.9, 0, Math.PI * 2); ctx.fill();
  });

  // Escudos
  shields.forEach(s => {
    const alphas = [0.9, 0.55, 0.25];
    ctx.fillStyle = `rgba(0,255,247,${alphas[3 - s.hp] || 0.15})`;
    ctx.fillRect(s.x, s.y, s.w, s.h);
  });

  // Aliens
  aliens.filter(a => a.alive).forEach(a => {
    ctx.save();
    ctx.shadowColor = a.type.color; ctx.shadowBlur = 7;
    drawAlien(a.x, a.y, a.type.color, a.frame);
    ctx.restore();
  });

  // UFO
  if (ufo) {
    ctx.save();
    ctx.shadowColor = '#FF4F7B'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#FF4F7B';
    ctx.beginPath(); ctx.ellipse(ufo.x + 20, ufo.y + 10, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FF8CAB';
    ctx.beginPath(); ctx.ellipse(ufo.x + 20, ufo.y + 5, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Balas del jugador
  ctx.save();
  ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 6;
  ctx.fillStyle = '#4ade80';
  bullets.forEach(b => { ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h); });
  ctx.restore();

  // Balas alienígenas
  ctx.save();
  ctx.shadowColor = '#FF4F7B'; ctx.shadowBlur = 5;
  ctx.fillStyle = '#FF4F7B';
  alienBullets.forEach(b => { ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h); });
  ctx.restore();

  // Nave del jugador
  if (running) {
    ctx.save();
    ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 12;
    ctx.fillStyle   = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(ship.x,               ship.y - ship.h / 2);
    ctx.lineTo(ship.x - ship.w / 2,  ship.y + ship.h / 2);
    ctx.lineTo(ship.x - ship.w / 4,  ship.y + ship.h / 4);
    ctx.lineTo(ship.x + ship.w / 4,  ship.y + ship.h / 4);
    ctx.lineTo(ship.x + ship.w / 2,  ship.y + ship.h / 2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function drawAlien(x, y, color, frame) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x + ALIEN_W / 2, y + ALIEN_H / 2, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(x + ALIEN_W / 2 - 5, y + ALIEN_H / 2 - 2, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + ALIEN_W / 2 + 5, y + ALIEN_H / 2 - 2, 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + ALIEN_W / 2 - 6, y + 4); ctx.lineTo(x + ALIEN_W / 2 - 10 + frame * 2, y - 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + ALIEN_W / 2 + 6, y + 4); ctx.lineTo(x + ALIEN_W / 2 + 10 - frame * 2, y - 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + ALIEN_W / 2 - 12, y + ALIEN_H - 4); ctx.lineTo(x + ALIEN_W / 2 - 8 + (frame ? -4 : 4), y + ALIEN_H + 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + ALIEN_W / 2 + 12, y + ALIEN_H - 4); ctx.lineTo(x + ALIEN_W / 2 + 8 + (frame ? 4 : -4), y + ALIEN_H + 4); ctx.stroke();
}

// ── Game over / win ───────────────────────────────────
function gameOver() {
  running = false; gameEnded = true;
  showOverlay('GAME OVER', `${score} puntos · Necesitás ${WIN_SCORE} · Enter para reintentar`, false);
}

function gameWin() {
  running = false; gameEnded = true;
  const ml = parseInt(localStorage.getItem("maxLevel")) || 1;
  if (ml === 7) {
    saveMaxLevel(8);
    showOverlay('¡GANASTE!', '🏃 Dino Runner desbloqueado · Enter para volver al mapa', true);
  } else {
    showOverlay('¡GANASTE!', `${score} puntos · Enter para volver al mapa`, true);
  }
}

function saveMaxLevel(n) {
  localStorage.setItem("maxLevel", String(n));
  // Sync con Supabase
  try {
    const me = JSON.parse(localStorage.getItem("currentUser"));
    if (me && me.id && typeof sb !== 'undefined') {
      sb.from('profiles')
        .select('max_level').eq('id', me.id).single()
        .then(({ data }) => {
          if (!data || data.max_level < n) {
            sb.from('profiles').update({ max_level: n }).eq('id', me.id).then(() => {
              me.max_level = n; me.maxLevel = n;
              localStorage.setItem("currentUser", JSON.stringify(me));
            });
          }
        });
    }
  } catch(e) { console.log('Supabase sync error:', e); }
}

function showOverlay(title, sub, goMap) {
  overlayGoMap = goMap;
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div style="font-family:var(--font-display);font-size:20px;font-weight:900;color:${goMap ? '#4ade80' : 'var(--pink)'};letter-spacing:2px;">${title}</div>
    <div style="font-family:var(--font-display);font-size:24px;font-weight:900;color:#4ade80;">${score}</div>
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary);text-align:center;max-width:280px;">${sub}</div>`;
}

// ── Loop ─────────────────────────────────────────────
function startGame() {
  if (running) return;
  running = true;
  overlay.style.display = 'none';
  requestAnimationFrame(loop);
}

function loop() {
  if (!running) return;
  update();
  draw();
  requestAnimationFrame(loop);
}

initGame();
