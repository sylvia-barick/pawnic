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
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'oklch(0.07 0.02 275 / 90%)', backdropFilter: 'blur(8px)' }}
    >
      <div className="glass-panel rounded-2xl p-8 w-full max-w-md text-center glow-brand">
        <div className="text-6xl mb-3">{isWinner ? '🏆' : '💀'}</div>
        <h2 className="font-display font-black text-3xl tracking-widest mb-1 text-brand-glow">
          {isWinner ? 'You Win!' : 'Game Over'}
        </h2>
        {winner && (
          <p className="text-muted-foreground text-sm mb-6">
            <span className="text-lg mr-1">{winner.avatar}</span>
            <span className="text-foreground font-bold">{winner.nickname}</span> survived!
          </p>
        )}

        {/* Final standings */}
        <div className="space-y-2 mb-6">
          {sorted.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                i === 0 ? 'bg-[oklch(0.70_0.22_45/15%)] border border-[oklch(0.70_0.22_45/40%)]' : 'bg-[oklch(0.12_0.03_270)]'
              }`}
            >
              <span className={`font-display font-black text-sm w-5 ${i === 0 ? 'text-brand-glow' : 'text-muted-foreground'}`}>
                {i === 0 ? '👑' : `#${i + 1}`}
              </span>
              <span className="text-lg">{p.avatar}</span>
              <span className={`flex-1 text-left font-bold text-sm ${p.user_id === myPlayer?.user_id ? 'text-brand-glow' : 'text-foreground'}`}>
                {p.nickname}
                {p.user_id === myPlayer?.user_id && <span className="text-muted-foreground font-normal text-xs ml-1">(you)</span>}
              </span>
              <span className="font-display font-bold text-brand-glow text-sm">{p.points} pts</span>
              {!p.is_alive && <span className="text-xs">💀</span>}
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 rounded-xl font-display font-black text-xs tracking-widest uppercase text-black transition-all"
            style={{ background: 'oklch(0.70 0.22 45)', boxShadow: '0 0 20px oklch(0.70 0.22 45 / 50%)' }}
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  )
}
