'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Room, Player } from '@/lib/types'

interface Props {
  code: string
  room: Room
  myPlayer: Player | null
}

export function GameNavBar({ code, room, myPlayer }: Props) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  // Countdown timer inside header to drive the danger level
  useEffect(() => {
    if (!room?.explosion_at || room.status !== 'playing') {
      setTimeLeft(null)
      return
    }
    const tick = () => {
      const ms = new Date(room.explosion_at!).getTime() - Date.now()
      setTimeLeft(Math.max(0, Math.floor(ms / 1000)))
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [room?.explosion_at, room?.status])

  // Compute Danger Level and segment counts based on seconds remaining
  let dangerText = 'CALM'
  let dangerColor = 'text-[oklch(0.65_0.22_145)]' // green
  let filledSegments = 2

  if (room.status === 'playing' && timeLeft !== null) {
    if (timeLeft > 25) {
      dangerText = 'CALM'
      dangerColor = 'text-[oklch(0.80_0.18_195)]' // soft cyan-blue
      filledSegments = 2
    } else if (timeLeft <= 25 && timeLeft > 18) {
      dangerText = 'NERVOUS'
      dangerColor = 'text-yellow-400'
      filledSegments = 4
    } else if (timeLeft <= 18 && timeLeft > 10) {
      dangerText = 'ANGRY'
      dangerColor = 'text-orange-500'
      filledSegments = 6
    } else if (timeLeft <= 10 && timeLeft > 4) {
      dangerText = 'RABID'
      dangerColor = 'text-[#FF5F1F]' // neon orange
      filledSegments = 8
    } else {
      dangerText = 'NUCLEAR'
      dangerColor = 'text-[#FF007F] animate-pulse' // hot pink
      filledSegments = 10
    }
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-14 bg-background/95 border-b border-border/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-md"
    >
      {/* Left: Logo + name */}
      <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
        <span className="text-xl">🐾</span>
        <span className="font-display font-black text-lg tracking-widest text-[#F8FAFC]">
          PAW<span className="text-[#FF5F1F]">nic</span>
        </span>
      </Link>

      {/* Center: Danger Level progress segments */}
      <div className="flex flex-col items-center justify-center translate-y-0.5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-display text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
            Danger Level
          </span>
          <span className={`font-display font-black text-xs uppercase tracking-widest ${dangerColor}`}>
            {dangerText}
          </span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 10 }).map((_, idx) => {
            const isFilled = idx < filledSegments
            return (
              <div
                key={idx}
                className={`danger-segment ${isFilled ? 'filled' : ''}`}
                style={
                  isFilled
                    ? {
                        backgroundColor:
                          dangerText === 'NUCLEAR' || dangerText === 'RABID'
                            ? '#FF007F'
                            : dangerText === 'ANGRY'
                            ? '#FF5F1F'
                            : '#EAB308',
                        boxShadow: `0 0 8px ${
                          dangerText === 'NUCLEAR' || dangerText === 'RABID'
                            ? '#FF007F'
                            : dangerText === 'ANGRY'
                            ? '#FF5F1F'
                            : '#EAB308'
                        }`,
                      }
                    : undefined
                }
              />
            )
          })}
        </div>
      </div>

      {/* Right: Mock Stellar Wallet detail */}
      <div className="flex items-center gap-4">
        {/* Wallet info */}
        <div className="flex items-center gap-2 bg-[#0E0E18] border border-cyan-500/25 hover:border-cyan-500/50 transition-all rounded-full px-3 py-1 text-xs shadow-[0_0_10px_rgba(6,182,212,0.05)]">
          <span className="text-sm">🐱</span>
          <div className="flex flex-col text-left leading-tight">
            <span className="font-bold text-foreground">1.25 XLM</span>
            <span className="text-[9px] text-muted-foreground select-all font-mono">GD...7J4K</span>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText('GDSTLQWDX7J4K')}
            className="text-[10px] text-muted-foreground hover:text-cyan-400 transition-colors ml-1"
            title="Copy Wallet Address"
          >
            📋
          </button>
        </div>

        {/* Menu burger */}
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-border/80 hover:bg-white/5 transition-colors"
          title="Menu"
        >
          <span className="text-xs text-muted-foreground">☰</span>
        </button>
      </div>
    </header>
  )
}
