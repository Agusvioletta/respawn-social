// gamemap.js — Respawn Social v2

const canvas = document.getElementById('game-map');
const ctx    = canvas.getContext('2d');
const WIDTH  = canvas.width;
const HEIGHT = canvas.height;

const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) window.location.href = "index.html";

// Cargar maxLevel desde Supabase y sincronizar con localStorage
let maxLevel = parseInt(localStorage.getItem("maxLevel")) || currentUser.max_level || 1;

// Sync asíncrono — actualizar desde Supabase en background
(async function syncMaxLevel() {
  try {
    if (typeof sb !== 'undefined' && currentUser.id) {
      const { data } = await sb.from('profiles').select('max_level').eq('id', currentUser.id).single();
      if (data && data.max_level > maxLevel) {
        maxLevel = data.max_level;
        localStorage.setItem("maxLevel", String(maxLevel));
      }
    }
  } catch(e) { console.log('maxLevel sync error:', e); }
})();

const TILE  = 24;
const SPEED = 3;

const LEVELS = [
  { id:1, name:"Snake",         emoji:"🐍", path:"snake.html",         x: TILE*2,  y: HEIGHT - TILE*4,  color:"#00FFF7" },
  { id:2, name:"Pong",          emoji:"🏓", path:"pong.html",          x: TILE*6,  y: HEIGHT - TILE*7,  color:"#FF4F7B" },
  { id:3, name:"Breakout",      emoji:"🧱", path:"breakout.html",      x: TILE*11, y: HEIGHT - TILE*10, color:"#C084FC" },
  { id:4, name:"Asteroids",     emoji:"☄",  path:"asteroids.html",     x: TILE*16, y: HEIGHT - TILE*7,  color:"#FFB800" },
  { id:5, name:"Flappy",        emoji:"🐦", path:"flappy.html",        x: TILE*21, y: HEIGHT - TILE*4,  color:"#4ade80" },
  { id:6, name:"Tetris",        emoji:"🟪", path:"tetris.html",        x: TILE*26, y: HEIGHT - TILE*7,  color:"#a78bfa" },
  { id:7, name:"Dino",          emoji:"🦕", path:"dino.html",          x: TILE*31, y: HEIGHT - TILE*4,  color:"#FF8C00" },
  { id:8, name:"Space Invaders",emoji:"👾", path:"spaceinvaders.html", x: TILE*35, y: HEIGHT - TILE*7,  color:"#4ade80" },
];

const SIZE = TILE;
let player = { x: TILE * 1.5, y: HEIGHT - TILE * 3, width: SIZE, height: SIZE };

const playerAvatar = new Image();
playerAvatar.src = currentUser.avatar;

// ── Teclas mantenidas ──
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)) e.preventDefault();
  if (e.key === 'Enter' && currentLevel) window.location.href = currentLevel.path;
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

// ── Update: movimiento libre ──
function update() {
  let vx = 0, vy = 0;
  if (keys['ArrowLeft']  || keys['a']) vx -= SPEED;
  if (keys['ArrowRight'] || keys['d']) vx += SPEED;
  if (keys['ArrowUp']    || keys['w']) vy -= SPEED;
  if (keys['ArrowDown']  || keys['s']) vy += SPEED;
  if (vx && vy) { vx *= 0.707; vy *= 0.707; }
  player.x = Math.max(0, Math.min(WIDTH  - player.width,  player.x + vx));
  player.y = Math.max(0, Math.min(HEIGHT - player.height, player.y + vy));
}

// ── Fondo ──
function drawBackground() {
  ctx.fillStyle = '#0A0A18';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let x = TILE; x < WIDTH; x += TILE)
    for (let y = TILE; y < HEIGHT; y += TILE) {
      ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI*2); ctx.fill();
    }

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.setLineDash([5,12]);
  ctx.beginPath();
  ctx.moveTo(LEVELS[0].x + TILE/2, LEVELS[0].y + TILE/2);
  LEVELS.forEach(lv => ctx.lineTo(lv.x + TILE/2, lv.y + TILE/2));
  ctx.stroke();
  ctx.restore();
}

// ── Niveles ──
function drawLevels() {
  const t = Date.now();
  LEVELS.forEach(lv => {
    const locked = lv.id > maxLevel;
    const cx = lv.x + TILE/2, cy = lv.y + TILE/2;

    if (!locked) {
      const pulse = 0.5 + 0.5 * Math.sin(t/700 + lv.id*1.5);
      ctx.save();
      ctx.globalAlpha = 0.12 + pulse*0.13;
      ctx.fillStyle = lv.color;
      roundRect(ctx, lv.x-6, lv.y-6, TILE+12, TILE+12, 12); ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = lv.color; ctx.shadowBlur = 10 + pulse*8;
      ctx.fillStyle = lv.color;
      roundRect(ctx, lv.x, lv.y, TILE, TILE, 7); ctx.fill();
      ctx.restore();

      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.font = "bold 13px 'Orbitron',monospace";
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(lv.id, cx, cy);

      ctx.fillStyle = lv.color; ctx.font = "10px 'Orbitron',monospace";
      ctx.textBaseline = 'top';
      ctx.fillText(`${lv.emoji} ${lv.name}`, cx, lv.y + TILE + 5);
    } else {
      ctx.fillStyle = '#161628'; ctx.strokeStyle = '#2A2A48'; ctx.lineWidth = 1;
      roundRect(ctx, lv.x, lv.y, TILE, TILE, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.font = '16px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🔒', cx, cy);
    }
  });
}

// ── Jugador ──
function drawPlayer() {
  ctx.save();
  ctx.shadowColor = '#00FFF7'; ctx.shadowBlur = 14;
  ctx.drawImage(playerAvatar, player.x, player.y, player.width, player.height);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,255,247,0.8)'; ctx.lineWidth = 1.5;
  roundRect(ctx, player.x, player.y, player.width, player.height, 4); ctx.stroke();
}

// ── Interacción ──
let currentLevel = null;
function checkLevelInteraction() {
  const inst = document.getElementById('map-instructions');
  const px = player.x + player.width/2, py = player.y + player.height/2;
  const tol = TILE * 0.85;

  const active = LEVELS.find(lv =>
    Math.abs(px - (lv.x + TILE/2)) < tol &&
    Math.abs(py - (lv.y + TILE/2)) < tol
  );

  if (active) {
    if (active.id <= maxLevel) {
      inst.textContent = `Presioná Enter para jugar: ${active.emoji} ${active.name}`;
      inst.className = 'active'; return active;
    } else {
      inst.textContent = `Nivel ${active.id} bloqueado · Completá el anterior primero`;
      inst.className = 'locked';
    }
  } else {
    inst.textContent = 'Usá las flechas o WASD · Enter para entrar al nivel';
    inst.className = '';
  }
  return null;
}

// ── Util ──
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

// ── Loop ──
function gameLoop() {
  update();
  currentLevel = checkLevelInteraction();
  drawBackground(); drawLevels(); drawPlayer();
}

playerAvatar.onload = () => { setInterval(gameLoop, 1000/60); };
if (playerAvatar.complete) playerAvatar.onload();
