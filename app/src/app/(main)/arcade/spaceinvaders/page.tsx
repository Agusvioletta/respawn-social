'use client'
import { GameCanvas } from '@/components/arcade/GameCanvas'
import { spaceInvadersEngine } from '@/lib/games/spaceinvaders'
import { getGame } from '@/lib/games/types'

export default function SpaceInvadersPage() {
  const game = getGame('spaceinvaders')!
  return <GameCanvas game={game} engine={spaceInvadersEngine} width={520} height={480} />
}
