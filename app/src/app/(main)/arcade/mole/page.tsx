'use client'
import { GameCanvas } from '@/components/arcade/GameCanvas'
import { moleEngine } from '@/lib/games/mole'
import { getGame } from '@/lib/games/types'

export default function MolePage() {
  const game = getGame('mole')!
  return <GameCanvas game={game} engine={moleEngine} width={400} height={420} />
}
