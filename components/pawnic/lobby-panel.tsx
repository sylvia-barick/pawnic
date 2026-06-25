'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { startGame, leaveRoom } from '@/app/actions/game'
import type { Room, Player } from '@/lib/types'

interface Props {
  room: Room | null
  players: Player[]
  myPlayer: Player | null
}

export function LobbyPanel({ room, players, myPlayer }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')

  if (!room) return null

  const isHost = room.host_id === myPlayer?.user_id
  const alivePlayers = players.filter(p => p.is_alive)
  const canStart = isHost && room.status === 'waiting' && players.length >= 2

  function handleStart() {
    setMsg('')
    startTransition(async () => {
      const res = await startGame(room!.id)
      if (res.error) setMsg(res.error)
    })
  }

  function handleLeave() {
    startTransition(async () => {
      await leaveRoom(room!.id)
      router.push('/')
    })
  }

  const sortedPlayers = [...players].sort((a, b) => b.points - a.points)

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Room card */}
      <div className="glass-panel rounded-xl p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">Room</span>
          <span
            className={`font-display text-xs uppercase px-2 py-0.5 rounded-full tracking-wider ${
              room.status === 'playing'
                ? 'bg-[oklch(0.65_0.22_145/20%)] text-[oklch(0.65_0.22_145)]'
                : room.status === 'finished'
                ? 'bg-[oklch(0.62_0.26_22/20%)] text-[oklch(0.62_0.26_22)]'
                : 'bg-[oklch(0.80_0.18_195/15%)] text-[oklch(0.80_0.18_195)]'
            }`}
          >
            {room.status}
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Code</span>
            <span className="font-display font-bold tracking-widest text-brand-glow">{room.code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Players</span>
            <span className="text-foreground">{players.length} / 8</span>
          </div>
          {room.status === 'playing' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Round</span>
              <span className="text-foreground">{room.round_number}</span>
            </div>
          )}
          {room.status === 'playing' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Alive</span>
              <span className="text-[oklch(0.65_0.22_145)]">{alivePlayers.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Player list */}
      <div className="glass-panel rounded-xl p-3 flex-1 overflow-hidden flex flex-col min-h-0">
        <span className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-2 shrink-0">Players</span>
        <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-1">
          {sortedPlayers.map((p, i) => {
            const hasBomb = room.bomb_holder_id === p.id
            const isMe = p.user_id === myPlayer?.user_id

            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${
                  hasBomb ? 'bg-[oklch(0.62_0.26_22/20%)] border border-[oklch(0.62_0.26_22/50%)]' :
                  isMe ? 'bg-[oklch(0.70_0.22_45/10%)] border border-[oklch(0.70_0.22_45/30%)]' :
                  'bg-[oklch(0.12_0.03_270/60%)]'
                } ${!p.is_alive ? 'opacity-40' : ''}`}
              >
                {/* Rank */}
                <span className="text-muted-foreground font-display text-xs w-3 shrink-0">
                  {room.status !== 'waiting' ? i + 1 : ''}
                </span>
                {/* Avatar */}
                <span className="text-base leading-none shrink-0">{p.avatar}</span>
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate leading-none ${isMe ? 'text-brand-glow' : 'text-foreground'}`}>
                    {p.nickname}
                    {isMe && <span className="text-muted-foreground font-normal"> (you)</span>}
                    {room.host_id === p.user_id && <span className="ml-1 text-yellow-400 text-[10px]">★</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{p.points} pts</p>
                </div>
                {/* Bomb */}
                {hasBomb && (
                  <span className="text-base animate-bomb-bounce shrink-0" title="Has the bomb">🥔</span>
                )}
                {/* Frozen */}
                {p.is_frozen && <span className="text-xs" title="Frozen">❄️</span>}
                {/* Shield */}
                {p.shield_active && <span className="text-xs" title="Shield active">🛡️</span>}
                {/* Dead */}
                {!p.is_alive && <span className="text-xs">💀</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 shrink-0">
        {msg && <p className="text-xs text-red-400 text-center">{msg}</p>}

        {room.status === 'waiting' && isHost && (
          <button
            onClick={handleStart}
            disabled={!canStart || isPending}
            className="w-full py-3 rounded-xl font-display font-black text-xs tracking-widest uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed text-black"
            style={{ background: 'oklch(0.70 0.22 45)', boxShadow: canStart ? '0 0 16px oklch(0.70 0.22 45 / 50%)' : 'none' }}
          >
            {isPending ? 'Starting...' : players.length < 2 ? 'Need 2+ Players' : 'Start Game'}
          </button>
        )}

        {room.status === 'waiting' && !isHost && (
          <div className="text-center text-xs text-muted-foreground font-display py-2 uppercase tracking-widest">
            Waiting for host...
          </div>
        )}

        <button
          onClick={handleLeave}
          disabled={isPending}
          className="w-full py-2 rounded-xl font-display text-xs tracking-widest uppercase text-muted-foreground hover:text-red-400 transition-colors border border-border hover:border-red-400/40"
        >
          Leave Room
        </button>
      </div>
    </div>
  )
}
