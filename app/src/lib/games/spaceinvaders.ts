import type { GameEngine } from '@/components/arcade/GameCanvas'

export const spaceInvadersEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const ALIEN_ROWS = 3, ALIEN_COLS = 8
    const ALIEN_W = 38, ALIEN_H = 28, ALIEN_PAD = 10
    const ALIEN_TYPES = [
      { color: '#FF4F7B', pts: 30 },
      { color: '#C084FC', pts: 20 },
      { color: '#4ade80', pts: 10 },
    ]

    interface Alien { x: number; y: number; alive: boolean; color: string; pts: number; frame: number }
    interface Bullet { x: number; y: number; vy: number; w: number; h: number }
    interface Shield { x: number; y: number; w: number; h: number; hp: number }

    let ship = { x: W / 2, y: H - 40, w: 36, h: 22, speed: 5 }
    let aliens: Alien[] = []
    let bullets: Bullet[] = []
    let alienBullets: Bullet[] = []
    let shields: Shield[] = []
    let score = 0, lives = 3, wave = 1
    let alienDir = 1, alienTimer = 0, alienSpeed = 60
    let ufo: { x: number; y: number; vx: number } | null = null, ufoTimer = 0
    let lastShot = 0, alive = true, raf: number
    const keys: Record<string, boolean> = {}

    function buildAliens() {
      const list: Alien[] = []
      const startX = Math.max(20, (W - ALIEN_COLS * (ALIEN_W + ALIEN_PAD)) / 2)
      for (let r = 0; r < ALIEN_ROWS; r++)
        for (let c = 0; c < ALIEN_COLS; c++)
          list.push({ x: startX + c * (ALIEN_W + ALIEN_PAD), y: 50 + r * (ALIEN_H + ALIEN_PAD), alive: true, ...ALIEN_TYPES[r % ALIEN_TYPES.length], frame: 0 })
      return list
    }

    function buildShields(): Shield[] {
      const list: Shield[] = []
      const positions = [60, 170, 280, 390]
      positions.forEach(sx => {
        for (let bx = 0; bx < 4; bx++)
          for (let by = 0; by < 3; by++)
            list.push({ x: sx + bx * 12, y: H - 100 + by * 12, w: 10, h: 10, hp: 3 })
      })
      return list
    }

    function drawAlien(x: number, y: number, color: string, frame: number) {
      ctx.fillStyle = color
      ctx.beginPath(); ctx.ellipse(x + ALIEN_W / 2, y + ALIEN_H / 2, 14, 10, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#000'
      ctx.beginPath(); ctx.arc(x + ALIEN_W / 2 - 5, y + ALIEN_H / 2 - 2, 3, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(x + ALIEN_W / 2 + 5, y + ALIEN_H / 2 - 2, 3, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = color; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x + ALIEN_W / 2 - 6, y + 4); ctx.lineTo(x + ALIEN_W / 2 - 10 + frame * 2, y - 4); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + ALIEN_W / 2 + 6, y + 4); ctx.lineTo(x + ALIEN_W / 2 + 10 - frame * 2, y - 4); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + ALIEN_W / 2 - 12, y + ALIEN_H - 4); ctx.lineTo(x + ALIEN_W / 2 - 8 + (frame ? -4 : 4), y + ALIEN_H + 4); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + ALIEN_W / 2 + 12, y + ALIEN_H - 4); ctx.lineTo(x + ALIEN_W / 2 + 8 + (frame ? 4 : -4), y + ALIEN_H + 4); ctx.stroke()
    }

    function draw() {
      ctx.fillStyle = '#07070F'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ;[[30,18],[110,55],[240,12],[370,75],[455,38],[75,145],[315,175],[18,198],[468,218]].forEach(([x,y]) => {
        ctx.beginPath(); ctx.arc(x, y, 0.9, 0, Math.PI * 2); ctx.fill()
      })
      shields.forEach(s => {
        const a = [0.9, 0.55, 0.25][3 - s.hp] ?? 0.15
        ctx.fillStyle = `rgba(0,255,247,${a})`; ctx.fillRect(s.x, s.y, s.w, s.h)
      })
      aliens.filter(a => a.alive).forEach(a => {
        ctx.save(); ctx.shadowColor = a.color; ctx.shadowBlur = 7
        drawAlien(a.x, a.y, a.color, a.frame); ctx.restore()
      })
      if (ufo) {
        ctx.save(); ctx.shadowColor = '#FF4F7B'; ctx.shadowBlur = 12; ctx.fillStyle = '#FF4F7B'
        ctx.beginPath(); ctx.ellipse(ufo.x + 20, ufo.y + 10, 22, 10, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#FF8CAB'; ctx.beginPath(); ctx.ellipse(ufo.x + 20, ufo.y + 5, 11, 6, 0, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }
      ctx.save(); ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 6; ctx.fillStyle = '#4ade80'
      bullets.forEach(b => ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h)); ctx.restore()
      ctx.save(); ctx.shadowColor = '#FF4F7B'; ctx.shadowBlur = 5; ctx.fillStyle = '#FF4F7B'
      alienBullets.forEach(b => ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h)); ctx.restore()
      ctx.save(); ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 12; ctx.fillStyle = '#4ade80'
      ctx.beginPath()
      ctx.moveTo(ship.x, ship.y - ship.h / 2)
      ctx.lineTo(ship.x - ship.w / 2, ship.y + ship.h / 2)
      ctx.lineTo(ship.x - ship.w / 4, ship.y + ship.h / 4)
      ctx.lineTo(ship.x + ship.w / 4, ship.y + ship.h / 4)
      ctx.lineTo(ship.x + ship.w / 2, ship.y + ship.h / 2)
      ctx.closePath(); ctx.fill(); ctx.restore()
      ctx.fillStyle = '#4ade80'; ctx.font = "11px 'Share Tech Mono',monospace"; ctx.textAlign = 'left'
      ctx.fillText(`${'♥'.repeat(Math.max(0, lives))}  OLA ${wave}`, 8, H - 6)
    }

    function update() {
      if (keys['ArrowLeft'] && ship.x > 24) ship.x -= ship.speed
      if (keys['ArrowRight'] && ship.x < W - 24) ship.x += ship.speed
      bullets.forEach(b => { b.y += b.vy }); bullets = bullets.filter(b => b.y > 0)
      alienBullets.forEach(b => { b.y += b.vy }); alienBullets = alienBullets.filter(b => b.y < H)
      alienTimer++
      if (alienTimer >= alienSpeed) {
        alienTimer = 0
        const living = aliens.filter(a => a.alive)
        if (!living.length) return
        const right = Math.max(...living.map(a => a.x + ALIEN_W))
        const left  = Math.min(...living.map(a => a.x))
        if (alienDir === 1 && right > W - 20) { alienDir = -1; aliens.forEach(a => { a.y += 10 }) }
        else if (alienDir === -1 && left < 20) { alienDir = 1; aliens.forEach(a => { a.y += 10 }) }
        aliens.forEach(a => { if (a.alive) { a.x += alienDir * 14; a.frame = 1 - a.frame } })
        if (alienBullets.length < 1 && Math.random() < 0.04) {
          const bottom = living.filter(a => !living.find(b => b.x === a.x && b.y > a.y))
          if (bottom.length) {
            const s = bottom[Math.floor(Math.random() * bottom.length)]
            alienBullets.push({ x: s.x + ALIEN_W / 2, y: s.y + ALIEN_H, vy: 2.5, w: 3, h: 12 })
          }
        }
      }
      ufoTimer++
      if (ufoTimer > 500 && !ufo && Math.random() < 0.005) { ufo = { x: -30, y: 28, vx: 2 }; ufoTimer = 0 }
      if (ufo) { ufo.x += ufo.vx; if (ufo.x > W + 40) ufo = null }

      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi]; let hit = false
        for (let ai = 0; ai < aliens.length; ai++) {
          const a = aliens[ai]
          if (!a.alive) continue
          if (b.x > a.x && b.x < a.x + ALIEN_W && b.y > a.y && b.y < a.y + ALIEN_H) {
            a.alive = false; score += a.pts; onScore(score); alienSpeed = Math.max(20, alienSpeed - 0.4); hit = true; break
          }
        }
        if (!hit && ufo && b.x > ufo.x && b.x < ufo.x + 40 && b.y > ufo.y && b.y < ufo.y + 20) {
          score += 100; onScore(score); ufo = null; hit = true
        }
        if (!hit) for (let si = shields.length - 1; si >= 0; si--) {
          const s = shields[si]
          if (b.x > s.x && b.x < s.x + s.w && b.y > s.y && b.y < s.y + s.h) {
            s.hp--; if (s.hp <= 0) shields.splice(si, 1); hit = true; break
          }
        }
        if (hit) bullets.splice(bi, 1)
      }

      for (let bi = alienBullets.length - 1; bi >= 0; bi--) {
        const b = alienBullets[bi]; let hit = false
        if (Math.abs(b.x - ship.x) < 20 && b.y > ship.y - 14 && b.y < ship.y + 12) {
          lives--; ship.x = W / 2
          if (lives <= 0) { alive = false; cancelAnimationFrame(raf); onGameOver(score); return }
          hit = true
        }
        if (!hit) for (let si = shields.length - 1; si >= 0; si--) {
          const s = shields[si]
          if (b.x > s.x && b.x < s.x + s.w && b.y > s.y && b.y < s.y + s.h) {
            s.hp--; if (s.hp <= 0) shields.splice(si, 1); hit = true; break
          }
        }
        if (hit) alienBullets.splice(bi, 1)
      }

      if (aliens.some(a => a.alive && a.y + ALIEN_H > ship.y - 16)) { alive = false; cancelAnimationFrame(raf); onGameOver(score); return }
      if (!aliens.some(a => a.alive)) {
        wave++; alienSpeed = Math.max(30, 60 - (wave - 1) * 5); alienBullets = []; aliens = buildAliens(); shields = buildShields()
      }
    }

    aliens = buildAliens(); shields = buildShields(); draw()
    raf = requestAnimationFrame(function loop() {
      if (!alive) return; update(); draw(); raf = requestAnimationFrame(loop)
    })

    function onKey(e: KeyboardEvent) {
      keys[e.key] = true
      if (e.key === ' ') {
        e.preventDefault()
        if (Date.now() - lastShot >= 250) { lastShot = Date.now(); bullets.push({ x: ship.x, y: ship.y - 14, vy: -11, w: 3, h: 14 }) }
      }
    }
    function offKey(e: KeyboardEvent) { keys[e.key] = false }
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', offKey)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', offKey) }
  }
}
