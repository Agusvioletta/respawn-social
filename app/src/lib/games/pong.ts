import type { GameEngine } from '@/components/arcade/GameCanvas'

export const pongEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const WIN_SCORE = 7
    const PAD = { w: 10, h: 72, speed: 6 }
    const CPU_MARGIN = 48

    let player = { x: 16, y: H / 2 - PAD.h / 2, score: 0, dy: 0 }
    let cpu    = { x: W - 16 - PAD.w, y: H / 2 - PAD.h / 2, score: 0 }
    let ball   = { x: W / 2, y: H / 2, r: 7, speed: 5, dx: 5, dy: 3 }
    const keys: Record<string, boolean> = {}
    let raf: number
    let alive = true

    function rr(x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath()
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
      ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
    }

    function resetBall() {
      ball = { x: W / 2, y: H / 2, r: 7, speed: 5, dx: (Math.random() > 0.5 ? 1 : -1) * 5, dy: (Math.random() > 0.5 ? 1 : -1) * 3 }
    }

    function draw() {
      ctx.fillStyle = '#0A0A18'; ctx.fillRect(0, 0, W, H)
      for (let y = 8; y < H; y += 18) {
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(W / 2 - 1, y, 2, 10)
      }
      ctx.save(); ctx.shadowColor = '#00FFF7'; ctx.shadowBlur = 12; ctx.fillStyle = '#00FFF7'
      rr(player.x, player.y, PAD.w, PAD.h, 4); ctx.fill(); ctx.restore()
      ctx.save(); ctx.shadowColor = '#FF4F7B'; ctx.shadowBlur = 12; ctx.fillStyle = '#FF4F7B'
      rr(cpu.x, cpu.y, PAD.w, PAD.h, 4); ctx.fill(); ctx.restore()
      ctx.save(); ctx.shadowColor = 'rgba(232,232,240,0.5)'; ctx.shadowBlur = 16; ctx.fillStyle = '#E8E8F0'
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill(); ctx.restore()
      // scores
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = "bold 24px 'Orbitron',monospace"; ctx.textAlign = 'center'
      ctx.fillText(`${player.score}`, W / 2 - 40, 36)
      ctx.fillText(`${cpu.score}`, W / 2 + 40, 36)
    }

    function update() {
      if (keys['ArrowUp'] || keys['w']) player.dy = -PAD.speed
      else if (keys['ArrowDown'] || keys['s']) player.dy = PAD.speed
      else player.dy = 0
      player.y = Math.max(0, Math.min(H - PAD.h, player.y + player.dy))
      const cpuCenter = cpu.y + PAD.h / 2
      if (cpuCenter < ball.y - CPU_MARGIN) cpu.y += PAD.speed * 0.9
      else if (cpuCenter > ball.y + CPU_MARGIN) cpu.y -= PAD.speed * 0.9
      cpu.y = Math.max(0, Math.min(H - PAD.h, cpu.y))
      ball.x += ball.dx; ball.y += ball.dy
      if (ball.y - ball.r < 0) { ball.dy = Math.abs(ball.dy); ball.y = ball.r }
      if (ball.y + ball.r > H) { ball.dy = -Math.abs(ball.dy); ball.y = H - ball.r }
      for (const pad of [player, cpu]) {
        if (ball.x - ball.r < pad.x + PAD.w && ball.x + ball.r > pad.x &&
            ball.y > pad.y && ball.y < pad.y + PAD.h) {
          ball.dx = -ball.dx
          ball.dy = ((ball.y - (pad.y + PAD.h / 2)) / (PAD.h / 2)) * ball.speed
          ball.speed = Math.min(ball.speed + 0.3, 14)
          ball.x = pad === player ? pad.x + PAD.w + ball.r : pad.x - ball.r
        }
      }
      if (ball.x - ball.r < 0) {
        cpu.score++
        if (cpu.score >= WIN_SCORE) { alive = false; cancelAnimationFrame(raf); onGameOver(player.score * 20, false); return }
        resetBall()
      } else if (ball.x + ball.r > W) {
        player.score++
        const pts = player.score * 20
        onScore(pts)
        if (player.score >= WIN_SCORE) { alive = false; cancelAnimationFrame(raf); onGameOver(pts + 200, true); return }
        resetBall()
      }
    }

    function loop() { if (!alive) return; update(); draw(); raf = requestAnimationFrame(loop) }
    draw()
    raf = requestAnimationFrame(loop)

    function onKey(e: KeyboardEvent) { keys[e.key] = true }
    function offKey(e: KeyboardEvent) { keys[e.key] = false }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', offKey)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', offKey) }
  }
}
