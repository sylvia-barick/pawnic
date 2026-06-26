'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { startGame, leaveRoom } from '@/app/actions/game'
import type { Room, Player } from '@/lib/types'

interface Props {
  room: Room | null
  players: Player[]
  myPlayer: Player | null
  userId: string
}

export function LobbyPanel({ room, players, myPlayer, userId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')

  if (!room) return null

  const isHost = room.host_id === userId
  const alivePlayers = players.filter(p => p.is_alive)
  const canStart = isHost && room.status === 'waiting' && players.length >= 2

  function handleStart() {
    setMsg('')
    startTransition(async () => {
      const res = await startGame(userId, room!.id)
      if (res.error) setMsg(res.error)
    })
  }

  function handleLeave() {
    startTransition(async () => {
      await leaveRoom(userId, room!.id)
      router.push('/')
    })
  }

  const sortedPlayers = [...players].sort((a, b) => b.points - a.points)

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* 1. Room Info Card */}
      <div className="glass-panel glow-orange rounded-xl p-4 flex flex-col shrink-0">
        <div className="flex items-center gap-2 border-b border-border/50 pb-2 mb-3">
          <span className="text-sm">📋</span>
          <span className="font-display text-xs uppercase tracking-widest font-black text-foreground">
            Room Info
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-display font-medium">ROOM CODE</span>
            <div className="flex items-center gap-2 bg-[#06060A]/80 border border-border/60 rounded px-2 py-0.5">
              <span className="font-display font-bold tracking-widest text-[#FF5F1F] select-all uppercase">
                {room.code}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(room.code)}
                className="text-[10px] text-muted-foreground hover:text-[#FF5F1F] transition-colors"
                title="Copy Room Code"
              >
                ⧉
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-display font-medium">PRIZE POOL</span>
            <span className="font-display font-bold text-[#EAB308]">
              {(players.length * 1.0).toFixed(2)} XLM
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-display font-medium">BUY-IN</span>
            <span className="font-display font-bold text-foreground">1.00 XLM</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-display font-medium">PLAYERS</span>
            <span className="font-display font-bold text-foreground">{players.length} / 8</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-display font-medium">ROUND</span>
            <span className="font-display font-bold text-foreground">{room.round_number}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-display font-medium">ALIVE</span>
            <span className="font-display font-bold text-[#22C55E]">{alivePlayers.length}</span>
          </div>
        </div>
      </div>

      {/* 2. Player list */}
      <div className="glass-panel glow-orange rounded-xl p-4 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center gap-2 border-b border-border/50 pb-2 mb-3 shrink-0">
          <span className="text-sm">🐾</span>
          <span className="font-display text-xs uppercase tracking-widest font-black text-foreground">
            Players
          </span>
        </div>

        <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1 select-none">
          {sortedPlayers.map((p, i) => {
            const hasBomb = room.bomb_holder_id === p.id
            const isMe = p.user_id === userId
            const isAlive = p.is_alive
            
            // Show status of the player
            const playerStatus = !isAlive ? '💀 Eliminated' : hasBomb ? '🔥 Holding Cat!' : '💚 Safe'

            return (
              <div
                key={p.id}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${
                  hasBomb
                    ? 'bg-[#FF007F]/8 border-[#FF007F]/40 shadow-[0_0_8px_rgba(255,0,127,0.15)]'
                    : isMe
                    ? 'bg-[#FF5F1F]/8 border-[#FF5F1F]/40 shadow-[0_0_8px_rgba(255,95,31,0.15)]'
                    : 'bg-[#0E0E18]/80 border-border/50'
                } ${!isAlive ? 'opacity-30' : ''}`}
              >
                {/* Ranking number */}
                <span className="font-display font-black text-xs text-muted-foreground w-4 shrink-0">
                  {i + 1}
                </span>

                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-lg bg-background border ${
                    hasBomb
                      ? 'border-[#FF007F] shadow-[0_0_6px_#FF007F]'
                      : isMe
                      ? 'border-[#FF5F1F] shadow-[0_0_6px_#FF5F1F]'
                      : 'border-border'
                  }`}
                >
                  {p.avatar}
                </div>

                {/* Name, Star Host badge, and status */}
                <div className="flex-1 min-w-0 text-left leading-tight">
                  <div className="flex items-center gap-1">
                    <p className={`text-xs font-bold truncate ${isMe ? 'text-[#FF5F1F]' : 'text-foreground'}`}>
                      {p.nickname}
                    </p>
                    {isMe && <span className="text-[9px] text-muted-foreground font-normal">(You)</span>}
                    {room.host_id === p.user_id && <span className="text-[#EAB308] text-[9px] shrink-0">★</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    {playerStatus}
                  </p>
                </div>

                {/* Points / Score */}
                <div className="flex items-center gap-1 text-right shrink-0">
                  <span className="font-display font-black text-xs text-foreground">
                    {p.points}
                  </span>
                  <span className="text-[10px]" title="Ability Coins">🐾</span>
                </div>

                {/* Status Badges */}
                {p.is_frozen && <span className="text-[10px] shrink-0" title="Frozen">❄️</span>}
                {p.shield_active && <span className="text-[10px] shrink-0" title="Shielded">🛡️</span>}
                {!isAlive && <span className="text-[10px] shrink-0" title="Eliminated">💀</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. Actions / Leave Room Card */}
      <div className="glass-panel glow-orange rounded-xl p-4 space-y-2 shrink-0">
        {msg && (
          <p className="text-xs text-[#FF007F] text-center bg-[#FF007F]/10 border border-[#FF007F]/20 px-2 py-1.5 rounded-lg font-display">
            {msg}
          </p>
        )}

        {room.status === 'waiting' && isHost && (
          <button
            onClick={handleStart}
            disabled={!canStart || isPending}
            className="w-full py-3 rounded-xl font-display font-black text-xs tracking-widest uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white"
            style={{
              background: '#FF5F1F',
              boxShadow: canStart ? '0 0 16px rgba(255, 95, 31, 0.4)' : 'none',
              border: '1px solid #FF5F1F',
            }}
          >
            {isPending ? 'Starting...' : players.length < 2 ? 'Need 2+ Players' : 'Start Game'}
          </button>
        )}

        {room.status === 'waiting' && !isHost && (
          <div className="text-center text-xs text-muted-foreground font-display py-2.5 uppercase tracking-widest animate-pulse bg-white/3 border border-border/50 rounded-xl">
            Waiting for host...
          </div>
        )}

        <button
          onClick={handleLeave}
          disabled={isPending}
          className="w-full py-2.5 rounded-xl font-display text-xs tracking-widest uppercase text-muted-foreground hover:text-red-400 transition-colors border border-border/80 hover:border-red-500/40"
        >
          Leave Room
        </button>
      </div>
    </div>
  )
}
