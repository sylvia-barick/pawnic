'use client'

import { use } from 'react'
import { useRoom } from '@/hooks/use-room'
import { GameNavBar } from '@/components/pawnic/game-nav-bar'
import { LobbyPanel } from '@/components/pawnic/lobby-panel'
import { ArenaPanel } from '@/components/pawnic/arena-panel'
import { ShopPanel } from '@/components/pawnic/shop-panel'
import { FinishedOverlay } from '@/components/pawnic/finished-overlay'

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const gameState = useRoom(code)
  const { room, loading, error } = gameState

  if (loading) {
    return (
      <div className="min-h-screen bg-background cyber-grid flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'oklch(0.70 0.22 45)', borderTopColor: 'transparent' }} />
          <p className="font-display text-muted-foreground tracking-widest text-sm uppercase">Joining room...</p>
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="glass-panel rounded-2xl p-8 text-center max-w-sm">
          <p className="text-red-400 font-display text-lg mb-4">{error ?? 'Room not found'}</p>
          <a href="/" className="text-brand-glow font-display text-sm uppercase tracking-widest hover:underline">
            Back to Lobby
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-background" style={{ height: '100vh', overflow: 'hidden' }}>
      <GameNavBar code={code} room={room} myPlayer={gameState.myPlayer} />

      <main
        className="flex gap-2 px-2 pb-2"
        style={{ marginTop: '48px', height: 'calc(100vh - 48px)', overflow: 'hidden' }}
      >
        {/* Left: lobby/players */}
        <div className="w-60 shrink-0 flex flex-col overflow-hidden pt-2">
          <LobbyPanel {...gameState} />
        </div>

        {/* Center: arena */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden pt-2">
          <ArenaPanel {...gameState} />
        </div>

        {/* Right: shop */}
        <div className="w-60 shrink-0 flex flex-col overflow-hidden pt-2">
          <ShopPanel {...gameState} />
        </div>
      </main>

      {room.status === 'finished' && <FinishedOverlay {...gameState} />}
    </div>
  )
}
