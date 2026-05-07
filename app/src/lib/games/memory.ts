import type { GameEngine } from '@/components/arcade/GameCanvas'

const EMOJIS = ['🎮','🏆','⚡','🔥','💎','🌟','🎯','🚀','🎲','👾','🦄','🍕','🎸','🐉','🌈']

// Configuración de cada ronda: columnas, filas, timeout para voltear (ms)
const ROUND_CONFIG = [
  { cols: 2, rows: 2, flipMs: 1000 },  // Ronda 1: 4 cartas (2 pares)
  { cols: 3, rows: 2, flipMs: 900  },  // Ronda 2: 6 cartas (3 pares)
  { cols: 4, rows: 3, flipMs: 850  },  // Ronda 3: 12 cartas (6 pares)
  { cols: 4, rows: 4, flipMs: 800  },  // Ronda 4: 16 cartas (8 pares)
  { cols: 5, rows: 4, flipMs: 700  },  // Ronda 5: 20 cartas (10 pares)
  { cols: 5, rows: 4, flipMs: 550  },  // Ronda 6+: misma grilla, más rápido
]

export const memoryEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const PAD = 8, TOP = 58

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
    // Para la pantalla de transición entre rondas
    let transitioning = false, transitionTimer = 0

    function cfg() {
      return ROUND_CONFIG[Math.min(round, ROUND_CONFIG.length - 1)]
    }

    function buildCards() {
      const { cols, rows } = cfg()
      totalPairs = Math.floor((cols * rows) / 2)
      const count = totalPairs * 2
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

    function draw() {
      ctx.fillStyle = '#0A0A18'; ctx.fillRect(0, 0, W, H)

      // HUD
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#00FFF7'
      ctx.font = `bold 11px 'Orbitron',sans-serif`
      ctx.fillText(`MEMORIA — RONDA ${round + 1}`, W / 2, 22)
      ctx.font = `10px 'Share Tech Mono',monospace`
      ctx.fillStyle = '#C084FC'
      ctx.fillText(`${matches}/${totalPairs} pares  ·  ${score} pts`, W / 2, 42)

      if (transitioning) {
        // Pantalla de transición entre rondas
        ctx.fillStyle = 'rgba(10,10,24,0.88)'; ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#00FFF7'
        ctx.font = `bold 20px 'Orbitron',sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(`¡RONDA ${round} OK!`, W / 2, H / 2 - 20)
        ctx.fillStyle = '#C084FC'
        ctx.font = `12px 'Share Tech Mono',monospace`
        ctx.fillText(`RONDA ${round + 1} — ${cfg().cols * cfg().rows} cartas`, W / 2, H / 2 + 14)
        if (alive && !paused) raf = requestAnimationFrame(draw)
        return
      }

      // Animar flip
      cards.forEach(c => {
        const target = (c.flipped || c.matched) ? 1 : 0
        if (c.flipPct !== target) {
          c.flipPct += (target - c.flipPct) * 0.22
          if (Math.abs(c.flipPct - target) < 0.02) c.flipPct = target
        }
        drawCard(c)
      })

      if (alive && !paused) raf = requestAnimationFrame(draw)
    }

    function nextRound() {
      round++
      transitioning = true
      cancelAnimationFrame(raf)
      buildCards()
      // Mostrar transición por 1.6s, luego arrancar nueva ronda
      transitionTimer = window.setTimeout(() => {
        transitioning = false
        if (alive) { raf = requestAnimationFrame(draw) }
      }, 1600)
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
          // Puntos por par: más puntos en rondas avanzadas
          const pts = 100 + round * 20
          score += pts; onScore(score)
          selected = []; locked = false

          if (matches === totalPairs) {
            // Bonus de completar ronda
            const bonus = 300 + round * 100
            score += bonus; onScore(score)
            // Siempre hay una ronda siguiente
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
    draw()

    return {
      cleanup: () => {
        alive = false
        cancelAnimationFrame(raf)
        clearTimeout(transitionTimer)
        canvas.removeEventListener('pointerdown', onPointer)
      },
      pause: () => { paused = true; cancelAnimationFrame(raf) },
      resume: () => { paused = false; draw() },
    }
  },
}
