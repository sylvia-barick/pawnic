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
  let dangerColor = 'text-[#3B82F6]' // soft cyan-blue
  let filledSegments = 2
  let dangerBorderColor = 'glass-panel glow-blue'
  let dangerBadgeBorderColor = 'border-[#3B82F6] text-[#3B82F6]'

  if (room.status === 'playing' && timeLeft !== null) {
    if (timeLeft > 25) {
      dangerText = 'CALM'
      dangerColor = 'text-[#3B82F6]' // soft cyan-blue
      filledSegments = 2
      dangerBorderColor = 'glass-panel glow-blue'
      dangerBadgeBorderColor = 'border-[#3B82F6] text-[#3B82F6]'
    } else if (timeLeft <= 25 && timeLeft > 18) {
      dangerText = 'NERVOUS'
      dangerColor = 'text-yellow-400'
      filledSegments = 4
      dangerBorderColor = 'glass-panel glow-yellow'
      dangerBadgeBorderColor = 'border-yellow-400 text-yellow-400'
    } else if (timeLeft <= 18 && timeLeft > 10) {
      dangerText = 'ANGRY'
      dangerColor = 'text-orange-500'
      filledSegments = 6
      dangerBorderColor = 'glass-panel glow-orange'
      dangerBadgeBorderColor = 'border-orange-500 text-orange-500'
    } else if (timeLeft <= 10 && timeLeft > 4) {
      dangerText = 'RABID'
      dangerColor = 'text-[#FF007F]'
      filledSegments = 8
      dangerBorderColor = 'glass-panel glow-red'
      dangerBadgeBorderColor = 'border-[#FF007F] text-[#FF007F]'
    } else {
      dangerText = 'NUCLEAR'
      dangerColor = 'text-[#FF007F] animate-pulse'
      filledSegments = 10
      dangerBorderColor = 'glass-panel glow-red animate-pulse'
      dangerBadgeBorderColor = 'border-[#FF007F] text-[#FF007F] animate-pulse'
    }
  }

  return (
    <header className="fixed top-2 left-0 right-0 z-50 flex gap-2 px-2 pointer-events-none select-none h-14">
      {/* 1. Left Box: Logo & Brand */}
      <Link
        href="/"
        className="pointer-events-auto w-72 shrink-0 glass-panel glow-orange flex items-center justify-center gap-3 h-full hover:translate-y-0.5 transition-all"
      >
        <span className="text-xl animate-bomb-bounce">🐾</span>
        <span className="font-display font-black text-xl tracking-widest text-[#F8FAFC]">
          PAW<span className="text-[#FF5F1F]">nic</span>
        </span>
      </Link>

      {/* 2. Center Box: Danger Level Indicator */}
      <div className={`pointer-events-auto flex-1 min-w-0 flex items-center justify-between px-6 h-full transition-all duration-300 ${dangerBorderColor}`}>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display font-black text-[9px] uppercase tracking-[0.2em] text-muted-foreground leading-none">
              Danger Level
            </span>
            <span className={`font-display font-black text-xs uppercase tracking-widest leading-none ${dangerColor}`}>
              {dangerText}
            </span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 10 }).map((_, idx) => {
              const isFilled = idx < filledSegments
              return (
                <div
                  key={idx}
                  className={`danger-segment ${isFilled ? 'filled' : ''} border border-black/80 shadow-[1px_1px_0px_0px_#000000]`}
                  style={
                    isFilled
                      ? {
                          backgroundColor:
                            dangerText === 'NUCLEAR' || dangerText === 'RABID'
                              ? '#FF007F'
                              : dangerText === 'ANGRY'
                              ? '#FF5F1F'
                              : dangerText === 'NERVOUS'
                              ? '#FFE234'
                              : '#3B82F6',
                          boxShadow: `0 0 8px ${
                            dangerText === 'NUCLEAR' || dangerText === 'RABID'
                              ? '#FF007F'
                              : dangerText === 'ANGRY'
                              ? '#FF5F1F'
                              : dangerText === 'NERVOUS'
                              ? '#FFE234'
                              : '#3B82F6'
                          }`,
                        }
                      : undefined
                  }
                />
              )
            })}
          </div>
        </div>
        <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 border-black bg-black/40 text-sm shadow-[1.5px_1.5px_0px_0px_#000000] ${dangerColor}`}>
          {dangerText === 'NUCLEAR' ? '🙀' : dangerText === 'RABID' ? '😾' : dangerText === 'ANGRY' ? '🐱' : '😸'}
        </div>
      </div>

      {/* 3. Right Box: Wallet & Options Menu */}
      <div className="pointer-events-auto w-80 shrink-0 glass-panel glow-purple flex items-center justify-between px-3 h-full">
        {/* Wallet info */}
        <div className="flex items-center gap-2 bg-black/40 border-2 border-black rounded-xl px-2.5 py-1 text-xs shadow-[2px_2px_0px_0px_#000]">
          <span className="text-sm bg-[#FFE234] w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-black shadow-[1px_1px_0px_0px_#000]">🐱</span>
          <div className="flex flex-col text-left leading-tight">
            <span className="font-black text-foreground text-[11px] tracking-wide">1.25 XLM</span>
            <span className="text-[9px] font-bold text-muted-foreground select-all font-mono">GD...7J4K</span>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText('GDSTLQWDX7J4K')}
            className="text-[10px] text-muted-foreground hover:text-[#A855F7] transition-all ml-1 active:scale-95"
            title="Copy Wallet Address"
          >
            📋
          </button>
        </div>

        {/* Menu burger */}
        <button
          className="w-8 h-8 rounded-xl flex items-center justify-center border-2 border-black bg-white/5 hover:bg-white/10 hover:border-black active:translate-y-0.5 transition-all shrink-0 shadow-[2px_2px_0px_0px_#000000]"
          title="Menu"
        >
          <span className="text-sm font-black text-foreground">☰</span>
        </button>
      </div>
    </header>
  )
}
