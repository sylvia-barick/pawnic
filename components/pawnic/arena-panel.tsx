'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { passBomb, sendChatMessage, usePower } from '@/app/actions/game'
import type { Room, Player, GameEvent, PowerType } from '@/lib/types'
import { ShieldAlert, Snowflake, Sparkles, EyeOff, Heart, Lock, Coins, Flame, Cloud, Smile } from 'lucide-react'

interface Props {
  room: Room | null
  players: Player[]
  events: GameEvent[]
  myPlayer: Player | null
  userId: string
  reactions: { id: string; playerId: string; emoji: string; xOffset: number }[]
  sendReaction: (emoji: string) => void
}

const abilityColors: Record<PowerType, { bg: string; border: string; text: string }> = {
  reverse: { bg: 'rgba(168, 85, 247, 0.05)', border: 'rgba(168, 85, 247, 0.4)', text: 'text-[#A855F7]' },
  freeze: { bg: 'rgba(6, 182, 212, 0.05)', border: 'rgba(6, 182, 212, 0.4)', text: 'text-[#06B6D4]' },
  double_points: { bg: 'rgba(34, 197, 94, 0.05)', border: 'rgba(34, 197, 94, 0.4)', text: 'text-[#22C55E]' },
  smoke_screen: { bg: 'rgba(148, 163, 184, 0.05)', border: 'rgba(148, 163, 184, 0.4)', text: 'text-slate-400' },
  nine_lives: { bg: 'rgba(255, 0, 127, 0.05)', border: 'rgba(255, 0, 127, 0.4)', text: 'text-[#FF007F]' },
}

const abilityShortnames: Record<PowerType, string> = {
  reverse: 'MIRR',
  freeze: 'FRZ',
  double_points: '2X',
  smoke_screen: 'SMK',
  nine_lives: '9LIV',
}

export function ArenaPanel({ room, players, events, myPlayer, userId, reactions, sendReaction }: Props) {
  const [chatInput, setChatInput] = useState('')
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [showExplosion, setShowExplosion] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [passError, setPassError] = useState('')
  const [selectingFreeze, setSelectingFreeze] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const eventsEndRef = useRef<HTMLDivElement>(null)
  const lastExplodeEventRef = useRef<string | null>(null)

  // Reaction Picker state & refs
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const pickerButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        pickerButtonRef.current &&
        !pickerButtonRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Countdown timer for Explosions
  useEffect(() => {
    if (!room?.explosion_at || room?.status !== 'playing') {
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
  
  // Hides who is holding the POTATO from other players for 4 seconds if Smoke Screen is active
  const isSmokeScreenActive = players.some(p => {
    const pPowers = (p.powers ?? {}) as Record<string, any>
    const until = pPowers.smoke_screen_until
    return until && new Date(until) > new Date()
  })

  const bombHolder = players.find(p => p.id === room?.bomb_holder_id)
  const isMeHolding = bombHolder?.user_id === userId
  const shouldHideHolder = isSmokeScreenActive && !isMeHolding

  const iHaveBomb = room?.bomb_holder_id === myPlayer?.id
  const isFrozen = !!(myPlayer?.is_frozen && myPlayer.frozen_until && new Date(myPlayer.frozen_until) > new Date())

  // Ability slots config mapped to the mockup descriptions & actions
  const abilitySlots: { key: PowerType; name: string; icon: React.ComponentType<any> }[] = [
    { key: 'reverse', name: 'Mirror', icon: ShieldAlert },
    { key: 'freeze', name: 'Freeze', icon: Snowflake },
    { key: 'double_points', name: 'Catnip', icon: Sparkles },
    { key: 'smoke_screen', name: 'Smoke Screen', icon: EyeOff },
    { key: 'nine_lives', name: 'Nine Lives', icon: Heart },
  ]

  const myPowers = (myPlayer?.powers ?? {}) as Record<string, any>
  const angleStep = alivePlayers.length > 1 ? (2 * Math.PI) / alivePlayers.length : 0

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 1. Main Game Arena Card */}
      <div className="glass-panel glow-blue rounded-2xl flex-1 min-h-0 relative overflow-hidden cyber-grid flex flex-col p-5">
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
            {/* Explodes in timer - Ticking */}
            <div className="flex flex-col text-left leading-tight bg-black/60 border border-[#FF5F1F]/25 rounded-xl px-4 py-2 backdrop-blur-md shadow-[0_0_16px_rgba(255,95,31,0.12)]">
              <span className="font-display text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-black">
                Fuse Status
              </span>
              <span className="font-display font-black text-base text-[#FF5F1F] font-mono mt-1 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-[#FF5F1F] animate-pulse" />
                TICKING
              </span>
            </div>

            {/* Current Holder Name */}
            <div className="flex flex-col text-right leading-tight bg-black/60 border border-[#EAB308]/25 rounded-xl px-4 py-2 backdrop-blur-md shadow-[0_0_16px_rgba(234,179,8,0.12)]">
              <span className="font-display text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-black">
                Holder
              </span>
              <span className="font-display font-black text-base text-[#EAB308] mt-1 flex items-center justify-end gap-1.5">
                {shouldHideHolder ? (
                  <>
                    <Cloud className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-400">Hidden</span>
                  </>
                ) : bombHolder ? (
                  `${bombHolder.nickname}${bombHolder.user_id === userId ? ' (You)' : ''}`
                ) : (
                  '--'
                )}
              </span>
            </div>
          </div>
        )}

        {/* Dynamic game display layouts */}
        {room?.status === 'waiting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <div className="w-72 h-72 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center bg-black/60">
              <video
                src="/cawt.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
            <p className="font-display text-muted-foreground text-sm uppercase tracking-[0.2em] font-black animate-pulse">
              Lobby: Waiting for players...
            </p>
            <p className="text-xs text-muted-foreground">
              Share code{' '}
              <span className="text-[#FF5F1F] font-display font-bold select-all bg-black/40 border border-white/10 px-2.5 py-1 rounded-lg">
                {room?.code}
              </span>{' '}
              to invite
            </p>
          </div>
        )}

        {room?.status === 'playing' && (
          <div className="flex-1 w-full relative flex items-center justify-center min-h-0 select-none">
            {/* Circular active players loop wrapper */}
            <div className="relative" style={{ width: 300, height: 300 }}>
              
              {/* Central Holographic Arena floor details */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="arena-hologram-floor flex items-center justify-center">
                  <div className="arena-hologram-ring-outer flex items-center justify-center">
                    <div className="arena-hologram-ring-inner" />
                  </div>
                </div>
              </div>

              {/* Laser wires connecting players to center */}
              {alivePlayers.map((p, i) => {
                const angle = angleStep * i - Math.PI / 2
                const r = alivePlayers.length <= 3 ? 95 : 115
                const hasBomb = p.id === room?.bomb_holder_id
                const showBombVisual = hasBomb && !shouldHideHolder
                return (
                  <div
                    key={`laser-${p.id}`}
                    className={`arena-laser-line ${showBombVisual ? 'active' : ''}`}
                    style={{
                      width: r,
                      left: 150,
                      top: 150,
                      transform: `rotate(${angle}rad)`,
                      opacity: showBombVisual ? 0.65 : 0.2,
                    }}
                  />
                )
              })}

              {/* Central Glowing Cat Asset */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-32 h-32 rounded-full bg-cover bg-center border border-[#FF007F]/45 shadow-[0_0_40px_rgba(255,0,127,0.65)] animate-glow-pulse overflow-hidden flex items-center justify-center bg-black/60">
                  <img
                    src="/neon-cat.png"
                    alt="Cursed Cat"
                    className="w-24 h-24 object-contain animate-bomb-bounce scale-105"
                  />
                </div>
              </div>

              {/* Loop layout of players around the cat */}
              {alivePlayers.map((p, i) => {
                const angle = angleStep * i - Math.PI / 2
                const r = alivePlayers.length <= 3 ? 95 : 115
                const x = Math.cos(angle) * r + 150 - 34
                const y = Math.sin(angle) * r + 150 - 34
                const hasBomb = p.id === room?.bomb_holder_id
                const showBombVisual = hasBomb && !shouldHideHolder
                const isMe = p.user_id === userId
                const canPass = iHaveBomb && !isMe && !isFrozen && !isPending

                const playerReactions = reactions.filter(r => r.playerId === p.id)

                return (
                  <div
                    key={p.id}
                    className="absolute flex flex-col items-center justify-center gap-1.5 z-10"
                    style={{ left: x, top: y, width: 68 }}
                  >
                    {/* Floating Reactions */}
                    {playerReactions.map(r => (
                      <span
                        key={r.id}
                        className="absolute pointer-events-none z-50"
                        style={{
                          bottom: '100%',
                          left: '50%',
                          marginLeft: `${r.xOffset}px`,
                          transform: 'translateX(-50%)'
                        }}
                      >
                        <span className="block text-2xl animate-float-up-fade">
                          {r.emoji}
                        </span>
                      </span>
                    ))}

                    <button
                      onClick={() => canPass && handlePass(p.id)}
                      disabled={!canPass}
                      className={`avatar-circle w-16 h-16 rounded-2xl border-3 flex items-center justify-center overflow-hidden transition-all relative select-none ${
                        showBombVisual
                          ? 'border-[#FF007F] animate-pulse shadow-[0_0_15px_#FF007F]'
                          : canPass
                          ? 'border-[#06B6D4] hover:scale-110 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                          : isMe
                          ? 'border-[#FF5F1F]'
                          : 'border-border/80'
                      } bg-[#0E0E18]`}
                      title={canPass ? `Pass bomb to ${p.nickname}` : p.nickname}
                    >
                      {p.avatar.endsWith('.png') ? (
                        <img src={`/${p.avatar}`} alt="Cat" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">{p.avatar}</span>
                      )}
                      {showBombVisual && (
                        <span className="absolute -top-2 -right-2 animate-bomb-bounce block w-6 h-6 z-20">
                          <img
                            src="/neon-cat.png"
                            alt="Neon Cat"
                            className="w-full h-full object-contain"
                          />
                        </span>
                      )}
                      {p.is_frozen && p.frozen_until && new Date(p.frozen_until) > new Date() && <span className="absolute -bottom-1 -right-1 text-xs">❄️</span>}
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
                      {p.points} pts
                    </span>
                  </div>
                )
              })}
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
          <div className="flex justify-between items-center w-full z-10 shrink-0 border-t border-white/5 pt-3">
            <button
              onClick={() => alert('Leaderboard is displayed on the left side.')}
              className="px-3.5 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-[10px] font-display font-bold uppercase tracking-wider transition-colors text-white"
            >
              View Leaderboard
            </button>
            <div className="flex items-center gap-1.5 bg-[#0E0E18] border border-white/5 rounded-xl px-3 py-1.5 text-xs font-mono font-bold">
              <span className="text-muted-foreground font-display font-bold text-[9px] uppercase tracking-wider mr-1">
                Ability Coins
              </span>
              <span className="text-[#FF5F1F] font-black">{myPlayer?.points ?? 0}</span>
              <Coins className="w-3.5 h-3.5 text-[#EAB308]" title="Ability Coins" />
            </div>
          </div>
        )}
      </div>

      {/* Target selector popup for Freezing ability */}
      {selectingFreeze && (
        <div className="glass-panel glow-purple rounded-2xl p-4 border shrink-0">
          <p className="font-display text-xs uppercase tracking-widest text-[#06B6D4] font-black mb-2 text-left">
            Choose Target to Freeze:
          </p>
          <div className="flex flex-wrap gap-2.5">
            {players
              .filter(p => p.is_alive && p.user_id !== userId)
              .map(p => (
                <button
                  key={p.id}
                  onClick={() => handleUseAbility('freeze', p.id)}
                  disabled={isPending}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 hover:bg-[#06B6D4]/10 hover:border-[#06B6D4] rounded-xl text-xs transition-all text-white"
                >
                  <span className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-background/50">
                    {p.avatar.endsWith('.png') ? (
                      <img src={`/${p.avatar}`} alt="Cat" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span>{p.avatar}</span>
                    )}
                  </span>
                  <span className="font-bold">{p.nickname}</span>
                </button>
              ))}
            <button
              onClick={() => setSelectingFreeze(false)}
              className="px-4 py-2 text-xs text-muted-foreground hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="text-xs text-[#FF007F] font-display bg-[#FF007F]/10 border border-[#FF007F]/20 px-3 py-2 rounded-xl shrink-0 text-left">
          {errorMsg}
        </p>
      )}

      {/* 2. Bottom row split: Abilities Panel & Chat Panel */}
      <div className="flex gap-4 shrink-0 h-48">
        {/* Left column: Abilities console (5 slots) */}
        <div className="glass-panel glow-purple rounded-2xl p-4 flex-1 flex flex-col justify-between">
          <span className="flex items-center gap-2 text-left border-b border-white/5 pb-1.5 mb-2.5">
            <span className="w-1 h-3.5 rounded-full bg-[#A855F7] shadow-[0_0_8px_#A855F7]" />
            <span className="font-display text-[11px] uppercase tracking-[0.2em] text-foreground font-black">
              Abilities
            </span>
          </span>
          <div className="flex gap-2.5 justify-between items-center flex-1 py-1">
            {abilitySlots.map((slot, index) => {
              const ownedCount = myPowers[slot.key] ?? 0
              const isPlaying = room?.status === 'playing'
              const canUse = isPlaying && ownedCount > 0 && !isPending
              const meta = abilityColors[slot.key]

              return (
                <button
                  key={slot.key}
                  disabled={!canUse}
                  onClick={() =>
                    slot.key === 'freeze' ? setSelectingFreeze(true) : handleUseAbility(slot.key)
                  }
                  className={`flex-1 flex flex-col items-center justify-center py-3 border rounded-xl h-full transition-all relative ${
                    canUse
                      ? 'bg-black/40 border-[1px] hover:scale-105 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.2)]'
                      : 'bg-black/15 border-white/5 opacity-60 cursor-not-allowed'
                  }`}
                  style={canUse ? { borderColor: meta.border, boxShadow: `0 0 12px ${meta.border.replace('0.4', '0.15')}` } : {}}
                  title={`${slot.name} (Owned: ${ownedCount})`}
                >
                  {/* Shortcut keycap */}
                  <span className="absolute top-1 left-1.5 px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[7px] font-mono font-bold leading-none text-muted-foreground">
                    {index + 1}
                  </span>

                  {/* Inner Box with Text */}
                  <div
                    className="w-12 h-12 rounded-lg border flex items-center justify-center font-display text-[9px] font-black tracking-wider transition-all select-none my-1 bg-[#0E0E18]/90"
                    style={{
                      borderColor: canUse ? meta.border : 'rgba(255, 255, 255, 0.08)',
                      color: canUse ? meta.text.replace('text-[', '').replace(']', '') : 'rgba(255, 255, 255, 0.35)',
                      boxShadow: canUse ? `inset 0 0 10px ${meta.border.replace('0.4', '0.2')}, 0 0 8px ${meta.border.replace('0.4', '0.1')}` : 'none'
                    }}
                  >
                    {abilityShortnames[slot.key]}
                  </div>

                  {/* Name and Count */}
                  <span className="text-[8px] font-bold truncate max-w-full font-display mt-0.5 text-muted-foreground">
                    {slot.name}
                  </span>

                  {ownedCount > 0 && (
                    <span className="absolute bottom-1.5 right-1.5 px-1 py-0.5 rounded bg-[#A855F7]/25 text-[7px] font-bold text-white font-mono leading-none border border-[#A855F7]/30">
                      x{ownedCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right column: Chat Console */}
        <div className="glass-panel glow-purple rounded-2xl flex flex-col" style={{ width: 280 }}>
          {/* Messages display */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0 select-text text-left">
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
          <form onSubmit={handleChat} className="flex gap-2 p-2 border-t border-white/5 shrink-0 relative">
            <button
              ref={pickerButtonRef}
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors px-1.5 cursor-pointer shrink-0 flex items-center justify-center"
              title="Add Reaction"
            >
              <Smile className="w-4 h-4" />
            </button>

            {showPicker && (
              <div
                ref={pickerRef}
                className="absolute bottom-full right-2 mb-2 p-3.5 rounded-2xl bg-[#0A0A10]/95 border border-[#A855F7]/30 shadow-[0_0_20px_rgba(168,85,247,0.35)] z-30 w-56 flex flex-col gap-2.5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150"
              >
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-display font-bold block mb-1.5 text-left">
                    Standard Reactions
                  </span>
                  <div className="grid grid-cols-6 gap-1">
                    {['😂', '😭', '😱', '❤️', '👏', '🔥'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => sendReaction(emoji)}
                        className="text-lg hover:scale-125 transition-transform p-1 hover:bg-white/5 rounded-lg cursor-pointer text-white"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-t border-white/5 pt-2.5">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-display font-bold block mb-1.5 text-left">
                    Game Reactions
                  </span>
                  <div className="grid grid-cols-7 gap-1">
                    {['💣', '🥔', '💥', '💀', '🚨', '🪞', '💸'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => sendReaction(emoji)}
                        className="text-lg hover:scale-125 transition-transform p-1 hover:bg-white/5 rounded-lg cursor-pointer text-white"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Type a message..."
              maxLength={80}
              className="flex-1 bg-transparent! border-none! shadow-none! rounded-none! py-1! px-0! text-xs focus:ring-0 placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isPending}
              className="text-[#A855F7] hover:text-[#c084fc] font-display text-xs uppercase tracking-widest font-black disabled:opacity-40 transition-colors shrink-0 px-2 text-white"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
