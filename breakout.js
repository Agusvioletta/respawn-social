// breakout.js — Respawn Social v2

const canvas = document.getElementById('breakout-board');
const ctx    = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const C = {
  bg:      '#0A0A18',
  paddle:  '#00FFF7',
  ball:    '#E8E8F0',
  bricks:  ['#C084FC','#FF4F7B','#00FFF7','#ffaa00'],
};

// ─────────────────────────────────────────
// CONFIGURACIÓN DE BLOQUES
// ─────────────────────────────────────────
const COLS    = 8;
const ROWS    = 4;
const B_W     = 48;
const B_H     = 18;
const B_PAD   = 6;
const B_OFF_X = (W - (COLS * (B_W + B_PAD) - B_PAD)) / 2;
const B_OFF_Y = 28;

// ─────────────────────────────────────────
// OBJETOS
// ─────────────────────────────────────────
const paddle = { w:80, h:10, x:W/2 - 40, y:H - 18, dx:0, speed:7 };
const ball   = { x:W/2, y:H/2, r:6, dx:3.5, dy:-3.5 };

let bricks = [], score = 0, lives = 3, running = false, gameLoopInterval;
const overlay = document.getElementById('overlay');
let overlayGoMap = false;

function makeBricks() {
  bricks = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      bricks.push({
        x: B_OFF_X + c * (B_W + B_PAD),
        y: B_OFF_Y + r * (B_H + B_PAD),
        alive: true,
        color: C.bricks[r % C.bricks.length]
      });
    }
  }
}

// ─────────────────────────────────────────
// DRAW
// ─────────────────────────────────────────
function draw() {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // Bloques
  bricks.forEach(b => {
    if (!b.alive) return;
    ctx.save();
    ctx.shadowColor = b.color + '88';
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = b.color;
    roundRect(ctx, b.x, b.y, B_W, B_H, 4);
    ctx.fill();
    // Highlight superior
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, b.x, b.y, B_W, 4, 4);
    ctx.fill();
    ctx.restore();
  });

  // Paddle
  ctx.save();
  ctx.shadowColor = C.paddle; ctx.shadowBlur = 12;
  ctx.fillStyle   = C.paddle;
  roundRect(ctx, paddle.x, paddle.y, paddle.w, paddle.h, 5);
  ctx.fill();
  ctx.restore();

  // Ball
  ctx.save();
  ctx.shadowColor = 'rgba(232,232,240,0.6)'; ctx.shadowBlur = 12;
  ctx.fillStyle   = C.ball;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────
function update() {
  // Paddle
  paddle.x += paddle.dx;
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

  // Ball
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Paredes laterales
  if (ball.x - ball.r < 0)     { ball.dx = Math.abs(ball.dx); ball.x = ball.r; }
  if (ball.x + ball.r > W)     { ball.dx = -Math.abs(ball.dx); ball.x = W - ball.r; }
  // Techo
  if (ball.y - ball.r < 0)     { ball.dy = Math.abs(ball.dy); ball.y = ball.r; }

  // Suelo — perder vida
  if (ball.y + ball.r > H) {
    lives--;
    updateLivesDisplay();
    if (lives <= 0) { gameOver(false); return; }
    resetBall();
  }

  // Paleta
  if (
    ball.x > paddle.x && ball.x < paddle.x + paddle.w &&
    ball.y + ball.r > paddle.y && ball.y + ball.r < paddle.y + paddle.h + 4
  ) {
    ball.dy = -Math.abs(ball.dy);
    // Desvío según punto de impacto
    const rel = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    ball.dx = rel * 5;
    ball.y  = paddle.y - ball.r;
  }

  // Bloques
  for (let b of bricks) {
    if (!b.alive) continue;
    if (
      ball.x + ball.r > b.x && ball.x - ball.r < b.x + B_W &&
      ball.y + ball.r > b.y && ball.y - ball.r < b.y + B_H
    ) {
      ball.dy = -ball.dy;
      b.alive = false;
      score += 10;
      document.getElementById('score').textContent = score;

      if (bricks.every(bk => !bk.alive)) { gameOver(true); return; }
      break;
    }
  }
}

function resetBall() {
  ball.x = W/2; ball.y = paddle.y - ball.r - 4;
  ball.dx = (Math.random() > 0.5 ? 1 : -1) * 3.5;
  ball.dy = -3.5;
}

function updateLivesDisplay() {
  document.getElementById('lives').textContent = '♥ '.repeat(Math.max(0, lives)).trim();
}

// ─────────────────────────────────────────
// GAME OVER
// ─────────────────────────────────────────
function gameOver(won) {
  clearInterval(gameLoopInterval);
  running = false;
  const maxLevel = parseInt(localStorage.getItem("maxLevel")) || 1;

  if (won && maxLevel === 3) {
    localStorage.setItem("maxLevel", "4");
    saveMaxLevel(4);
    showOverlay('¡GANASTE!', '🏆 ¡Completaste todos los niveles! Enter para volver', true);
  } else if (won) {
    showOverlay('¡GANASTE!', `Puntaje: ${score} · Enter para volver al mapa`, true);
  } else {
    showOverlay('GAME OVER', `Puntaje: ${score} · Enter para reintentar`, false);
  }
}



function showOverlay(title, sub, goMap) {
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div style="font-family:var(--font-display);font-size:20px;font-weight:900;color:${goMap ? 'var(--purple)' : 'var(--pink)'};letter-spacing:2px;">${title}</div>
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary);text-align:center;max-width:280px;">${sub}</div>
  `;
  overlayGoMap = goMap;
}

// ─────────────────────────────────────────
// CONTROLES
// ─────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight','a','d'].includes(e.key)) e.preventDefault();

  if (!running) {
    if (e.key === 'Enter' && overlayGoMap) { window.location.href = 'gamemap.html'; return; }
    startGame(); return;
  }

  if (e.key === 'ArrowRight' || e.key === 'd') paddle.dx =  paddle.speed;
  if (e.key === 'ArrowLeft'  || e.key === 'a') paddle.dx = -paddle.speed;
});

document.addEventListener('keyup', e => {
  if (['ArrowLeft','ArrowRight','a','d'].includes(e.key)) paddle.dx = 0;
});

function startGame() {
  if (running) return;
  score = 0; lives = 3;
  document.getElementById('score').textContent = '0';
  updateLivesDisplay();
  makeBricks();
  paddle.x = W/2 - paddle.w/2;
  resetBall();
  running = true;
  overlay.style.display = 'none';
  overlayGoMap = false;
  clearInterval(gameLoopInterval);
  gameLoopInterval = setInterval(gameLoop, 1000/60);
}

// ─────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

function gameLoop() { update(); draw(); }

draw(); // primer frame
