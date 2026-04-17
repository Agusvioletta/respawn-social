import type { GameEngine } from '@/components/arcade/GameCanvas'

export const tetrisEngine: GameEngine = {
  init(canvas, onScore, onGameOver) {
    const ctx = canvas.getContext('2d')!
    const COLS = 10, ROWS = 20, BLOCK = Math.floor(canvas.width / COLS)
    const H = ROWS * BLOCK

    const COLORS: Record<string, string> = {
      I: '#00FFF7', O: '#FFD700', T: '#C084FC',
      S: '#4ade80', Z: '#FF4F7B', J: '#3B82F6', L: '#FF8C00'
    }
    const SHAPES: Record<string, number[][]> = {
      I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      O: [[1,1],[1,1]],
      T: [[0,1,0],[1,1,1],[0,0,0]],
      S: [[0,1,1],[1,1,0],[0,0,0]],
      Z: [[1,1,0],[0,1,1],[0,0,0]],
      J: [[1,0,0],[1,1,1],[0,0,0]],
      L: [[0,0,1],[1,1,1],[0,0,0]],
    }
    const KEYS = Object.keys(SHAPES)

    interface Piece { shape: number[][]; color: string; x: number; y: number }

    let board: (string | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
    let current: Piece, next: Piece
    let score = 0, lines = 0, level = 1, dropInterval = 600, lastDrop = 0
    let alive = true, paused = false, raf: number

    function newPiece(): Piece {
      const k = KEYS[Math.floor(Math.random() * KEYS.length)]
      return { shape: SHAPES[k].map(r => [...r]), color: COLORS[k], x: Math.floor(COLS / 2) - 2, y: 0 }
    }

    function collides(p: Piece) {
      return p.shape.some((row, r) => row.some((v, c) => {
        if (!v) return false
        const nx = p.x + c, ny = p.y + r
        return nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && board[ny][nx])
      }))
    }

    function merge(p: Piece) {
      p.shape.forEach((row, r) => row.forEach((v, c) => {
        if (v && p.y + r >= 0) board[p.y + r][p.x + c] = p.color
      }))
    }

    function clearLines() {
      let cleared = 0
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(c => c)) { board.splice(r, 1); board.unshift(Array(COLS).fill(null)); cleared++; r++ }
      }
      if (!cleared) return
      const pts = [0, 100, 300, 500, 800]
      score += (pts[cleared] ?? 1000) * level
      lines += cleared
      level = Math.floor(lines / 10) + 1
      dropInterval = Math.max(80, 600 - (level - 1) * 55)
      onScore(score)
    }

    function rotate(p: Piece): Piece {
      const R = p.shape[0].map((_, i) => p.shape.map(row => row[i]).reverse())
      const rotated = { ...p, shape: R }
      return collides(rotated) ? p : rotated
    }

    function drop() {
      const moved = { ...current, y: current.y + 1 }
      if (!collides(moved)) { current = moved; return }
      merge(current); clearLines()
      current = next; next = newPiece()
      if (collides(current)) { alive = false; cancelAnimationFrame(raf); onGameOver(score) }
    }

    function hardDrop() {
      while (!collides({ ...current, y: current.y + 1 })) current.y++
      drop()
    }

    function drawBlock(x: number, y: number, color: string) {
      ctx.fillStyle = color; ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2)
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, 3)
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x * BLOCK + 1, y * BLOCK + BLOCK - 4, BLOCK - 2, 3)
    }

    function draw() {
      ctx.fillStyle = '#0A0A18'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 0.5
      for (let c = 0; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c * BLOCK, 0); ctx.lineTo(c * BLOCK, H); ctx.stroke() }
      for (let r = 0; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * BLOCK); ctx.lineTo(canvas.width, r * BLOCK); ctx.stroke() }
      board.forEach((row, r) => row.forEach((color, c) => { if (color) drawBlock(c, r, color) }))

      // Ghost
      const ghost = { ...current }
      while (!collides({ ...ghost, y: ghost.y + 1 })) ghost.y++
      current.shape.forEach((row, r) => row.forEach((v, c) => {
        if (v && ghost.y + r !== current.y + r) {
          ctx.fillStyle = 'rgba(255,255,255,0.08)'
          ctx.fillRect((ghost.x + c) * BLOCK + 1, (ghost.y + r) * BLOCK + 1, BLOCK - 2, BLOCK - 2)
        }
      }))
      current.shape.forEach((row, r) => row.forEach((v, c) => { if (v) drawBlock(current.x + c, current.y + r, current.color) }))

      // HUD (stats on side — drawn below board)
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = "10px 'Share Tech Mono',monospace"; ctx.textAlign = 'left'
      ctx.fillText(`Nv ${level}  Líneas ${lines}`, 4, H + 14)
    }

    current = newPiece(); next = newPiece()

    function loop(ts: number) {
      if (!alive) return
      if (!paused) {
        if (ts - lastDrop >= dropInterval) { drop(); lastDrop = ts }
        draw()
      }
      raf = requestAnimationFrame(loop)
    }
    lastDrop = performance.now()
    raf = requestAnimationFrame(loop)

    function onKey(e: KeyboardEvent) {
      if (!alive || paused) return
      switch (e.key) {
        case 'ArrowLeft':  { const m = { ...current, x: current.x - 1 }; if (!collides(m)) current = m; break }
        case 'ArrowRight': { const m = { ...current, x: current.x + 1 }; if (!collides(m)) current = m; break }
        case 'ArrowDown':  drop(); break
        case 'ArrowUp':    current = rotate(current); break
        case ' ':          e.preventDefault(); hardDrop(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return {
      cleanup: () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey) },
      pause:   () => { paused = true },
      resume:  () => { paused = false },
    }
  }
}
