import type { GameEngine } from '@/components/arcade/GameCanvas'

export const froggerEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height

    const ROWS = 9
    const ROW_H = H / ROWS
    const FROG_R = ROW_H * 0.36

    let frog = { x: W / 2, y: H - ROW_H / 2 }
    let score = 0, lives = 3
    let alive = true, paused = false, dead = false, deadTimer = 0
    let raf: number, lastNow = performance.now()

    // Lanes: y-center, direction (1=right, -1=left), speed, array of vehicles
    type Vehicle = { x: number; w: number; h: number }
    type Lane = { y: number; dir: number; speed: number; vehicles: Vehicle[]; color: string }

    const lanes: Lane[] = [
      { y: ROW_H * 1.5, dir:  1, speed: 1.4, color: '#FF4F7B', vehicles: [] },
      { y: ROW_H * 2.5, dir: -1, speed: 2.1, color: '#C084FC', vehicles: [] },
      { y: ROW_H * 3.5, dir:  1, speed: 1.0, color: '#FF8C00', vehicles: [] },
      { y: ROW_H * 4.5, dir: -1, speed: 2.6, color: '#FF4F7B', vehicles: [] },
      { y: ROW_H * 5.5, dir:  1, speed: 1.7, color: '#4ade80', vehicles: [] },
      { y: ROW_H * 6.5, dir: -1, speed: 1.2, color: '#00FFF7', vehicles: [] },
      { y: ROW_H * 7.5, dir:  1, speed: 1.9, color: '#FF8C00', vehicles: [] },
    ]

    lanes.forEach(lane => {
      const count = 2 + Math.floor(Math.random() * 2)
      const spacing = W / count
      for (let i = 0; i < count; i++) {
        const w = 46 + Math.random() * 36, h = ROW_H * 0.55
        lane.vehicles.push({ x: i * spacing + Math.random() * 20, w, h })
      }
    })

    function resetFrog() { frog = { x: W / 2, y: H - ROW_H / 2 } }

    function checkCollision() {
      lanes.forEach(lane => {
        if (Math.abs(frog.y - lane.y) > FROG_R + ROW_H * 0.28) return
        lane.vehicles.forEach(v => {
          if (frog.x + FROG_R * 0.7 > v.x && frog.x - FROG_R * 0.7 < v.x + v.w) {
            dead = true; deadTimer = 600
          }
        })
      })
    }

    function draw(now: number) {
      if (!alive) return
      const dt = Math.min(now - lastNow, 50); lastNow = now

      if (!paused) {
        if (dead) {
          deadTimer -= dt
          if (deadTimer <= 0) {
            lives--; dead = false
            if (lives <= 0) { alive = false; cancelAnimationFrame(raf); onGameOver(score); return }
            resetFrog()
          }
        } else {
          lanes.forEach(lane => {
            lane.vehicles.forEach(v => {
              v.x += lane.dir * lane.speed
              if (lane.dir > 0 && v.x > W + 80) v.x = -v.w - 20
              if (lane.dir < 0 && v.x < -v.w - 80) v.x = W + 20
            })
          })
          checkCollision()
          if (!dead && frog.y < ROW_H * 0.6) {
            score += 100; onScore(score); resetFrog()
          }
        }
      }

      // Background
      ctx.fillStyle = '#0A0A18'; ctx.fillRect(0, 0, W, H)

      // Safe zones
      ctx.fillStyle = 'rgba(74,222,128,0.06)'
      ctx.fillRect(0, 0, W, ROW_H)
      ctx.fillRect(0, H - ROW_H, W, ROW_H)

      // Lane rows
      lanes.forEach((lane, i) => {
        ctx.fillStyle = i % 2 === 0 ? '#0D0D20' : '#111128'
        ctx.fillRect(0, lane.y - ROW_H / 2, W, ROW_H)
      })

      // Dashed center lane markers
      ctx.setLineDash([16, 16]); ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1
      for (let r = 1; r < ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * ROW_H); ctx.lineTo(W, r * ROW_H); ctx.stroke()
      }
      ctx.setLineDash([])

      // Vehicles
      lanes.forEach(lane => {
        lane.vehicles.forEach(v => {
          ctx.save()
          ctx.shadowColor = lane.color; ctx.shadowBlur = 6
          ctx.fillStyle = lane.color
          ctx.beginPath(); ctx.roundRect(v.x, lane.y - v.h / 2, v.w, v.h, 5); ctx.fill()

          // Headlights
          const hx = lane.dir > 0 ? v.x + v.w - 7 : v.x + 4
          ctx.shadowBlur = 0; ctx.fillStyle = '#FFD700'
          ctx.beginPath(); ctx.arc(hx, lane.y - 5, 2.5, 0, Math.PI * 2); ctx.fill()
          ctx.beginPath(); ctx.arc(hx, lane.y + 5, 2.5, 0, Math.PI * 2); ctx.fill()
          ctx.restore()
        })
      })

      // Frog or death flash
      if (dead) {
        const flash = Math.sin(deadTimer * 0.03) > 0
        if (flash) {
          ctx.save(); ctx.font = `${FROG_R * 2}px sans-serif`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText('💥', frog.x, frog.y); ctx.restore()
        }
      } else {
        ctx.save(); ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 10
        ctx.font = `${FROG_R * 2}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('🐸', frog.x, frog.y); ctx.restore()
      }

      // HUD
      ctx.fillStyle = 'rgba(7,7,15,0.65)'; ctx.fillRect(0, 0, W, 36)
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#4ade80'; ctx.font = `bold 10px 'Orbitron',sans-serif`
      ctx.textAlign = 'left'; ctx.fillText(`SCORE: ${score}`, 10, 23)
      ctx.textAlign = 'right'
      const heartsStr = Array.from({ length: lives }, () => '❤').join(' ')
      ctx.fillStyle = '#FF4F7B'; ctx.font = `12px sans-serif`
      ctx.fillText(heartsStr, W - 10, 24)

      raf = requestAnimationFrame(draw)
    }

    function onKey(e: KeyboardEvent) {
      if (!alive || paused || dead) return
      const STEP_X = W / 9, STEP_Y = ROW_H
      switch (e.key) {
        case 'ArrowLeft':  case 'a': frog.x = Math.max(FROG_R, frog.x - STEP_X); break
        case 'ArrowRight': case 'd': frog.x = Math.min(W - FROG_R, frog.x + STEP_X); break
        case 'ArrowUp':    case 'w': frog.y = Math.max(ROW_H / 2, frog.y - STEP_Y); break
        case 'ArrowDown':  case 's': frog.y = Math.min(H - ROW_H / 2, frog.y + STEP_Y); break
        default: return
      }
      e.preventDefault()
    }

    window.addEventListener('keydown', onKey)
    raf = requestAnimationFrame(draw)

    return {
      cleanup: () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey) },
      pause:   () => { paused = true },
      resume:  () => { paused = false },
    }
  },
}
