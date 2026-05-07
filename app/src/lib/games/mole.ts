import type { GameEngine } from '@/components/arcade/GameCanvas'

const TOTAL_TIME = 30  // segundos

export const moleEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height

    const COLS = 3, ROWS = 3
    const HOLE_R = Math.min(W, H) * 0.11
    const padX = W * 0.18, padY = H * 0.17
    const stepX = (W - padX * 2) / (COLS - 1)
    const stepY = (H - padY * 2 - 20) / (ROWS - 1)

    type Hole = { x: number; y: number; active: boolean; hit: boolean; timer: number; riseY: number }
    const holes: Hole[] = Array.from({ length: COLS * ROWS }, (_, i) => ({
      x: padX + (i % COLS) * stepX,
      y: padY + Math.floor(i / COLS) * stepY + 20,
      active: false, hit: false, timer: 0, riseY: 0,
    }))

    let score = 0, timeLeft = TOTAL_TIME
    let alive = true, paused = false
    let raf: number
    let lastNow = performance.now()

    function spawnMole() {
      const inactive = holes.filter(h => !h.active)
      if (!inactive.length) return
      const h = inactive[Math.floor(Math.random() * inactive.length)]
      h.active = true; h.hit = false; h.riseY = 0
      h.timer = 1200 + Math.random() * 1200
    }

    const spawnInterval = setInterval(spawnMole, 700)
    spawnMole()

    function draw(now: number) {
      if (!alive) return
      const dt = now - lastNow; lastNow = now

      if (!paused) {
        timeLeft = Math.max(0, timeLeft - dt / 1000)
        if (timeLeft === 0) {
          clearInterval(spawnInterval); alive = false
          cancelAnimationFrame(raf); onGameOver(score)
          return
        }
        holes.forEach(h => {
          if (!h.active) return
          // Rise animation
          h.riseY = Math.min(1, h.riseY + dt / 120)
          h.timer -= dt
          if (h.timer <= 0 && !h.hit) { h.active = false; h.riseY = 0 }
          if (h.hit) { h.riseY = Math.max(0, h.riseY - dt / 100) }
        })
      }

      ctx.fillStyle = '#0A0A18'; ctx.fillRect(0, 0, W, H)

      // Fondo de tierra
      ctx.fillStyle = '#1A1A30'
      ctx.fillRect(0, H * 0.12, W, H * 0.88)

      // Timer bar
      const barW = W - 32
      ctx.fillStyle = '#111120'
      ctx.beginPath(); ctx.roundRect(16, 10, barW, 8, 4); ctx.fill()
      const pct = timeLeft / TOTAL_TIME
      ctx.fillStyle = pct < 0.25 ? '#FF4F7B' : pct < 0.5 ? '#FFB800' : '#00FFF7'
      ctx.beginPath(); ctx.roundRect(16, 10, barW * pct, 8, 4); ctx.fill()

      // HUD texto
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#00FFF7'
      ctx.font = `bold 11px 'Orbitron',sans-serif`
      ctx.fillText('WHACK-A-MOLE', W / 2, H * 0.1)
      ctx.font = `10px 'Share Tech Mono',monospace`
      ctx.fillStyle = '#C084FC'
      ctx.fillText(`${score} pts  ·  ${Math.ceil(timeLeft)}s`, W / 2, H * 0.1 + 16)

      // Hoyos y topos
      holes.forEach(h => {
        // Sombra del hoyo
        ctx.save()
        ctx.fillStyle = '#050510'
        ctx.beginPath()
        ctx.ellipse(h.x, h.y + HOLE_R * 0.3, HOLE_R, HOLE_R * 0.45, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 2
        ctx.beginPath()
        ctx.ellipse(h.x, h.y + HOLE_R * 0.3, HOLE_R, HOLE_R * 0.45, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()

        if (!h.active && !h.hit) return
        const riseOff = HOLE_R * 1.6 * (1 - h.riseY)

        ctx.save()
        ctx.beginPath()
        ctx.ellipse(h.x, h.y + HOLE_R * 0.3, HOLE_R, HOLE_R * 0.45, 0, 0, Math.PI * 2)
        ctx.clip()

        const col = h.hit ? '#FFD700' : '#FF4F7B'
        if (!h.hit) { ctx.shadowColor = col; ctx.shadowBlur = 16 }
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(h.x, h.y - HOLE_R * 0.6 + riseOff, HOLE_R * 0.78, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Cara
        ctx.save()
        ctx.font = `${HOLE_R * 1.1}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.globalAlpha = h.riseY
        ctx.fillText(h.hit ? '💫' : '🐹', h.x, h.y - HOLE_R * 0.55 + riseOff)
        ctx.restore()
      })

      raf = requestAnimationFrame(draw)
    }

    function onPointer(e: PointerEvent) {
      if (paused || !alive) return
      const rect = canvas.getBoundingClientRect()
      const mx = (e.clientX - rect.left) * (W / rect.width)
      const my = (e.clientY - rect.top) * (H / rect.height)

      holes.forEach(h => {
        if (!h.active || h.hit) return
        const dx = mx - h.x, dy = my - (h.y - HOLE_R * 0.6)
        if (dx * dx + dy * dy < (HOLE_R * 0.85) ** 2) {
          h.hit = true; score += 10; onScore(score)
          setTimeout(() => { h.active = false; h.riseY = 0 }, 400)
        }
      })
    }

    canvas.addEventListener('pointerdown', onPointer)
    raf = requestAnimationFrame(draw)

    return {
      cleanup: () => {
        alive = false; clearInterval(spawnInterval)
        cancelAnimationFrame(raf); canvas.removeEventListener('pointerdown', onPointer)
      },
      pause:   () => { paused = true },
      resume:  () => { paused = false },
    }
  },
}
