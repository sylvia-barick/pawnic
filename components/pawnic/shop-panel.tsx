'use client'

import { useState, useEffect, useTransition } from 'react'
import { buyPower } from '@/app/actions/game'
import type { Room, Player, PowerType, GameEvent } from '@/lib/types'
import {
  ShieldAlert,
  Snowflake,
  Sparkles,
  EyeOff,
  Heart,
  TrendingUp,
  ShoppingBag,
  LogIn,
  LogOut,
  Play,
  Skull,
  Zap,
  Settings,
  Coins
} from 'lucide-react'

interface Props {
  room: Room | null
  players: Player[]
  events: GameEvent[]
  myPlayer: Player | null
  userId: string
}

// In the mockup, these 5 abilities are presented in the shop:
const POWERS = [
  {
    key: 'reverse',
    name: 'Mirror',
    description: 'Reflects the next incoming POTATO back to the sender.',
    cost: 100,
    icon: ShieldAlert,
    color: '#A855F7'
  },
  {
    key: 'freeze',
    name: 'Freeze',
    description: "Freezes a target player for 3 seconds so they can't pass or use powers.",
    cost: 80,
    icon: Snowflake,
    color: '#06B6D4'
  },
  {
    key: 'double_points',
    name: 'Catnip',
    description: 'Doubles your point gain for 10 seconds while holding the POTATO.',
    cost: 60,
    icon: Sparkles,
    color: '#22C55E'
  },
  {
    key: 'smoke_screen',
    name: 'Smoke Screen',
    description: 'Hides who is holding the POTATO from other players for 4 seconds.',
    cost: 70,
    icon: EyeOff,
    color: '#94A3B8'
  },
  {
    key: 'nine_lives',
    name: 'Nine Lives',
    description: 'Automatically saves you from one explosion once per match.',
    cost: 150,
    icon: Heart,
    color: '#FF007F'
  }
] as const

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
      <div className="glass-panel rounded-2xl flex-1 flex items-center justify-center">
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
        return { icon: Skull, textColor: 'text-[#FF007F]', colorCode: '#FF007F' }
      case 'power':
        if (ev.message.includes('Freeze') || ev.message.includes('froze')) {
          return { icon: Snowflake, textColor: 'text-[#06B6D4]', colorCode: '#06B6D4' }
        }
        if (ev.message.includes('Catnip') || ev.message.includes('Double Points')) {
          return { icon: Sparkles, textColor: 'text-[#22C55E]', colorCode: '#22C55E' }
        }
        return { icon: ShieldAlert, textColor: 'text-[#A855F7]', colorCode: '#A855F7' }
      case 'pass':
        return { icon: Zap, textColor: 'text-[#FF5F1F]', colorCode: '#FF5F1F' }
      case 'join':
        return { icon: LogIn, textColor: 'text-foreground', colorCode: '#22C55E' }
      case 'start':
        return { icon: Play, textColor: 'text-foreground', colorCode: '#FF5F1F' }
      default:
        return { icon: Settings, textColor: 'text-muted-foreground', colorCode: '#94A3B8' }
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 1. Room Activity Timeline Log */}
      <div className="glass-panel glow-purple rounded-2xl p-5 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5 mb-3.5 shrink-0">
          <span className="w-1 h-4 rounded-full bg-[#A855F7] shadow-[0_0_8px_#A855F7]" />
          <TrendingUp className="w-3.5 h-3.5 text-[#A855F7]" />
          <span className="font-display text-xs uppercase tracking-[0.2em] font-black text-foreground">
            Room Activity
          </span>
          <span className="ml-auto flex items-center gap-1 text-[9px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-lg font-display font-black uppercase tracking-wider border border-green-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        </div>

        {/* Dynamic Activity List with Timeline Track */}
        <div className="relative border-l border-white/5 pl-4 ml-2.5 space-y-4 overflow-y-auto flex-1 min-h-0 pr-1 select-none text-left">
          {events
            .filter(ev => ev.type !== 'chat') // skip simple chat messages in activity feed
            .slice(-15)
            .reverse() // show latest at top
            .map(ev => {
              const meta = resolveEventMeta(ev)
              const EvIcon = meta.icon
              return (
                <div key={ev.id} className="relative flex gap-2.5 items-start text-[11px] leading-tight">
                  {/* Timeline bullet dot */}
                  <span
                    className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full border border-[#06060A]"
                    style={{ backgroundColor: meta.colorCode }}
                  />

                  <EvIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: meta.colorCode }} />
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
            <div className="text-center py-8 text-xs text-muted-foreground">
              No activity logged yet.
            </div>
          )}
        </div>
      </div>

      {/* 2. Power Shop buy grid */}
      <div className="glass-panel glow-purple rounded-2xl p-5 shrink-0 flex flex-col">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5 mb-3.5 shrink-0">
          <span className="w-1 h-4 rounded-full bg-[#FF007F] shadow-[0_0_8px_#FF007F]" />
          <ShoppingBag className="w-3.5 h-3.5 text-[#FF007F]" />
          <span className="font-display text-xs uppercase tracking-[0.2em] font-black text-foreground">
            Power Shop
          </span>
          <span className="ml-auto flex items-center gap-1 font-display font-black text-[11px] text-[#EAB308] bg-[#EAB308]/10 border border-[#EAB308]/25 rounded-lg px-2 py-0.5">
            {myPlayer.points}
            <Coins className="w-3 h-3 text-[#EAB308]" />
          </span>
        </div>

        {msg && (
          <p className="text-xs text-[#FF007F] bg-[#FF007F]/10 border border-[#FF007F]/20 px-3 py-2 rounded-xl mb-2.5 text-left font-display">
            {msg}
          </p>
        )}

        <div className="space-y-3">
          {POWERS.map(item => {
            const canAfford = myPlayer.points >= item.cost
            const canBuy = isPlaying && canAfford && !isPending
            const ShopIcon = item.icon

            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 border border-white/5 rounded-xl p-3 bg-transparent hover:bg-white/2 hover:border-white/10 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                  {/* Backdrop for Emoji in Shop - Square with solid black bg, no translucent purple bubble */}
                  <span className="w-10 h-10 rounded-lg bg-black flex items-center justify-center shrink-0 border border-white/10">
                    <ShopIcon className="w-4 h-4" style={{ color: item.color }} />
                  </span>

                  <div className="min-w-0">
                    <span className="font-display font-black text-xs text-foreground block tracking-wide">
                      {item.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground block truncate mt-0.5 leading-normal">
                      {item.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Cost badge - Solid black bg with a border */}
                  <div className="flex items-center gap-1 bg-black border border-[#EAB308]/30 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-[#EAB308]">
                    <span>{item.cost}</span>
                    <Coins className="w-2.5 h-2.5 text-[#EAB308]" />
                  </div>

                  {/* Buy trigger */}
                  <button
                    onClick={() => handleBuy(item.key)}
                    disabled={!canBuy}
                    className={`px-3.5 py-1.5 rounded-lg text-[10px] font-display font-black uppercase tracking-wider border transition-all ${
                      canBuy
                        ? 'bg-[#FF007F] border-[#FF007F] text-white hover:bg-[#ff2a93] shadow-[0_4px_12px_rgba(255,0,127,0.35)] hover:scale-105 active:scale-95 text-white'
                        : 'bg-black border-white/5 text-muted-foreground/30 cursor-not-allowed'
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
