'use client'

import { useState, useEffect, useTransition, useRef, useCallback } from 'react'
import { passBomb, sendChatMessage, usePower, buyPower, buyAndUsePower } from '@/app/actions/game'
import { POWER_CATALOG } from '@/lib/types'
import type { Room, Player, GameEvent, PowerType } from '@/lib/types'
import { ShieldAlert, Snowflake, Sparkles, EyeOff, Heart, Lock, Coins, Flame, Cloud, Smile, Copy, Check } from 'lucide-react'

interface Props {
  room: Room | null
  players: Player[]
  events: GameEvent[]
  myPlayer: Player | null
  userId: string
  reactions: { id: string; playerId: string; emoji: string; xOffset: number }[]
  sendReaction: (emoji: string) => void
  optimisticBombHolder: string | null | undefined
  setOptimisticBombHolder: (id: string | null | undefined) => void
}

const abilityColors: Record<PowerType, { bg: string; border: string; text: string }> = {
  reverse: { bg: 'rgba(168, 85, 247, 0.05)', border: 'rgba(168, 85, 247, 0.4)', text: 'text-[#A855F7]' },
  freeze: { bg: 'rgba(6, 182, 212, 0.05)', border: 'rgba(6, 182, 212, 0.4)', text: 'text-[#06B6D4]' },
  double_points: { bg: 'rgba(34, 197, 94, 0.05)', border: 'rgba(34, 197, 94, 0.4)', text: 'text-[#22C55E]' },
  smoke_screen: { bg: 'rgba(148, 163, 184, 0.05)', border: 'rgba(148, 163, 184, 0.4)', text: 'text-slate-400' },
  nine_lives: { bg: 'rgba(255, 0, 127, 0.05)', border: 'rgba(255, 0, 127, 0.4)', text: 'text-[#FF007F]' },
  shield: { bg: 'rgba(234, 179, 8, 0.05)', border: 'rgba(234, 179, 8, 0.4)', text: 'text-[#EAB308]' },
}

const abilityShortnames: Record<PowerType, string> = {
  reverse: 'MIRR',
  freeze: 'FRZ',
  double_points: '2X',
  smoke_screen: 'SMK',
  nine_lives: '9LIV',
  shield: 'SHLD',
}

export function ArenaPanel({ room, players, events, myPlayer, userId, reactions, sendReaction, optimisticBombHolder, setOptimisticBombHolder }: Props) {
  const [chatInput, setChatInput] = useState('')
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [showExplosion, setShowExplosion] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [passError, setPassError] = useState('')
  const [selectingFreeze, setSelectingFreeze] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const eventsEndRef = useRef<HTMLDivElement>(null)
  const lastExplodeEventRef = useRef<string | null>(null)
  // Tick every 250ms to keep time-based ability countdowns live
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 250)
    return () => clearInterval(id)
  }, [])

  const [copied, setCopied] = useState(false)
  const handleCopyCode = () => {
    if (!room?.code) return
    navigator.clipboard.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Ball passing animation states and audio effects
  const [isJumping, setIsJumping] = useState(false)
  const prevHolderIdRef = useRef<string | null | undefined>(null)

  // Audio references
  const tickAudioRef = useRef<HTMLAudioElement | null>(null)
  const prevStatusRef = useRef<'waiting' | 'playing' | 'finished' | null>(null)
  const prevPlayersCountRef = useRef<number>(0)

  // Play tick.mp3 continuously during gameplay
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!tickAudioRef.current) {
      tickAudioRef.current = new Audio('/tick.mp3')
      tickAudioRef.current.loop = true
    }

    const audio = tickAudioRef.current
    if (room?.status === 'playing') {
      audio.play().catch(err => {
        console.log('Tick audio blocked, queuing for interaction:', err)
        const unlockTick = () => {
          if (room?.status === 'playing') {
            audio.play().catch(e => console.log('Tick play failed after interaction:', e))
          }
          document.removeEventListener('click', unlockTick)
          document.removeEventListener('keydown', unlockTick)
        }
        document.addEventListener('click', unlockTick)
        document.addEventListener('keydown', unlockTick)
      })
    } else {
      audio.pause()
      audio.currentTime = 0
    }

    return () => {
      audio.pause()
    }
  }, [room?.status])

  // Helper function to play cat.mp3 with auto-unlock fallback
  const playCatSound = useCallback(() => {
    if (typeof window === 'undefined') return
    const audio = new Audio('/cat.mp3')
    audio.play().catch(err => {
      console.log('Cat audio blocked, queuing for interaction:', err)
      const unlockAndPlay = () => {
        const retryAudio = new Audio('/cat.mp3')
        retryAudio.play().catch(e => console.log('Cat audio play failed after interaction:', e))
        document.removeEventListener('click', unlockAndPlay)
        document.removeEventListener('keydown', unlockAndPlay)
      }
      document.addEventListener('click', unlockAndPlay)
      document.addEventListener('keydown', unlockAndPlay)
    })
  }, [])

  // Play cat.mp3 on initial room entry (creating or joining room)
  useEffect(() => {
    playCatSound()
  }, [playCatSound])

  // Play cat.mp3 on state changes (ball moves, players join, game start/end)
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Player joins
    if (players.length > prevPlayersCountRef.current && prevPlayersCountRef.current > 0) {
      playCatSound()
    }
    prevPlayersCountRef.current = players.length

    // 2. Game starts or ends
    if (room?.status && prevStatusRef.current && room.status !== prevStatusRef.current) {
      playCatSound()
    }
    prevStatusRef.current = room?.status ?? null

    // 3. Ball movement (potato holder changes)
    const currentHolderId = room?.bomb_holder_id
    if (currentHolderId && currentHolderId !== prevHolderIdRef.current && prevHolderIdRef.current !== undefined) {
      playCatSound()

      // Also trigger jumping pass animation
      if (prevHolderIdRef.current) {
        setIsJumping(true)
        const timer = setTimeout(() => {
          setIsJumping(false)
        }, 200)
        return () => clearTimeout(timer)
      }
    }
    prevHolderIdRef.current = currentHolderId
  }, [players.length, room?.status, room?.bomb_holder_id, playCatSound])

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
    // Optimistic UI: immediately move the ball before server confirms
    const previousHolder = room.bomb_holder_id
    setOptimisticBombHolder(targetId)
    startTransition(async () => {
      const res = await passBomb(userId, room.id, targetId)
      if (res.error) {
        // Revert optimistic update on error
        setOptimisticBombHolder(previousHolder)
        setPassError(res.error)
      }
      // On success, realtime will clear optimisticBombHolder automatically
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

  function handleBuy(type: PowerType, targetId?: string) {
    if (!room || !myPlayer) return
    setErrorMsg('')

    if (type === 'freeze' && !targetId) {
      setSelectingFreeze(true)
      return
    }

    setSelectingFreeze(false)
    startTransition(async () => {
      const res = await buyAndUsePower(userId, room.id, type, targetId)
      if (res.error) {
        setErrorMsg(res.error)
      }
    })
  }

  const alivePlayers = players.filter(p => p.is_alive)

  // Hides who is holding the POTATO from other players if Smoke Screen is active
  const isSmokeScreenActive = players.some(p => {
    const pPowers = (p.powers ?? {}) as Record<string, any>
    const until = pPowers.smoke_screen_until
    return until && new Date(until) > new Date()
  })

  // Effective bomb holder: use optimistic state immediately, fall back to server state
  const effectiveBombHolderId = optimisticBombHolder !== undefined
    ? optimisticBombHolder
    : room?.bomb_holder_id

  const bombHolder = players.find(p => p.id === effectiveBombHolderId)
  const isMeHolding = bombHolder?.user_id === userId
  const iHaveBomb = effectiveBombHolderId === myPlayer?.id
  const shouldHideHolder = isSmokeScreenActive && !iHaveBomb

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
  const radius = alivePlayers.length <= 3 ? 75 : 82

  // Compute ball coordinates
  let ballX = 120
  let ballY = 120
  let showBall = false

  if (room?.status === 'playing' && effectiveBombHolderId && !shouldHideHolder) {
    const holderIdx = alivePlayers.findIndex(p => p.id === effectiveBombHolderId)
    if (holderIdx !== -1) {
      const angle = angleStep * holderIdx - Math.PI / 2
      const r = radius
      const px = Math.cos(angle) * r + 120 - 28
      const py = Math.sin(angle) * r + 120 - 28
      ballX = px + 44
      ballY = py - 2
      showBall = true
    }
  }

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

        {/* Smoke Screen Overlay */}
        {isSmokeScreenActive && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden bg-black/25 backdrop-blur-[2px]">
            {/* Drifting smoke clouds */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-40 select-none">
              <div className="absolute inset-0 bg-radial from-slate-400/40 via-slate-500/10 to-transparent blur-3xl animate-pulse duration-1000" />
              <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-slate-300/30 rounded-full blur-3xl animate-smoke-drift-1" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-slate-400/25 rounded-full blur-3xl animate-smoke-drift-2" />
              <div className="absolute top-[20%] right-[-20%] w-[50%] h-[50%] bg-slate-200/20 rounded-full blur-3xl animate-smoke-drift-3" />
            </div>
            {/* Floating Cloud Icons */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white/30 flex gap-4 animate-bounce">
                <Cloud className="w-12 h-12 text-slate-300/40 blur-[1px] animate-pulse" />
                <Cloud className="w-16 h-16 text-slate-400/30 blur-[2px] animate-pulse delay-200" />
                <Cloud className="w-10 h-10 text-slate-300/40 blur-[1px] animate-pulse delay-500" />
              </div>
            </div>
            <style>{`
              @keyframes smokeDrift1 {
                0% { transform: translate(0, 0) scale(1); }
                50% { transform: translate(15%, 10%) scale(1.15); }
                100% { transform: translate(0, 0) scale(1); }
              }
              @keyframes smokeDrift2 {
                0% { transform: translate(0, 0) scale(1.1); }
                50% { transform: translate(-10%, -15%) scale(0.85); }
                100% { transform: translate(0, 0) scale(1.1); }
              }
              @keyframes smokeDrift3 {
                0% { transform: translate(0, 0) scale(0.9); }
                50% { transform: translate(-15%, 15%) scale(1.2); }
                100% { transform: translate(0, 0) scale(0.9); }
              }
              .animate-smoke-drift-1 {
                animation: smokeDrift1 8s ease-in-out infinite;
              }
              .animate-smoke-drift-2 {
                animation: smokeDrift2 10s ease-in-out infinite;
              }
              .animate-smoke-drift-3 {
                animation: smokeDrift3 7s ease-in-out infinite;
              }
            `}</style>
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
            <div className="flex flex-col items-center gap-2 mt-1">
              <span className="text-sm font-semibold text-muted-foreground">
                Share code to invite
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xl text-[#FF5F1F] font-display font-black tracking-wider bg-black/50 border-2 border-white/10 px-4 py-1.5 rounded-xl shadow-lg select-all">
                  {room?.code}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-[#FF5F1F]/10 hover:border-[#FF5F1F]/50 transition-all text-white flex items-center justify-center cursor-pointer active:scale-95 pointer-events-auto"
                  title="Copy Invite Code"
                >
                  {copied ? (
                    <Check className="w-4.5 h-4.5 text-green-400" />
                  ) : (
                    <Copy className="w-4.5 h-4.5 text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {room?.status === 'playing' && (
          <div className="flex-1 w-full relative flex items-center justify-center min-h-0 select-none overflow-hidden">
            {/* Circular active players loop wrapper */}
            <div className="relative" style={{ width: 240, height: 240 }}>

              {/* Central Holographic Arena floor details */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="arena-hologram-floor flex items-center justify-center" style={{ width: 220, height: 220 }}>
                  <div className="arena-hologram-ring-outer flex items-center justify-center" style={{ width: 190, height: 190 }}>
                    <div className="arena-hologram-ring-inner" style={{ width: 110, height: 110 }} />
                  </div>
                </div>
              </div>

              {/* Laser wires connecting players to center */}
              {alivePlayers.map((p, i) => {
                const angle = angleStep * i - Math.PI / 2
                const r = radius
                const hasBomb = p.id === effectiveBombHolderId
                const showBombVisual = hasBomb && !shouldHideHolder
                return (
                  <div
                    key={`laser-${p.id}`}
                    className={`arena-laser-line ${showBombVisual ? 'active' : ''}`}
                    style={{
                      width: r,
                      left: 120,
                      top: 120,
                      transform: `rotate(${angle}rad)`,
                      opacity: showBombVisual ? 0.65 : 0.2,
                    }}
                  />
                )
              })}

              {/* Central Glowing Cat Asset */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-24 h-24 rounded-full bg-cover bg-center border border-[#FF007F]/45 shadow-[0_0_30px_rgba(255,0,127,0.55)] animate-glow-pulse overflow-hidden flex items-center justify-center bg-black/60">
                  <img
                    src="/neon-cat.png"
                    alt="Cursed Cat"
                    className="w-18 h-18 object-contain animate-bomb-bounce scale-105"
                  />
                </div>
              </div>

              {/* Dynamic Passing Ball */}
              {showBall && (
                <div
                  className="absolute transition-all duration-200 ease-out z-30 pointer-events-none"
                  style={{
                    left: ballX,
                    top: ballY,
                    width: 32,
                    height: 32,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div
                    className={`w-full h-full rounded-full overflow-hidden border-2 border-[#FF007F] shadow-[0_0_15px_rgba(255,0,127,0.95)] bg-black ${isJumping ? 'animate-ball-jump' : 'animate-bomb-bounce'
                      }`}
                  >
                    <img
                      src="/ball.jpg"
                      alt="Passing Ball"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Loop layout of players around the cat */}
              {alivePlayers.map((p, i) => {
                const angle = angleStep * i - Math.PI / 2
                const r = radius
                const x = Math.cos(angle) * r + 120 - 28
                const y = Math.sin(angle) * r + 120 - 28
                const hasBomb = p.id === effectiveBombHolderId
                const showBombVisual = hasBomb && !shouldHideHolder
                const isMe = p.user_id === userId
                const canPass = iHaveBomb && !isMe && !isFrozen && !isPending

                const playerReactions = reactions.filter(r => r.playerId === p.id)

                // Calculate active ability timers for this player
                const now = Date.now()
                const frozenSec = p.is_frozen && p.frozen_until
                  ? Math.max(0, Math.ceil((new Date(p.frozen_until).getTime() - now) / 1000))
                  : 0
                const catnipSec = p.double_points_until
                  ? Math.max(0, Math.ceil((new Date(p.double_points_until).getTime() - now) / 1000))
                  : 0
                const pPowers = (p.powers ?? {}) as Record<string, any>
                const smokeSec = pPowers.smoke_screen_until
                  ? Math.max(0, Math.ceil((new Date(pPowers.smoke_screen_until).getTime() - now) / 1000))
                  : 0

                return (
                  <div
                    key={p.id}
                    className="absolute flex flex-col items-center justify-center gap-1 z-10"
                    style={{ left: x, top: y, width: 56 }}
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
                      className={`avatar-circle w-14 h-14 rounded-2xl border-3 flex items-center justify-center overflow-hidden transition-all relative select-none ${showBombVisual
                          ? 'border-4 border-[#FF007F] scale-105 shadow-[0_0_20px_#FF007F,inset_0_0_10px_rgba(255,0,127,0.6)] animate-pulse'
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
                        <span className="text-xl">{p.avatar}</span>
                      )}
                      
                      {/* Ticking Status Badges on Avatar Corners */}
                      {catnipSec > 0 && (
                        <span className="absolute -top-1 -left-1 text-[7.5px] bg-[#22C55E] text-white border border-black rounded px-1 select-none z-20 font-mono font-bold leading-none py-0.5">
                          🌿{catnipSec}s
                        </span>
                      )}
                      {frozenSec > 0 && (
                        <span className="absolute -bottom-1 -right-1 text-[7.5px] bg-[#06B6D4] text-black border border-black rounded px-1 select-none z-20 font-mono font-bold leading-none py-0.5 animate-pulse">
                          ❄️{frozenSec}s
                        </span>
                      )}
                      {smokeSec > 0 && (
                        <span className="absolute -top-1 -right-1 text-[7.5px] bg-slate-500 text-white border border-black rounded px-1 select-none z-20 font-mono font-bold leading-none py-0.5">
                          ☁️{smokeSec}s
                        </span>
                      )}
                      {p.shield_active && (
                        <span className="absolute -bottom-1 -left-1 text-[7.5px] bg-[#EAB308] text-black border border-black rounded px-1 select-none z-20 font-bold leading-none py-0.5">
                          🛡️
                        </span>
                      )}
                      {p.reverse_active && !showBombVisual && (
                        <span className="absolute -top-1 -right-1 text-[7.5px] bg-[#A855F7] text-white border border-black rounded px-1 select-none z-20 font-bold leading-none py-0.5" title="Mirror Active">
                          🔮
                        </span>
                      )}

                      {showBombVisual && (
                        <span className="absolute -top-1.5 -right-1 text-base z-30 select-none animate-bounce filter drop-shadow-[0_0_4px_#FF007F]">
                          💣
                        </span>
                      )}
                    </button>
                    <span
                      className={`text-center leading-none font-display text-[9px] font-bold max-w-full truncate ${isMe ? 'text-[#FF5F1F]' : 'text-foreground'
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
          <div className="flex justify-end items-center w-full z-10 shrink-0 border-t border-white/5 pt-3">
            <div className="flex items-center gap-1.5 bg-[#0E0E18] border border-white/5 rounded-xl px-3 py-1.5 text-xs font-mono font-bold">
              <span className="text-muted-foreground font-display font-bold text-[9px] uppercase tracking-wider mr-1">
                Ability Coins
              </span>
              <span className="text-[#FF5F1F] font-black">{myPlayer?.points ?? 0}</span>
              <span title="Ability Coins"><Coins className="w-3.5 h-3.5 text-[#EAB308]" /></span>
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
                  onClick={() => {
                    const ownedCount = myPowers['freeze'] ?? 0
                    if (ownedCount > 0) {
                      handleUseAbility('freeze', p.id)
                    } else {
                      handleBuy('freeze', p.id)
                    }
                  }}
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
      <div className="flex gap-4 shrink-0 h-52">
        {/* Left column: Abilities console (5 slots) */}
        <div className="glass-panel glow-purple rounded-2xl p-3 flex-1 flex flex-col justify-between">
          <span className="flex items-center gap-2 text-left border-b border-white/5 pb-1.5 mb-2.5">
            <span className="w-1.5 h-3.5 rounded-full bg-[#A855F7] shadow-[0_0_8px_#A855F7]" />
            <span className="font-display text-[11px] uppercase tracking-[0.2em] text-[#94A3B8] font-black">
              Abilities Console
            </span>
          </span>
          <div className="flex gap-3 justify-between items-center flex-1 py-0.5 px-0.5">
            {abilitySlots.map((slot, index) => {
              const ownedCount = myPowers[slot.key] ?? 0
              const isPlaying = room?.status === 'playing'
              const cost = POWER_CATALOG[slot.key].cost
              const canAfford = (myPlayer?.points ?? 0) >= cost
              const canBuy = isPlaying && canAfford && !isPending
              const canUse = isPlaying && ownedCount > 0 && !isPending
              const meta = abilityColors[slot.key]

              return (
                <button
                  key={slot.key}
                  disabled={!canUse && !canBuy}
                  onClick={() => {
                    if (canUse) {
                      slot.key === 'freeze' ? setSelectingFreeze(true) : handleUseAbility(slot.key)
                    } else if (canBuy) {
                      handleBuy(slot.key)
                    }
                  }}
                  title={`${slot.name}: ${POWER_CATALOG[slot.key].description}`}
                  className={`flex-1 flex flex-col items-center justify-between p-2 rounded-xl h-full relative overflow-hidden group transition-all duration-200 border ${
                    canUse || canBuy
                      ? 'hover:scale-[1.03] active:scale-95 cursor-pointer'
                      : 'cursor-default opacity-50'
                  }`}
                  style={{
                    background: canUse 
                      ? 'linear-gradient(135deg, rgba(30, 27, 75, 0.4), rgba(15, 12, 30, 0.6))'
                      : 'rgba(6, 6, 10, 0.35)',
                    borderColor: canUse 
                      ? meta.border.replace('0.4', '0.75') 
                      : canBuy 
                        ? 'rgba(255, 80, 160, 0.25)' 
                        : 'rgba(255, 255, 255, 0.05)',
                    boxShadow: canUse 
                      ? `0 0 14px ${meta.border.replace('0.4', '0.2')}, inset 0 0 10px rgba(168, 85, 247, 0.05)` 
                      : 'none'
                  }}
                >
                  {/* Background grid details */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:8px_8px] pointer-events-none opacity-20" />

                  {/* Shortcut keycap */}
                  <span className="absolute top-1.5 left-1.5 px-1 py-0.5 rounded bg-black/60 border border-slate-700/60 text-[7px] font-mono font-bold leading-none text-muted-foreground shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                    {index + 1}
                  </span>

                  {/* Floating Emoji */}
                  <span className="text-3xl mt-3.5 mb-1.5 block transition-transform duration-300 group-hover:scale-110 select-none">
                    {POWER_CATALOG[slot.key].emoji}
                  </span>

                  {/* Name */}
                  <span
                    className="text-[9px] font-black truncate max-w-full font-display tracking-wider leading-none select-none"
                    style={{ color: canUse ? '#fff' : 'rgba(255,255,255,0.45)' }}
                  >
                    {slot.name}
                  </span>

                  {/* Dynamic Status / Action Label Badge */}
                  <span className={`text-[7.5px] font-black uppercase tracking-wider font-display border px-1.5 py-0.5 rounded mt-2.5 z-10 select-none ${
                    canUse
                      ? 'bg-[#A855F7]/10 border-[#A855F7]/40 text-[#A855F7]'
                      : canBuy
                        ? 'bg-[#FF007F]/10 border-[#FF007F]/40 text-[#FF007F]'
                        : 'bg-white/5 border-transparent text-muted-foreground/35'
                  }`}>
                    {canUse ? `USE (x${ownedCount})` : `BUY: ${cost}`}
                  </span>
                </button>
              )
            })}
          </div>
        </div>


        {/* Right column: Chat Console */}
        <div className="glass-panel glow-purple rounded-2xl flex flex-col" style={{ width: 280 }}>
          <div className="flex items-center gap-2 text-left border-b border-white/5 pb-1.5 px-4 pt-3.5 shrink-0">
            <span className="w-1 h-3.5 rounded-full bg-[#A855F7] shadow-[0_0_8px_#A855F7]" />
            <span className="font-display text-[10px] uppercase tracking-[0.15em] text-foreground font-black">
              Chat & Reaction
            </span>
          </div>
          {/* Messages display */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 min-h-0 select-text text-left">
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
              placeholder="Write chat and reaction..."
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
