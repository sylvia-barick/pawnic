'use client'

import Link from 'next/link'
import { PawLogo } from './paw-logo'
import type { Room, Player } from '@/lib/types'

interface Props {
  code: string
  room: Room
  myPlayer: Player | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  waiting:  { label: 'Waiting',    color: 'oklch(0.80 0.18 195)' },
  playing:  { label: 'Live',       color: 'oklch(0.65 0.22 145)' },
  finished: { label: 'Finished',   color: 'oklch(0.62 0.26 22)'  },
}

export function GameNavBar({ code, room, myPlayer }: Props) {
  const status = STATUS_LABELS[room.status] ?? STATUS_LABELS.waiting

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-12 glass-panel border-b border-border"
    >
      {/* Logo + name */}
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <PawLogo size={24} />
        <span className="font-display font-black text-base tracking-widest text-brand-glow">PAWnic</span>
      </Link>

      {/* Room info */}
      <div className="flex items-center gap-4">
        {/* Status badge */}
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: status.color, boxShadow: `0 0 6px ${status.color}` }}
          />
          <span className="font-display text-xs tracking-widest uppercase" style={{ color: status.color }}>
            {status.label}
          </span>
        </div>

        {/* Round */}
        {room.status === 'playing' && (
          <span className="text-xs text-muted-foreground font-display">
            Round <span className="text-foreground">{room.round_number}</span>
          </span>
        )}

        {/* Room code */}
        <div className="flex items-center gap-1.5 glass-panel rounded-lg px-3 py-1">
          <span className="text-xs text-muted-foreground font-display uppercase tracking-wider">Code:</span>
          <span className="font-display font-bold text-sm tracking-widest text-brand-glow">{code}</span>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="ml-1 text-muted-foreground hover:text-brand-glow transition-colors text-xs"
            title="Copy code"
          >
            ⧉
          </button>
        </div>
      </div>

      {/* Player identity */}
      {myPlayer && (
        <div className="flex items-center gap-2">
          <span className="text-lg">{myPlayer.avatar}</span>
          <div className="text-right">
            <p className="font-display text-xs font-bold text-foreground leading-none">{myPlayer.nickname}</p>
            <p className="font-display text-xs text-brand-glow leading-none mt-0.5">{myPlayer.points} pts</p>
          </div>
        </div>
      )}
    </header>
  )
}
