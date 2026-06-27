'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Room, Player } from '@/lib/types'
import { Horizon } from '@stellar/stellar-sdk'
import { Wallet, Copy, Menu, Flame, Zap, ShieldAlert, ShieldCheck, CheckCircle, CircleX } from 'lucide-react'

interface Props {
  code: string
  room: Room
  myPlayer: Player | null
}

export function GameNavBar({ code, room, myPlayer }: Props) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [balance, setBalance] = useState<string>('...')
  const walletAddress = (myPlayer?.powers as any)?.wallet_address || ''

  useEffect(() => {
    if (!walletAddress) {
      setBalance('0.00')
      return
    }
    const server = new Horizon.Server('https://horizon-testnet.stellar.org')
    const fetchBalance = () => {
      server.loadAccount(walletAddress)
        .then(account => {
          const native = account.balances.find(b => b.asset_type === 'native')
          setBalance(native ? Number(native.balance).toFixed(2) : '0.00')
        })
        .catch(err => {
          console.error('Failed to load wallet balance in nav bar:', err)
        })
    }
    fetchBalance()
    // Periodically update balance (e.g. every 10 seconds)
    const interval = setInterval(fetchBalance, 10000)
    return () => clearInterval(interval)
  }, [walletAddress])

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
  let dangerText = 'STABLE'
  let dangerColor = 'text-[#3B82F6]' // soft cyan-blue
  let filledSegments = 2
  let dangerBorderColor = 'glass-panel glow-blue'

  if (room.status === 'playing' && timeLeft !== null) {
    if (timeLeft > 60) {
      dangerText = 'STABLE'
      dangerColor = 'text-[#3B82F6]'
      filledSegments = 3
      dangerBorderColor = 'glass-panel glow-blue'
    } else if (timeLeft > 30) {
      dangerText = 'NERVOUS'
      dangerColor = 'text-[#FFE234]'
      filledSegments = 5
      dangerBorderColor = 'glass-panel glow-yellow'
    } else if (timeLeft > 10) {
      dangerText = 'UNSTABLE'
      dangerColor = 'text-[#FF5F1F] animate-pulse'
      filledSegments = 8
      dangerBorderColor = 'glass-panel glow-orange animate-pulse'
    } else {
      dangerText = 'NUCLEAR'
      dangerColor = 'text-[#FF007F] animate-pulse'
      filledSegments = 10
      dangerBorderColor = 'glass-panel glow-red animate-pulse'
    }
  } else if (room.status === 'finished') {
    dangerText = 'FINISHED'
    dangerColor = 'text-[#22C55E]'
    filledSegments = 0
    dangerBorderColor = 'glass-panel glow-green'
  }

  return (
    <header className="fixed top-2 left-0 right-0 z-50 flex gap-2 px-2 pointer-events-none select-none h-14">
      {/* 1. Left Box: Logo & Brand */}
      <Link
        href="/"
        className="pointer-events-auto w-72 shrink-0 glass-panel glow-orange flex items-center justify-center gap-3 h-full hover:translate-y-0.5 transition-all"
      >
        <span className="w-6 h-6 rounded bg-black/45 border border-white/5 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
          <img src="/paw-logo-room.png" alt="Logo" className="w-full h-full object-cover" />
        </span>
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
                              : dangerText === 'ANGRY' || dangerText === 'UNSTABLE'
                              ? '#FF5F1F'
                              : dangerText === 'NERVOUS'
                              ? '#FFE234'
                              : '#3B82F6',
                          boxShadow: `0 0 8px ${
                            dangerText === 'NUCLEAR' || dangerText === 'RABID'
                              ? '#FF007F'
                              : dangerText === 'ANGRY' || dangerText === 'UNSTABLE'
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
        <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 border-black bg-black/40 shadow-[1.5px_1.5px_0px_0px_#000000] ${dangerColor}`}>
          {dangerText === 'NUCLEAR' ? (
            <Flame className="w-4 h-4 text-[#FF007F] animate-pulse" />
          ) : dangerText === 'UNSTABLE' || dangerText === 'ANGRY' ? (
            <Zap className="w-4 h-4 text-[#FF5F1F]" />
          ) : dangerText === 'NERVOUS' ? (
            <ShieldAlert className="w-4 h-4 text-[#FFE234]" />
          ) : dangerText === 'FINISHED' ? (
            <CheckCircle className="w-4 h-4 text-[#22C55E]" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />
          )}
        </div>
      </div>

      {/* 3. Right Box: Wallet & Options Menu */}
      <div className="pointer-events-auto w-80 shrink-0 glass-panel glow-purple flex items-center justify-between px-3 h-full">
        {/* Wallet info */}
        {walletAddress ? (
          <div className="flex items-center gap-2 bg-black/40 border-2 border-black rounded-xl px-2.5 py-1 text-xs shadow-[2px_2px_0px_0px_#000]">
            <span className="bg-[#FFE234] w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border border-black shadow-[1px_1px_0px_0px_#000] text-black">
              <Wallet className="w-3 h-3" />
            </span>
            <div className="flex flex-col text-left leading-tight">
              <span className="font-black text-foreground text-[11px] tracking-wide">{balance} XLM</span>
              <span className="text-[9px] font-bold text-muted-foreground select-all font-mono">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(walletAddress)}
              className="text-[10px] text-muted-foreground hover:text-[#A855F7] transition-all ml-1 active:scale-95 flex items-center justify-center"
              title="Copy Wallet Address"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-black/40 border-2 border-black rounded-xl px-2.5 py-1 text-xs shadow-[2px_2px_0px_0px_#000]">
            <span className="bg-red-500 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border border-black shadow-[1px_1px_0px_0px_#000] text-white">
              <CircleX className="w-3 h-3" />
            </span>
            <div className="flex flex-col text-left leading-tight">
              <span className="font-black text-foreground text-[11px] tracking-wide">No Wallet</span>
              <span className="text-[9px] font-bold text-muted-foreground font-mono">Disconnected</span>
            </div>
          </div>
        )}

        {/* Menu burger */}
        <button
          className="w-8 h-8 rounded-xl flex items-center justify-center border-2 border-black bg-white/5 hover:bg-white/10 hover:border-black active:translate-y-0.5 transition-all shrink-0 shadow-[2px_2px_0px_0px_#000000]"
          title="Menu"
        >
          <Menu className="w-4 h-4 text-foreground" />
        </button>
      </div>
    </header>
  )
}
