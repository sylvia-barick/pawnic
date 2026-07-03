'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { startGame, leaveRoom } from '@/app/actions/game'
import type { Room, Player } from '@/lib/types'
import { Info, Users, Copy, Check, Coins, Snowflake, Shield, Skull } from 'lucide-react'

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

  const isSmokeScreenActive = players.some(p => {
    const pPowers = (p.powers ?? {}) as Record<string, any>
    const until = pPowers.smoke_screen_until
    return until && new Date(until) > new Date()
  })
  const bombHolder = players.find(p => p.id === room.bomb_holder_id)
  const isMeHolding = bombHolder?.user_id === userId
  const shouldHideHolder = isSmokeScreenActive && !isMeHolding

  function handleStart() {
    setMsg('')
    startTransition(async () => {
      const res = await startGame(userId, room!.id)
      if (res.error) setMsg(res.error)
    })
  }

  // Calculate total prize pool and individual buy-ins
  const myBuyIn = Number((myPlayer?.powers as any)?.buy_in ?? room.buy_in ?? 1.0)
  const totalPrizePool = players.reduce((sum, p) => {
    const pBuyIn = Number((p.powers as any)?.buy_in ?? room.buy_in ?? 1.0)
    return sum + pBuyIn
  }, 0)
  const sortedPlayers = [...players].sort((a, b) => b.points - a.points)

  function handleLeave() {
    startTransition(async () => {
      await leaveRoom(userId, room!.id)
      router.push('/')
    })
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 1. Room Info Card - Compact Padding */}
      <div className="glass-panel glow-orange rounded-2xl p-3.5 flex flex-col shrink-0">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5 mb-3">
          <span className="w-1 h-4 rounded-full bg-[#FF5F1F] shadow-[0_0_8px_#FF5F1F]" />
          <Info className="w-3.5 h-3.5 text-[#FF5F1F]" />
          <span className="font-display text-[11px] uppercase tracking-[0.2em] font-black text-foreground">
            Room Info
          </span>
        </div>

        {/* Hero Prize Pool */}
        <div className="relative overflow-hidden rounded-xl border border-[#EAB308]/30 bg-gradient-to-br from-[#EAB308]/10 to-transparent px-3 py-2.5 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-display font-black text-[9px] uppercase tracking-[0.2em]">
              Prize Pool
            </span>
            <span className="font-display font-bold text-[9px] text-muted-foreground uppercase tracking-wider">
              {myBuyIn.toFixed(2)} buy-in
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="font-display font-black text-2xl text-[#EAB308] leading-none drop-shadow-[0_0_12px_rgba(234,179,8,0.45)]">
              {totalPrizePool.toFixed(2)}
            </span>
            <span className="font-display font-black text-xs text-[#EAB308]/70 tracking-wider">XLM</span>
          </div>
        </div>

        <div className="space-y-2 text-[11px]">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-display font-bold uppercase tracking-wider text-[10px]">Room Code</span>
            <div className="flex items-center gap-1.5 bg-[#06060A]/85 border border-white/10 rounded-lg px-2 py-0.5">
              <span className="font-display font-black tracking-[0.2em] text-[#FF5F1F] select-all uppercase">
                {room.code}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(room.code)}
                className="text-[9px] text-muted-foreground hover:text-[#FF5F1F] transition-colors flex items-center justify-center"
                title="Copy Room Code"
              >
                <Copy className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
          {/* Inline stat chips */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <div className="flex flex-col items-center justify-center rounded-lg bg-white/3 border border-white/5 py-1.5">
              <span className="font-display font-black text-base text-foreground leading-none">{players.length}<span className="text-muted-foreground text-[10px]">/8</span></span>
              <span className="text-[8px] text-muted-foreground font-display font-bold uppercase tracking-wider mt-1">Players</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-white/3 border border-white/5 py-1.5">
              <span className="font-display font-black text-base text-foreground leading-none">{room.round_number}</span>
              <span className="text-[8px] text-muted-foreground font-display font-bold uppercase tracking-wider mt-1">Round</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-[#22C55E]/8 border border-[#22C55E]/20 py-1.5">
              <span className="font-display font-black text-base text-[#22C55E] leading-none">{alivePlayers.length}</span>
              <span className="text-[8px] text-muted-foreground font-display font-bold uppercase tracking-wider mt-1">Alive</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Player list - Styled with Cyan details & Compact Rows */}
      <div className="glass-panel glow-cyan rounded-2xl p-3.5 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5 mb-2.5 shrink-0">
          <span className="w-1 h-4 rounded-full bg-[#06B6D4] shadow-[0_0_8px_#06B6D4]" />
          <Users className="w-3.5 h-3.5 text-[#06B6D4]" />
          <span className="font-display text-[11px] uppercase tracking-[0.2em] font-black text-foreground">
            Players
          </span>
          <span className="ml-auto font-display font-black text-[10px] text-[#06B6D4] bg-[#06B6D4]/10 border border-[#06B6D4]/25 rounded-md px-2 py-0.5">
            {players.length}
          </span>
        </div>

        <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-0.5 select-none">
          {sortedPlayers.map((p, i) => {
            const hasBomb = room.bomb_holder_id === p.id
            const showBombVisual = hasBomb && !shouldHideHolder
            const isMe = p.user_id === userId
            const isAlive = p.is_alive
            
            // Show status of the player
            const playerStatus = !isAlive ? 'Eliminated' : showBombVisual ? 'Holding Cat!' : 'Safe'

            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all ${
                  showBombVisual
                    ? 'bg-[#FF007F]/10 border-[#FF007F]/40 shadow-[0_2px_8px_rgba(255,0,127,0.1)]'
                    : isMe
                    ? 'bg-[#FF5F1F]/10 border-[#FF5F1F]/40 shadow-[0_2px_8px_rgba(255,95,31,0.1)]'
                    : 'bg-[#0E0E18]/80 border-white/5'
                } ${!isAlive ? 'opacity-35' : ''}`}
              >
                {/* Ranking number */}
                <span className="font-display font-black text-[10px] text-muted-foreground w-3 shrink-0 text-left">
                  {i + 1}
                </span>

                {/* Avatar - Compact w-8 h-8 */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-black/45 border shrink-0 ${
                    showBombVisual
                      ? 'border-[#FF007F]'
                      : isMe
                      ? 'border-[#FF5F1F]'
                      : 'border-white/10'
                  }`}
                >
                  {p.avatar.endsWith('.png') ? (
                    <img src={`/${p.avatar}`} alt="Cat" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">{p.avatar}</span>
                  )}
                </div>

                {/* Name, Star Host badge, and status */}
                <div className="flex-1 min-w-0 text-left leading-none">
                  <div className="flex items-center gap-1">
                    <p className={`text-[11px] font-bold truncate ${isMe ? 'text-[#FF5F1F]' : 'text-foreground'}`}>
                      {p.nickname}
                    </p>
                    {room.host_id === p.user_id && <span className="text-[#EAB308] text-[9px] shrink-0" title="Host">★</span>}
                  </div>
                  <p className="text-[8px] text-muted-foreground mt-0.5 font-mono">
                    {playerStatus}
                  </p>
                </div>

                {/* Points / Score */}
                <div className="flex items-center gap-1 text-right shrink-0">
                  <span className="font-display font-black text-[11px] text-foreground">
                    {p.points}
                  </span>
                  <span title="Ability Coins"><Coins className="w-2.5 h-2.5 text-[#EAB308]" /></span>
                </div>

                {/* Status Badges */}
                {p.is_frozen && p.frozen_until && new Date(p.frozen_until) > new Date() && (
                  <span title="Frozen" className="shrink-0"><Snowflake className="w-2.5 h-2.5 text-[#06B6D4]" /></span>
                )}
                {p.shield_active && (
                  <span title="Shielded" className="shrink-0"><Shield className="w-2.5 h-2.5 text-[#3B82F6]" /></span>
                )}
                {!isAlive && (
                  <span title="Eliminated" className="shrink-0"><Skull className="w-2.5 h-2.5 text-[#FF007F]" /></span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. Actions / Leave Room Card - Compact Padding */}
      <div className="glass-panel glow-orange rounded-2xl p-3.5 space-y-2 shrink-0">
        {msg && (
          <p className="text-[10px] text-[#FF007F] text-center bg-[#FF007F]/10 border border-[#FF007F]/20 px-2.5 py-1.5 rounded-xl font-display">
            {msg}
          </p>
        )}

        {room.status === 'waiting' && isHost && (
          <>
            {players.length < 2 ? (
              <div className="flex items-center justify-center p-2.5 border border-dashed border-[#FF5F1F]/45 bg-[#FF5F1F]/5 rounded-xl gap-2 text-center animate-pulse shrink-0">
                <Users className="w-3.5 h-3.5 text-[#FF5F1F] animate-pulse" />
                <span className="font-display font-bold text-[10px] uppercase tracking-wider text-[#FF5F1F]">
                  Waiting for players ({players.length}/8)
                </span>
              </div>
            ) : (
              <button
                onClick={handleStart}
                disabled={isPending}
                className="w-full py-2.5 rounded-xl font-display font-black text-[10px] tracking-widest uppercase transition-all text-white shadow-[0_4px_12px_rgba(255,95,31,0.4)] hover:shadow-[0_6px_16px_rgba(255,95,31,0.6)] animate-pulse"
                style={{
                  background: '#FF5F1F',
                  border: '1px solid #FF5F1F',
                }}
              >
                {isPending ? 'Starting...' : '🚀 Start Game'}
              </button>
            )}
          </>
        )}

        {room.status === 'waiting' && !isHost && (
          <div className="text-center text-[10px] text-muted-foreground font-display py-2.5 uppercase tracking-widest animate-pulse bg-white/5 border border-white/5 rounded-xl">
            Waiting for host...
          </div>
        )}

        <button
          onClick={handleLeave}
          disabled={isPending}
          className="w-full py-2 rounded-xl font-display text-[10px] tracking-widest uppercase text-muted-foreground hover:text-red-400 transition-colors border border-white/5 hover:border-red-500/40 bg-white/5"
        >
          Leave Room
        </button>
      </div>
    </div>
  )
}
