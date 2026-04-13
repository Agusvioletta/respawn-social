'use client'
import { GameCanvas } from '@/components/arcade/GameCanvas'
import { breakoutEngine } from '@/lib/games/breakout'
import { getGame } from '@/lib/games/types'

export default function BreakoutPage() {
  const game = getGame('breakout')!
  return <GameCanvas game={game} engine={breakoutEngine} width={480} height={400} />
}
