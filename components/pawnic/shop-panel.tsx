'use client'

import { useState, useEffect, useTransition } from 'react'
import { buyPower } from '@/app/actions/game'
import type { Room, Player, PowerType, GameEvent } from '@/lib/types'
import { POWER_CATALOG } from '@/lib/types'

interface Props {
  room: Room | null
  players: Player[]
  events: GameEvent[]
  myPlayer: Player | null
  userId: string
}

// In the mockup, these 5 abilities are presented in the shop:
const POWERS: { key: PowerType; name: string; description: string; cost: number; emoji: string }[] = [
  { key: 'reverse', name: 'Mirror', description: 'Reflects the next incoming POTATO back to the sender.', cost: 100, emoji: '🔮' },
  { key: 'freeze', name: 'Freeze', description: 'Freezes a target player for 3 seconds so they can\'t pass or use powers.', cost: 80, emoji: '❄️' },
  { key: 'double_points', name: 'Catnip', description: 'Doubles your point gain for 10 seconds while holding the POTATO.', cost: 60, emoji: '🌿' },
  { key: 'smoke_screen', name: 'Smoke Screen', description: 'Hides who is holding the POTATO from other players for 4 seconds.', cost: 70, emoji: '☁️' },
  { key: 'nine_lives', name: 'Nine Lives', description: 'Automatically saves you from one explosion once per match.', cost: 150, emoji: '🐱' },
]

export function ShopPanel({ room, players, events, myPlayer, userId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [, setTick] = useState(0)

  // Force update timestamps every 5 seconds to keep the "time ago" feed live
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000)
    return () => clearInterval(id)
  }, [])

  if (!room || !myPlayer) {
    return (
      <div className="glass-panel rounded-xl flex-1 flex items-center justify-center">
        <p className="font-display text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>
      </div>
    )
  }

  const isPlaying = room.status === 'playing'

  function handleBuy(type: PowerType) {
    setMsg('')
    startTransition(async () => {
      const res = await buyPower(userId, room!.id, type)
      if (res.error) setMsg(res.error)
    })
  }

  // Format relative timestamp offsets dynamically (e.g. "12s ago", "2m ago")
  function formatTimeAgo(createdAt: string) {
    const msDiff = Date.now() - new Date(createdAt).getTime()
    const seconds = Math.max(0, Math.floor(msDiff / 1000))
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  }

  // Helper to resolve an event's styling class and custom icon
  function resolveEventMeta(ev: GameEvent) {
    switch (ev.type) {
      case 'explode':
        return { emoji: '💥', textColor: 'text-[#FF007F]', textGlow: 'glow-red' }
      case 'power':
        if (ev.message.includes('Freeze') || ev.message.includes('froze')) {
          return { emoji: '❄️', textColor: 'text-[#06B6D4]', textGlow: '' }
        }
        if (ev.message.includes('Catnip') || ev.message.includes('Double Points')) {
          return { emoji: '🌿', textColor: 'text-[#22C55E]', textGlow: '' }
        }
        return { emoji: '🔮', textColor: 'text-[#A855F7]', textGlow: '' }
      case 'pass':
        return { emoji: '⚡', textColor: 'text-[#FF5F1F]', textGlow: '' }
      case 'join':
      case 'start':
        return { emoji: '🐾', textColor: 'text-foreground', textGlow: '' }
      default:
        return { emoji: '⚙️', textColor: 'text-muted-foreground', textGlow: '' }
    }
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* 1. Room Activity Timeline Log */}
      <div className="glass-panel glow-purple rounded-xl p-4 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center gap-2 border-b border-border/50 pb-2 mb-3 shrink-0">
          <span className="text-xs">📈</span>
          <span className="font-display text-xs uppercase tracking-widest font-black text-foreground">
            Room Activity
          </span>
          <span className="ml-auto text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-display font-bold uppercase tracking-wider">
            Live
          </span>
        </div>

        {/* Dynamic Activity List */}
        <div className="space-y-3.5 overflow-y-auto flex-1 min-h-0 pr-1 select-none text-left">
          {events
            .filter(ev => ev.type !== 'chat') // skip simple chat messages in activity feed
            .slice(-15)
            .reverse() // show latest at top
            .map(ev => {
              const meta = resolveEventMeta(ev)
              return (
                <div key={ev.id} className="flex gap-2.5 items-start text-[11px] leading-tight">
                  <span className="text-sm shrink-0 leading-none mt-0.5">{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold ${meta.textColor} truncate`}>
                      {ev.message}
                    </p>
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0 mt-0.5 font-mono">
                    {formatTimeAgo(ev.created_at)}
                  </span>
                </div>
              )
            })}
          {events.filter(ev => ev.type !== 'chat').length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No activity logged yet.
            </div>
          )}
        </div>
      </div>

      {/* 2. Power Shop buy grid */}
      <div className="glass-panel glow-purple rounded-xl p-4 shrink-0 flex flex-col">
        <div className="flex items-center gap-2 border-b border-border/50 pb-2 mb-3 shrink-0">
          <span className="text-xs">🛒</span>
          <span className="font-display text-xs uppercase tracking-widest font-black text-foreground">
            Power Shop
          </span>
        </div>

        {msg && (
          <p className="text-xs text-[#FF007F] bg-[#FF007F]/10 border border-[#FF007F]/20 px-2 py-1 rounded-lg mb-2 text-left font-display">
            {msg}
          </p>
        )}

        <div className="space-y-2.5">
          {POWERS.map(item => {
            const canAfford = myPlayer.points >= item.cost
            const canBuy = isPlaying && canAfford && !isPending

            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-2 border border-border/40 rounded-lg p-2 bg-white/2 hover:bg-white/3 transition-all"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                  <span className="text-xl leading-none shrink-0">{item.emoji}</span>
                  <div className="min-w-0">
                    <span className="font-display font-bold text-xs text-foreground block">
                      {item.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground block truncate">
                      {item.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Cost badge */}
                  <div className="flex items-center gap-0.5 text-xs font-mono font-bold text-[#EAB308]">
                    <span>{item.cost}</span>
                    <span className="text-[9px]">🐾</span>
                  </div>

                  {/* Buy trigger */}
                  <button
                    onClick={() => handleBuy(item.key)}
                    disabled={!canBuy}
                    className={`px-3 py-1 rounded text-[10px] font-display font-black uppercase tracking-wider border transition-all ${
                      canBuy
                        ? 'bg-[#FF007F] border-[#FF007F] text-white hover:bg-[#ff1e8e] shadow-[0_0_8px_rgba(255,0,127,0.3)]'
                        : 'bg-white/1 border-border/10 text-muted-foreground/45 cursor-not-allowed'
                    }`}
                  >
                    Buy
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
