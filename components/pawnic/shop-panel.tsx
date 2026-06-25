'use client'

import { useState, useTransition } from 'react'
import { buyPower, usePower } from '@/app/actions/game'
import type { Room, Player, PowerType } from '@/lib/types'
import { POWER_CATALOG } from '@/lib/types'

interface Props {
  room: Room | null
  players: Player[]
  myPlayer: Player | null
  userId: string
}

const POWERS = Object.entries(POWER_CATALOG) as [PowerType, (typeof POWER_CATALOG)[PowerType]][]

export function ShopPanel({ room, players, myPlayer, userId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [selectingFreeze, setSelectingFreeze] = useState(false)

  if (!room || !myPlayer) {
    return (
      <div className="glass-panel rounded-xl flex-1 flex items-center justify-center">
        <p className="font-display text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>
      </div>
    )
  }

  const myPowers = (myPlayer.powers ?? {}) as Record<PowerType, number>
  const isPlaying = room.status === 'playing'

  function handleBuy(type: PowerType) {
    setMsg('')
    startTransition(async () => {
      const res = await buyPower(userId, room!.id, type)
      if (res.error) setMsg(res.error)
    })
  }

  function handleUse(type: PowerType, targetId?: string) {
    setMsg('')
    setSelectingFreeze(false)
    startTransition(async () => {
      const res = await usePower(userId, room!.id, type, targetId)
      if (res.error) setMsg(res.error)
    })
  }

  const alivePlayers = players.filter(p => p.is_alive && p.user_id !== userId)

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* My stats */}
      <div className="glass-panel rounded-xl p-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">Your Stats</span>
          <span className="text-xl">{myPlayer.avatar}</span>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Points</span>
            <span className="font-display font-bold text-brand-glow">{myPlayer.points} pts</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className={
              myPlayer.is_frozen ? 'text-[oklch(0.80_0.18_195)]'
              : myPlayer.shield_active ? 'text-[oklch(0.80_0.22_60)]'
              : 'text-[oklch(0.65_0.22_145)]'
            }>
              {myPlayer.is_frozen ? '❄️ Frozen'
               : myPlayer.shield_active ? '🛡️ Shielded'
               : myPlayer.reverse_active ? '↩ Reverse On'
               : '✓ Ready'}
            </span>
          </div>
          {myPlayer.double_points_until && new Date(myPlayer.double_points_until) > new Date() && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Boost</span>
              <span className="text-[oklch(0.80_0.22_60)]">×2 Points active</span>
            </div>
          )}
        </div>
      </div>

      {/* Freeze target selector */}
      {selectingFreeze && (
        <div className="glass-panel rounded-xl p-3 border border-[oklch(0.80_0.18_195/50%)] shrink-0">
          <p className="font-display text-xs uppercase tracking-widest text-[oklch(0.80_0.18_195)] mb-2">
            Freeze who?
          </p>
          <div className="space-y-1">
            {alivePlayers.map(p => (
              <button
                key={p.id}
                onClick={() => handleUse('freeze', p.id)}
                disabled={isPending}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-[oklch(0.80_0.18_195/15%)] transition-colors text-left disabled:opacity-50"
              >
                <span className="text-base">{p.avatar}</span>
                <span className="text-foreground font-bold">{p.nickname}</span>
                <span className="text-muted-foreground ml-auto">{p.points}pts</span>
              </button>
            ))}
            <button
              onClick={() => setSelectingFreeze(false)}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Power shop */}
      <div className="glass-panel rounded-xl p-3 flex-1 overflow-hidden flex flex-col min-h-0">
        <span className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-2 shrink-0">
          Power Shop
        </span>
        {msg && (
          <p className="text-xs text-red-400 mb-2 shrink-0 bg-red-400/10 px-2 py-1 rounded">{msg}</p>
        )}
        <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
          {POWERS.map(([type, info]) => {
            const owned = myPowers[type] ?? 0
            const canAfford = myPlayer.points >= info.cost
            const canBuy = isPlaying && canAfford

            return (
              <div
                key={type}
                className="rounded-lg p-2 bg-[oklch(0.12_0.03_270/60%)] border border-border hover:border-[oklch(0.70_0.22_45/30%)] transition-all"
              >
                <div className="flex items-start gap-2 mb-1.5">
                  <span className="text-xl shrink-0 mt-0.5">{info.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-display text-xs font-bold text-foreground">{info.name}</span>
                      <span className={`font-display text-xs shrink-0 ${canAfford ? 'text-brand-glow' : 'text-muted-foreground'}`}>
                        {info.cost}pt
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{info.description}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleBuy(type)}
                    disabled={!canBuy || isPending}
                    className="flex-1 py-1 rounded text-[10px] font-display font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={canBuy ? {
                      background: 'oklch(0.70 0.22 45 / 20%)',
                      border: '1px solid oklch(0.70 0.22 45 / 50%)',
                      color: 'oklch(0.70 0.22 45)',
                    } : {
                      background: 'oklch(0.12 0.03 270)',
                      border: '1px solid oklch(0.30 0.08 270 / 50%)',
                      color: 'oklch(0.45 0.06 240)',
                    }}
                  >
                    Buy{owned > 0 ? ` (${owned})` : ''}
                  </button>
                  {owned > 0 && (
                    <button
                      onClick={() => type === 'freeze' ? setSelectingFreeze(true) : handleUse(type)}
                      disabled={isPending || !isPlaying}
                      className="flex-1 py-1 rounded text-[10px] font-display font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: 'oklch(0.65 0.22 240 / 20%)',
                        border: '1px solid oklch(0.65 0.22 240 / 50%)',
                        color: 'oklch(0.80 0.18 195)',
                      }}
                    >
                      Use ({owned})
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="glass-panel rounded-xl p-3 shrink-0">
        <span className="font-display text-xs uppercase tracking-widest text-muted-foreground block mb-2">
          Leaderboard
        </span>
        <div className="space-y-1">
          {[...players]
            .sort((a, b) => b.points - a.points)
            .slice(0, 5)
            .map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-display w-4 shrink-0">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <span className="shrink-0">{p.avatar}</span>
                <span className={`flex-1 truncate font-bold ${p.user_id === userId ? 'text-brand-glow' : p.is_alive ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                  {p.nickname}
                </span>
                <span className="font-display font-bold text-brand-glow shrink-0">{p.points}</span>
                {!p.is_alive && <span className="text-[10px] shrink-0">💀</span>}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
