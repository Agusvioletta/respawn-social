'use client'
import { GameCanvas } from '@/components/arcade/GameCanvas'
import { dinoEngine } from '@/lib/games/dino'
import { getGame } from '@/lib/games/types'

export default function DinoPage() {
  const game = getGame('dino')!
  return <GameCanvas game={game} engine={dinoEngine} width={600} height={280} />
}
