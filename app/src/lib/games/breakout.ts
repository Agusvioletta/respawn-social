import type { GameEngine } from '@/components/arcade/GameCanvas'

const BALL_BASE = 4.8   // velocidad base (antes 3.5)
const POWERUP_CHANCE = 0.28  // 28% chance por bloque destruido

// Power-up types
type PUType = 'multiball' | 'wide' | 'slow'
interface PowerUp { x: number; y: number; vy: number; type: PUType }
interface Ball { x: number; y: number; r: number; dx: number; dy: number }
interface Brick { x: number; y: number; alive: boolean; color: string; hp: number; maxHp: number }

const PU_COLORS: Record<PUType, string> = { multiball: '#FF4F7B', wide: '#4ade80', slow: '#C084FC' }
const PU_LABELS: Record<PUType, string> = { multiball: '🔴', wide: '🟢', slow: '🟣' }
const PU_NAMES:  Record<PUType, string> = { multiball: '+PELOTAS', wide: 'PALETA+', slow: 'LENTA' }
const PU_TYPES: PUType[] = ['multiball', 'wide', 'slow']

export const breakoutEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height

    const COLS = 8
    const B_W = Math.floor((W - 40) / COLS) - 6
    const B_H = 16, B_PAD = 6
    const B_OFF_X = (W - (COLS * (B_W + B_PAD) - B_PAD)) / 2
    const B_OFF_Y = 26

    const COLORS = ['#FF4F7B','#C084FC','#00FFF7','#FFD700','#4ade80','#FF8C00','#FF4F7B','#C084FC']

    const paddleBase = { w: 80, h: 10 }
    const paddle = { w: paddleBase.w, h: paddleBase.h, x: W / 2 - 40, y: H - 22, speed: 7 }

    let balls: Ball[] = []
    let powerUps: PowerUp[] = []
    let bricks: Brick[] = []
    let lives = 3, score = 0, wave = 1, waveRows = 4
    const keys: Record<string, boolean> = {}
    let raf: number, alive = true, paused = false

    // Power-up timers activos
    let wideTimer = 0
    let slowTimer = 0
    let multiTimer = 0

    let _phase: 'playing' | 'transition' = 'playing'
    // Getter prevents TypeScript control-flow narrowing across function call boundaries
    const getPhase = () => _phase
    const setPhase = (p: 'playing' | 'transition') => { _phase = p }
    let transitionTimeout = 0

    function spd() {
      // Velocidad de ola actual. La 'slow' la reduce temporalmente
      const base = Math.min(BALL_BASE + (wave - 1) * 0.45, 8)
      return slowTimer > 0 ? base * 0.6 : base
    }

    function normalizeBall(b: Ball) {
      const s = spd()
      const mag = Math.sqrt(b.dx * b.dx + b.dy * b.dy)
      if (mag === 0) return
      b.dx = (b.dx / mag) * s
      b.dy = (b.dy / mag) * s
    }

    function makeBall(fromX?: number, fromY?: number): Ball {
      const s = spd()
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3)
      return {
        x: fromX ?? W / 2, y: fromY ?? paddle.y - 10,
        r: 6, dx: Math.cos(angle) * s, dy: Math.sin(angle) * s,
      }
    }

    function makeBricks() {
      bricks = []
      for (let r = 0; r < waveRows; r++) {
        // Ladrillos con 2 HP desde ola 3, los más altos
        const hp = (wave >= 3 && r < wave - 2) ? 2 : 1
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

    function rr(x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath()
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
      ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
    }

    function applyPowerUp(type: PUType) {
      if (type === 'multiball') {
        // Añadir 2 pelotas extra desde la posición del paddle
        const existing = balls[0]
        const ox = existing ? existing.x : W / 2
        const oy = existing ? existing.y : paddle.y - 10
        balls.push(makeBall(ox, oy))
        balls.push(makeBall(ox, oy))
        multiTimer = 8000
      } else if (type === 'wide') {
        paddle.w = Math.min(paddleBase.w * 1.75, W * 0.5)
        wideTimer = 8000
      } else if (type === 'slow') {
        slowTimer = 6000
        balls.forEach(normalizeBall)
      }
    }

    function draw() {
      ctx.fillStyle = '#0A0A18'; ctx.fillRect(0, 0, W, H)

      if (getPhase() === 'transition') {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = '#C084FC'
        ctx.font = `bold 20px 'Orbitron',sans-serif`
        ctx.fillText(`¡OLA ${wave - 1} OK!`, W / 2, H / 2 - 26)
        ctx.fillStyle = '#00FFF7'
        ctx.font = `12px 'Share Tech Mono',monospace`
        ctx.fillText(`${score} pts`, W / 2, H / 2 + 6)
        ctx.fillStyle = '#555570'
        ctx.font = `9px 'Share Tech Mono',monospace`
        ctx.fillText(`OLA ${wave} — ${waveRows} filas${wave >= 3 ? '  bloques duros' : ''}`, W / 2, H / 2 + 26)
        return
      }

      // Bloques
      bricks.forEach(b => {
        if (!b.alive) return
        const damaged = b.maxHp > 1 && b.hp < b.maxHp
        ctx.save()
        ctx.shadowColor = damaged ? 'transparent' : b.color + '99'
        ctx.shadowBlur = damaged ? 0 : 7
        ctx.fillStyle = damaged ? '#44445A' : b.color
        ctx.globalAlpha = damaged ? 0.6 : 1
        rr(b.x, b.y, B_W, B_H, 4); ctx.fill()
        if (!damaged) {
          ctx.globalAlpha = 0.14; ctx.fillStyle = '#fff'
          rr(b.x, b.y, B_W, 4, 4); ctx.fill()
        }
        if (b.maxHp > 1 && !damaged) {
          ctx.globalAlpha = 0.7; ctx.fillStyle = '#fff'
          ctx.font = `bold 8px 'Share Tech Mono',monospace`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText('2', b.x + B_W / 2, b.y + B_H / 2)
        }
        ctx.restore()
      })

      // Power-ups cayendo
      powerUps.forEach(p => {
        ctx.save()
        ctx.shadowColor = PU_COLORS[p.type]; ctx.shadowBlur = 10
        ctx.fillStyle = PU_COLORS[p.type]
        ctx.beginPath(); ctx.roundRect(p.x - 14, p.y - 9, 28, 18, 4); ctx.fill()
        ctx.font = `10px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(PU_LABELS[p.type], p.x, p.y)
        ctx.restore()
      })

      // Paleta
      const paddleColor = wideTimer > 0 ? '#4ade80' : '#00FFF7'
      ctx.save(); ctx.shadowColor = paddleColor; ctx.shadowBlur = 12; ctx.fillStyle = paddleColor
      rr(paddle.x, paddle.y, paddle.w, paddle.h, 5); ctx.fill(); ctx.restore()

      // Pelotas
      balls.forEach((b, i) => {
        const col = i === 0 ? '#E8E8F0' : '#FF4F7B'
        ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.fillStyle = col
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.restore()
      })

      // HUD inferior
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#FF4F7B'; ctx.font = "11px 'Share Tech Mono',monospace"; ctx.textAlign = 'left'
      ctx.fillText('♥ '.repeat(lives).trim(), 8, H - 6)
      ctx.fillStyle = '#C084FC'; ctx.textAlign = 'center'
      ctx.font = `bold 8px 'Orbitron',sans-serif`
      ctx.fillText(`OLA ${wave}`, W / 2, H - 6)
      ctx.fillStyle = '#00FFF7'; ctx.textAlign = 'right'
      ctx.font = `9px 'Share Tech Mono',monospace`
      ctx.fillText(`${score} pts`, W - 8, H - 6)

      // Indicadores de power-ups activos
      let puX = 8
      if (wideTimer > 0) {
        ctx.fillStyle = '#4ade80'; ctx.font = `8px 'Share Tech Mono',monospace`
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
        ctx.fillText(`🟢${Math.ceil(wideTimer / 1000)}s`, puX, H - 18)
        puX += 44
      }
      if (slowTimer > 0) {
        ctx.fillStyle = '#C084FC'
        ctx.fillText(`🟣${Math.ceil(slowTimer / 1000)}s`, puX, H - 18)
        puX += 44
      }
      if (multiTimer > 0) {
        ctx.fillStyle = '#FF4F7B'
        ctx.fillText(`🔴${Math.ceil(multiTimer / 1000)}s`, puX, H - 18)
      }
    }

    const DT_CAP = 20  // ms por tick para física estable

    function update(dt: number) {
      // Power-up timers
      wideTimer = Math.max(0, wideTimer - dt)
      slowTimer = Math.max(0, slowTimer - dt)
      multiTimer = Math.max(0, multiTimer - dt)
      if (wideTimer === 0 && paddle.w !== paddleBase.w) paddle.w = paddleBase.w
      if (slowTimer === 0) balls.forEach(b => {
        // Renormalizar si slow acaba de expirar
        const s = spd()
        const mag = Math.sqrt(b.dx * b.dx + b.dy * b.dy)
        if (mag > 0 && Math.abs(mag - s) > 0.5) { b.dx = (b.dx / mag) * s; b.dy = (b.dy / mag) * s }
      })
      if (multiTimer === 0 && balls.length > 1) balls.splice(1)  // quitar pelotas extra

      // Paleta
      if (keys['ArrowLeft'] || keys['a']) paddle.x = Math.max(0, paddle.x - paddle.speed)
      if (keys['ArrowRight'] || keys['d']) paddle.x = Math.min(W - paddle.w, paddle.x + paddle.speed)

      // Power-ups cayendo
      for (let pi = powerUps.length - 1; pi >= 0; pi--) {
        const p = powerUps[pi]
        p.y += p.vy
        if (p.y > H) { powerUps.splice(pi, 1); continue }
        // Colisión con paleta
        if (p.x > paddle.x && p.x < paddle.x + paddle.w && p.y > paddle.y && p.y < paddle.y + paddle.h + 8) {
          applyPowerUp(p.type)
          powerUps.splice(pi, 1)
        }
      }

      // Pelotas
      for (let bi = balls.length - 1; bi >= 0; bi--) {
        const b = balls[bi]
        b.x += b.dx; b.y += b.dy

        if (b.x - b.r < 0) { b.dx = Math.abs(b.dx); b.x = b.r }
        if (b.x + b.r > W) { b.dx = -Math.abs(b.dx); b.x = W - b.r }
        if (b.y - b.r < 0) { b.dy = Math.abs(b.dy); b.y = b.r }

        if (b.y + b.r > H) {
          // Esta pelota se perdió
          balls.splice(bi, 1)
          if (balls.length === 0) {
            lives--
            if (lives <= 0) { alive = false; cancelAnimationFrame(raf); onGameOver(score, false); return }
            balls.push(makeBall())
          }
          continue
        }

        // Paleta
        if (b.x > paddle.x && b.x < paddle.x + paddle.w &&
            b.y + b.r > paddle.y && b.y + b.r < paddle.y + paddle.h + 4) {
          b.dy = -Math.abs(b.dy)
          b.dx = ((b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2)) * spd() * 1.1
          b.y = paddle.y - b.r
        }

        // Bloques
        for (const bk of bricks) {
          if (!bk.alive) continue
          if (b.x + b.r > bk.x && b.x - b.r < bk.x + B_W &&
              b.y + b.r > bk.y && b.y - b.r < bk.y + B_H) {
            b.dy = -b.dy
            bk.hp--
            if (bk.hp <= 0) {
              bk.alive = false
              score += 10 * wave; onScore(score)
              // Spawn power-up
              if (Math.random() < POWERUP_CHANCE) {
                const type = PU_TYPES[Math.floor(Math.random() * PU_TYPES.length)]
                powerUps.push({ x: bk.x + B_W / 2, y: bk.y + B_H / 2, vy: 2.2, type })
              }
            } else {
              score += 3; onScore(score)
            }
            if (bricks.every(bk2 => !bk2.alive)) {
              score += 300 + wave * 100; onScore(score)
              startNextWave()
              return
            }
            break
          }
        }
      }
    }

    function startNextWave() {
      setPhase('transition')
      powerUps = []
      wideTimer = 0; slowTimer = 0; multiTimer = 0
      paddle.w = paddleBase.w
      wave++
      waveRows = Math.min(4 + wave - 1, 8)
      makeBricks()
      balls = [makeBall()]
      cancelAnimationFrame(raf)
      transitionTimeout = window.setTimeout(() => {
        setPhase('playing')
        if (alive) loop()
      }, 1900)
    }

    let lastTime = performance.now()

    function loop() {
      raf = requestAnimationFrame(function tick(now) {
        if (!alive) return
        if (getPhase() === 'transition') { draw(); return }
        if (!paused) {
          const rawDt = now - lastTime
          // Limitar dt para física estable
          const steps = Math.ceil(rawDt / DT_CAP)
          const dt = rawDt / steps
          for (let i = 0; i < steps; i++) {
            update(dt)
            if (!alive || getPhase() === 'transition') break
          }
        }
        lastTime = now
        draw()
        raf = requestAnimationFrame(tick)
      })
    }

    function onKey(e: KeyboardEvent) { keys[e.key] = true }
    function offKey(e: KeyboardEvent) { keys[e.key] = false }
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', offKey)

    makeBricks()
    balls = [makeBall()]
    lastTime = performance.now()
    loop()

    return {
      cleanup: () => {
        alive = false; cancelAnimationFrame(raf)
        clearTimeout(transitionTimeout)
        window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', offKey)
      },
      pause: () => { paused = true },
      resume: () => { paused = false; lastTime = performance.now() },
    }
  }
}
