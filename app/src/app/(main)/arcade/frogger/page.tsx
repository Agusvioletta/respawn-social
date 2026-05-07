'use client'
import { GameCanvas } from '@/components/arcade/GameCanvas'
import { froggerEngine } from '@/lib/games/frogger'
import { getGame } from '@/lib/games/types'

export default function FroggerPage() {
  const game = getGame('frogger')!
  return <GameCanvas game={game} engine={froggerEngine} width={400} height={450} />
}
