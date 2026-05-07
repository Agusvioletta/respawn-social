import type { GameEngine } from '@/components/arcade/GameCanvas'

const EMOJIS = ['🎮', '🏆', '⚡', '🔥', '💎', '🌟', '🎯', '🚀', '🎲', '👾', '🦄', '🍕']
const GRID = 4   // 4×4 = 16 cartas = 8 pares

export const memoryEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height

    // Usar 8 emojis random
    const picked = [...EMOJIS].sort(() => Math.random() - 0.5).slice(0, 8)
    const symbols = [...picked, ...picked].sort(() => Math.random() - 0.5)

    const PAD = 10
    const TOP = 52
    const CARD_W = (W - PAD * (GRID + 1)) / GRID
    const CARD_H = (H - TOP - PAD * (GRID + 1)) / GRID

    type Card = { id: number; sym: string; x: number; y: number; flipped: boolean; matched: boolean; flipPct: number }
    const cards: Card[] = symbols.map((sym, i) => ({
      id: i, sym,
      x: PAD + (i % GRID) * (CARD_W + PAD),
      y: TOP + Math.floor(i / GRID) * (CARD_H + PAD),
      flipped: false, matched: false, flipPct: 0,
    }))

    let selected: number[] = []
    let score = 0, matches = 0
    let locked = false
    let alive = true, paused = false
    let raf: number

    function drawCard(c: Card) {
      const r = 8
      const flip = c.flipPct   // 0 = closed, 1 = open, animates 0→1 or 1→0

      // Squeeze effect: scale X by |cos(flip * PI)|
      const scaleX = Math.abs(Math.cos(flip * Math.PI))
      const cx = c.x + CARD_W / 2

      ctx.save()
      ctx.translate(cx, c.y)
      ctx.scale(scaleX, 1)
      ctx.translate(-CARD_W / 2, 0)

      // Background
      if (c.matched) {
        ctx.shadowColor = '#00FFF7'; ctx.shadowBlur = 12
        ctx.fillStyle = 'rgba(0,255,247,0.15)'
      } else if (flip > 0.5) {
        ctx.fillStyle = '#1C1C35'
      } else {
        ctx.fillStyle = '#161628'
      }
      ctx.beginPath()
      ctx.moveTo(r, 0); ctx.lineTo(CARD_W - r, 0)
      ctx.arcTo(CARD_W, 0, CARD_W, r, r)
      ctx.lineTo(CARD_W, CARD_H - r); ctx.arcTo(CARD_W, CARD_H, CARD_W - r, CARD_H, r)
      ctx.lineTo(r, CARD_H); ctx.arcTo(0, CARD_H, 0, CARD_H - r, r)
      ctx.lineTo(0, r); ctx.arcTo(0, 0, r, 0, r)
      ctx.closePath(); ctx.fill()

      // Border
      ctx.strokeStyle = c.matched ? '#00FFF7' : flip > 0.5 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1; ctx.stroke()

      // Content
      if (flip > 0.5 || c.matched) {
        ctx.font = `${Math.min(CARD_W, CARD_H) * 0.45}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(c.sym, CARD_W / 2, CARD_H / 2 + 2)
      } else {
        ctx.fillStyle = 'rgba(192,132,252,0.3)'
        ctx.font = `bold ${Math.min(CARD_W, CARD_H) * 0.38}px 'Orbitron',sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('?', CARD_W / 2, CARD_H / 2)
      }
      ctx.restore()
    }

    function draw() {
      ctx.fillStyle = '#0A0A18'; ctx.fillRect(0, 0, W, H)

      // HUD
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#00FFF7'
      ctx.font = `bold 11px 'Orbitron',sans-serif`
      ctx.fillText('MEMORIA', W / 2, 22)
      ctx.font = `11px 'Share Tech Mono',monospace`
      ctx.fillStyle = '#C084FC'
      ctx.fillText(`${matches}/8 pares  ·  ${score} pts`, W / 2, 42)

      // Animate flip (progress 0→1 or 1→0 in ~200ms)
      cards.forEach(c => {
        const target = (c.flipped || c.matched) ? 1 : 0
        if (c.flipPct !== target) {
          c.flipPct += (target - c.flipPct) * 0.25
          if (Math.abs(c.flipPct - target) < 0.02) c.flipPct = target
        }
        drawCard(c)
      })

      if (alive && !paused) raf = requestAnimationFrame(draw)
    }

    function onPointer(e: PointerEvent) {
      if (locked || paused || !alive) return
      const rect = canvas.getBoundingClientRect()
      const mx = (e.clientX - rect.left) * (W / rect.width)
      const my = (e.clientY - rect.top) * (H / rect.height)

      const card = cards.find(c =>
        !c.flipped && !c.matched &&
        mx >= c.x && mx <= c.x + CARD_W && my >= c.y && my <= c.y + CARD_H
      )
      if (!card) return

      card.flipped = true
      selected.push(card.id)

      if (selected.length === 2) {
        locked = true
        const [a, b] = selected.map(id => cards[id])
        if (a.sym === b.sym) {
          a.matched = b.matched = true
          matches++; score += 100; onScore(score)
          selected = []; locked = false
          if (matches === 8) {
            score += 800; onScore(score)
            setTimeout(() => { alive = false; cancelAnimationFrame(raf); onGameOver(score, true) }, 600)
          }
        } else {
          setTimeout(() => { a.flipped = b.flipped = false; selected = []; locked = false }, 900)
        }
      }
    }

    canvas.addEventListener('pointerdown', onPointer)
    draw()

    return {
      cleanup: () => { alive = false; cancelAnimationFrame(raf); canvas.removeEventListener('pointerdown', onPointer) },
      pause:   () => { paused = true; cancelAnimationFrame(raf) },
      resume:  () => { paused = false; draw() },
    }
  },
}
