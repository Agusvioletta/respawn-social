// tetris.js — Respawn Social v2

const canvas     = document.getElementById('tetris-board');
const ctx        = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx    = nextCanvas.getContext('2d');
const overlay    = document.getElementById('overlay');

const COLS = 12, ROWS = 24, BLOCK = 20;
const WIN_LINES = 20; // líneas para desbloquear siguiente nivel

const COLORS = {
  I: '#00FFF7', O: '#FFD700', T: '#C084FC',
  S: '#4ade80', Z: '#FF4F7B', J: '#3B82F6', L: '#FF8C00'
};

const PIECES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
};

const PIECE_KEYS = Object.keys(PIECES);

let board, currentPiece, nextPiece, score, linesCleared, level, gameRunning, gameEnded, dropInterval, lastDrop;

function el(id) { return document.getElementById(id); }

function newPiece() {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  return { shape: PIECES[key].map(r=>[...r]), color: COLORS[key], x: Math.floor(COLS/2) - 2, y: 0 };
}

function initGame() {
  board       = Array.from({length:ROWS}, () => Array(COLS).fill(null));
  score       = 0; linesCleared = 0; level = 1;
  gameRunning = false; gameEnded = false;
  currentPiece = newPiece();
  nextPiece    = newPiece();
  dropInterval = 600;
  lastDrop     = 0;
  updateHUD();
  drawBoard();
  drawNext();
}

function updateHUD() {
  el('score').textContent = score;
  el('level').textContent = level;
  el('lines').textContent = linesCleared;
}

// ── Draw ──────────────────────────────────
function drawBlock(ctx, x, y, color, size=BLOCK) {
  ctx.fillStyle = color;
  ctx.fillRect(x*size+1, y*size+1, size-2, size-2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x*size+1, y*size+1, size-2, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x*size+1, y*size+size-4, size-2, 3);
}

function drawBoard() {
  ctx.fillStyle = '#0A0A18';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth   = 0.5;
  for (let c=0;c<COLS;c++) { ctx.beginPath(); ctx.moveTo(c*BLOCK,0); ctx.lineTo(c*BLOCK,canvas.height); ctx.stroke(); }
  for (let r=0;r<ROWS;r++) { ctx.beginPath(); ctx.moveTo(0,r*BLOCK); ctx.lineTo(canvas.width,r*BLOCK); ctx.stroke(); }

  // Board cells
  board.forEach((row,r) => row.forEach((color,c) => { if (color) drawBlock(ctx,c,r,color); }));

  // Ghost piece
  if (currentPiece && gameRunning) {
    const ghost = {...currentPiece, y: currentPiece.y};
    while (!collides({...ghost, y: ghost.y+1})) ghost.y++;
    currentPiece.shape.forEach((row,r) => row.forEach((v,c) => {
      if (v && ghost.y+r !== currentPiece.y+r) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect((ghost.x+c)*BLOCK+1, (ghost.y+r)*BLOCK+1, BLOCK-2, BLOCK-2);
      }
    }));
    // Current piece
    currentPiece.shape.forEach((row,r) => row.forEach((v,c) => {
      if (v) drawBlock(ctx, currentPiece.x+c, currentPiece.y+r, currentPiece.color);
    }));
  }
}

function drawNext() {
  nextCtx.fillStyle = '#0A0A18';
  nextCtx.fillRect(0,0,nextCanvas.width,nextCanvas.height);
  if (!nextPiece) return;
  const off = 1;
  nextPiece.shape.forEach((row,r) => row.forEach((v,c) => {
    if (v) drawBlock(nextCtx, c+off, r+off, nextPiece.color, 16);
  }));
}

// ── Logic ─────────────────────────────────
function collides(piece) {
  return piece.shape.some((row,r) => row.some((v,c) => {
    if (!v) return false;
    const nx = piece.x+c, ny = piece.y+r;
    return nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && board[ny][nx]);
  }));
}

function merge() {
  currentPiece.shape.forEach((row,r) => row.forEach((v,c) => {
    if (v && currentPiece.y+r >= 0) board[currentPiece.y+r][currentPiece.x+c] = currentPiece.color;
  }));
}

function clearLines() {
  let cleared = 0;
  for (let r=ROWS-1; r>=0; r--) {
    if (board[r].every(c=>c)) {
      board.splice(r,1);
      board.unshift(Array(COLS).fill(null));
      cleared++; r++;
    }
  }
  if (!cleared) return;
  const pts = [0,100,300,500,800];
  score       += (pts[cleared]||1000) * level;
  linesCleared += cleared;
  level         = Math.floor(linesCleared/10)+1;
  dropInterval  = Math.max(80, 600 - (level-1)*55);
  updateHUD();
}

function rotate(piece) {
  const M = piece.shape;
  const R = M[0].map((_,i) => M.map(r=>r[i]).reverse());
  const rotated = {...piece, shape:R};
  if (collides(rotated)) return piece;
  return rotated;
}

function drop() {
  const moved = {...currentPiece, y: currentPiece.y+1};
  if (!collides(moved)) { currentPiece = moved; return; }
  merge();
  clearLines();
  currentPiece = nextPiece;
  nextPiece    = newPiece();
  drawNext();
  if (collides(currentPiece)) { gameOver(); }
}

function hardDrop() {
  while (!collides({...currentPiece, y: currentPiece.y+1})) currentPiece.y++;
  drop();
}

// ── Game loop ──────────────────────────────
function gameLoop(ts) {
  if (!gameRunning) return;
  if (ts - lastDrop >= dropInterval) { drop(); lastDrop = ts; }
  drawBoard();
  requestAnimationFrame(gameLoop);
}

function startGame() {
  if (gameRunning || gameEnded) return;
  gameRunning = true;
  overlay.style.display = 'none';
  lastDrop = performance.now();
  requestAnimationFrame(gameLoop);
}

// ── Game over ──────────────────────────────
let overlayGoMap = false;

function gameOver() {
  gameRunning = false; gameEnded = true;
  const maxLevel = parseInt(localStorage.getItem("maxLevel"))||1;
  const WIN_SCORE_TETRIS = 500;

  if (score >= WIN_SCORE_TETRIS && maxLevel === 6) {
    saveMaxLevel(7);
    showOverlay('¡GANASTE!', `${score} puntos · Nivel 7 desbloqueado · Enter para continuar`, true);
  } else {
    showOverlay('GAME OVER', `${score} puntos · Enter para reintentar`, false);
  }
}

function saveMaxLevel(n) {
  localStorage.setItem("maxLevel", String(n));
  const allUsers = JSON.parse(localStorage.getItem("users"))||[];
  const me = JSON.parse(localStorage.getItem("currentUser"));
  if (!me) return;
  const idx = allUsers.findIndex(u=>u.username===me.username);
  if (idx!==-1){allUsers[idx].maxLevel=n;localStorage.setItem("users",JSON.stringify(allUsers));}
  me.maxLevel=n; localStorage.setItem("currentUser",JSON.stringify(me));
}

function showOverlay(title, sub, goMap) {
  overlayGoMap = goMap;
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div style="font-family:var(--font-display);font-size:20px;font-weight:900;color:${goMap?'var(--purple)':'var(--pink)'};letter-spacing:2px;">${title}</div>
    <div style="font-family:var(--font-display);font-size:22px;color:var(--cyan);">${el('score').textContent}</div>
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary);text-align:center;max-width:280px;">${sub}</div>`;
}

// ── Controls ───────────────────────────────
document.addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();

  if (gameEnded) {
    if (e.key==='Enter') { if (overlayGoMap) window.location.href='gamemap.html'; else { initGame(); } }
    return;
  }
  if (!gameRunning) { startGame(); return; }

  switch(e.key) {
    case 'ArrowLeft':  { const m={...currentPiece,x:currentPiece.x-1}; if(!collides(m)) currentPiece=m; break; }
    case 'ArrowRight': { const m={...currentPiece,x:currentPiece.x+1}; if(!collides(m)) currentPiece=m; break; }
    case 'ArrowDown':  drop(); break;
    case 'ArrowUp':    currentPiece = rotate(currentPiece); break;
    case ' ':          hardDrop(); break;
  }
  drawBoard();
});

initGame();
