import type { GameEngine } from '@/components/arcade/GameCanvas'

const EMOJIS = ['🎮','🏆','⚡','🔥','💎','🌟','🎯','🚀','🎲','👾','🦄','🍕','🎸','🐉','🌈']

// cols, rows, timeout volteo (ms), tiempo por ronda (s)
const ROUND_CONFIG = [
  { cols: 2, rows: 2, flipMs: 1000, timeSec: 22 },  // Ronda 1: 4 cartas
  { cols: 3, rows: 2, flipMs: 900,  timeSec: 32 },  // Ronda 2: 6 cartas
  { cols: 4, rows: 3, flipMs: 850,  timeSec: 52 },  // Ronda 3: 12 cartas
  { cols: 4, rows: 4, flipMs: 800,  timeSec: 60 },  // Ronda 4: 16 cartas
  { cols: 5, rows: 4, flipMs: 700,  timeSec: 68 },  // Ronda 5: 20 cartas
  { cols: 5, rows: 4, flipMs: 550,  timeSec: 60 },  // Ronda 6+: misma grilla, más rápido
]

export const memoryEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const PAD = 8, TOP = 64  // más espacio para el HUD con timer

    type Card = {
      id: number; sym: string
      x: number; y: number; w: number; h: number
      flipped: boolean; matched: boolean; flipPct: number
    }

    let round = 0
    let score = 0
    let cards: Card[] = []
    let selected: number[] = []
    let matches = 0, totalPairs = 0
    let locked = false
    let alive = true, paused = false
    let raf: number
    let transitioning = false
    let transitionTimer = 0
    // Timer de ronda
    let timeLeft = 0
    let lastNow = performance.now()

    function cfg() {
      return ROUND_CONFIG[Math.min(round, ROUND_CONFIG.length - 1)]
    }

    function buildCards() {
      const { cols, rows } = cfg()
      totalPairs = Math.floor((cols * rows) / 2)
      const picked = [...EMOJIS].sort(() => Math.random() - 0.5).slice(0, totalPairs)
      const symbols = [...picked, ...picked].sort(() => Math.random() - 0.5)

      const CARD_W = (W - PAD * (cols + 1)) / cols
      const CARD_H = (H - TOP - PAD * (rows + 1)) / rows

      cards = symbols.map((sym, i) => ({
        id: i, sym,
        x: PAD + (i % cols) * (CARD_W + PAD),
        y: TOP + Math.floor(i / cols) * (CARD_H + PAD),
        w: CARD_W, h: CARD_H,
        flipped: false, matched: false, flipPct: 0,
      }))

      selected = []; matches = 0; locked = false
      timeLeft = cfg().timeSec
      lastNow = performance.now()
    }

    function drawCard(c: Card) {
      const flip = c.flipPct
      const scaleX = Math.abs(Math.cos(flip * Math.PI))
      const cx = c.x + c.w / 2
      const r = 6
      ctx.save()
      ctx.translate(cx, c.y)
      ctx.scale(scaleX, 1)
      ctx.translate(-c.w / 2, 0)

      if (c.matched) {
        ctx.shadowColor = '#00FFF7'; ctx.shadowBlur = 10
        ctx.fillStyle = 'rgba(0,255,247,0.13)'
      } else if (flip > 0.5) {
        ctx.fillStyle = '#1C1C35'
      } else {
        ctx.fillStyle = '#161628'
      }
      ctx.beginPath()
      ctx.moveTo(r, 0); ctx.lineTo(c.w - r, 0); ctx.arcTo(c.w, 0, c.w, r, r)
      ctx.lineTo(c.w, c.h - r); ctx.arcTo(c.w, c.h, c.w - r, c.h, r)
      ctx.lineTo(r, c.h); ctx.arcTo(0, c.h, 0, c.h - r, r)
      ctx.lineTo(0, r); ctx.arcTo(0, 0, r, 0, r)
      ctx.closePath(); ctx.fill()

      ctx.strokeStyle = c.matched ? '#00FFF7' : flip > 0.5 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'
      ctx.lineWidth = 1; ctx.stroke()

      if (flip > 0.5 || c.matched) {
        const fs = Math.min(c.w, c.h) * 0.42
        ctx.font = `${fs}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(c.sym, c.w / 2, c.h / 2 + 2)
      } else {
        ctx.fillStyle = 'rgba(192,132,252,0.3)'
        ctx.font = `bold ${Math.min(c.w, c.h) * 0.36}px 'Orbitron',sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('?', c.w / 2, c.h / 2)
      }
      ctx.restore()
    }

    function draw(now: number) {
      if (!alive) return
      const dt = Math.min(now - lastNow, 50); lastNow = now

      ctx.fillStyle = '#0A0A18'; ctx.fillRect(0, 0, W, H)

      // ── Pantalla de transición entre rondas ──
      if (transitioning) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = '#00FFF7'
        ctx.font = `bold 20px 'Orbitron',sans-serif`
        ctx.fillText(`¡RONDA ${round} OK!`, W / 2, H / 2 - 22)
        ctx.fillStyle = '#C084FC'
        ctx.font = `11px 'Share Tech Mono',monospace`
        ctx.fillText(`${score} pts`, W / 2, H / 2 + 6)
        const next = ROUND_CONFIG[Math.min(round, ROUND_CONFIG.length - 1)]
        ctx.fillStyle = '#555570'
        ctx.font = `9px 'Share Tech Mono',monospace`
        ctx.fillText(`RONDA ${round + 1} — ${next.cols * next.rows} cartas — ${next.timeSec}s`, W / 2, H / 2 + 24)
        raf = requestAnimationFrame(draw)
        return
      }

      // ── Actualizar timer ──
      if (!paused && !locked) {
        timeLeft = Math.max(0, timeLeft - dt / 1000)
        if (timeLeft === 0) {
          alive = false
          cancelAnimationFrame(raf)
          onGameOver(score, false)
          return
        }
      }

      // ── HUD ──
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#00FFF7'
      ctx.font = `bold 10px 'Orbitron',sans-serif`
      ctx.fillText(`MEMORIA — RONDA ${round + 1}`, W / 2, 20)
      ctx.font = `9px 'Share Tech Mono',monospace`
      ctx.fillStyle = '#C084FC'
      ctx.fillText(`${matches}/${totalPairs} pares  ·  ${score} pts`, W / 2, 36)

      // Timer bar
      const barW = W - 32
      const pct = timeLeft / cfg().timeSec
      ctx.fillStyle = '#111120'
      ctx.beginPath(); ctx.roundRect(16, 44, barW, 6, 3); ctx.fill()
      ctx.fillStyle = pct < 0.25 ? '#FF4F7B' : pct < 0.5 ? '#FFB800' : '#00FFF7'
      ctx.beginPath(); ctx.roundRect(16, 44, barW * pct, 6, 3); ctx.fill()
      // Segundos restantes
      ctx.textAlign = 'right'; ctx.fillStyle = pct < 0.25 ? '#FF4F7B' : '#555570'
      ctx.font = `8px 'Share Tech Mono',monospace`
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`${Math.ceil(timeLeft)}s`, W - 16, 42)

      // ── Cartas ──
      cards.forEach(c => {
        const target = (c.flipped || c.matched) ? 1 : 0
        if (c.flipPct !== target) {
          c.flipPct += (target - c.flipPct) * 0.22
          if (Math.abs(c.flipPct - target) < 0.02) c.flipPct = target
        }
        drawCard(c)
      })

      raf = requestAnimationFrame(draw)
    }

    function nextRound() {
      round++
      transitioning = true
      cancelAnimationFrame(raf)
      buildCards()
      transitionTimer = window.setTimeout(() => {
        transitioning = false
        if (alive) { lastNow = performance.now(); raf = requestAnimationFrame(draw) }
      }, 1700)
    }

    function onPointer(e: PointerEvent) {
      if (locked || paused || !alive || transitioning) return
      const rect = canvas.getBoundingClientRect()
      const mx = (e.clientX - rect.left) * (W / rect.width)
      const my = (e.clientY - rect.top) * (H / rect.height)

      const card = cards.find(c =>
        !c.flipped && !c.matched &&
        mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h
      )
      if (!card) return

      card.flipped = true
      selected.push(card.id)

      if (selected.length === 2) {
        locked = true
        const [a, b] = selected.map(id => cards[id])
        if (a.sym === b.sym) {
          a.matched = b.matched = true
          matches++
          const pts = 100 + round * 20
          score += pts; onScore(score)
          selected = []; locked = false

          if (matches === totalPairs) {
            // Bonus por tiempo restante
            const timeBonus = Math.round(timeLeft * 10)
            score += 300 + round * 100 + timeBonus; onScore(score)
            setTimeout(() => nextRound(), 600)
          }
        } else {
          const flipMs = cfg().flipMs
          setTimeout(() => { a.flipped = b.flipped = false; selected = []; locked = false }, flipMs)
        }
      }
    }

    buildCards()
    canvas.addEventListener('pointerdown', onPointer)
    raf = requestAnimationFrame(draw)

    return {
      cleanup: () => {
        alive = false
        cancelAnimationFrame(raf)
        clearTimeout(transitionTimer)
        canvas.removeEventListener('pointerdown', onPointer)
      },
      pause: () => { paused = true; cancelAnimationFrame(raf) },
      resume: () => { paused = false; lastNow = performance.now(); raf = requestAnimationFrame(draw) },
    }
  },
}
