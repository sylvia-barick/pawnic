'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { passBomb, sendChatMessage } from '@/app/actions/game'
import type { Room, Player, GameEvent } from '@/lib/types'

interface Props {
  room: Room | null
  players: Player[]
  events: GameEvent[]
  myPlayer: Player | null
  userId: string
}

export function ArenaPanel({ room, players, events, myPlayer, userId }: Props) {
  const [chatInput, setChatInput] = useState('')
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [showExplosion, setShowExplosion] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [passError, setPassError] = useState('')
  const eventsEndRef = useRef<HTMLDivElement>(null)
  const lastExplodeEventRef = useRef<string | null>(null)

  // Countdown timer
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

  // Explosion visual — fires when a new explode event appears
  useEffect(() => {
    const lastExplosion = [...events].reverse().find(e => e.type === 'explode')
    if (!lastExplosion) return
    if (lastExplosion.id === lastExplodeEventRef.current) return
    const age = Date.now() - new Date(lastExplosion.created_at).getTime()
    if (age < 4000) {
      lastExplodeEventRef.current = lastExplosion.id
      setShowExplosion(true)
      const t = setTimeout(() => setShowExplosion(false), 2500)
      return () => clearTimeout(t)
    }
  }, [events])

  // Auto-scroll chat
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  function handlePass(targetId: string) {
    if (!room || !myPlayer) return
    setPassError('')
    startTransition(async () => {
      const res = await passBomb(userId, room.id, targetId)
      if (res.error) setPassError(res.error)
    })
  }

  function handleChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || !room || !myPlayer) return
    const msg = chatInput.trim()
    setChatInput('')
    startTransition(async () => {
      await sendChatMessage(userId, room.id, myPlayer.nickname, msg)
    })
  }

  const alivePlayers = players.filter(p => p.is_alive)
  const bombHolder = players.find(p => p.id === room?.bomb_holder_id)
  const iHaveBomb = room?.bomb_holder_id === myPlayer?.id
  const isFrozen = !!(myPlayer?.is_frozen && myPlayer.frozen_until && new Date(myPlayer.frozen_until) > new Date())

  const timerColor = timeLeft === null ? 'text-muted-foreground'
    : timeLeft <= 5  ? 'text-[oklch(0.62_0.26_22)]'
    : timeLeft <= 10 ? 'text-[oklch(0.80_0.22_60)]'
    : 'text-[oklch(0.80_0.18_195)]'

  // Arrange players in a circle
  const angleStep = alivePlayers.length > 1 ? (2 * Math.PI) / alivePlayers.length : 0

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Arena */}
      <div className="glass-panel rounded-xl flex-1 min-h-0 relative overflow-hidden cyber-grid">
        {/* Explosion overlay */}
        {showExplosion && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none animate-screen-flash"
            style={{ background: 'radial-gradient(circle, oklch(0.62 0.26 22 / 60%) 0%, transparent 70%)' }}>
            <span className="font-display font-black text-6xl glow-red text-[oklch(0.62_0.26_22)]">
              BOOM!
            </span>
          </div>
        )}

        {/* Waiting state */}
        {room?.status === 'waiting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="text-6xl animate-bomb-bounce">🥔</div>
            <p className="font-display text-muted-foreground text-sm uppercase tracking-widest">
              Waiting for players...
            </p>
            <p className="text-xs text-muted-foreground">
              Share code{' '}
              <span className="text-brand-glow font-display font-bold select-all">{room.code}</span>{' '}
              to invite
            </p>
          </div>
        )}

        {/* Playing state */}
        {room?.status === 'playing' && (
          <>
            {/* Countdown */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
              <span className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-0.5">Explodes in</span>
              <span className={`font-display font-black text-4xl tabular-nums leading-none transition-colors ${timerColor} ${timeLeft !== null && timeLeft <= 5 ? 'animate-pulse' : ''}`}>
                {timeLeft !== null ? String(timeLeft).padStart(2, '0') : '--'}
              </span>
            </div>

            {/* Player circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative" style={{ width: 280, height: 280 }}>
                {alivePlayers.map((p, i) => {
                  const angle = angleStep * i - Math.PI / 2
                  const r = alivePlayers.length <= 3 ? 90 : 110
                  const x = Math.cos(angle) * r + 140 - 28
                  const y = Math.sin(angle) * r + 140 - 28
                  const hasBomb = p.id === room.bomb_holder_id
                  const isMe = p.user_id === userId
                  const canPass = iHaveBomb && !isMe && !isFrozen && !isPending

                  return (
                    <div
                      key={p.id}
                      className="absolute flex flex-col items-center gap-1"
                      style={{ left: x, top: y, width: 56 }}
                    >
                      <button
                        onClick={() => canPass && handlePass(p.id)}
                        disabled={!canPass}
                        className={`w-12 h-12 rounded-full text-2xl flex items-center justify-center border-2 transition-all relative ${
                          hasBomb
                            ? 'border-[oklch(0.62_0.26_22)] animate-pulse-red scale-110 shadow-[0_0_16px_oklch(0.62_0.26_22/70%)]'
                            : canPass
                            ? 'border-[oklch(0.70_0.22_45/60%)] hover:border-[oklch(0.70_0.22_45)] hover:scale-105 hover:shadow-[0_0_12px_oklch(0.70_0.22_45/50%)] cursor-pointer'
                            : isMe
                            ? 'border-[oklch(0.70_0.22_45/40%)]'
                            : 'border-border opacity-80'
                        } bg-[oklch(0.15_0.04_270)]`}
                        title={canPass ? `Pass bomb to ${p.nickname}` : p.nickname}
                      >
                        {p.avatar}
                        {hasBomb && (
                          <span className="absolute -top-1.5 -right-1.5 text-base animate-bomb-bounce z-10">🥔</span>
                        )}
                        {p.is_frozen && (
                          <span className="absolute -bottom-1 -right-1 text-xs">❄️</span>
                        )}
                        {p.shield_active && (
                          <span className="absolute -bottom-1 -left-1 text-xs">🛡️</span>
                        )}
                      </button>
                      <span className={`text-center leading-tight font-display text-[10px] font-bold max-w-full truncate ${isMe ? 'text-brand-glow' : 'text-foreground'}`}>
                        {p.nickname}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-display">{p.points}pts</span>
                    </div>
                  )
                })}

                {/* Center decorative bomb */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className={`text-4xl transition-opacity ${iHaveBomb ? 'animate-bomb-bounce opacity-80' : 'opacity-10'}`}>
                    🥔
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom status */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 w-full px-4">
              {isFrozen ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[oklch(0.80_0.18_195/50%)] bg-[oklch(0.80_0.18_195/10%)]">
                  <span className="text-lg">❄️</span>
                  <span className="font-display text-xs font-bold text-[oklch(0.80_0.18_195)] uppercase tracking-widest">
                    Frozen! Cannot pass
                  </span>
                </div>
              ) : iHaveBomb ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[oklch(0.62_0.26_22/60%)] bg-[oklch(0.62_0.26_22/15%)] animate-pulse-red">
                  <span className="animate-bomb-bounce text-xl">🥔</span>
                  <span className="font-display text-xs font-bold text-[oklch(0.62_0.26_22)] uppercase tracking-widest">
                    You have the bomb! Click a player to pass
                  </span>
                </div>
              ) : bombHolder ? (
                <div className="px-3 py-1.5 rounded-full bg-[oklch(0.12_0.03_270)] border border-border">
                  <span className="font-display text-xs text-muted-foreground">
                    <span className="text-foreground font-bold">{bombHolder.nickname}</span> holds the bomb
                  </span>
                </div>
              ) : null}
              {passError && (
                <p className="text-xs text-red-400 font-display">{passError}</p>
              )}
            </div>
          </>
        )}

        {/* Finished state */}
        {room?.status === 'finished' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-display text-muted-foreground text-sm uppercase tracking-widest">Game Over</p>
          </div>
        )}
      </div>

      {/* Chat / event log */}
      <div className="glass-panel rounded-xl flex flex-col shrink-0" style={{ height: 180 }}>
        <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
          {events.slice(-40).map(ev => (
            <div key={ev.id} className="text-xs leading-relaxed">
              <span className={
                ev.type === 'explode' ? 'text-[oklch(0.62_0.26_22)] font-bold'
                : ev.type === 'power'  ? 'text-[oklch(0.80_0.18_195)]'
                : ev.type === 'pass'   ? 'text-[oklch(0.70_0.22_45/80%)]'
                : ev.type === 'start'  ? 'text-[oklch(0.65_0.22_145)]'
                : ev.type === 'join'   ? 'text-[oklch(0.65_0.22_145)]'
                : 'text-muted-foreground'
              }>
                {ev.type === 'chat' && ev.nickname ? (
                  <><span className="text-foreground font-bold">{ev.nickname}:</span> {ev.message}</>
                ) : ev.message}
              </span>
            </div>
          ))}
          <div ref={eventsEndRef} />
        </div>
        <form onSubmit={handleChat} className="flex gap-2 p-2 border-t border-border shrink-0">
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Chat..."
            maxLength={80}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isPending}
            className="text-brand-glow font-display text-xs uppercase tracking-widest disabled:opacity-40 hover:opacity-80 transition-opacity shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
