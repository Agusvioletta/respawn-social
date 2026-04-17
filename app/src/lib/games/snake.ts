import type { GameEngine } from '@/components/arcade/GameCanvas'

export const snakeEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const GRID = 20, TILE = W / GRID

    let snake = [{ x: 10, y: 10 }]
    let food = { x: 5, y: 5 }
    let dx = 1, dy = 0
    let score = 0
    let alive = true
    let paused = false
    let interval: ReturnType<typeof setInterval>

    function placeFood() {
      do {
        food = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
      } while (snake.some(s => s.x === food.x && s.y === food.y))
    }

    function rr(x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath()
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
      ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
    }

    function draw() {
      ctx.fillStyle = '#0A0A18'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(255,255,255,0.03)'
      for (let x = 0; x < GRID; x++)
        for (let y = 0; y < GRID; y++) {
          ctx.beginPath(); ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, 1, 0, Math.PI * 2); ctx.fill()
        }
      ctx.save(); ctx.shadowColor = 'rgba(255,79,123,0.6)'; ctx.shadowBlur = 12
      ctx.fillStyle = '#FF4F7B'
      rr(food.x * TILE + 3, food.y * TILE + 3, TILE - 6, TILE - 6, 4); ctx.fill()
      ctx.restore()
      snake.forEach((seg, i) => {
        const alpha = Math.max(0.3, 1 - i * 0.04)
        if (i === 0) { ctx.save(); ctx.shadowColor = '#00FFF7'; ctx.shadowBlur = 10 }
        ctx.fillStyle = i === 0 ? '#00FFF7' : `rgba(0,200,195,${alpha})`
        rr(seg.x * TILE + 1, seg.y * TILE + 1, TILE - 2, TILE - 2, i === 0 ? 5 : 3); ctx.fill()
        if (i === 0) ctx.restore()
      })
    }

    function update() {
      if (!alive) return
      const head = { x: snake[0].x + dx, y: snake[0].y + dy }
      snake.unshift(head)
      if (head.x === food.x && head.y === food.y) {
        score++; onScore(score * 10); placeFood()
      } else { snake.pop() }
      if (
        head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID ||
        snake.slice(1).some(s => s.x === head.x && s.y === head.y)
      ) { alive = false; clearInterval(interval); onGameOver(score * 10) }
    }

    placeFood()
    draw()
    interval = setInterval(() => { if (!paused) { update(); draw() } }, 140)

    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowLeft':  case 'a': if (dx !== 1)  { dx = -1; dy = 0 } break
        case 'ArrowRight': case 'd': if (dx !== -1) { dx = 1;  dy = 0 } break
        case 'ArrowUp':    case 'w': if (dy !== 1)  { dx = 0;  dy = -1 } break
        case 'ArrowDown':  case 's': if (dy !== -1) { dx = 0;  dy = 1 } break
      }
    }
    window.addEventListener('keydown', onKey)
    return {
      cleanup: () => { alive = false; clearInterval(interval); window.removeEventListener('keydown', onKey) },
      pause:   () => { paused = true },
      resume:  () => { paused = false },
    }
  }
}
