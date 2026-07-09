'use client'

import { useRouter } from 'next/navigation'
import type { Room, Player } from '@/lib/types'
import { getExplorerTxUrl } from '@/lib/stellar-config'

interface Props {
  room: Room | null
  players: Player[]
  myPlayer: Player | null
}

export function FinishedOverlay({ room, players, myPlayer }: Props) {
  const router = useRouter()
  const sorted = [...players].sort((a, b) => b.points - a.points)
  const winner = players.find(p => p.is_alive) ?? sorted[0]
  const isWinner = myPlayer?.is_alive === true
  const myPayout = myPlayer?.powers?.payout_amount ? Number(myPlayer.powers.payout_amount) : 0
  const myPayoutTx = myPlayer?.powers?.payout_tx || ''

  const totalPrizePool = players.reduce((sum, p) => sum + Number(p.powers?.original_contribution ?? p.powers?.buy_in ?? 1.0), 0)
  const eliminatedPlayer = players.find(p => !p.is_alive)
  const forfeitedCapital = eliminatedPlayer ? Number(eliminatedPlayer.powers?.original_contribution ?? eliminatedPlayer.powers?.buy_in ?? 1.0) : 0
  const totalWeightedScore = players.filter(p => p.is_alive).reduce((sum, p) => sum + Number(p.powers?.weighted_score ?? 0), 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6, 6, 10, 0.95)', backdropFilter: 'blur(8px)' }}
    >
      <div className="bg-[#12121E] rounded-2xl p-8 w-full max-w-2xl text-center max-h-[95vh] overflow-y-auto flex flex-col justify-between relative border-[4px] border-black shadow-[8px_8px_0px_0px_#A855F7]">
        <div>
          {/* Header icon */}
          {isWinner ? (
            <div className="w-60 h-60 mx-auto mb-4 rounded-2xl overflow-hidden border-4 border-black bg-white shadow-[4px_4px_0px_0px_#FFE234] flex items-center justify-center">
              <video
                src="/win.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-60 h-60 mx-auto mb-4 rounded-2xl overflow-hidden border-4 border-black bg-white shadow-[4px_4px_0px_0px_#FF007F] flex items-center justify-center">
              <video
                src="/loose.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Heading */}
          <h2 className="font-display font-black text-4xl tracking-widest mb-2 text-foreground uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            {isWinner ? 'You Survived!' : 'You Lost'}
          </h2>

          {/* Winner details */}
          {winner && (
            <p className="text-muted-foreground text-xs mb-6 flex items-center justify-center gap-1.5">
              <span className="bg-[#0E0E18] border-2 border-black w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {winner.avatar.endsWith('.png') ? (
                  <img src={`/${winner.avatar}`} alt="Cat" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">{winner.avatar}</span>
                )}
              </span>
              <span className="text-foreground font-black bg-[#FF5F1F] text-black px-2 py-0.5 border border-black rounded shadow-[2px_2px_0px_rgba(0,0,0,1)]">{winner.nickname}</span> survived!
            </p>
          )}

          {/* Tokenomics Stats Dashboard Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#FFE234] border-2 border-black rounded-xl p-3.5 text-left text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[9px] uppercase tracking-wider text-black/70 block font-black leading-none">Total Prize Pool</span>
              <strong className="text-black font-display text-sm font-black block mt-1.5 leading-none">{totalPrizePool.toFixed(2)} XLM</strong>
            </div>
            <div className="bg-[#FF007F] border-2 border-black rounded-xl p-3.5 text-left text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[9px] uppercase tracking-wider text-white/80 block font-black leading-none">Forfeited Capital</span>
              <strong className="text-white font-display text-sm font-black block mt-1.5 leading-none">{forfeitedCapital.toFixed(2)} XLM</strong>
            </div>
            <div className="bg-[#A855F7] border-2 border-black rounded-xl p-3.5 text-left text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[9px] uppercase tracking-wider text-white/80 block font-black leading-none">Total Weighted Score</span>
              <strong className="text-white font-display text-sm font-black block mt-1.5 leading-none">{totalWeightedScore}</strong>
            </div>
            <div className="bg-[#06B6D4] border-2 border-black rounded-xl p-3.5 text-left text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[9px] uppercase tracking-wider text-black/70 block font-black leading-none">Eliminated Player</span>
              <strong className="text-black font-display text-[10px] font-black block truncate mt-1.5 leading-none">
                {eliminatedPlayer ? eliminatedPlayer.nickname : 'None'}
              </strong>
            </div>
          </div>

          {/* Reward Formula Explainer */}
          <div className="bg-[#18182B] border-2 border-black rounded-xl p-3 mb-6 text-left text-[10px] leading-relaxed text-slate-200 font-mono shadow-[3px_3px_0px_0px_#A855F7]">
            <div className="font-display font-black text-[9px] uppercase tracking-widest text-[#A855F7] mb-1.5 border-b-2 border-black pb-1 leading-none">
              🧬 Weighted Tokenomics Formula
            </div>
            <div>• <strong className="text-white">Weighted Score</strong> = Bet Amount × Hold Time (seconds)</div>
            <div>• <strong className="text-white">Score Share</strong> = Player Score / Total Weighted Score</div>
            <div>• <strong className="text-white">Bonus Reward</strong> = Score Share × Forfeited Capital</div>
            <div>• <strong className="text-white">Final Payout</strong> = Original Bet + Bonus Reward</div>
          </div>

          {/* Standings list (Two column grid for detail layouts) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {sorted.map((p, i) => {
              const origBuyIn = Number(p.powers?.original_contribution ?? p.powers?.buy_in ?? room?.buy_in ?? 1.0)
              const holdTime = Number(p.powers?.hold_time ?? 0)
              const score = Number(p.powers?.weighted_score ?? (origBuyIn * holdTime))
              const bonusEarned = Number(p.powers?.bonus_earned ?? 0)
              const payoutAmount = Number(p.powers?.payout_amount ?? 0)
              const payoutTx = p.powers?.payout_tx || ''

              const isUser = p.user_id === myPlayer?.user_id
              const cardClass = !p.is_alive
                ? 'bg-[#FF007F]/15 border-2 border-[#FF007F] shadow-[4px_4px_0px_0px_#FF007F] rounded-xl flex flex-col gap-2.5 px-4 py-3 text-left'
                : isUser
                ? 'bg-[#18182B] border-2 border-[#FF5F1F] shadow-[4px_4px_0px_0px_#FF5F1F] rounded-xl flex flex-col gap-2.5 px-4 py-3 text-left'
                : 'bg-[#18182B] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl flex flex-col gap-2.5 px-4 py-3 text-left'

              return (
                <div key={p.id} className={cardClass}>
                  {/* Standings Row */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`font-display font-black text-xs w-4 shrink-0 ${
                        !p.is_alive ? 'text-[#FF007F]' : 'text-slate-400'
                      }`}
                    >
                      {!p.is_alive ? '💀' : `#${i + 1}`}
                    </span>
                    <span className="bg-[#0E0E18] w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                      {p.avatar.endsWith('.png') ? (
                        <img src={`/${p.avatar}`} alt="Cat" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">{p.avatar}</span>
                      )}
                    </span>
                    <span
                      className={`flex-1 text-xs font-black truncate ${
                        isUser ? 'text-[#FF5F1F]' : 'text-white'
                      }`}
                    >
                      {p.nickname}
                      {isUser && (
                        <span className="text-muted-foreground font-normal text-[8px] ml-1">(you)</span>
                      )}
                    </span>
                    <span className="text-[10px] text-white shrink-0 font-mono font-bold bg-black/40 px-1.5 py-0.5 rounded border border-black">
                      {p.points} pts
                    </span>
                  </div>

                  {/* Payout Summary Details */}
                  <div className="border-t border-black/40 pt-2 flex flex-col gap-1.5 font-mono text-[9px]">
                    <div className="grid grid-cols-3 gap-2 leading-none">
                      <div>
                        <span className="text-slate-400 block leading-none">Bet:</span>
                        <strong className="text-white block mt-1 leading-none">{origBuyIn.toFixed(2)} XLM</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block leading-none font-sans">Hold Time:</span>
                        <strong className="text-white block mt-1 leading-none">{holdTime}s</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block leading-none">Score:</span>
                        <strong className="text-[#A855F7] block mt-1 leading-none">{score}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-dashed border-black/40 pt-1.5 leading-none">
                      <div>
                        <span className="text-slate-400 block leading-none">Bonus:</span>
                        {p.is_alive ? (
                          <strong className="text-[#22C55E] block mt-1 leading-none">+{bonusEarned.toFixed(4)} XLM</strong>
                        ) : (
                          <strong className="text-red-500 block mt-1 leading-none">0.00 XLM</strong>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block leading-none">Payout:</span>
                        {p.is_alive ? (
                          <strong className="text-[#FFE234] block mt-1 leading-none">{payoutAmount.toFixed(4)} XLM</strong>
                        ) : (
                          <strong className="text-red-500 block mt-1 leading-none">0.00 XLM</strong>
                        )}
                      </div>
                    </div>

                    {p.is_alive && payoutTx && (
                      <div className="flex justify-between items-center text-[8px] mt-1 border-t border-black/30 pt-1">
                        <span className="text-slate-400">Tx Hash:</span>
                        <a
                          href={getExplorerTxUrl(payoutTx)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#A855F7] hover:text-[#C084FC] underline font-bold"
                        >
                          {payoutTx.slice(0, 18)}...
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-center mt-2 shrink-0">
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 rounded-xl font-display font-black text-xs tracking-widest uppercase text-black bg-[#FF5F1F] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  )
}
