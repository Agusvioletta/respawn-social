import type { GameEngine } from '@/components/arcade/GameCanvas'

export const stackEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height

    const BH = 22        // block height
    const INITIAL_W = W * 0.52
    const MIN_W = 18     // game over if narrower

    // Stack starts at bottom
    type Block = { x: number; w: number; y: number; color: string }

    const COLORS = [
      '#00FFF7','#00C8C2','#0099A0','#4ade80',
      '#C084FC','#FF4F7B','#FF8C00','#FFD700',
    ]

    const firstBlock: Block = { x: (W - INITIAL_W) / 2, w: INITIAL_W, y: H - BH, color: COLORS[0] }
    const stack: Block[] = [firstBlock]

    let curX = 0, curW = INITIAL_W, curDir = 1
    let speed = 2.5, score = 0
    let alive = true, paused = false
    let raf: number
    let level = 0
    let perfect = 0   // consecutive perfect drops

    function drop() {
      if (!alive) return
      const top = stack[stack.length - 1]

      const left  = Math.max(curX, top.x)
      const right = Math.min(curX + curW, top.x + top.w)
      const overlap = right - left

      if (overlap <= 0) {
        alive = false; cancelAnimationFrame(raf); onGameOver(score); return
      }

      const isPerfect = overlap >= top.w * 0.95
      if (isPerfect) {
        perfect++
        if (perfect >= 3) { score += 50; onScore(score) }  // streak bonus
      } else {
        perfect = 0
      }

      const newBlock: Block = {
        x: left, w: overlap,
        y: top.y - BH,
        color: COLORS[level % COLORS.length],
      }
      stack.push(newBlock)
      score += Math.max(1, Math.round((overlap / top.w) * 20)) + level
      onScore(score)
      level++

      // Speed up every 5 levels
      if (level % 5 === 0) speed = Math.min(8, speed + 0.6)

      // Scroll down if stack is getting too high
      if (newBlock.y < H * 0.45) {
        stack.forEach(b => { b.y += BH })
      }

      curW = isPerfect ? Math.min(overlap + 2, top.w) : overlap
      curX = 0; curDir = 1

      if (curW < MIN_W) {
        alive = false; cancelAnimationFrame(raf); onGameOver(score)
      }
    }

    function draw() {
      if (!alive) return

      if (!paused) {
        curX += curDir * speed
        if (curX + curW > W) { curX = W - curW; curDir = -1 }
        if (curX < 0)        { curX = 0;        curDir =  1 }
      }

      ctx.fillStyle = '#0A0A18'; ctx.fillRect(0, 0, W, H)

      // Grid dots background
      ctx.fillStyle = 'rgba(255,255,255,0.025)'
      for (let gx = 20; gx < W; gx += 30)
        for (let gy = 20; gy < H; gy += 30) {
          ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI * 2); ctx.fill()
        }

      // HUD
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#00FFF7'
      ctx.font = `bold 11px 'Orbitron',sans-serif`
      ctx.fillText(`STACK — ${score} pts`, W / 2, 24)
      ctx.font = `9px 'Share Tech Mono',monospace`
      ctx.fillStyle = '#555570'
      ctx.fillText('ESPACIO / CLICK para soltar', W / 2, 40)
      if (perfect >= 3) {
        ctx.fillStyle = '#FFD700'
        ctx.fillText(`🔥 RACHA x${perfect}`, W / 2, 52)
      }

      // Stacked blocks
      stack.forEach((b, i) => {
        const isTop = i === stack.length - 1
        ctx.save()
        if (isTop) { ctx.shadowColor = b.color; ctx.shadowBlur = 8 }
        ctx.fillStyle = b.color
        const alpha = Math.max(0.25, 1 - (stack.length - 1 - i) * 0.07)
        ctx.globalAlpha = alpha
        ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, BH - 2, 3); ctx.fill()
        if (isTop) {
          ctx.globalAlpha = 0.3
          ctx.fillStyle = '#fff'
          ctx.fillRect(b.x + 4, b.y + 3, b.w - 8, 3)
        }
        ctx.restore()
      })

      // Moving (current) block
      const curColor = COLORS[(level + 1) % COLORS.length]
      const curY = stack[stack.length - 1].y - BH
      ctx.save()
      ctx.shadowColor = curColor; ctx.shadowBlur = 16
      ctx.fillStyle = curColor
      ctx.beginPath(); ctx.roundRect(curX, curY, curW, BH - 2, 3); ctx.fill()
      ctx.globalAlpha = 0.3; ctx.fillStyle = '#fff'
      ctx.fillRect(curX + 4, curY + 3, Math.max(0, curW - 8), 3)
      ctx.restore()

      if (!paused) raf = requestAnimationFrame(draw)
    }

    function onAction(e: Event) {
      if (!alive || paused) return
      if (e instanceof KeyboardEvent && e.code !== 'Space') return
      if (e instanceof KeyboardEvent) e.preventDefault()
      drop()
    }

    window.addEventListener('keydown', onAction as (e: Event) => void)
    canvas.addEventListener('pointerdown', onAction)
    raf = requestAnimationFrame(draw)

    return {
      cleanup: () => {
        alive = false; cancelAnimationFrame(raf)
        window.removeEventListener('keydown', onAction as (e: Event) => void)
        canvas.removeEventListener('pointerdown', onAction)
      },
      pause:   () => { paused = true; cancelAnimationFrame(raf) },
      resume:  () => { paused = false; draw() },
    }
  },
}
