export const LEVEL_NAMES = [
  'Novato', 'Aprendiz', 'Jugador', 'Veterano',
  'Elite', 'Leyenda', 'Máster', 'Campeón',
] as const

export const GAME_ICONS: Record<string, string> = {
  valorant: '🔫', minecraft: '⛏', 'league of legends': '⚔',
  fortnite: '🏗', apex: '🎯', cs2: '💣', overwatch: '🎮',
  'rocket league': '🚗', 'among us': '🔪', terraria: '⚒', default: '🕹',
}

export interface XPStats {
  posts: number
  followers: number
  following: number
  likes: number
  comments: number
  gameLevels: number
}

export function calculateXP(stats: Partial<XPStats>): number {
  return (
    (stats.posts ?? 0) * 10 +
    (stats.followers ?? 0) * 8 +
    (stats.following ?? 0) * 5 +
    (stats.likes ?? 0) * 3 +
    (stats.comments ?? 0) * 4 +
    (stats.gameLevels ?? 0) * 50
  )
}

export function xpLevel(total: number) {
  let level = 1
  let remaining = total
  while (remaining >= level * 100) {
    remaining -= level * 100
    level++
  }
  return { level: Math.min(level, 8), current: remaining, needed: level * 100 }
}

export function getLevelName(level: number): string {
  return LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)]
}

export function detectGameTag(content: string): { game: string; icon: string } | null {
  const lower = content.toLowerCase()
  for (const [game, icon] of Object.entries(GAME_ICONS)) {
    if (game !== 'default' && lower.includes(game)) return { game, icon }
  }
  return null
}
