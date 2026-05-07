import type { GameEngine } from '@/components/arcade/GameCanvas'

const N = 4

type Grid = number[][]

function empty(): Grid { return Array.from({ length: N }, () => Array(N).fill(0)) }

function addRandom(g: Grid) {
  const cells: [number, number][] = []
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c] === 0) cells.push([r, c])
  if (!cells.length) return
  const [r, c] = cells[Math.floor(Math.random() * cells.length)]
  g[r][c] = Math.random() < 0.9 ? 2 : 4
}

function hasMovesLeft(g: Grid): boolean {
  if (g.flat().includes(0)) return true
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      if (c < N - 1 && g[r][c] === g[r][c + 1]) return true
      if (r < N - 1 && g[r][c] === g[r + 1][c]) return true
    }
  return false
}

function slideRow(row: number[]): [number[], number] {
  let pts = 0
  const filt = row.filter(v => v !== 0)
  const merged: number[] = []
  let i = 0
  while (i < filt.length) {
    if (i + 1 < filt.length && filt[i] === filt[i + 1]) {
      const val = filt[i] * 2; merged.push(val); pts += val; i += 2
    } else { merged.push(filt[i]); i++ }
  }
  while (merged.length < N) merged.push(0)
  return [merged, pts]
}

function applyMove(g: Grid, dir: 'left' | 'right' | 'up' | 'down'): [Grid, number, boolean] {
  const newG = empty(); let pts = 0; let changed = false
  if (dir === 'left') {
    for (let r = 0; r < N; r++) {
      const [row, p] = slideRow(g[r].slice()); newG[r] = row; pts += p
      if (row.some((v, c) => v !== g[r][c])) changed = true
    }
  } else if (dir === 'right') {
    for (let r = 0; r < N; r++) {
      const [row, p] = slideRow(g[r].slice().reverse()); newG[r] = row.reverse(); pts += p
      if (newG[r].some((v, c) => v !== g[r][c])) changed = true
    }
  } else if (dir === 'up') {
    for (let c = 0; c < N; c++) {
      const col = g.map(r => r[c])
      const [merged, p] = slideRow(col); pts += p
      merged.forEach((v, r) => { newG[r][c] = v; if (v !== g[r][c]) changed = true })
    }
  } else {
    for (let c = 0; c < N; c++) {
      const col = g.map(r => r[c]).reverse()
      const [merged, p] = slideRow(col); merged.reverse(); pts += p
      merged.forEach((v, r) => { newG[r][c] = v; if (v !== g[r][c]) changed = true })
    }
  }
  return [newG, pts, changed]
}

const TILE_COLORS: Record<number, [string, string]> = {
  0:    ['#161628', '#555570'],
  2:    ['#1C2B3A', '#E8E8F0'],
  4:    ['#1A2E20', '#E8E8F0'],
  8:    ['#FF8C00', '#fff'],
  16:   ['#FF6B00', '#fff'],
  32:   ['#FF4F7B', '#fff'],
  64:   ['#CC3D62', '#fff'],
  128:  ['#C084FC', '#fff'],
  256:  ['#9A5ECC', '#fff'],
  512:  ['#00FFF7', '#0A0A18'],
  1024: ['#00C8C2', '#0A0A18'],
  2048: ['#FFD700', '#0A0A18'],
}

export const g2048Engine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height

    const TOP = 56
    const PAD = 8
    const BOARD_SIZE = Math.min(W, H - TOP) - 20
    const TILE = (BOARD_SIZE - PAD * (N + 1)) / N
    const BOARD_X = (W - BOARD_SIZE) / 2
    const BOARD_Y = TOP + 8

    let grid = empty(); addRandom(grid); addRandom(grid)
    let score = 0, alive = true, paused = false
    let raf: number, won = false

    function draw() {
      ctx.fillStyle = '#0A0A18'; ctx.fillRect(0, 0, W, H)

      // HUD
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#FFD700'
      ctx.font = `bold 14px 'Orbitron',sans-serif`
      ctx.fillText('2048', W / 2, 24)
      ctx.font = `11px 'Share Tech Mono',monospace`
      ctx.fillStyle = '#C084FC'
      ctx.fillText(`SCORE: ${score.toLocaleString('es-AR')}`, W / 2, 46)

      // Board background
      ctx.fillStyle = '#111120'
      ctx.beginPath()
      ctx.roundRect(BOARD_X, BOARD_Y, BOARD_SIZE, BOARD_SIZE, 12)
      ctx.fill()

      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const v = grid[r][c]
          const x = BOARD_X + PAD + c * (TILE + PAD)
          const y = BOARD_Y + PAD + r * (TILE + PAD)
          const [bg, fg] = TILE_COLORS[v] ?? ['#7C3AED', '#fff']

          ctx.fillStyle = bg
          ctx.beginPath(); ctx.roundRect(x, y, TILE, TILE, 6); ctx.fill()

          if (v > 0) {
            if (v >= 512) { ctx.save(); ctx.shadowColor = fg; ctx.shadowBlur = 8 }
            ctx.fillStyle = fg
            const fs = v >= 1000 ? Math.max(10, TILE * 0.28) : v >= 100 ? TILE * 0.34 : TILE * 0.42
            ctx.font = `bold ${fs}px 'Orbitron',sans-serif`
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
            ctx.fillText(String(v), x + TILE / 2, y + TILE / 2)
            if (v >= 512) ctx.restore()
          }
        }
      }
      ctx.textBaseline = 'alphabetic'

      if (alive && !paused) raf = requestAnimationFrame(draw)
    }

    function onKey(e: KeyboardEvent) {
      if (!alive || paused) return
      let dir: 'left' | 'right' | 'up' | 'down' | null = null
      switch (e.key) {
        case 'ArrowLeft':  case 'a': dir = 'left';  break
        case 'ArrowRight': case 'd': dir = 'right'; break
        case 'ArrowUp':    case 'w': dir = 'up';    break
        case 'ArrowDown':  case 's': dir = 'down';  break
      }
      if (!dir) return
      e.preventDefault()

      const [newG, pts, changed] = applyMove(grid, dir)
      if (!changed) return
      grid = newG; score += pts; onScore(score)
      addRandom(grid)

      if (grid.flat().includes(2048) && !won) {
        won = true; score += 2048; onScore(score)
        setTimeout(() => { alive = false; cancelAnimationFrame(raf); onGameOver(score, true) }, 400)
        return
      }
      if (!hasMovesLeft(grid)) {
        setTimeout(() => { alive = false; cancelAnimationFrame(raf); onGameOver(score, false) }, 300)
      }
    }

    draw()
    window.addEventListener('keydown', onKey)

    return {
      cleanup: () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey) },
      pause:   () => { paused = true; cancelAnimationFrame(raf) },
      resume:  () => { paused = false; draw() },
    }
  },
}
