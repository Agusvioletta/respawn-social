import type { GameEngine } from '@/components/arcade/GameCanvas'

export const asteroidsEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height

    interface Vec { x: number; y: number }
    interface Asteroid { x: number; y: number; vx: number; vy: number; radius: number; size: number; angle: number; spin: number; points: Vec[] }
    interface Bullet { x: number; y: number; vx: number; vy: number; life: number }
    interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }

    let ship = { x: W / 2, y: H / 2, angle: -Math.PI / 2, vx: 0, vy: 0, radius: 12 }
    let bullets: Bullet[] = []
    let asteroids: Asteroid[] = []
    let particles: Particle[] = []
    let score = 0, lives = 3, wave = 1, invincible = 0
    let lastShot = 0
    const keys: Record<string, boolean> = {}
    let raf: number
    let alive = true
    let paused = false

    function mkAsteroid(size: number, pos: Vec | null): Asteroid {
      let x = 0, y = 0
      if (pos) { x = pos.x; y = pos.y }
      else {
        const side = Math.floor(Math.random() * 4)
        x = side === 0 ? 0 : side === 1 ? W : Math.random() * W
        y = side === 2 ? 0 : side === 3 ? H : Math.random() * H
      }
      const a = Math.random() * Math.PI * 2
      const sp = (0.8 + Math.random() * 1.2) * (4 - size) * 0.4
      const r = size === 3 ? 40 : size === 2 ? 22 : 12
      const n = 8 + Math.floor(Math.random() * 4)
      return {
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        radius: r, size, angle: 0, spin: (Math.random() - 0.5) * 0.06,
        points: Array.from({ length: n }, (_, i) => {
          const ang = (i / n) * Math.PI * 2
          const d = r * (0.75 + Math.random() * 0.5)
          return { x: Math.cos(ang) * d, y: Math.sin(ang) * d }
        })
      }
    }

    function spawnWave(w: number) {
      return Array.from({ length: 3 + w }, () => mkAsteroid(3, null))
    }

    function shoot() {
      if (Date.now() - lastShot < 180) return
      lastShot = Date.now()
      bullets.push({
        x: ship.x + Math.cos(ship.angle) * ship.radius,
        y: ship.y + Math.sin(ship.angle) * ship.radius,
        vx: Math.cos(ship.angle) * 7 + ship.vx,
        vy: Math.sin(ship.angle) * 7 + ship.vy,
        life: 60
      })
    }

    function explode(x: number, y: number, color: string, n = 8) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 30 + Math.random() * 20, color })
      }
    }

    function dist(a: Vec, b: Vec) { return Math.hypot(a.x - b.x, a.y - b.y) }

    function draw() {
      ctx.fillStyle = '#07070F'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ;[[50,40],[150,90],[300,30],[420,110],[80,200],[260,300],[470,350],[180,380],[340,200]].forEach(([x,y]) => {
        ctx.beginPath(); ctx.arc(x, y, 0.8, 0, Math.PI * 2); ctx.fill()
      })
      asteroids.forEach(a => {
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.angle)
        ctx.shadowColor = 'rgba(192,132,252,0.5)'; ctx.shadowBlur = 8
        ctx.strokeStyle = '#C084FC'; ctx.lineWidth = 1.5; ctx.fillStyle = 'rgba(28,28,52,0.8)'
        ctx.beginPath(); a.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
        ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore()
      })
      ctx.save(); ctx.shadowColor = '#00FFF7'; ctx.shadowBlur = 8; ctx.fillStyle = '#00FFF7'
      bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill() })
      ctx.restore()
      particles.forEach(p => {
        ctx.globalAlpha = p.life / 50; ctx.fillStyle = p.color
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill()
      }); ctx.globalAlpha = 1
      const show = invincible === 0 || Math.floor(invincible / 4) % 2 === 0
      if (show) {
        ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.angle)
        ctx.shadowColor = '#00FFF7'; ctx.shadowBlur = 14; ctx.strokeStyle = '#00FFF7'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(0,255,247,0.1)'
        ctx.beginPath()
        ctx.moveTo(ship.radius, 0); ctx.lineTo(-ship.radius * 0.7, -ship.radius * 0.65)
        ctx.lineTo(-ship.radius * 0.4, 0); ctx.lineTo(-ship.radius * 0.7, ship.radius * 0.65)
        ctx.closePath(); ctx.fill(); ctx.stroke()
        if (keys['ArrowUp']) {
          ctx.strokeStyle = '#FF4F7B'; ctx.shadowColor = '#FF4F7B'; ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.moveTo(-ship.radius * 0.4, -4); ctx.lineTo(-ship.radius * 0.8 - Math.random() * 8, 0); ctx.lineTo(-ship.radius * 0.4, 4)
          ctx.stroke()
        }
        ctx.restore()
      }
      // HUD
      ctx.fillStyle = '#00FFF7'; ctx.font = "11px 'Share Tech Mono',monospace"; ctx.textAlign = 'left'
      ctx.fillText(`VIDAS: ${'♥ '.repeat(Math.max(0, lives))}`, 8, 18)
      ctx.fillText(`OLA: ${wave}`, 8, 34)
    }

    function update() {
      const ROT = 0.07, THRUST = 0.18, FRICTION = 0.98
      if (keys['ArrowLeft']) ship.angle -= ROT
      if (keys['ArrowRight']) ship.angle += ROT
      if (keys['ArrowUp']) { ship.vx += Math.cos(ship.angle) * THRUST; ship.vy += Math.sin(ship.angle) * THRUST }
      ship.vx *= FRICTION; ship.vy *= FRICTION
      ship.x = (ship.x + ship.vx + W) % W; ship.y = (ship.y + ship.vy + H) % H
      if (invincible > 0) invincible--
      bullets.forEach(b => { b.x = (b.x + b.vx + W) % W; b.y = (b.y + b.vy + H) % H; b.life-- })
      bullets = bullets.filter(b => b.life > 0)
      asteroids.forEach(a => { a.x = (a.x + a.vx + W) % W; a.y = (a.y + a.vy + H) % H; a.angle += a.spin })
      particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; p.vx *= 0.96; p.vy *= 0.96 })
      particles = particles.filter(p => p.life > 0)

      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        for (let ai = asteroids.length - 1; ai >= 0; ai--) {
          const b = bullets[bi], a = asteroids[ai]
          if (dist(b, a) < a.radius) {
            explode(a.x, a.y, '#00FFF7', a.size * 4)
            bullets.splice(bi, 1)
            const pts = ({ 3: 20, 2: 50, 1: 100 } as Record<number, number>)[a.size] ?? 10
            score += pts; onScore(score)
            if (a.size > 1) {
              asteroids.push(mkAsteroid(a.size - 1, { x: a.x, y: a.y }))
              asteroids.push(mkAsteroid(a.size - 1, { x: a.x, y: a.y }))
            }
            asteroids.splice(ai, 1); break
          }
        }
      }

      if (invincible === 0) {
        for (const a of asteroids) {
          if (dist(ship, a) < a.radius + ship.radius - 4) {
            lives--; explode(ship.x, ship.y, '#FF4F7B', 14)
            ship.vx = 0; ship.vy = 0; ship.x = W / 2; ship.y = H / 2; invincible = 120
            if (lives <= 0) { cancelAnimationFrame(raf); alive = false; onGameOver(score); return }
            break
          }
        }
      }

      if (asteroids.length === 0) { wave++; asteroids = spawnWave(wave); explode(W / 2, H / 2, '#C084FC', 20) }
    }

    asteroids = spawnWave(wave)
    raf = requestAnimationFrame(function loop() {
      if (!alive) return
      if (!paused) { update(); draw() }
      raf = requestAnimationFrame(loop)
    })

    function onKey(e: KeyboardEvent) {
      keys[e.key] = true
      if (e.key === ' ') { e.preventDefault(); shoot() }
    }
    function offKey(e: KeyboardEvent) { keys[e.key] = false }
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', offKey)
    return {
      cleanup: () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', offKey) },
      pause:   () => { paused = true },
      resume:  () => { paused = false },
    }
  }
}
