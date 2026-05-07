export interface GameDef {
  id: string
  name: string
  emoji: string
  color: string
  description: string
  minLevel: number
}

export const GAMES: GameDef[] = [
  // ── Nivel 1 ─────────────────────────────────────────────────────────────────
  { id: 'snake',        name: 'Snake',          emoji: '🐍', color: '#00FFF7', description: 'Comé, crecé, no te mordas.',              minLevel: 1 },
  { id: 'memory',       name: 'Memoria',        emoji: '🃏', color: '#C084FC', description: 'Encontrá los pares. Ejercitá la mente.',  minLevel: 1 },
  // ── Nivel 2 ─────────────────────────────────────────────────────────────────
  { id: 'pong',         name: 'Pong',           emoji: '🏓', color: '#FF4F7B', description: 'El clásico de todos los tiempos.',        minLevel: 2 },
  { id: 'mole',         name: 'Whack-a-Mole',  emoji: '🐹', color: '#4ade80', description: 'Golpeá los topos antes de que escapen.',   minLevel: 2 },
  // ── Nivel 3 ─────────────────────────────────────────────────────────────────
  { id: 'breakout',     name: 'Breakout',       emoji: '🧱', color: '#C084FC', description: 'Rompé todos los bloques.',                minLevel: 3 },
  // ── Nivel 4 ─────────────────────────────────────────────────────────────────
  { id: 'asteroids',    name: 'Asteroids',      emoji: '☄️', color: '#FFB800', description: 'Sobrevivé en el espacio.',                minLevel: 4 },
  { id: 'g2048',        name: '2048',           emoji: '🔢', color: '#FFD700', description: 'Combiná los números. Llegá a 2048.',      minLevel: 4 },
  // ── Nivel 5 ─────────────────────────────────────────────────────────────────
  { id: 'flappy',       name: 'Flappy Bird',    emoji: '🐦', color: '#4ade80', description: 'Tan simple, tan brutal.',                 minLevel: 5 },
  // ── Nivel 6 ─────────────────────────────────────────────────────────────────
  { id: 'tetris',       name: 'Tetris',         emoji: '🟪', color: '#a78bfa', description: 'Encajá las piezas, no pierdas el ritmo.', minLevel: 6 },
  { id: 'frogger',      name: 'Frogger',        emoji: '🐸', color: '#4ade80', description: 'Cruzá la calle sin que te aplasten.',     minLevel: 6 },
  // ── Nivel 7 ─────────────────────────────────────────────────────────────────
  { id: 'dino',         name: 'Dino Run',       emoji: '🦕', color: '#FF8C00', description: 'Saltá, corré, sobrevivé.',                minLevel: 7 },
  { id: 'stack',        name: 'Stack',          emoji: '🗼', color: '#00FFF7', description: 'Apilá los bloques con precisión.',        minLevel: 7 },
  // ── Nivel 8 ─────────────────────────────────────────────────────────────────
  { id: 'spaceinvaders',name: 'Space Invaders', emoji: '👾', color: '#4ade80', description: 'Defendé la Tierra. Último nivel.',        minLevel: 8 },
]

export function getGame(id: string): GameDef | undefined {
  return GAMES.find((g) => g.id === id)
}
