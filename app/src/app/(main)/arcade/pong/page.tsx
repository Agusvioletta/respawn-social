'use client'
import { GameCanvas } from '@/components/arcade/GameCanvas'
import { pongEngine } from '@/lib/games/pong'
import { getGame } from '@/lib/games/types'

export default function PongPage() {
  const game = getGame('pong')!
  return <GameCanvas game={game} engine={pongEngine} width={480} height={320} />
}
