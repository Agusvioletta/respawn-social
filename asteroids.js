// asteroids.js — Respawn Social v2

const canvas  = document.getElementById('ast-board');
const ctx     = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const W = canvas.width, H = canvas.height;
const WIN_SCORE = 1000;

function el(id) { return document.getElementById(id); }

// ── State ──────────────────────────────────
let ship, bullets, asteroids, particles, score, lives, wave, running, gameEnded, overlayGoMap, invincible;

const keys = {};
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if ([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  if (!running && !gameEnded) { startGame(); return; }
  if (gameEnded) {
    if (e.key==='Enter') { if(overlayGoMap) window.location.href='gamemap.html'; else initGame(); }
  }
  if (e.key===' ' && running) shoot();
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

// ── Init ───────────────────────────────────
function initGame() {
  ship       = { x:W/2, y:H/2, angle:0, vx:0, vy:0, radius:12 };
  bullets    = [];
  particles  = [];
  score      = 0; lives = 3; wave = 1;
  running    = false; gameEnded = false; overlayGoMap = false; invincible = 0;
  asteroids  = spawnWave(wave);
  el('score').textContent = '0';
  el('lives').textContent = '♥ ♥ ♥';
  el('wave').textContent  = '1';
  overlay.style.display   = 'flex';
  overlay.innerHTML = `
    <div style="font-family:var(--font-display);font-size:20px;font-weight:900;color:var(--cyan);letter-spacing:2px;">ASTEROIDS</div>
    <div style="font-family:var(--font-mono);font-size:13px;color:var(--text-secondary);">Presioná cualquier tecla para despegar</div>`;
  draw();
}

function spawnWave(w) {
  const count = 3 + w;
  return Array.from({length:count}, () => spawnAsteroid(3, null));
}

function spawnAsteroid(size, pos) {
  let x, y;
  if (pos) { x=pos.x; y=pos.y; }
  else {
    // Spawnear lejos de la nave
    const side = Math.floor(Math.random()*4);
    x = side===0?0:side===1?W:Math.random()*W;
    y = side===2?0:side===3?H:Math.random()*H;
  }
  const angle = Math.random()*Math.PI*2;
  const speed = (0.8+Math.random()*1.2) * (4-size) * 0.4;
  const r     = size===3?40:size===2?22:12;
  return {
    x, y, size, radius: r,
    vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
    angle: 0, spin: (Math.random()-0.5)*0.06,
    points: Array.from({length:8+Math.floor(Math.random()*4)}, (_,i)=>{
      const a = (i/(8+4))*Math.PI*2;
      const d = r*(0.75+Math.random()*0.5);
      return {x:Math.cos(a)*d, y:Math.sin(a)*d};
    })
  };
}

// ── Shoot ──────────────────────────────────
let lastShot = 0;
function shoot() {
  if (Date.now()-lastShot < 180) return;
  lastShot = Date.now();
  const sp = 7;
  bullets.push({
    x: ship.x + Math.cos(ship.angle)*ship.radius,
    y: ship.y + Math.sin(ship.angle)*ship.radius,
    vx: Math.cos(ship.angle)*sp + ship.vx,
    vy: Math.sin(ship.angle)*sp + ship.vy,
    life: 60
  });
}

// ── Particles ──────────────────────────────
function explode(x, y, color, n=8) {
  for (let i=0;i<n;i++) {
    const a=Math.random()*Math.PI*2, s=1+Math.random()*3;
    particles.push({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:30+Math.random()*20, color });
  }
}

// ── Update ─────────────────────────────────
function update() {
  if (!running) return;

  // Ship controls
  const ROT_SPEED = 0.07, THRUST = 0.18, FRICTION = 0.98;
  if (keys['ArrowLeft'])  ship.angle -= ROT_SPEED;
  if (keys['ArrowRight']) ship.angle += ROT_SPEED;
  if (keys['ArrowUp']) {
    ship.vx += Math.cos(ship.angle)*THRUST;
    ship.vy += Math.sin(ship.angle)*THRUST;
  }
  ship.vx *= FRICTION; ship.vy *= FRICTION;
  ship.x   = (ship.x+ship.vx+W)%W;
  ship.y   = (ship.y+ship.vy+H)%H;
  if (invincible > 0) invincible--;

  // Bullets
  bullets.forEach(b => { b.x=(b.x+b.vx+W)%W; b.y=(b.y+b.vy+H)%H; b.life--; });
  bullets = bullets.filter(b=>b.life>0);

  // Asteroids
  asteroids.forEach(a => {
    a.x = (a.x+a.vx+W)%W;
    a.y = (a.y+a.vy+H)%H;
    a.angle += a.spin;
  });

  // Particles
  particles.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.life--; p.vx*=0.96; p.vy*=0.96; });
  particles = particles.filter(p=>p.life>0);

  // Bullet vs asteroid
  for (let bi=bullets.length-1;bi>=0;bi--) {
    for (let ai=asteroids.length-1;ai>=0;ai--) {
      const b=bullets[bi], a=asteroids[ai];
      if (dist(b,a)<a.radius) {
        explode(a.x, a.y, '#00FFF7', a.size*4);
        bullets.splice(bi,1);
        const pts = {3:20,2:50,1:100}[a.size]||10;
        score += pts;
        el('score').textContent = score;
        if (a.size > 1) {
          asteroids.push(spawnAsteroid(a.size-1, {x:a.x,y:a.y}));
          asteroids.push(spawnAsteroid(a.size-1, {x:a.x,y:a.y}));
        }
        asteroids.splice(ai,1);
        break;
      }
    }
  }

  // Ship vs asteroid
  if (invincible===0) {
    asteroids.forEach(a => {
      if (dist(ship,a) < a.radius + ship.radius - 4) {
        lives--;
        el('lives').textContent = '♥ '.repeat(Math.max(0,lives)).trim()||'💀';
        explode(ship.x,ship.y,'#FF4F7B',14);
        ship.vx=0; ship.vy=0; ship.x=W/2; ship.y=H/2;
        invincible = 120;
        if (lives<=0) { gameOver(); }
      }
    });
  }

  // Next wave
  if (asteroids.length===0) {
    wave++;
    el('wave').textContent = wave;
    asteroids = spawnWave(wave);
    explode(W/2,H/2,'#C084FC',20);
  }

  // Win
  if (score >= WIN_SCORE && !gameEnded) { gameWin(); }
}

function dist(a,b) { return Math.hypot(a.x-b.x, a.y-b.y); }

// ── Draw ───────────────────────────────────
function draw() {
  ctx.fillStyle = '#07070F';
  ctx.fillRect(0,0,W,H);

  // Stars
  ctx.fillStyle='rgba(255,255,255,0.5)';
  [[50,40],[150,90],[300,30],[420,110],[80,200],[260,300],[470,350],[180,380],[340,200]].forEach(([sx,sy])=>{
    ctx.beginPath();ctx.arc(sx,sy,0.8,0,Math.PI*2);ctx.fill();
  });

  // Asteroids
  asteroids.forEach(a => {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.angle);
    ctx.save();
    ctx.shadowColor = 'rgba(192,132,252,0.5)'; ctx.shadowBlur = 8;
    ctx.strokeStyle = '#C084FC'; ctx.lineWidth = 1.5;
    ctx.fillStyle   = 'rgba(28,28,52,0.8)';
    ctx.beginPath();
    a.points.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.restore();
  });

  // Bullets
  bullets.forEach(b => {
    ctx.save();
    ctx.shadowColor='#00FFF7';ctx.shadowBlur=8;
    ctx.fillStyle='#00FFF7';
    ctx.beginPath();ctx.arc(b.x,b.y,3,0,Math.PI*2);ctx.fill();
    ctx.restore();
  });

  // Particles
  particles.forEach(p => {
    ctx.globalAlpha = p.life/50;
    ctx.fillStyle   = p.color;
    ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Ship
  if (running) {
    const show = invincible===0 || Math.floor(invincible/4)%2===0;
    if (show) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      ctx.save();
      ctx.shadowColor='#00FFF7';ctx.shadowBlur=14;
      ctx.strokeStyle='#00FFF7';ctx.lineWidth=2;
      ctx.fillStyle='rgba(0,255,247,0.1)';
      ctx.beginPath();
      ctx.moveTo(ship.radius,0);
      ctx.lineTo(-ship.radius*0.7, -ship.radius*0.65);
      ctx.lineTo(-ship.radius*0.4, 0);
      ctx.lineTo(-ship.radius*0.7,  ship.radius*0.65);
      ctx.closePath();ctx.fill();ctx.stroke();
      ctx.restore();

      // Thruster
      if (keys['ArrowUp']) {
        ctx.strokeStyle='#FF4F7B';ctx.lineWidth=2;ctx.shadowColor='#FF4F7B';ctx.shadowBlur=8;
        ctx.beginPath();
        ctx.moveTo(-ship.radius*0.4, -4);
        ctx.lineTo(-ship.radius*0.8-Math.random()*8, 0);
        ctx.lineTo(-ship.radius*0.4,  4);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

// ── Game over / win ────────────────────────
function gameOver() {
  running=false;gameEnded=true;
  showOverlay('GAME OVER',`${score} puntos · Enter para reintentar`,false);
}

function gameWin() {
  running=false;gameEnded=true;
  const maxLevel=parseInt(localStorage.getItem("maxLevel"))||1;
  if (maxLevel===4) { saveMaxLevel(5); showOverlay('¡GANASTE!','🐦 Flappy desbloqueado · Enter para volver al mapa',true); }
  else { showOverlay('¡GANASTE!',`${score} puntos · Enter para volver al mapa`,true); }
}

function saveMaxLevel(n) {
  localStorage.setItem("maxLevel",String(n));
  const allUsers=JSON.parse(localStorage.getItem("users"))||[];
  const me=JSON.parse(localStorage.getItem("currentUser"));
  if(!me)return;
  const idx=allUsers.findIndex(u=>u.username===me.username);
  if(idx!==-1){allUsers[idx].maxLevel=n;localStorage.setItem("users",JSON.stringify(allUsers));}
  me.maxLevel=n;localStorage.setItem("currentUser",JSON.stringify(me));
}

function showOverlay(title, sub, goMap) {
  overlayGoMap=goMap;
  overlay.style.display='flex';
  overlay.innerHTML=`
    <div style="font-family:var(--font-display);font-size:20px;font-weight:900;color:${goMap?'var(--cyan)':'var(--pink)'};letter-spacing:2px;">${title}</div>
    <div style="font-family:var(--font-display);font-size:24px;font-weight:900;color:var(--cyan);">${score}</div>
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary);text-align:center;max-width:280px;">${sub}</div>`;
}

function startGame() {
  if(running)return;
  running=true;
  overlay.style.display='none';
  requestAnimationFrame(loop);
}

function loop() {
  if(!running)return;
  update();draw();
  requestAnimationFrame(loop);
}

initGame();
