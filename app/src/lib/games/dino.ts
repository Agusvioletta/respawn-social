import type { GameEngine } from '@/components/arcade/GameCanvas'

export const dinoEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const GROUND = H - 35
    const GRAVITY = 0.7, JUMP_VEL = -14

    interface Obs { x: number; y: number; w: number; h: number; color: string; type: string; flying: boolean }
    interface Cloud { x: number; y: number; w: number; speed: number }

    let dino = { x: 80, y: GROUND - 40, w: 32, h: 40, vy: 0, grounded: true, ducking: false }
    let obstacles: Obs[] = []
    let clouds: Cloud[] = []
    let score = 0, speed = 5, frameCount = 0
    let alive = true, paused = false, raf: number
    const keys: Record<string, boolean> = {}

    const OBS_TYPES: Omit<Obs, 'x' | 'y'>[] = [
      { w: 20, h: 40, color: '#C084FC', type: 'cactus_small', flying: false },
      { w: 30, h: 55, color: '#9A5ECC', type: 'cactus_big', flying: false },
      { w: 60, h: 28, color: '#FF4F7B', type: 'pterodactyl', flying: true },
    ]

    for (let i = 0; i < 4; i++) clouds.push({ x: Math.random() * W, y: 20 + Math.random() * 50, w: 50 + Math.random() * 30, speed: 0.5 + Math.random() * 0.5 })

    function spawnObs() {
      const t = OBS_TYPES[Math.floor(Math.random() * OBS_TYPES.length)]
      const y = t.flying ? GROUND - 45 - Math.random() * 30 : GROUND
      obstacles.push({ ...t, x: W + 20, y })
    }

    function jump() { if (!dino.grounded || dino.ducking) return; dino.vy = JUMP_VEL; dino.grounded = false }

    function draw() {
      ctx.fillStyle = '#07070F'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ;[[50,15],[150,25],[300,10],[450,20],[580,12],[100,30],[380,8]].forEach(([x,y]) => {
        ctx.beginPath(); ctx.arc(x, y, 0.7, 0, Math.PI * 2); ctx.fill()
      })
      ctx.fillStyle = 'rgba(192,132,252,0.12)'
      clouds.forEach(c => { ctx.beginPath(); ctx.ellipse(c.x + c.w / 2, c.y, c.w / 2, 12, 0, 0, Math.PI * 2); ctx.fill() })
      ctx.strokeStyle = 'rgba(192,132,252,0.3)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4])
      ctx.beginPath(); ctx.moveTo(0, GROUND + 2); ctx.lineTo(W, GROUND + 2); ctx.stroke(); ctx.setLineDash([])
      for (let x = (-(frameCount * speed) % 40 + 40) % 40; x < W; x += 40) {
        ctx.fillStyle = 'rgba(192,132,252,0.15)'; ctx.fillRect(x, GROUND + 3, 20, 2)
      }

      obstacles.forEach(o => {
        ctx.save(); ctx.shadowColor = o.color; ctx.shadowBlur = 8; ctx.fillStyle = o.color
        if (o.type === 'pterodactyl') {
          const fy = o.y - o.h
          ctx.fillRect(o.x + 10, fy + 8, 40, 14)
          const wf = Math.floor(frameCount / 8) % 2
          ctx.beginPath(); ctx.moveTo(o.x, fy + (wf ? 0 : 8)); ctx.lineTo(o.x + 20, fy + 8); ctx.lineTo(o.x + 10, fy + 18); ctx.closePath(); ctx.fill()
          ctx.beginPath(); ctx.moveTo(o.x + 60, fy + (wf ? 0 : 8)); ctx.lineTo(o.x + 40, fy + 8); ctx.lineTo(o.x + 50, fy + 18); ctx.closePath(); ctx.fill()
        } else {
          ctx.fillRect(o.x + o.w / 2 - 4, o.y - o.h, 8, o.h)
          ctx.fillRect(o.x, o.y - o.h + 8, o.w / 2 - 4, 6); ctx.fillRect(o.x, o.y - o.h + 8, 6, Math.min(o.h - 10, 20))
          ctx.fillRect(o.x + o.w / 2 + 4, o.y - o.h + 8, o.w / 2 - 4, 6); ctx.fillRect(o.x + o.w - 6, o.y - o.h + 8, 6, Math.min(o.h - 10, 20))
        }
        ctx.restore()
      })

      // Dino
      const { x, y, w, h, ducking, grounded } = dino
      ctx.save(); ctx.shadowColor = '#FF4F7B'; ctx.shadowBlur = 10; ctx.fillStyle = '#FF4F7B'
      if (ducking) {
        ctx.beginPath(); ctx.roundRect(x, y + 15, w + 12, h - 10, 6); ctx.fill()
        ctx.fillStyle = '#FF8CAB'; ctx.beginPath(); ctx.ellipse(x + w + 6, y + 20, 8, 6, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + w + 10, y + 18, 3, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x + w + 11, y + 18, 1.5, 0, Math.PI * 2); ctx.fill()
      } else {
        ctx.beginPath(); ctx.roundRect(x + 4, y + 8, w - 8, h - 8, 6); ctx.fill()
        ctx.fillStyle = '#FF6B8E'; ctx.beginPath(); ctx.roundRect(x + 8, y, w - 2, 16, 5); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + w, y + 6, 4, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x + w + 1, y + 6, 2, 0, Math.PI * 2); ctx.fill()
        const lf = grounded ? Math.floor(frameCount / 6) % 2 : 0
        ctx.fillStyle = '#FF4F7B'
        ctx.fillRect(x + 6, y + h - 12, 8, lf ? 10 : 6)
        ctx.fillRect(x + w - 12, y + h - 12, 8, lf ? 6 : 10)
      }
      ctx.restore()
    }

    function update() {
      frameCount++; score++; onScore(score)
      speed = 5 + Math.floor(score / 120) * 0.5
      if (!dino.grounded) { dino.vy += GRAVITY; dino.y += dino.vy }
      const groundY = GROUND - dino.h
      if (dino.y >= groundY) { dino.y = groundY; dino.vy = 0; dino.grounded = true }
      const lastObs = obstacles[obstacles.length - 1]
      if (!obstacles.length || lastObs.x < W - 280 - Math.random() * 180) spawnObs()
      obstacles.forEach(o => o.x -= speed)
      obstacles = obstacles.filter(o => o.x > -80)
      clouds.forEach(c => { c.x -= c.speed; if (c.x < -100) c.x = W + Math.random() * 200 })
      const margin = 8
      for (const o of obstacles) {
        const oTop = o.flying ? o.y - o.h : GROUND - o.h
        if (
          dino.x + dino.w - margin > o.x + margin &&
          dino.x + margin < o.x + o.w - margin &&
          dino.y + dino.h - margin > oTop + margin &&
          dino.y + margin < oTop + o.h - margin
        ) { alive = false; cancelAnimationFrame(raf); onGameOver(score); return }
      }
      if (keys['ArrowDown']) {
        if (!dino.ducking) { dino.ducking = true; dino.h = 22; dino.y = GROUND - 22 }
      } else if (dino.ducking) { dino.ducking = false; dino.h = 40 }
    }

    raf = requestAnimationFrame(function loop() {
      if (!alive) return
      if (!paused) { update(); draw() }
      raf = requestAnimationFrame(loop)
    })

    function onKey(e: KeyboardEvent) {
      keys[e.key] = true
      if ((e.key === ' ' || e.key === 'ArrowUp') && dino.grounded && !dino.ducking) { e.preventDefault(); jump() }
    }
    function offKey(e: KeyboardEvent) { keys[e.key] = false }
    canvas.addEventListener('click', jump)
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', offKey)
    return {
      cleanup: () => { alive = false; cancelAnimationFrame(raf); canvas.removeEventListener('click', jump); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', offKey) },
      pause:   () => { paused = true },
      resume:  () => { paused = false },
    }
  }
}
