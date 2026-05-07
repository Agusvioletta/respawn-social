'use client'
import { GameCanvas } from '@/components/arcade/GameCanvas'
import { stackEngine } from '@/lib/games/stack'
import { getGame } from '@/lib/games/types'

export default function StackPage() {
  const game = getGame('stack')!
  return <GameCanvas game={game} engine={stackEngine} width={400} height={500} />
}
