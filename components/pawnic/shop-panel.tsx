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
            .slice(-30) // increased size so we can see more activities
            .reverse() // show latest at top
            .map(ev => {
              const meta = resolveEventMeta(ev)
              const EvIcon = meta.icon

              // Mask pass messages if they occurred during active smoke screen
              let displayMsg = ev.message
              if (ev.type === 'pass') {
                const evTime = new Date(ev.created_at).getTime()
                const isSmokeActive = players.some(p => {
                  const pPowers = (p.powers ?? {}) as Record<string, any>
                  const until = pPowers.smoke_screen_until
                  if (!until) return false
                  const untilTime = new Date(until).getTime()
                  return evTime >= (untilTime - 10000) && evTime <= untilTime
                })
                if (isSmokeActive) {
                  displayMsg = 'POTATO passed secretly... ☁️'
                }
              }

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
                      {displayMsg}
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

      {/* 2. Leaderboard */}
      <div className="glass-panel glow-purple rounded-2xl p-5 shrink-0 flex flex-col min-h-0 max-h-[320px]">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5 mb-3 shrink-0">
          <span className="w-1 h-4 rounded-full bg-[#EAB308] shadow-[0_0_8px_#EAB308]" />
          <span className="font-display text-xs uppercase tracking-[0.2em] font-black text-foreground">
            Leaderboard
          </span>
        </div>

        <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
          {[...players]
            .sort((a, b) => b.points - a.points)
            .map((p, idx) => {
              const isMe = p.user_id === userId
              const crownColor = idx === 0 ? 'text-[#EAB308]' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : ''
              
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${
                    isMe
                      ? 'bg-[#FF5F1F]/10 border-[#FF5F1F]/40 shadow-[0_2px_8px_rgba(255,95,31,0.08)]'
                      : 'bg-black border-white/5'
                  }`}
                >
                  <span className="font-display font-black text-[10px] w-5 text-left text-muted-foreground">
                    #{idx + 1}
                  </span>
                  
                  <span className="w-6 h-6 rounded-lg bg-black flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                    {p.avatar.endsWith('.png') ? (
                      <img src={`/${p.avatar}`} alt="Cat" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs">{p.avatar}</span>
                    )}
                  </span>

                  <span className={`text-xs font-bold truncate flex-1 text-left ${isMe ? 'text-[#FF5F1F]' : 'text-foreground'}`}>
                    {p.nickname}
                    {idx < 3 && <span className={`ml-1 text-xs ${crownColor}`} title="Top Ranks">👑</span>}
                  </span>

                  <span className="font-display font-black text-[10px] text-foreground shrink-0 font-mono">
                    {p.points} pts
                  </span>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
