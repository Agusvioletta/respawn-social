// pong.js — Respawn Social v2

const canvas = document.getElementById('pong-board');
const ctx    = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const WIN_SCORE = 5;
const CPU_MARGIN = 48;

const C = {
  bg:       '#0A0A18',
  net:      'rgba(255,255,255,0.06)',
  player:   '#00FFF7',
  cpu:      '#FF4F7B',
  ball:     '#E8E8F0',
  ballGlow: 'rgba(232,232,240,0.5)'
};

// ─────────────────────────────────────────
// OBJETOS
// ─────────────────────────────────────────
const PAD = { w:10, h:72, speed:6 };

let player = { x:16, y:H/2 - PAD.h/2, score:0, dy:0 };
let cpu    = { x:W - 16 - PAD.w, y:H/2 - PAD.h/2, score:0 };
let ball   = { x:W/2, y:H/2, r:7, speed:5, dx:5, dy:3 };

let running = false, gameLoopInterval;
const overlay = document.getElementById('overlay');
let overlayGoMap = false;

// ─────────────────────────────────────────
// DRAW
// ─────────────────────────────────────────
function draw() {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // Red central
  for (let y = 8; y < H; y += 18) {
    ctx.fillStyle = C.net;
    ctx.fillRect(W/2 - 1, y, 2, 10);
  }

  // Player paddle con glow
  ctx.save();
  ctx.shadowColor = C.player; ctx.shadowBlur = 12;
  ctx.fillStyle   = C.player;
  roundRect(ctx, player.x, player.y, PAD.w, PAD.h, 4); ctx.fill();
  ctx.restore();

  // CPU paddle
  ctx.save();
  ctx.shadowColor = C.cpu; ctx.shadowBlur = 12;
  ctx.fillStyle   = C.cpu;
  roundRect(ctx, cpu.x, cpu.y, PAD.w, PAD.h, 4); ctx.fill();
  ctx.restore();

  // Pelota con glow
  ctx.save();
  ctx.shadowColor = C.ballGlow; ctx.shadowBlur = 16;
  ctx.fillStyle   = C.ball;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────
function update() {
  // Player
  player.y += player.dy;
  player.y = Math.max(0, Math.min(H - PAD.h, player.y));

  // CPU IA
  const cpuCenter = cpu.y + PAD.h / 2;
  if (cpuCenter < ball.y - CPU_MARGIN) cpu.y += PAD.speed * 0.9;
  else if (cpuCenter > ball.y + CPU_MARGIN) cpu.y -= PAD.speed * 0.9;
  cpu.y = Math.max(0, Math.min(H - PAD.h, cpu.y));

  // Pelota
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Paredes arriba/abajo
  if (ball.y - ball.r < 0) { ball.dy = Math.abs(ball.dy); ball.y = ball.r; }
  if (ball.y + ball.r > H) { ball.dy = -Math.abs(ball.dy); ball.y = H - ball.r; }

  // Colisión paletas
  [player, cpu].forEach(pad => {
    if (
      ball.x - ball.r < pad.x + PAD.w &&
      ball.x + ball.r > pad.x &&
      ball.y > pad.y && ball.y < pad.y + PAD.h
    ) {
      ball.dx = -ball.dx;
      const rel = (ball.y - (pad.y + PAD.h/2)) / (PAD.h/2);
      ball.dy   = rel * ball.speed;
      ball.speed = Math.min(ball.speed + 0.3, 14);
      // Evitar que se quede pegada
      ball.x = pad === player ? pad.x + PAD.w + ball.r : pad.x - ball.r;
    }
  });

  // Punto
  if (ball.x - ball.r < 0) {
    cpu.score++;
    document.getElementById('cpuScore').textContent = cpu.score;
    if (cpu.score >= WIN_SCORE) { gameOver(false); return; }
    resetBall();
  } else if (ball.x + ball.r > W) {
    player.score++;
    document.getElementById('playerScore').textContent = player.score;
    if (player.score >= WIN_SCORE) { gameOver(true); return; }
    resetBall();
  }
}

function resetBall() {
  ball.x = W/2; ball.y = H/2;
  ball.speed = 5;
  ball.dx = (Math.random() > 0.5 ? 1 : -1) * 5;
  ball.dy = (Math.random() > 0.5 ? 1 : -1) * 3;
}

// ─────────────────────────────────────────
// GAME OVER
// ─────────────────────────────────────────
function gameOver(won) {
  clearInterval(gameLoopInterval);
  running = false;
  const maxLevel = parseInt(localStorage.getItem("maxLevel")) || 1;

  if (won && maxLevel === 2) {
    localStorage.setItem("maxLevel", "3");
    saveMaxLevel(3);
    showOverlay('¡GANASTE!', '🧱 Breakout desbloqueado · Enter para volver al mapa', true);
  } else if (won) {
    showOverlay('¡GANASTE!', `${player.score} — ${cpu.score} · Enter para volver al mapa`, true);
  } else {
    showOverlay('PERDISTE', `${player.score} — ${cpu.score} · Enter para reintentar`, false);
  }
}



function showOverlay(title, sub, goMap) {
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div style="font-family:var(--font-display);font-size:20px;font-weight:900;color:${goMap ? 'var(--cyan)' : 'var(--pink)'};letter-spacing:2px;">${title}</div>
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary);text-align:center;max-width:300px;">${sub}</div>
  `;
  overlayGoMap = goMap;
}

// ─────────────────────────────────────────
// CONTROLES
// ─────────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (['ArrowUp','ArrowDown','w','s'].includes(e.key)) e.preventDefault();

  if (!running) {
    if (e.key === 'Enter' && overlayGoMap) { window.location.href = 'gamemap.html'; return; }
    startGame(); return;
  }
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

function handlePlayer() {
  if (keys['ArrowUp']   || keys['w']) player.dy = -PAD.speed;
  else if (keys['ArrowDown'] || keys['s']) player.dy = PAD.speed;
  else player.dy = 0;
}

function startGame() {
  if (running) return;
  player.score = 0; cpu.score = 0;
  document.getElementById('playerScore').textContent = '0';
  document.getElementById('cpuScore').textContent    = '0';
  player.y = H/2 - PAD.h/2;
  cpu.y    = H/2 - PAD.h/2;
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

function gameLoop() { handlePlayer(); update(); draw(); }

draw(); // primer frame
