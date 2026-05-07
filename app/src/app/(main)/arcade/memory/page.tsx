'use client'
import { GameCanvas } from '@/components/arcade/GameCanvas'
import { memoryEngine } from '@/lib/games/memory'
import { getGame } from '@/lib/games/types'

export default function MemoryPage() {
  const game = getGame('memory')!
  return <GameCanvas game={game} engine={memoryEngine} width={400} height={420} />
}
