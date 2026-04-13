import type { GameEngine } from '@/components/arcade/GameCanvas'

export const flappyEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const GRAVITY = 0.45, FLAP_VEL = -8
    const PIPE_W = 52, PIPE_GAP = 140, PIPE_SPEED = 2.4
    const GROUND = H - 30

    let bird = { x: 80, y: H / 2, vy: 0, radius: 14 }
    interface Pipe { x: number; top: number; scored: boolean }
    let pipes: Pipe[] = []
    let score = 0, pipeTimer = 0
    let raf: number
    let alive = true

    function spawnPipe() {
      const top = 60 + Math.random() * (GROUND - PIPE_GAP - 80 - 60)
      pipes.push({ x: W + 10, top, scored: false })
    }

    function drawBg() {
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#07070F'); grad.addColorStop(1, '#0D0D20')
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ;[[40,60],[120,30],[200,80],[280,20],[320,70],[80,120],[160,50]].forEach(([x,y]) => {
        ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill()
      })
      ctx.fillStyle = '#111120'; ctx.fillRect(0, GROUND, W, H - GROUND)
      ctx.fillStyle = 'rgba(192,132,252,0.2)'; ctx.fillRect(0, GROUND - 1, W, 2)
    }

    function drawPipe(p: Pipe) {
      ctx.fillStyle = '#1C1C34'; ctx.strokeStyle = '#C084FC'; ctx.lineWidth = 1.5
      // top shaft
      ctx.beginPath(); ctx.roundRect(p.x, 0, PIPE_W, p.top - 10, [0, 0, 8, 8]); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.roundRect(p.x - 6, p.top - 20, PIPE_W + 12, 20, 8); ctx.fill(); ctx.stroke()
      // bottom
      const botY = p.top + PIPE_GAP
      ctx.beginPath(); ctx.roundRect(p.x - 6, botY, PIPE_W + 12, 20, 8); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.roundRect(p.x, botY + 20, PIPE_W, GROUND - botY - 20, [8, 8, 0, 0]); ctx.fill(); ctx.stroke()
    }

    function drawBird() {
      const { x, y, vy } = bird
      const tilt = Math.min(Math.max(vy * 3, -40), 60)
      ctx.save(); ctx.translate(x, y); ctx.rotate(tilt * Math.PI / 180)
      ctx.save(); ctx.shadowColor = '#FF4F7B'; ctx.shadowBlur = 12; ctx.fillStyle = '#FF4F7B'
      ctx.beginPath(); ctx.ellipse(0, 0, bird.radius, bird.radius * 0.85, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
      ctx.fillStyle = '#FF8CAB'; ctx.beginPath(); ctx.ellipse(-3, -4, 5, 4, -0.3, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6, -4, 4, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(7, -4, 2, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }

    function update() {
      bird.vy += GRAVITY; bird.y += bird.vy
      pipeTimer++
      if (pipeTimer >= 90) { spawnPipe(); pipeTimer = 0 }
      pipes.forEach(p => { p.x -= PIPE_SPEED })
      pipes = pipes.filter(p => p.x > -PIPE_W - 20)
      pipes.forEach(p => {
        if (!p.scored && p.x + PIPE_W < bird.x) {
          p.scored = true; score++; onScore(score * 10)
        }
      })
      if (bird.y + bird.radius > GROUND || bird.y - bird.radius < 0) {
        alive = false; cancelAnimationFrame(raf); onGameOver(score * 10); return
      }
      for (const p of pipes) {
        const bx = bird.x, by = bird.y, br = bird.radius - 2
        const inX = bx + br > p.x - 6 && bx - br < p.x + PIPE_W + 6
        if (inX && (by - br < p.top || by + br > p.top + PIPE_GAP)) {
          alive = false; cancelAnimationFrame(raf); onGameOver(score * 10); return
        }
      }
    }

    function loop() {
      if (!alive) return
      drawBg(); pipes.forEach(drawPipe); drawBird()
      ctx.fillStyle = '#00FFF7'; ctx.font = "bold 28px 'Orbitron',monospace"; ctx.textAlign = 'center'
      ctx.shadowColor = '#00FFF7'; ctx.shadowBlur = 10
      ctx.fillText(String(score), W / 2, 50); ctx.shadowBlur = 0
      update(); raf = requestAnimationFrame(loop)
    }

    drawBg(); drawBird()
    raf = requestAnimationFrame(loop)

    function flap() { bird.vy = FLAP_VEL }
    function onKey(e: KeyboardEvent) { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); flap() } }
    canvas.addEventListener('click', flap)
    window.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(raf); canvas.removeEventListener('click', flap); window.removeEventListener('keydown', onKey) }
  }
}
