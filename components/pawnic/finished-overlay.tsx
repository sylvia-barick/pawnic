'use client'

import { useRouter } from 'next/navigation'
import type { Room, Player } from '@/lib/types'

interface Props {
  room: Room | null
  players: Player[]
  myPlayer: Player | null
}

export function FinishedOverlay({ players, myPlayer }: Props) {
  const router = useRouter()
  const sorted = [...players].sort((a, b) => b.points - a.points)
  const winner = players.find(p => p.is_alive) ?? sorted[0]
  const isWinner = winner?.user_id === myPlayer?.user_id

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6, 6, 10, 0.9)', backdropFilter: 'blur(8px)' }}
    >
      <div className="glass-panel glow-purple rounded-2xl p-8 w-full max-w-md text-center max-h-[90vh] overflow-y-auto flex flex-col justify-between">
        <div>
          {/* Header icon */}
          <div className="text-6xl mb-4 animate-bomb-bounce">{isWinner ? '🏆' : '💀'}</div>

          {/* Heading */}
          <h2 className="font-display font-black text-3xl tracking-widest mb-1.5 text-foreground">
            {isWinner ? 'You Win!' : 'Game Over'}
          </h2>

          {/* Winner details */}
          {winner && (
            <p className="text-muted-foreground text-sm mb-6 flex items-center justify-center gap-1.5">
              <span className="text-xl bg-[#0E0E18] border border-border/80 w-8 h-8 rounded-full flex items-center justify-center">
                {winner.avatar}
              </span>
              <span className="text-foreground font-black">{winner.nickname}</span> survived!
            </p>
          )}

          {/* Standings list */}
          <div className="space-y-2 mb-6">
            {sorted.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
                  i === 0
                    ? 'bg-[#FF5F1F]/10 border-[#FF5F1F]/40 shadow-[0_0_10px_rgba(255,95,31,0.15)]'
                    : 'bg-[#0E0E18]/80 border-border/50'
                }`}
              >
                <span
                  className={`font-display font-black text-xs w-5 ${
                    i === 0 ? 'text-[#FF5F1F]' : 'text-muted-foreground'
                  }`}
                >
                  {i === 0 ? '👑' : `#${i + 1}`}
                </span>
                <span className="text-lg bg-background/50 w-7 h-7 rounded-full flex items-center justify-center">
                  {p.avatar}
                </span>
                <span
                  className={`flex-1 text-left font-bold text-xs truncate ${
                    p.user_id === myPlayer?.user_id ? 'text-[#FF5F1F]' : 'text-foreground'
                  }`}
                >
                  {p.nickname}
                  {p.user_id === myPlayer?.user_id && (
                    <span className="text-muted-foreground font-normal text-[9px] ml-1">(you)</span>
                  )}
                </span>
                <span className="font-display font-black text-xs text-foreground shrink-0">
                  {p.points} pts
                </span>
                {!p.is_alive && <span className="text-xs shrink-0" title="Eliminated">💀</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-center mt-2 shrink-0">
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 rounded-xl font-display font-black text-xs tracking-widest uppercase text-white transition-all border border-[#FF5F1F]"
            style={{
              background: '#FF5F1F',
              boxShadow: '0 0 20px rgba(255, 95, 31, 0.4)',
            }}
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  )
}
