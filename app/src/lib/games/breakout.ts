import type { GameEngine } from '@/components/arcade/GameCanvas'

export const breakoutEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const COLS = 8, ROWS = 5
    const B_W = Math.floor((W - 40) / COLS) - 6
    const B_H = 18, B_PAD = 6
    const B_OFF_X = (W - (COLS * (B_W + B_PAD) - B_PAD)) / 2
    const B_OFF_Y = 28
    const COLORS = ['#C084FC', '#FF4F7B', '#00FFF7', '#ffaa00', '#4ade80']
    const paddle = { w: 80, h: 10, x: W / 2 - 40, y: H - 22, speed: 7 }
    const ballInit = () => ({ x: W / 2, y: H / 2, r: 6, dx: 3.5, dy: -3.5 })
    let ball = ballInit()
    let lives = 3, score = 0
    const keys: Record<string, boolean> = {}
    let raf: number
    let alive = true

    interface Brick { x: number; y: number; alive: boolean; color: string }
    let bricks: Brick[] = []

    function makeBricks() {
      bricks = []
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          bricks.push({ x: B_OFF_X + c * (B_W + B_PAD), y: B_OFF_Y + r * (B_H + B_PAD), alive: true, color: COLORS[r % COLORS.length] })
    }

    function rr(x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath()
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
      ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
    }

    function resetBall() {
      ball = { x: W / 2, y: paddle.y - 10, r: 6, dx: (Math.random() > 0.5 ? 1 : -1) * 3.5, dy: -3.5 }
    }

    function draw() {
      ctx.fillStyle = '#0A0A18'; ctx.fillRect(0, 0, W, H)
      bricks.forEach(b => {
        if (!b.alive) return
        ctx.save(); ctx.shadowColor = b.color + '88'; ctx.shadowBlur = 8; ctx.fillStyle = b.color
        rr(b.x, b.y, B_W, B_H, 4); ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(b.x, b.y, B_W, 4, 4); ctx.fill()
        ctx.restore()
      })
      ctx.save(); ctx.shadowColor = '#00FFF7'; ctx.shadowBlur = 12; ctx.fillStyle = '#00FFF7'
      rr(paddle.x, paddle.y, paddle.w, paddle.h, 5); ctx.fill(); ctx.restore()
      ctx.save(); ctx.shadowColor = 'rgba(232,232,240,0.6)'; ctx.shadowBlur = 12; ctx.fillStyle = '#E8E8F0'
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill(); ctx.restore()
      // lives
      ctx.fillStyle = '#FF4F7B'; ctx.font = "12px 'Share Tech Mono',monospace"; ctx.textAlign = 'left'
      ctx.fillText('♥ '.repeat(lives), 8, H - 6)
    }

    function update() {
      if (keys['ArrowLeft'] || keys['a']) paddle.x = Math.max(0, paddle.x - paddle.speed)
      if (keys['ArrowRight'] || keys['d']) paddle.x = Math.min(W - paddle.w, paddle.x + paddle.speed)
      ball.x += ball.dx; ball.y += ball.dy
      if (ball.x - ball.r < 0) { ball.dx = Math.abs(ball.dx); ball.x = ball.r }
      if (ball.x + ball.r > W) { ball.dx = -Math.abs(ball.dx); ball.x = W - ball.r }
      if (ball.y - ball.r < 0) { ball.dy = Math.abs(ball.dy); ball.y = ball.r }
      if (ball.y + ball.r > H) {
        lives--
        if (lives <= 0) { alive = false; cancelAnimationFrame(raf); onGameOver(score, false); return }
        resetBall()
      }
      if (ball.x > paddle.x && ball.x < paddle.x + paddle.w &&
          ball.y + ball.r > paddle.y && ball.y + ball.r < paddle.y + paddle.h + 4) {
        ball.dy = -Math.abs(ball.dy)
        ball.dx = ((ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2)) * 5
        ball.y = paddle.y - ball.r
      }
      for (const b of bricks) {
        if (!b.alive) continue
        if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + B_W &&
            ball.y + ball.r > b.y && ball.y - ball.r < b.y + B_H) {
          ball.dy = -ball.dy; b.alive = false; score += 10; onScore(score)
          if (bricks.every(bk => !bk.alive)) { alive = false; cancelAnimationFrame(raf); onGameOver(score + 500, true); return }
          break
        }
      }
    }

    makeBricks(); draw()
    raf = requestAnimationFrame(function loop() { if (!alive) return; update(); draw(); raf = requestAnimationFrame(loop) })

    function onKey(e: KeyboardEvent) { keys[e.key] = true }
    function offKey(e: KeyboardEvent) { keys[e.key] = false }
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', offKey)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', offKey) }
  }
}
