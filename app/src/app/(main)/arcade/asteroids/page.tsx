'use client'
import { GameCanvas } from '@/components/arcade/GameCanvas'
import { asteroidsEngine } from '@/lib/games/asteroids'
import { getGame } from '@/lib/games/types'

export default function AsteroidsPage() {
  const game = getGame('asteroids')!
  return <GameCanvas game={game} engine={asteroidsEngine} width={500} height={500} />
}
