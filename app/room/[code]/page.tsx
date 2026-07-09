'use client'

// Pin server actions to Mumbai (bom1) — matches Supabase ap-south-1
export const preferredRegion = 'bom1'

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
      <div className="min-h-screen bg-transparent cyber-grid flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="w-80 h-80 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center bg-black/60">
            <video
              src="/cawt.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
          <p className="font-display text-muted-foreground tracking-[0.25em] text-xs uppercase font-black animate-pulse">
            Connecting to Arena...
          </p>
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="glass-panel rounded-2xl p-8 text-center max-w-sm">
          <p className="text-red-400 font-display text-lg mb-4">{error ?? 'Room not found'}</p>
          <a
            href="/"
            className="text-brand-glow font-display text-sm uppercase tracking-widest hover:underline"
          >
            Back to Lobby
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-transparent" style={{ height: '100dvh', overflow: 'hidden' }}>
      <GameNavBar code={code} room={room} myPlayer={gameState.myPlayer} />

      <main
        className="flex gap-2 px-2 pb-2 pt-2 bg-transparent"
        style={{ marginTop: '74px', height: 'calc(100dvh - 74px)', overflow: 'hidden' }}
      >
        {/* Left: room info + player roster */}
        <div className="w-72 shrink-0 flex flex-col overflow-hidden">
          <LobbyPanel
            room={room}
            players={gameState.players}
            myPlayer={gameState.myPlayer}
            userId={gameState.userId}
          />
        </div>

        {/* Center: game arena + chat */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <ArenaPanel
            room={room}
            players={gameState.players}
            events={gameState.events}
            myPlayer={gameState.myPlayer}
            userId={gameState.userId}
            reactions={gameState.reactions}
            sendReaction={gameState.sendReaction}
            optimisticBombHolder={gameState.optimisticBombHolder}
            setOptimisticBombHolder={gameState.setOptimisticBombHolder}
          />
        </div>

        {/* Right: powers shop + leaderboard */}
        <div className="w-80 shrink-0 flex flex-col overflow-hidden">
          <ShopPanel
            room={room}
            players={gameState.players}
            events={gameState.events}
            myPlayer={gameState.myPlayer}
            userId={gameState.userId}
          />
        </div>
      </main>

      {room.status === 'finished' && (
        <FinishedOverlay
          room={room}
          players={gameState.players}
          myPlayer={gameState.myPlayer}
        />
      )}
    </div>
  )
}
