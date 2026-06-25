'use client'

import { useState, useTransition } from 'react'
import { buyPower, usePower } from '@/app/actions/game'
import type { Room, Player, PowerType } from '@/lib/types'
import { POWER_CATALOG } from '@/lib/types'

interface Props {
  room: Room | null
  players: Player[]
  myPlayer: Player | null
}

const POWERS = Object.entries(POWER_CATALOG) as [PowerType, (typeof POWER_CATALOG)[PowerType]][]

export function ShopPanel({ room, players, myPlayer }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [selectingFreeze, setSelectingFreeze] = useState(false)

  if (!room || !myPlayer) return (
    <div className="glass-panel rounded-xl flex-1 flex items-center justify-center">
      <p className="font-display text-xs text-muted-foreground uppercase tracking-widest">Joining...</p>
    </div>
  )

  const myPowers = myPlayer.powers as Record<PowerType, number>

  function handleBuy(type: PowerType) {
    setMsg('')
    startTransition(async () => {
      const res = await buyPower(room!.id, type)
      if (res.error) setMsg(res.error)
    })
  }

  function handleUse(type: PowerType, targetId?: string) {
    setMsg('')
    setSelectingFreeze(false)
    startTransition(async () => {
      const res = await usePower(room!.id, type, targetId)
      if (res.error) setMsg(res.error)
    })
  }

  const alivePlayers = players.filter(p => p.is_alive && p.user_id !== myPlayer.user_id)

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* My stats */}
      <div className="glass-panel rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">Your Stats</span>
          <span className="text-lg">{myPlayer.avatar}</span>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Points</span>
            <span className="font-display font-bold text-brand-glow">{myPlayer.points}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className={myPlayer.is_frozen ? 'text-[oklch(0.80_0.18_195)]' : 'text-[oklch(0.65_0.22_145)]'}>
              {myPlayer.is_frozen ? '❄️ Frozen' : myPlayer.shield_active ? '🛡️ Shielded' : '✓ Ready'}
            </span>
          </div>
          {myPlayer.double_points_until && new Date(myPlayer.double_points_until) > new Date() && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Boost</span>
              <span className="text-[oklch(0.80_0.22_60)]">×2 Points</span>
            </div>
          )}
          {myPlayer.reverse_active && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Power</span>
              <span className="text-[oklch(0.80_0.18_195)]">↩ Reverse</span>
            </div>
          )}
        </div>
      </div>

      {/* Freeze target selector */}
      {selectingFreeze && (
        <div className="glass-panel rounded-xl p-3 border border-[oklch(0.80_0.18_195/50%)]">
          <p className="font-display text-xs uppercase tracking-widest text-[oklch(0.80_0.18_195)] mb-2">Freeze who?</p>
          <div className="space-y-1">
            {alivePlayers.map(p => (
              <button
                key={p.id}
                onClick={() => handleUse('freeze', p.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-[oklch(0.80_0.18_195/15%)] transition-colors text-left"
              >
                <span>{p.avatar}</span>
                <span className="text-foreground">{p.nickname}</span>
              </button>
            ))}
            <button onClick={() => setSelectingFreeze(false)}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Power shop */}
      <div className="glass-panel rounded-xl p-3 flex-1 overflow-hidden flex flex-col min-h-0">
        <span className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-2 shrink-0">Power Shop</span>
        {msg && <p className="text-xs text-red-400 mb-2 shrink-0">{msg}</p>}
        <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
          {POWERS.map(([type, info]) => {
            const owned = myPowers[type] ?? 0
            const canAfford = myPlayer.points >= info.cost
            const canBuy = room.status === 'playing' && canAfford

            return (
              <div
                key={type}
                className="rounded-lg p-2 bg-[oklch(0.12_0.03_270/60%)] border border-border hover:border-[oklch(0.70_0.22_45/30%)] transition-all"
              >
                <div className="flex items-start gap-2 mb-1.5">
                  <span className="text-lg shrink-0 mt-0.5">{info.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-display text-xs font-bold text-foreground">{info.name}</span>
                      <span className="font-display text-xs text-brand-glow shrink-0">{info.cost}pt</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{info.description}</p>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  {/* Buy */}
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
                      color: 'oklch(0.55 0.06 240)',
                    }}
                  >
                    Buy {owned > 0 && `(${owned})`}
                  </button>

                  {/* Use */}
                  {owned > 0 && (
                    <button
                      onClick={() => type === 'freeze' ? setSelectingFreeze(true) : handleUse(type)}
                      disabled={isPending || room.status !== 'playing'}
                      className="flex-1 py-1 rounded text-[10px] font-display font-bold uppercase tracking-wider transition-all disabled:opacity-40"
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
        <span className="font-display text-xs uppercase tracking-widest text-muted-foreground block mb-2">Leaderboard</span>
        <div className="space-y-1">
          {[...players]
            .sort((a, b) => b.points - a.points)
            .slice(0, 4)
            .map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-display w-4">{i + 1}</span>
                <span>{p.avatar}</span>
                <span className={`flex-1 truncate font-bold ${p.user_id === myPlayer.user_id ? 'text-brand-glow' : 'text-foreground'}`}>
                  {p.nickname}
                </span>
                <span className="font-display font-bold text-brand-glow">{p.points}</span>
                {!p.is_alive && <span className="text-[10px]">💀</span>}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
