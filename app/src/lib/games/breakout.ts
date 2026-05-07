import type { GameEngine } from '@/components/arcade/GameCanvas'

export const breakoutEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height

    const COLS = 8
    const B_W = Math.floor((W - 40) / COLS) - 6
    const B_H = 16, B_PAD = 6
    const B_OFF_X = (W - (COLS * (B_W + B_PAD) - B_PAD)) / 2
    const B_OFF_Y = 26

    const COLORS = ['#FF4F7B', '#C084FC', '#00FFF7', '#FFD700', '#4ade80', '#FF8C00', '#FF4F7B', '#C084FC']

    const paddle = { w: 80, h: 10, x: W / 2 - 40, y: H - 22, speed: 7 }
    const ballBase = 3.5
    let ball = { x: W / 2, y: H / 2, r: 6, dx: ballBase, dy: -ballBase }
    let lives = 3, score = 0, wave = 1
    let waveRows = 4  // empieza con 4 filas
    const keys: Record<string, boolean> = {}
    let raf: number, alive = true, paused = false
    let transitioning = false, transitionTimer = 0

    interface Brick { x: number; y: number; alive: boolean; color: string; hp: number; maxHp: number }
    let bricks: Brick[] = []

    function makeBricks() {
      bricks = []
      // Desde ola 3: algunas filas tienen ladrillos con 2 HP
      const hardRowStart = wave >= 3 ? 0 : 999
      for (let r = 0; r < waveRows; r++) {
        const isHard = r < hardRowStart + (wave - 2)
        const hp = isHard ? 2 : 1
        for (let c = 0; c < COLS; c++) {
          bricks.push({
            x: B_OFF_X + c * (B_W + B_PAD),
            y: B_OFF_Y + r * (B_H + B_PAD),
            alive: true, color: COLORS[r % COLORS.length],
            hp, maxHp: hp,
          })
        }
      }
    }

    function ballSpeed() {
      // Velocidad base crece con cada ola
      const spd = Math.min(ballBase + (wave - 1) * 0.5, 7.5)
      const sign = (v: number) => v >= 0 ? 1 : -1
      const ratio = spd / Math.sqrt(ball.dx ** 2 + ball.dy ** 2)
      ball.dx *= ratio; ball.dy *= ratio
    }

    function resetBall() {
      const spd = Math.min(ballBase + (wave - 1) * 0.5, 7.5)
      ball = { x: W / 2, y: paddle.y - 10, r: 6, dx: (Math.random() > 0.5 ? 1 : -1) * spd, dy: -spd }
    }

    function rr(x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath()
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
      ctx.lineTo(0 + x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
    }

    function draw() {
      ctx.fillStyle = '#0A0A18'; ctx.fillRect(0, 0, W, H)

      if (transitioning) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = '#C084FC'
        ctx.font = `bold 20px 'Orbitron',sans-serif`
        ctx.fillText(`¡OLA ${wave - 1} OK!`, W / 2, H / 2 - 24)
        ctx.fillStyle = '#00FFF7'
        ctx.font = `12px 'Share Tech Mono',monospace`
        ctx.fillText(`${score} pts`, W / 2, H / 2 + 8)
        ctx.fillStyle = '#555570'
        ctx.font = `10px 'Share Tech Mono',monospace`
        ctx.fillText(`OLA ${wave} — ${waveRows} filas${wave >= 3 ? ' + bloques duros' : ''}`, W / 2, H / 2 + 28)
        return
      }

      // Bloques
      bricks.forEach(b => {
        if (!b.alive) return
        ctx.save()
        // Si tiene 2 HP: brilla más; si ya recibió 1 golpe: semitransparente
        const damaged = b.maxHp > 1 && b.hp < b.maxHp
        ctx.shadowColor = damaged ? '#555' : b.color + '99'
        ctx.shadowBlur = damaged ? 2 : 8
        ctx.fillStyle = damaged ? '#555570' : b.color
        ctx.globalAlpha = damaged ? 0.5 : 1
        rr(b.x, b.y, B_W, B_H, 4); ctx.fill()
        if (!damaged) {
          ctx.globalAlpha = 0.15; ctx.fillStyle = '#fff'
          rr(b.x, b.y, B_W, 4, 4); ctx.fill()
        }
        // Indicador de HP extra
        if (b.maxHp > 1 && !damaged) {
          ctx.globalAlpha = 0.7; ctx.fillStyle = '#fff'
          ctx.font = `bold 8px 'Share Tech Mono',monospace`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText('2', b.x + B_W / 2, b.y + B_H / 2)
        }
        ctx.restore()
      })

      // Paleta
      ctx.save(); ctx.shadowColor = '#00FFF7'; ctx.shadowBlur = 12; ctx.fillStyle = '#00FFF7'
      rr(paddle.x, paddle.y, paddle.w, paddle.h, 5); ctx.fill(); ctx.restore()

      // Pelota
      ctx.save(); ctx.shadowColor = '#E8E8F0'; ctx.shadowBlur = 12; ctx.fillStyle = '#E8E8F0'
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill(); ctx.restore()

      // HUD
      ctx.fillStyle = '#FF4F7B'; ctx.font = "11px 'Share Tech Mono',monospace"; ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText('♥ '.repeat(lives).trim(), 8, H - 6)
      ctx.fillStyle = '#C084FC'; ctx.textAlign = 'center'
      ctx.font = `bold 9px 'Orbitron',sans-serif`
      ctx.fillText(`OLA ${wave}`, W / 2, H - 6)
      ctx.fillStyle = '#00FFF7'; ctx.textAlign = 'right'
      ctx.font = `9px 'Share Tech Mono',monospace`
      ctx.fillText(`${score} pts`, W - 8, H - 6)
    }

    function nextWave() {
      wave++
      waveRows = Math.min(4 + wave - 1, 8)  // +1 fila por ola, máx 8
      transitioning = true
      cancelAnimationFrame(raf)
      makeBricks()
      resetBall()
      transitionTimer = window.setTimeout(() => {
        transitioning = false
        if (alive) loop()
      }, 1800)
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

      // Paleta
      if (ball.x > paddle.x && ball.x < paddle.x + paddle.w &&
          ball.y + ball.r > paddle.y && ball.y + ball.r < paddle.y + paddle.h + 4) {
        ball.dy = -Math.abs(ball.dy)
        ball.dx = ((ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2)) * 5.5
        ball.y = paddle.y - ball.r
      }

      // Ladrillos
      for (const b of bricks) {
        if (!b.alive) continue
        if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + B_W &&
            ball.y + ball.r > b.y && ball.y - ball.r < b.y + B_H) {
          ball.dy = -ball.dy
          b.hp--
          if (b.hp <= 0) {
            b.alive = false
            score += 10 * wave; onScore(score)
          } else {
            // Golpe sin destruir: pequeño rebote extra y puntos menores
            score += 3; onScore(score)
          }
          // ¿Limpiamos ola?
          if (bricks.every(bk => !bk.alive)) {
            const bonus = 300 + wave * 100; score += bonus; onScore(score)
            nextWave()
            return
          }
          break
        }
      }
    }

    function loop() {
      raf = requestAnimationFrame(function tick() {
        if (!alive || transitioning) return
        if (!paused) { update(); draw() }
        else draw()
        raf = requestAnimationFrame(tick)
      })
    }

    makeBricks(); draw()
    loop()

    function onKey(e: KeyboardEvent) { keys[e.key] = true }
    function offKey(e: KeyboardEvent) { keys[e.key] = false }
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', offKey)

    return {
      cleanup: () => {
        alive = false; cancelAnimationFrame(raf)
        clearTimeout(transitionTimer)
        window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', offKey)
      },
      pause: () => { paused = true },
      resume: () => { paused = false },
    }
  }
}
