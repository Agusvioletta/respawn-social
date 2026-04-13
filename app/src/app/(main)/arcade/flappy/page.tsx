'use client'
import { GameCanvas } from '@/components/arcade/GameCanvas'
import { flappyEngine } from '@/lib/games/flappy'
import { getGame } from '@/lib/games/types'

export default function FlappyPage() {
  const game = getGame('flappy')!
  return <GameCanvas game={game} engine={flappyEngine} width={360} height={480} />
}
