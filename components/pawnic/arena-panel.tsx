'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { passBomb, sendChatMessage, usePower } from '@/app/actions/game'
import type { Room, Player, GameEvent, PowerType } from '@/lib/types'

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
  const [selectingFreeze, setSelectingFreeze] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const eventsEndRef = useRef<HTMLDivElement>(null)
  const lastExplodeEventRef = useRef<string | null>(null)

  // Countdown timer for Explosions
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

  // Screen Flash trigger on explosion
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

  // Auto-scroll chat to bottom
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

  function handleUseAbility(type: PowerType, targetId?: string) {
    setErrorMsg('')
    setSelectingFreeze(false)
    startTransition(async () => {
      const res = await usePower(userId, room!.id, type, targetId)
      if (res.error) setErrorMsg(res.error)
    })
  }

  const alivePlayers = players.filter(p => p.is_alive)
  const bombHolder = players.find(p => p.id === room?.bomb_holder_id)
  const iHaveBomb = room?.bomb_holder_id === myPlayer?.id
  const isFrozen = !!(myPlayer?.is_frozen && myPlayer.frozen_until && new Date(myPlayer.frozen_until) > new Date())

  // Ability slots config mapped to the mockup descriptions & actions
  const abilitySlots: { key: PowerType; name: string; emoji: string }[] = [
    { key: 'reverse', name: 'Mirror', emoji: '🔮' },
    { key: 'freeze', name: 'Freeze', emoji: '❄️' },
    { key: 'double_points', name: 'Catnip', emoji: '🌿' },
    { key: 'speed_pass', name: 'Smoke Screen', emoji: '☁️' },
    { key: 'time_bomb', name: 'Nine Lives', emoji: '🐱' },
  ]

  const myPowers = (myPlayer?.powers ?? {}) as Record<PowerType, number>
  const angleStep = alivePlayers.length > 1 ? (2 * Math.PI) / alivePlayers.length : 0

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* 1. Main Game Arena Card */}
      <div className="glass-panel glow-blue rounded-xl flex-1 min-h-0 relative overflow-hidden cyber-grid flex flex-col p-4">
        {/* Explosion Overlay */}
        {showExplosion && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none animate-screen-flash"
            style={{ background: 'radial-gradient(circle, rgba(255,0,127,0.4) 0%, transparent 70%)' }}
          >
            <span className="font-display font-black text-6xl text-[#FF007F] animate-explosion">
              BOOM!
            </span>
          </div>
        )}

        {/* Card Header (HUD display inside Arena Panel) */}
        {room?.status === 'playing' && (
          <div className="flex justify-between items-start w-full z-10 shrink-0">
            {/* Explodes in timer */}
            <div className="flex flex-col text-left leading-tight bg-black/40 border border-border/50 rounded-lg px-3 py-1.5 backdrop-blur-sm">
              <span className="font-display text-[9px] uppercase tracking-widest text-muted-foreground">
                Explodes In
              </span>
              <span className="font-display font-black text-xl text-[#FF5F1F] animate-pulse font-mono mt-0.5">
                {timeLeft !== null ? `${timeLeft}s` : '--'}
              </span>
            </div>

            {/* Current Holder Name */}
            <div className="flex flex-col text-right leading-tight bg-black/40 border border-border/50 rounded-lg px-3 py-1.5 backdrop-blur-sm">
              <span className="font-display text-[9px] uppercase tracking-widest text-muted-foreground">
                Holder
              </span>
              <span className="font-display font-black text-sm text-[#EAB308] mt-0.5">
                {bombHolder ? `${bombHolder.nickname}${bombHolder.user_id === userId ? ' (You)' : ''}` : '--'}
              </span>
            </div>
          </div>
        )}

        {/* Dynamic game display layouts */}
        {room?.status === 'waiting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <div className="text-6xl animate-bomb-bounce">🥔</div>
            <p className="font-display text-muted-foreground text-sm uppercase tracking-widest font-black">
              Lobby: Waiting for players...
            </p>
            <p className="text-xs text-muted-foreground">
              Share code{' '}
              <span className="text-[#FF5F1F] font-display font-bold select-all bg-black/30 border border-border/30 px-2 py-0.5 rounded">
                {room.code}
              </span>{' '}
              to invite
            </p>
          </div>
        )}

        {room?.status === 'playing' && (
          <div className="flex-1 w-full relative flex items-center justify-center min-h-0 select-none">
            {/* Circular active players loop wrapper */}
            <div className="relative" style={{ width: 300, height: 300 }}>
              {/* Loop layout of players around the cat */}
              {alivePlayers.map((p, i) => {
                const angle = angleStep * i - Math.PI / 2
                const r = alivePlayers.length <= 3 ? 95 : 115
                const x = Math.cos(angle) * r + 150 - 26
                const y = Math.sin(angle) * r + 150 - 26
                const hasBomb = p.id === room.bomb_holder_id
                const isMe = p.user_id === userId
                const canPass = iHaveBomb && !isMe && !isFrozen && !isPending

                return (
                  <div
                    key={p.id}
                    className="absolute flex flex-col items-center gap-1 z-10"
                    style={{ left: x, top: y, width: 52 }}
                  >
                    <button
                      onClick={() => canPass && handlePass(p.id)}
                      disabled={!canPass}
                      className={`w-11 h-11 rounded-full text-xl flex items-center justify-center border-2 transition-all relative ${
                        hasBomb
                          ? 'border-[#FF007F] animate-pulse shadow-[0_0_15px_#FF007F]'
                          : canPass
                          ? 'border-[#06B6D4] hover:scale-110 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                          : isMe
                          ? 'border-[#FF5F1F]'
                          : 'border-border/80'
                      } bg-[#0E0E18]`}
                      title={canPass ? `Pass bomb to ${p.nickname}` : p.nickname}
                    >
                      {p.avatar}
                      {hasBomb && (
                        <span className="absolute -top-1.5 -right-1.5 text-sm animate-bomb-bounce">🥔</span>
                      )}
                      {p.is_frozen && <span className="absolute -bottom-1 -right-1 text-xs">❄️</span>}
                      {p.shield_active && <span className="absolute -bottom-1 -left-1 text-xs">🛡️</span>}
                    </button>
                    <span
                      className={`text-center leading-none font-display text-[9px] font-bold max-w-full truncate ${
                        isMe ? 'text-[#FF5F1F]' : 'text-foreground'
                      }`}
                    >
                      {p.nickname}
                    </span>
                    <span className="text-[8px] text-muted-foreground font-mono leading-none">
                      {(p.points / 10).toFixed(1)}s
                    </span>
                  </div>
                )
              })}

              {/* Central Glowing Cat Asset */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-24 h-24 rounded-full bg-cover bg-center border border-[#FF007F]/40 shadow-[0_0_25px_rgba(255,0,127,0.35)] animate-pulse overflow-hidden">
                  <img
                    src="/neon-cat.png"
                    alt="Cursed Cat"
                    className="w-full h-full object-cover scale-105"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {room?.status === 'finished' && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <p className="font-display text-muted-foreground text-sm uppercase tracking-widest font-black">
              Game Finished
            </p>
          </div>
        )}

        {/* Card Footer (HUD display inside Arena Panel) */}
        {room?.status === 'playing' && (
          <div className="flex justify-between items-center w-full z-10 shrink-0 border-t border-border/40 pt-2 mb-0.5">
            <button
              onClick={() => alert('Leaderboard is displayed on the left side.')}
              className="px-3 py-1 bg-white/5 border border-border/80 hover:bg-white/10 rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-colors"
            >
              View Leaderboard
            </button>
            <div className="flex items-center gap-1.5 bg-[#0E0E18] border border-border/60 rounded-lg px-3 py-1 text-xs font-mono font-bold">
              <span className="text-muted-foreground font-display font-bold text-[9px] uppercase tracking-wider mr-1">
                Ability Coins
              </span>
              <span className="text-[#FF5F1F] font-black">{myPlayer?.points ?? 0}</span>
              <span>🐾</span>
            </div>
          </div>
        )}
      </div>

      {/* Target selector popup for Freezing ability */}
      {selectingFreeze && (
        <div className="glass-panel glow-purple rounded-xl p-3 border shrink-0">
          <p className="font-display text-xs uppercase tracking-widest text-[#06B6D4] font-black mb-2 text-left">
            Choose Target to Freeze:
          </p>
          <div className="flex flex-wrap gap-2">
            {players
              .filter(p => p.is_alive && p.user_id !== userId)
              .map(p => (
                <button
                  key={p.id}
                  onClick={() => handleUseAbility('freeze', p.id)}
                  disabled={isPending}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-white/3 border border-border/60 hover:bg-[#06B6D4]/10 hover:border-[#06B6D4] rounded-lg text-xs transition-all"
                >
                  <span>{p.avatar}</span>
                  <span className="font-bold">{p.nickname}</span>
                </button>
              ))}
            <button
              onClick={() => setSelectingFreeze(false)}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="text-xs text-[#FF007F] font-display bg-[#FF007F]/10 border border-[#FF007F]/20 px-2 py-1 rounded shrink-0 text-left">
          {errorMsg}
        </p>
      )}

      {/* 2. Bottom row split: Abilities Panel & Chat Panel */}
      <div className="flex gap-2 shrink-0 h-44">
        {/* Left column: Abilities console (5 slots) */}
        <div className="glass-panel glow-purple rounded-xl p-3 flex-1 flex flex-col justify-between">
          <span className="font-display text-[10px] uppercase tracking-widest text-muted-foreground text-left font-black block border-b border-border/50 pb-1 mb-2">
            Abilities
          </span>
          <div className="flex gap-1.5 justify-between items-center flex-1 py-1">
            {abilitySlots.map((slot, index) => {
              const ownedCount = myPowers[slot.key] ?? 0
              const isPlaying = room.status === 'playing'
              const canUse = isPlaying && ownedCount > 0 && !isPending

              return (
                <button
                  key={slot.key}
                  disabled={!canUse}
                  onClick={() =>
                    slot.key === 'freeze' ? setSelectingFreeze(true) : handleUseAbility(slot.key)
                  }
                  className={`flex-1 flex flex-col items-center justify-between py-2 border rounded-lg h-full transition-all ${
                    canUse
                      ? 'bg-[#A855F7]/8 border-[#A855F7]/40 hover:bg-[#A855F7]/15 hover:scale-105 shadow-[0_0_8px_rgba(168,85,247,0.1)]'
                      : 'bg-white/1 border-border/20 opacity-30 cursor-not-allowed'
                  }`}
                  title={`${slot.name} (Owned: ${ownedCount})`}
                >
                  <span className="font-display font-black text-[9px] text-muted-foreground leading-none">
                    {index + 1}
                  </span>
                  <span className="text-xl leading-none my-1 animate-pulse-blue">{slot.emoji}</span>
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-[8px] font-bold truncate max-w-full font-display">
                      {slot.name}
                    </span>
                    <span className="text-[9px] text-[#A855F7] font-bold font-mono mt-0.5">
                      x{ownedCount}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right column: Chat Console */}
        <div className="glass-panel glow-purple rounded-xl flex flex-col" style={{ width: 280 }}>
          {/* Messages display */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0 select-text text-left">
            {events.slice(-30).map(ev => (
              <div key={ev.id} className="text-[11px] leading-relaxed">
                {ev.type === 'chat' && ev.nickname ? (
                  <p>
                    <span className="text-[#FF5F1F] font-bold">{ev.nickname}:</span>{' '}
                    <span className="text-foreground">{ev.message}</span>
                  </p>
                ) : (
                  // Skip system game logs in chat to keep it purely chat messages, as we have activity timeline
                  null
                )}
              </div>
            ))}
            <div ref={eventsEndRef} />
          </div>

          {/* Form input */}
          <form onSubmit={handleChat} className="flex gap-2 p-2 border-t border-border/50 shrink-0">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Type a message..."
              maxLength={80}
              className="flex-1 bg-transparent border-none! shadow-none! rounded-none! py-1! px-0! text-xs focus:ring-0 placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isPending}
              className="text-[#A855F7] hover:text-[#c084fc] font-display text-xs uppercase tracking-widest font-black disabled:opacity-40 transition-colors shrink-0"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
