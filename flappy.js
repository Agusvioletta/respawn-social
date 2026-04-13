// flappy.js — Respawn Social v2

const canvas  = document.getElementById('flappy-board');
const ctx     = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const W = canvas.width, H = canvas.height;
const WIN_SCORE = 15;

const C = {
  bg:     '#0A0A18',
  bird:   '#FF4F7B',
  birdHL: '#FF8CAB',
  pipe:   '#1C1C34',
  pipeBorder: '#C084FC',
  score:  '#00FFF7',
  ground: '#111120',
};

let bird, pipes, score, bestScore, running, gameEnded, overlayGoMap, raf;

function el(id) { return document.getElementById(id); }

bestScore = parseInt(localStorage.getItem("flappy_best"))||0;
el('best').textContent = bestScore;

function initGame() {
  bird      = { x:80, y:H/2, vy:0, radius:14 };
  pipes     = [];
  score     = 0;
  running   = false;
  gameEnded = false;
  overlayGoMap = false;
  el('score').textContent = '0';
  pipeTimer = 0;
}

// ── Bird physics ──
const GRAVITY   = 0.45;
const FLAP_VEL  = -8;
const PIPE_W    = 52;
const PIPE_GAP  = 140;
const PIPE_SPEED = 2.4;

let pipeTimer = 0;

function spawnPipe() {
  const minTop = 60, maxTop = H - PIPE_GAP - 80;
  const top = minTop + Math.random() * (maxTop - minTop);
  pipes.push({ x: W+10, top, scored: false });
}

// ── Draw ──
function drawBird() {
  const {x,y,vy} = bird;
  const tilt = Math.min(Math.max(vy * 3, -40), 60);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt * Math.PI/180);

  // Body
  ctx.save();
  ctx.shadowColor = C.bird; ctx.shadowBlur = 12;
  ctx.fillStyle   = C.bird;
  ctx.beginPath(); ctx.ellipse(0, 0, bird.radius, bird.radius*0.85, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // Highlight
  ctx.fillStyle = C.birdHL;
  ctx.beginPath(); ctx.ellipse(-3, -4, 5, 4, -0.3, 0, Math.PI*2); ctx.fill();

  // Eye
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(6, -4, 4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(7, -4, 2, 0, Math.PI*2); ctx.fill();

  // Wing
  ctx.fillStyle = 'rgba(255,79,123,0.6)';
  ctx.beginPath(); ctx.ellipse(-4, 3, 8, 4, 0.3, 0, Math.PI*2); ctx.fill();

  ctx.restore();
}

function drawPipe(p) {
  const r = 8;
  // Top pipe
  ctx.fillStyle = C.pipe;
  ctx.strokeStyle = C.pipeBorder;
  ctx.lineWidth = 1.5;
  // Shaft
  roundRect(ctx, p.x, 0, PIPE_W, p.top-10, 0, 0, r, r);
  ctx.fill(); ctx.stroke();
  // Cap
  roundRect(ctx, p.x-6, p.top-20, PIPE_W+12, 20, r, r, r, r);
  ctx.fill(); ctx.stroke();

  // Bottom pipe
  const botY = p.top + PIPE_GAP;
  roundRect(ctx, p.x-6, botY, PIPE_W+12, 20, r, r, r, r);
  ctx.fill(); ctx.stroke();
  roundRect(ctx, p.x, botY+20, PIPE_W, H-botY-20, r, r, 0, 0);
  ctx.fill(); ctx.stroke();
}

function roundRect(ctx, x, y, w, h, tl=0, tr=0, br=0, bl=0) {
  ctx.beginPath();
  ctx.moveTo(x+tl, y);
  ctx.lineTo(x+w-tr, y); ctx.arcTo(x+w, y, x+w, y+tr, tr);
  ctx.lineTo(x+w, y+h-br); ctx.arcTo(x+w, y+h, x+w-br, y+h, br);
  ctx.lineTo(x+bl, y+h); ctx.arcTo(x, y+h, x, y+h-bl, bl);
  ctx.lineTo(x, y+tl); ctx.arcTo(x, y, x+tl, y, tl);
  ctx.closePath();
}

function drawBackground() {
  // Sky gradient
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0, '#07070F');
  grad.addColorStop(1, '#0D0D20');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,H);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  [[40,60],[120,30],[200,80],[280,20],[320,70],[80,120],[160,50]].forEach(([sx,sy])=>{
    ctx.beginPath(); ctx.arc(sx,sy,1,0,Math.PI*2); ctx.fill();
  });

  // Ground
  ctx.fillStyle = C.ground;
  ctx.fillRect(0, H-30, W, 30);
  ctx.fillStyle = 'rgba(192,132,252,0.2)';
  ctx.fillRect(0, H-31, W, 2);
}

function drawScore() {
  ctx.fillStyle = C.score;
  ctx.font      = "bold 28px 'Orbitron', monospace";
  ctx.textAlign = 'center';
  ctx.shadowColor = C.score; ctx.shadowBlur = 10;
  ctx.fillText(score, W/2, 50);
  ctx.shadowBlur = 0;
}

// ── Update ──
function update() {
  bird.vy += GRAVITY;
  bird.y  += bird.vy;

  pipeTimer++;
  if (pipeTimer >= 90) { spawnPipe(); pipeTimer = 0; }

  pipes.forEach(p => { p.x -= PIPE_SPEED; });
  pipes = pipes.filter(p => p.x > -PIPE_W-20);

  // Score
  pipes.forEach(p => {
    if (!p.scored && p.x + PIPE_W < bird.x) {
      p.scored = true; score++;
      el('score').textContent = score;
      if (score > bestScore) {
        bestScore = score;
        el('best').textContent = bestScore;
        localStorage.setItem("flappy_best", bestScore);
      }
    }
  });

  // Collisions
  if (bird.y + bird.radius > H-30 || bird.y - bird.radius < 0) { gameOver(); return; }
  pipes.forEach(p => {
    const bx = bird.x, by = bird.y, br = bird.radius - 2;
    const inX = bx+br > p.x-6 && bx-br < p.x+PIPE_W+6;
    if (inX && (by-br < p.top || by+br > p.top+PIPE_GAP)) { gameOver(); }
  });

  if (score >= WIN_SCORE) { gameWin(); }
}

function gameLoop() {
  if (!running) return;
  drawBackground();
  pipes.forEach(drawPipe);
  drawBird();
  drawScore();
  update();
  raf = requestAnimationFrame(gameLoop);
}

// ── Game over / win ──
function gameOver() {
  running = false; gameEnded = true;
  cancelAnimationFrame(raf);
  showOverlay('GAME OVER', `${score} puntos · Necesitás ${WIN_SCORE} para avanzar · Enter para reintentar`, false);
}

function gameWin() {
  running = false; gameEnded = true;
  cancelAnimationFrame(raf);
  const maxLevel = parseInt(localStorage.getItem("maxLevel"))||1;
  if (maxLevel === 5) {
    saveMaxLevel(6);
    showOverlay('¡GANASTE!', '🟪 Tetris desbloqueado · Enter para volver al mapa', true);
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
    <div style="font-family:var(--font-display);font-size:20px;font-weight:900;color:${goMap?'var(--cyan)':'var(--pink)'};letter-spacing:2px;">${title}</div>
    <div style="font-family:var(--font-display);font-size:28px;font-weight:900;color:var(--pink);">${score}</div>
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary);text-align:center;max-width:280px;">${sub}</div>`;
}

function flap() {
  if (gameEnded) {
    if (overlayGoMap) { window.location.href='gamemap.html'; return; }
    initGame();
    overlay.style.display = 'none';
    return;
  }
  if (!running) {
    running = true;
    overlay.style.display = 'none';
    requestAnimationFrame(gameLoop);
  }
  bird.vy = FLAP_VEL;
}

document.addEventListener('keydown', e => { if (e.key===' '||e.key==='Enter'||e.key==='ArrowUp') { e.preventDefault(); flap(); } });
canvas.addEventListener('click', flap);

initGame();
// Draw initial frame
drawBackground();
drawBird();
