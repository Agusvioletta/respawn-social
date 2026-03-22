// snake.js — Respawn Social v2

const canvas       = document.getElementById('game-board');
const ctx          = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const overlay      = document.getElementById('overlay');

const GRID        = 20;
const TILE        = canvas.width / GRID;
const WIN_SCORE   = 10;

// Paleta
const C = {
  bg:       '#0A0A18',
  grid:     'rgba(255,255,255,0.03)',
  snake:    '#00FFF7',
  snakeDim: '#007A76',
  food:     '#FF4F7B',
  foodGlow: 'rgba(255,79,123,0.6)',
  text:     '#E8E8F0'
};

let snake, food, dx, dy, score, running, gameEnded, gameLoopInterval;

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
function initGame() {
  snake = [{ x:10, y:10 }];
  dx = 1; dy = 0;
  score = 0;
  running = false;
  gameEnded = false;
  overlayGoMap = false;
  scoreDisplay.textContent = '0';
  placeFood();
  draw();
}

function startGame() {
  if (running) return;
  running = true;
  overlay.style.display = 'none';
  clearInterval(gameLoopInterval);
  gameLoopInterval = setInterval(gameLoop, 140);
}

// ─────────────────────────────────────────
// FOOD
// ─────────────────────────────────────────
function placeFood() {
  do {
    food = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake.some(s => s.x === food.x && s.y === food.y));
}

// ─────────────────────────────────────────
// DRAW
// ─────────────────────────────────────────
function draw() {
  // Fondo
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx.fillStyle = C.grid;
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      ctx.fillRect(x * TILE + TILE/2 - 1, y * TILE + TILE/2 - 1, 2, 2);
    }
  }

  // Comida con glow
  ctx.save();
  ctx.shadowColor = C.foodGlow;
  ctx.shadowBlur  = 12;
  ctx.fillStyle   = C.food;
  const fx = food.x * TILE + 3;
  const fy = food.y * TILE + 3;
  const fs = TILE - 6;
  roundRect(ctx, fx, fy, fs, fs, 4);
  ctx.fill();
  ctx.restore();

  // Snake
  snake.forEach((seg, i) => {
    const alpha = Math.max(0.3, 1 - i * 0.04);
    ctx.fillStyle = i === 0 ? C.snake : `rgba(0,200,195,${alpha})`;
    if (i === 0) {
      ctx.save();
      ctx.shadowColor = C.snake;
      ctx.shadowBlur  = 10;
    }
    roundRect(ctx, seg.x * TILE + 1, seg.y * TILE + 1, TILE - 2, TILE - 2, i === 0 ? 5 : 3);
    ctx.fill();
    if (i === 0) ctx.restore();
  });
}

// ─────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────
function update() {
  if (gameEnded) return;

  const head = { x: snake[0].x + dx, y: snake[0].y + dy };
  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreDisplay.textContent = score;
    placeFood();
  } else {
    snake.pop();
  }

  // Colisiones con bordes y cuerpo
  if (
    head.x < 0 || head.x >= GRID ||
    head.y < 0 || head.y >= GRID ||
    snake.slice(1).some(s => s.x === head.x && s.y === head.y)
  ) {
    gameEnded = true;
    gameOver(false);
    return;
  }

  // Victoria — solo si aún no terminó
  if (score >= WIN_SCORE) {
    gameEnded = true;
    gameOver(true);
  }
}

// ─────────────────────────────────────────
// GAME OVER
// ─────────────────────────────────────────
function gameOver(won) {
  clearInterval(gameLoopInterval);
  running = false;

  const maxLevel = parseInt(localStorage.getItem("maxLevel")) || 1;

  if (won) {
    // Desbloquear nivel 2 solo si corresponde
    if (maxLevel === 1) {
      localStorage.setItem("maxLevel", "2");
      saveMaxLevelToUser(2);
      showOverlay('¡NIVEL SUPERADO!', '🏓 Pong desbloqueado · Enter para volver al mapa', true);
    } else {
      showOverlay('¡BIEN JUGADO!', `Puntaje: ${score} · Enter para volver al mapa`, true);
    }
  } else {
    showOverlay('GAME OVER', `Puntaje: ${score} de ${WIN_SCORE} necesarios · Enter para reintentar`, false);
  }
}

function showOverlay(title, sub, goMap) {
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div style="font-family:var(--font-display);font-size:20px;font-weight:900;color:${goMap ? 'var(--cyan)' : 'var(--pink)'};letter-spacing:2px;">${title}</div>
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary);text-align:center;max-width:280px;">${sub}</div>
  `;
  overlayGoMap = goMap;
}

let overlayGoMap = false;

// ─────────────────────────────────────────
// CONTROLES
// ─────────────────────────────────────────
let pendingDir = null;

document.addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)) {
    e.preventDefault();
  }

  // Juego terminado (ganó o perdió) — solo Enter actúa
  if (gameEnded) {
    if (e.key === 'Enter') {
      if (overlayGoMap) { window.location.href = 'gamemap.html'; return; }
      initGame();
      startGame();
    }
    return;
  }

  // Esperando empezar (overlay inicial)
  if (!running) {
    startGame();
    return;
  }

  // En juego — cambiar dirección
  switch (e.key) {
    case 'ArrowLeft':  case 'a': if (dx !== 1)  { dx=-1; dy=0;  } break;
    case 'ArrowRight': case 'd': if (dx !== -1) { dx=1;  dy=0;  } break;
    case 'ArrowUp':    case 'w': if (dy !== 1)  { dx=0;  dy=-1; } break;
    case 'ArrowDown':  case 's': if (dy !== -1) { dx=0;  dy=1;  } break;
  }
});

// ─────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r); ctx.closePath();
}

function gameLoop() { update(); draw(); }

// ─────────────────────────────────────────
// SYNC — Guarda maxLevel en el objeto user
// ─────────────────────────────────────────
function saveMaxLevelToUser(level) {
  const allUsers = JSON.parse(localStorage.getItem("users")) || [];
  const me = JSON.parse(localStorage.getItem("currentUser"));
  if (!me) return;
  const idx = allUsers.findIndex(u => u.username === me.username);
  if (idx !== -1) { allUsers[idx].maxLevel = level; localStorage.setItem("users", JSON.stringify(allUsers)); }
  me.maxLevel = level;
  localStorage.setItem("currentUser", JSON.stringify(me));
}

// ─────────────────────────────────────────
// INICIO
// ─────────────────────────────────────────
const maxLvlBadge = document.getElementById('currentLevel');
if (maxLvlBadge) maxLvlBadge.textContent = localStorage.getItem("maxLevel") || "1";

initGame();
