'use client'
import { GameCanvas } from '@/components/arcade/GameCanvas'
import { tetrisEngine } from '@/lib/games/tetris'
import { getGame } from '@/lib/games/types'

export default function TetrisPage() {
  const game = getGame('tetris')!
  return <GameCanvas game={game} engine={tetrisEngine} width={200} height={420} />
}
