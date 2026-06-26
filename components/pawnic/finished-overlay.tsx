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
  const isWinner = myPlayer?.is_alive === true
  const myPayout = myPlayer?.powers?.payout_amount ? Number(myPlayer.powers.payout_amount) : 0
  const myPayoutTx = myPlayer?.powers?.payout_tx || ''

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
            {isWinner ? 'You Survived!' : 'Game Over'}
          </h2>

          {/* Winner details */}
          {winner && (
            <p className="text-muted-foreground text-sm mb-4 flex items-center justify-center gap-1.5">
              <span className="bg-[#0E0E18] border border-border/80 w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden">
                {winner.avatar.endsWith('.png') ? (
                  <img src={`/${winner.avatar}`} alt="Cat" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{winner.avatar}</span>
                )}
              </span>
              <span className="text-foreground font-black">{winner.nickname}</span> survived!
            </p>
          )}

          {/* Payout readout */}
          {isWinner && myPayout > 0 ? (
            <div className="mb-6 p-4 rounded-xl border-3 border-white bg-[#06060A] shadow-[3px_3px_0px_0px_#000000] text-center">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#22C55E] font-display font-bold block mb-1">
                🏆 Victory Payout Credited!
              </span>
              <span className="font-display font-black text-xl text-[#FFE234] block">
                +{myPayout.toFixed(4)} XLM
              </span>
              <span className="text-[9px] text-muted-foreground font-medium block mt-1">
                Sent to your connected wallet address
              </span>
              {myPayoutTx && (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${myPayoutTx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-[#A855F7] hover:text-[#C084FC] underline mt-2 block font-mono"
                >
                  Verify on Stellar.expert (Tx: {myPayoutTx.slice(0, 8)}...)
                </a>
              )}
            </div>
          ) : !isWinner ? (
            <div className="mb-6 p-4 rounded-xl border-3 border-white bg-[#06060A] shadow-[3px_3px_0px_0px_#000000] text-center">
              <span className="text-[10px] uppercase tracking-[0.15em] text-red-500 font-display font-bold block">
                💥 Eliminated
              </span>
              <span className="text-xs text-muted-foreground font-medium block mt-1">
                You exploded and received 0.00 XLM
              </span>
            </div>
          ) : null}

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
                <span className="bg-background/50 w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
                  {p.avatar.endsWith('.png') ? (
                    <img src={`/${p.avatar}`} alt="Cat" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">{p.avatar}</span>
                  )}
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
