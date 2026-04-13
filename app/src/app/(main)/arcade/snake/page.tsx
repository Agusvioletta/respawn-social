'use client'
import { GameCanvas } from '@/components/arcade/GameCanvas'
import { snakeEngine } from '@/lib/games/snake'
import { getGame } from '@/lib/games/types'

export default function SnakePage() {
  const game = getGame('snake')!
  return <GameCanvas game={game} engine={snakeEngine} width={400} height={400} />
}
