export interface GameDef {
  id: string
  name: string
  emoji: string
  color: string
  description: string
  minLevel: number
}

export const GAMES: GameDef[] = [
  { id: 'snake',        name: 'Snake',          emoji: '🐍', color: '#00FFF7', description: 'Comé, crecé, no te mordas.',             minLevel: 1 },
  { id: 'pong',         name: 'Pong',           emoji: '🏓', color: '#FF4F7B', description: 'El clásico de todos los tiempos.',       minLevel: 2 },
  { id: 'breakout',     name: 'Breakout',       emoji: '🧱', color: '#C084FC', description: 'Rompé todos los bloques.',               minLevel: 3 },
  { id: 'asteroids',    name: 'Asteroids',      emoji: '☄️', color: '#FFB800', description: 'Sobrevivé en el espacio.',               minLevel: 4 },
  { id: 'flappy',       name: 'Flappy Bird',    emoji: '🐦', color: '#4ade80', description: 'Tan simple, tan brutal.',                minLevel: 5 },
  { id: 'tetris',       name: 'Tetris',         emoji: '🟪', color: '#a78bfa', description: 'Encajá las piezas, no pierdas el ritmo.', minLevel: 6 },
  { id: 'dino',         name: 'Dino Run',       emoji: '🦕', color: '#FF8C00', description: 'Saltá, corré, sobrevivé.',               minLevel: 7 },
  { id: 'spaceinvaders',name: 'Space Invaders', emoji: '👾', color: '#4ade80', description: 'Defendé la Tierra. Último nivel.',       minLevel: 8 },
]

export function getGame(id: string): GameDef | undefined {
  return GAMES.find((g) => g.id === id)
}
