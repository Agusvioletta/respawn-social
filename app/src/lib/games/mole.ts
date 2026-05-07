import type { GameEngine } from '@/components/arcade/GameCanvas'

const ROUND_CONFIG = [
  { cols: 2, rows: 2, roundSec: 15, spawnMs: 900,  visMin: 1400, visMax: 2000 },
  { cols: 3, rows: 3, roundSec: 18, spawnMs: 750,  visMin: 1200, visMax: 1800 },
  { cols: 3, rows: 3, roundSec: 18, spawnMs: 600,  visMin: 900,  visMax: 1400 },
  { cols: 4, rows: 3, roundSec: 20, spawnMs: 550,  visMin: 800,  visMax: 1200 },
  { cols: 4, rows: 4, roundSec: 20, spawnMs: 450,  visMin: 700,  visMax: 1000 },
  { cols: 5, rows: 4, roundSec: 22, spawnMs: 380,  visMin: 550,  visMax: 850  },
]

type Hole = { x: number; y: number; r: number; active: boolean; hit: boolean; timer: number; riseY: number }

export const moleEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height

    let round = 0
    let score = 0
    let alive = true, paused = false
    let raf: number
    let lastNow = performance.now()

    let timeLeft = 0
    let holes: Hole[] = []
    let spawnInterval: ReturnType<typeof setInterval> | null = null

    // 'playing' | 'transition'
    let phase: 'playing' | 'transition' = 'playing'
    let transitionTimer = 0

    function cfg() {
      return ROUND_CONFIG[Math.min(round, ROUND_CONFIG.length - 1)]
    }

    function buildHoles() {
      const { cols, rows } = cfg()
      const HOLE_R = Math.min(W / cols, (H * 0.82) / rows) * 0.36
      const padX = W * 0.12
      const padY = H * 0.14
      const stepX = cols > 1 ? (W - padX * 2) / (cols - 1) : 0
      const stepY = rows > 1 ? (H * 0.82 - padY * 2) / (rows - 1) : 0
      holes = Array.from({ length: cols * rows }, (_, i) => ({
        x: padX + (i % cols) * stepX,
        y: padY + Math.floor(i / cols) * stepY + H * 0.1,
        r: HOLE_R,
        active: false, hit: false, timer: 0, riseY: 0,
      }))
    }

    function stopSpawner() {
      if (spawnInterval !== null) { clearInterval(spawnInterval); spawnInterval = null }
    }

    function startSpawner() {
      stopSpawner()
      const { spawnMs, visMin, visMax } = cfg()
      spawnInterval = setInterval(() => {
        if (paused || phase !== 'playing') return
        const inactive = holes.filter(h => !h.active)
        if (!inactive.length) return
        const h = inactive[Math.floor(Math.random() * inactive.length)]
        h.active = true; h.hit = false; h.riseY = 0
        h.timer = visMin + Math.random() * (visMax - visMin)
      }, spawnMs)
    }

    function startRound() {
      buildHoles()
      timeLeft = cfg().roundSec
      lastNow = performance.now()
      phase = 'playing'
      startSpawner()
      // Lanzar el primer topo sin esperar el intervalo
      const inactive = holes.filter(h => !h.active)
      if (inactive.length) {
        const h = inactive[Math.floor(Math.random() * inactive.length)]
        h.active = true; h.hit = false; h.riseY = 0
        h.timer = cfg().visMin + Math.random() * (cfg().visMax - cfg().visMin)
      }
    }

    function endRound() {
      stopSpawner()
      holes.forEach(h => { h.active = false; h.riseY = 0; h.hit = false })
      phase = 'transition'
      round++
      transitionTimer = window.setTimeout(() => {
        if (!alive) return
        startRound()
      }, 1900)
    }

    // ── Loop principal — siempre corre mientras alive ──
    function draw(now: number) {
      if (!alive) return

      const dt = Math.min(now - lastNow, 50); lastNow = now

      // ── Lógica ──
      if (!paused) {
        if (phase === 'playing') {
          timeLeft = Math.max(0, timeLeft - dt / 1000)

          holes.forEach(h => {
            if (!h.active) return
            h.riseY = Math.min(1, h.riseY + dt / 120)
            h.timer -= dt
            if (h.timer <= 0 && !h.hit) { h.active = false; h.riseY = 0 }
            if (h.hit) { h.riseY = Math.max(0, h.riseY - dt / 90) }
          })

          if (timeLeft === 0) endRound()
        }
      }

      // ── Render ──
      ctx.fillStyle = '#0A0A18'; ctx.fillRect(0, 0, W, H)

      if (phase === 'transition') {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = '#4ade80'
        ctx.font = `bold 18px 'Orbitron',sans-serif`
        ctx.fillText(`¡RONDA ${round} OK!`, W / 2, H / 2 - 24)
        ctx.fillStyle = '#00FFF7'
        ctx.font = `11px 'Share Tech Mono',monospace`
        ctx.fillText(`${score} pts`, W / 2, H / 2 + 6)
        const next = ROUND_CONFIG[Math.min(round, ROUND_CONFIG.length - 1)]
        ctx.fillStyle = '#C084FC'
        ctx.font = `9px 'Share Tech Mono',monospace`
        ctx.fillText(`RONDA ${round + 1} — grilla ${next.cols}×${next.rows}`, W / 2, H / 2 + 26)
        raf = requestAnimationFrame(draw)
        return
      }

      // Fondo tierra
      ctx.fillStyle = '#141428'; ctx.fillRect(0, H * 0.12, W, H * 0.88)

      // Timer bar
      const barW = W - 32
      ctx.fillStyle = '#111120'; ctx.beginPath(); ctx.roundRect(16, 10, barW, 8, 4); ctx.fill()
      const pct = timeLeft / cfg().roundSec
      ctx.fillStyle = pct < 0.25 ? '#FF4F7B' : pct < 0.5 ? '#FFB800' : '#4ade80'
      ctx.beginPath(); ctx.roundRect(16, 10, barW * pct, 8, 4); ctx.fill()

      // HUD texto
      const { cols, rows } = cfg()
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#4ade80'
      ctx.font = `bold 9px 'Orbitron',sans-serif`
      ctx.fillText(`WHACK-A-MOLE  R${round + 1}  ${cols}×${rows}`, W / 2, H * 0.1 + 2)
      ctx.font = `9px 'Share Tech Mono',monospace`
      ctx.fillStyle = '#C084FC'
      ctx.fillText(`${score} pts  ·  ${Math.ceil(timeLeft)}s`, W / 2, H * 0.1 + 15)

      // Hoyos y topos
      holes.forEach(h => {
        ctx.save()
        ctx.fillStyle = '#050510'
        ctx.beginPath()
        ctx.ellipse(h.x, h.y + h.r * 0.3, h.r, h.r * 0.45, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 2
        ctx.stroke()
        ctx.restore()

        if (!h.active && !h.hit) return
        const riseOff = h.r * 1.6 * (1 - h.riseY)

        ctx.save()
        ctx.beginPath()
        ctx.ellipse(h.x, h.y + h.r * 0.3, h.r, h.r * 0.45, 0, 0, Math.PI * 2)
        ctx.clip()
        const col = h.hit ? '#FFD700' : '#FF4F7B'
        if (!h.hit) { ctx.shadowColor = col; ctx.shadowBlur = 16 }
        ctx.fillStyle = col
        ctx.beginPath(); ctx.arc(h.x, h.y - h.r * 0.6 + riseOff, h.r * 0.78, 0, Math.PI * 2); ctx.fill()
        ctx.restore()

        ctx.save()
        ctx.font = `${h.r * 1.1}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.globalAlpha = h.riseY
        ctx.fillText(h.hit ? '💫' : '🐹', h.x, h.y - h.r * 0.55 + riseOff)
        ctx.restore()
      })

      raf = requestAnimationFrame(draw)
    }

    function onPointer(e: PointerEvent) {
      if (paused || !alive || phase !== 'playing') return
      const rect = canvas.getBoundingClientRect()
      const mx = (e.clientX - rect.left) * (W / rect.width)
      const my = (e.clientY - rect.top) * (H / rect.height)

      holes.forEach(h => {
        if (!h.active || h.hit) return
        const dx = mx - h.x, dy = my - (h.y - h.r * 0.6)
        if (dx * dx + dy * dy < (h.r * 0.9) ** 2) {
          h.hit = true
          score += 10 + round * 5; onScore(score)
          setTimeout(() => { h.active = false; h.riseY = 0 }, 380)
        }
      })
    }

    canvas.addEventListener('pointerdown', onPointer)
    startRound()
    raf = requestAnimationFrame(draw)

    return {
      cleanup: () => {
        alive = false
        stopSpawner()
        clearTimeout(transitionTimer)
        cancelAnimationFrame(raf)
        canvas.removeEventListener('pointerdown', onPointer)
      },
      pause: () => { paused = true },
      resume: () => { paused = false },
    }
  },
}
