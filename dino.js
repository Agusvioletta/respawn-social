// dino.js — Respawn Social v2

const canvas  = document.getElementById('dino-board');
const ctx     = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const W = canvas.width, H = canvas.height;
const GROUND  = H - 30;
const WIN_SCORE = 300;

function el(id){return document.getElementById(id);}

let dino, obstacles, clouds, score, best, running, gameEnded, overlayGoMap, speed, frameCount;

best = parseInt(localStorage.getItem("dino_best"))||0;
el('best').textContent = best;

function initGame(){
  dino = { x:80, y:GROUND, w:32, h:40, vy:0, grounded:true, ducking:false };
  obstacles = []; clouds = []; score = 0; frameCount = 0; speed = 5;
  running = false; gameEnded = false; overlayGoMap = false;
  el('score').textContent = '0';
  el('speed').textContent = '1x';
  spawnClouds();
  overlay.style.display = 'flex';
  overlay.innerHTML = `<div style="font-family:var(--font-display);font-size:20px;font-weight:900;color:var(--pink);letter-spacing:2px;">DINO RUNNER</div><div style="font-family:var(--font-mono);font-size:13px;color:var(--text-secondary);">Espacio / ↑ para saltar</div>`;
  draw();
}

function spawnClouds(){
  for(let i=0;i<4;i++) clouds.push({x:Math.random()*W, y:20+Math.random()*50, w:50+Math.random()*30, speed:0.5+Math.random()*0.5});
}

// ── Obstacles ──
const OBS_TYPES = [
  { w:20, h:40, color:'#C084FC', type:'cactus_small' },
  { w:30, h:55, color:'#9A5ECC', type:'cactus_big'   },
  { w:60, h:28, color:'#FF4F7B', type:'pterodactyl', flying:true },
];

function spawnObstacle(){
  const t = OBS_TYPES[Math.floor(Math.random()*OBS_TYPES.length)];
  const y = t.flying ? GROUND - 45 - Math.random()*30 : GROUND;
  obstacles.push({...t, x:W+20, y});
}

// ── Physics ──
const GRAVITY=0.7, JUMP_VEL=-14;
const keys={};
document.addEventListener('keydown',e=>{
  keys[e.key]=true;
  if([' ','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();
  if(!running&&!gameEnded){startGame();return;}
  if(gameEnded&&e.key==='Enter'){if(overlayGoMap)window.location.href='gamemap.html';else initGame();}
  if(running&&(e.key===' '||e.key==='ArrowUp')&&dino.grounded&&!dino.ducking) jump();
  if(running&&e.key==='ArrowDown') duck(true);
});
document.addEventListener('keyup',e=>{ keys[e.key]=false; if(e.key==='ArrowDown') duck(false); });
canvas.addEventListener('click',()=>{ if(!running&&!gameEnded){startGame();return;} if(running&&dino.grounded&&!dino.ducking)jump(); });

function jump(){
  if(!dino.grounded||dino.ducking) return;
  dino.vy=JUMP_VEL;
  dino.grounded=false;
}

function duck(d){
  if(d && !dino.grounded) return; // no agacharse en el aire
  dino.ducking = d;
  if(d){
    dino.h = 22;           // altura agachado
    dino.y = GROUND - 22;  // pegar al piso correctamente
  } else {
    dino.h = 40;
    dino.y = Math.min(dino.y, GROUND - 40);
  }
}

function update(){
  if(!running)return;
  frameCount++;
  score++;
  el('score').textContent=score;

  // Speed increase — más gradual
  speed = 5 + Math.floor(score/120)*0.5;
  el('speed').textContent = (speed/5).toFixed(1)+'x';

  // Dino physics
  if(!dino.grounded){ dino.vy+=GRAVITY; dino.y+=dino.vy; }
  const groundY = GROUND - dino.h;
  if(dino.y >= groundY){ dino.y = groundY; dino.vy=0; dino.grounded=true; }

  // Spawn obstacles — gap generoso y fijo
  const minGap = 280;  // mínimo siempre 280px — da tiempo a reaccionar y saltar
  const maxGap = 460;
  const lastObs = obstacles[obstacles.length-1];
  if(!obstacles.length || lastObs.x < W - minGap - Math.random()*(maxGap-minGap)){
    spawnObstacle();
  }

  // Move obstacles
  obstacles.forEach(o=>o.x-=speed);
  obstacles=obstacles.filter(o=>o.x>-80);

  // Clouds
  clouds.forEach(c=>{c.x-=c.speed;if(c.x<-100)c.x=W+Math.random()*200;});

  // Collision — hitbox más permisiva (margen de 8px)
  const margin = 8;
  obstacles.forEach(o=>{
    const oTop = o.flying ? o.y - o.h : GROUND - o.h;
    if(
      dino.x + dino.w - margin > o.x + margin &&
      dino.x + margin < o.x + o.w - margin &&
      dino.y + dino.h - margin > oTop + margin &&
      dino.y + margin < oTop + o.h - margin
    ) gameOver();
  });

  // Best
  if(score>best){best=score;el('best').textContent=best;localStorage.setItem("dino_best",best);}

  // Win
  if(score>=WIN_SCORE&&!gameEnded) gameWin();
}

// ── Draw ──
function drawDino(){
  const {x,y,w,h,ducking,grounded}=dino;
  ctx.save();
  ctx.shadowColor='var(--pink)';ctx.shadowBlur=10;
  ctx.fillStyle='#FF4F7B';

  if(ducking){
    // Ducking body
    ctx.beginPath();ctx.roundRect(x,y+15,w+12,h-10,6);ctx.fill();
    ctx.fillStyle='#FF8CAB';
    ctx.beginPath();ctx.ellipse(x+w+6,y+20,8,6,0,0,Math.PI*2);ctx.fill();
    // Eye
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+w+10,y+18,3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';ctx.beginPath();ctx.arc(x+w+11,y+18,1.5,0,Math.PI*2);ctx.fill();
  } else {
    // Body
    ctx.beginPath();ctx.roundRect(x+4,y+8,w-8,h-8,6);ctx.fill();
    // Head
    ctx.fillStyle='#FF6B8E';
    ctx.beginPath();ctx.roundRect(x+8,y,w-2,16,5);ctx.fill();
    // Eye
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+w,y+6,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';ctx.beginPath();ctx.arc(x+w+1,y+6,2,0,Math.PI*2);ctx.fill();
    // Legs (animated when running)
    const legFrame=grounded?Math.floor(frameCount/6)%2:0;
    ctx.fillStyle='#FF4F7B';
    ctx.fillRect(x+6,y+h-12,8,legFrame?10:6);
    ctx.fillRect(x+w-12,y+h-12,8,legFrame?6:10);
  }
  ctx.restore();
}

function drawObstacle(o){
  ctx.save();
  ctx.shadowColor=o.color;ctx.shadowBlur=8;
  ctx.fillStyle=o.color;
  if(o.type==='pterodactyl'){
    // Flying enemy — simple pixel art
    const fy=o.y-o.h;
    ctx.fillRect(o.x+10,fy+8,40,14);
    // Wings
    const wf=Math.floor(frameCount/8)%2;
    ctx.beginPath();
    ctx.moveTo(o.x,fy+(wf?0:8));ctx.lineTo(o.x+20,fy+8);ctx.lineTo(o.x+10,fy+18);ctx.closePath();ctx.fill();
    ctx.beginPath();
    ctx.moveTo(o.x+60,fy+(wf?0:8));ctx.lineTo(o.x+40,fy+8);ctx.lineTo(o.x+50,fy+18);ctx.closePath();ctx.fill();
    ctx.fillStyle='#000';ctx.beginPath();ctx.arc(o.x+50,fy+12,2,0,Math.PI*2);ctx.fill();
  } else {
    // Cactus
    ctx.fillRect(o.x+o.w/2-4,o.y-o.h,8,o.h);
    // Arms
    const armH=Math.min(o.h-10,20);
    ctx.fillRect(o.x,o.y-o.h+8,o.w/2-4,6);
    ctx.fillRect(o.x,o.y-o.h+8,6,armH);
    ctx.fillRect(o.x+o.w/2+4,o.y-o.h+8,o.w/2-4,6);
    ctx.fillRect(o.x+o.w-6,o.y-o.h+8,6,armH);
  }
  ctx.restore();
}

function draw(){
  ctx.fillStyle='#07070F';ctx.fillRect(0,0,W,H);

  // Stars
  ctx.fillStyle='rgba(255,255,255,0.3)';
  [[50,15],[150,25],[300,10],[450,20],[580,12],[100,30],[380,8],[520,28]].forEach(([x,y])=>{
    ctx.beginPath();ctx.arc(x,y,0.7,0,Math.PI*2);ctx.fill();
  });

  // Clouds
  ctx.fillStyle='rgba(192,132,252,0.12)';
  clouds.forEach(c=>{
    ctx.beginPath();ctx.ellipse(c.x+c.w/2,c.y,c.w/2,12,0,0,Math.PI*2);ctx.fill();
  });

  // Ground line
  ctx.strokeStyle='rgba(192,132,252,0.3)';ctx.lineWidth=1.5;
  ctx.setLineDash([6,4]);
  ctx.beginPath();ctx.moveTo(0,GROUND+2);ctx.lineTo(W,GROUND+2);ctx.stroke();
  ctx.setLineDash([]);

  // Ground detail
  for(let x=(-frameCount*speed)%40;x<W;x+=40){
    ctx.fillStyle='rgba(192,132,252,0.15)';
    ctx.fillRect(x,GROUND+3,20,2);
  }

  obstacles.forEach(drawObstacle);
  if(running) drawDino();
}

// ── Game over / win ──
function gameOver(){
  running=false;gameEnded=true;
  showOverlay('GAME OVER',`${score} puntos · ${WIN_SCORE} para avanzar · Enter para reintentar`,false);
}
function gameWin(){
  running=false;gameEnded=true;
  const ml=parseInt(localStorage.getItem("maxLevel"))||1;
  // Dino es el nivel 8 en la cadena. Lo desbloquea cuando maxLevel===7 (ya pasó Space Invaders)
  // Pero también puede jugarse si ya tiene maxLevel >= 8
  if(ml===7){
    saveMaxLevel(8);
    showOverlay('¡GANASTE!','🏆 Nivel completado · Enter para volver al mapa',true);
  } else {
    showOverlay('¡GANASTE!',`${score} puntos · Enter para volver al mapa`,true);
  }
}
function saveMaxLevel(n){
  localStorage.setItem("maxLevel",String(n));
  const au=JSON.parse(localStorage.getItem("users"))||[];
  const me=JSON.parse(localStorage.getItem("currentUser"));
  if(!me)return;
  const idx=au.findIndex(u=>u.username===me.username);
  if(idx!==-1){au[idx].maxLevel=n;localStorage.setItem("users",JSON.stringify(au));}
  me.maxLevel=n;localStorage.setItem("currentUser",JSON.stringify(me));
}
function showOverlay(title,sub,goMap){
  overlayGoMap=goMap;
  overlay.style.display='flex';
  overlay.innerHTML=`<div style="font-family:var(--font-display);font-size:20px;font-weight:900;color:${goMap?'var(--cyan)':'var(--pink)'};letter-spacing:2px;">${title}</div><div style="font-family:var(--font-display);font-size:24px;font-weight:900;color:var(--pink);">${score}</div><div style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary);text-align:center;max-width:280px;">${sub}</div>`;
}
function startGame(){
  if(running)return;
  running=true;overlay.style.display='none';
  requestAnimationFrame(loop);
}
function loop(){if(!running)return;update();draw();requestAnimationFrame(loop);}

initGame();