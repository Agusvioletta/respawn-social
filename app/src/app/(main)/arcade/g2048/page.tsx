'use client'
import { GameCanvas } from '@/components/arcade/GameCanvas'
import { g2048Engine } from '@/lib/games/g2048'
import { getGame } from '@/lib/games/types'

export default function G2048Page() {
  const game = getGame('g2048')!
  return <GameCanvas game={game} engine={g2048Engine} width={400} height={480} />
}
