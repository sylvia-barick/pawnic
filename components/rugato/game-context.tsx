"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"

export type GamePhase = "lobby" | "playing" | "exploded" | "finished"

export interface Player {
  id: string
  name: string
  avatar: string
  points: number
  rank: number
  walletConnected: boolean
  ready: boolean
  holding: boolean
  eliminated: boolean
  mirrorActive: boolean
  smokeActive: boolean
}

export interface Power {
  id: string
  name: string
  icon: string
  description: string
  cost: number
  cooldown: number
  currentCooldown: number
}

export interface GameState {
  phase: GamePhase
  roomCode: string
  hostName: string
  players: Player[]
  maxPlayers: number
  buyIn: number
  prizePool: number
  currentHolderId: string | null
  round: number
  playersAlive: number
  walletConnected: boolean
  walletAddress: string
  balance: number
  myId: string
  powers: Power[]
  myPoints: number
  purchasedPowers: string[]
  activeEffects: string[]
  explosionVisible: boolean
  bombPosition: { x: number; y: number }
  passingBomb: boolean
  passFrom: string | null
  passTo: string | null
}

interface GameContextType {
  state: GameState
  connectWallet: () => void
  disconnectWallet: () => void
  createRoom: () => void
  joinRoom: () => void
  setReady: () => void
  startMatch: () => void
  passPotato: (toId: string) => void
  buyPower: (powerId: string) => void
  usePower: (powerId: string, targetId?: string) => void
  leaveRoom: () => void
}

const INITIAL_PLAYERS: Player[] = [
  { id: "p1", name: "Alice", avatar: "A", points: 420, rank: 1, walletConnected: true, ready: true, holding: true, eliminated: false, mirrorActive: false, smokeActive: false },
  { id: "p2", name: "Bob", avatar: "B", points: 310, rank: 2, walletConnected: true, ready: true, holding: false, eliminated: false, mirrorActive: false, smokeActive: false },
  { id: "p3", name: "Charlie", avatar: "C", points: 250, rank: 3, walletConnected: true, ready: true, holding: false, eliminated: false, mirrorActive: true, smokeActive: false },
  { id: "p4", name: "David", avatar: "D", points: 195, rank: 4, walletConnected: true, ready: true, holding: false, eliminated: false, mirrorActive: false, smokeActive: false },
  { id: "p5", name: "Emma", avatar: "E", points: 175, rank: 5, walletConnected: true, ready: false, holding: false, eliminated: false, mirrorActive: false, smokeActive: false },
  { id: "p6", name: "Frank", avatar: "F", points: 140, rank: 6, walletConnected: false, ready: false, holding: false, eliminated: false, mirrorActive: false, smokeActive: false },
  { id: "p7", name: "George", avatar: "G", points: 90, rank: 7, walletConnected: true, ready: true, holding: false, eliminated: false, mirrorActive: false, smokeActive: false },
  { id: "me", name: "You", avatar: "Y", points: 55, rank: 8, walletConnected: true, ready: true, holding: false, eliminated: false, mirrorActive: false, smokeActive: false },
]

const POWERS: Power[] = [
  { id: "mirror", name: "Mirror Shield", icon: "🪞", description: "Reflect next incoming POTATO back to sender.", cost: 50, cooldown: 15, currentCooldown: 0 },
  { id: "smoke", name: "Smoke Bomb", icon: "🌫️", description: "Blur another player's arena for 5 seconds.", cost: 25, cooldown: 10, currentCooldown: 8 },
  { id: "tax", name: "Potato Tax", icon: "🎯", description: "Force the POTATO onto any chosen player.", cost: 75, cooldown: 20, currentCooldown: 0 },
  { id: "fakeout", name: "Fake Out", icon: "💥", description: "Trigger a fake explosion. Scares opponents.", cost: 30, cooldown: 12, currentCooldown: 5 },
  { id: "emp", name: "EMP", icon: "⚡", description: "Disable all powers for 8 seconds.", cost: 120, cooldown: 30, currentCooldown: 0 },
  { id: "magnet", name: "Magnet", icon: "🧲", description: "Instantly pull POTATO to yourself.", cost: 150, cooldown: 25, currentCooldown: 12 },
]

const GameContext = createContext<GameContextType | null>(null)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>({
    phase: "lobby",
    roomCode: "ROOM-8245",
    hostName: "Alice",
    players: INITIAL_PLAYERS,
    maxPlayers: 10,
    buyIn: 0.5,
    prizePool: 4.0,
    currentHolderId: "p1",
    round: 1,
    playersAlive: 8,
    walletConnected: false,
    walletAddress: "",
    balance: 0,
    myId: "me",
    powers: POWERS,
    myPoints: 55,
    purchasedPowers: ["mirror"],
    activeEffects: [],
    explosionVisible: false,
    bombPosition: { x: 50, y: 50 },
    passingBomb: false,
    passFrom: null,
    passTo: null,
  })

  const pointsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const connectWallet = useCallback(() => {
    setState(s => ({
      ...s,
      walletConnected: true,
      walletAddress: "GAB4...X9PK",
      balance: 52.84,
    }))
  }, [])

  const disconnectWallet = useCallback(() => {
    setState(s => ({ ...s, walletConnected: false, walletAddress: "", balance: 0 }))
  }, [])

  const createRoom = useCallback(() => {
    setState(s => ({ ...s, phase: "lobby" }))
  }, [])

  const joinRoom = useCallback(() => {
    setState(s => ({ ...s, phase: "lobby" }))
  }, [])

  const setReady = useCallback(() => {
    setState(s => ({
      ...s,
      players: s.players.map(p => p.id === s.myId ? { ...p, ready: true } : p),
    }))
  }, [])

  const startMatch = useCallback(() => {
    setState(s => ({ ...s, phase: "playing" }))
  }, [])

  const passPotato = useCallback((toId: string) => {
    setState(s => {
      if (s.currentHolderId !== s.myId && s.currentHolderId !== "p1") return s
      const fromId = s.currentHolderId!
      return {
        ...s,
        passingBomb: true,
        passFrom: fromId,
        passTo: toId,
        players: s.players.map(p => ({
          ...p,
          holding: p.id === toId,
        })),
      }
    })
    setTimeout(() => {
      setState(s => ({
        ...s,
        currentHolderId: toId,
        passingBomb: false,
        passFrom: null,
        passTo: null,
      }))
    }, 800)
  }, [])

  const buyPower = useCallback((powerId: string) => {
    setState(s => {
      const power = s.powers.find(p => p.id === powerId)
      if (!power || s.myPoints < power.cost) return s
      return {
        ...s,
        myPoints: s.myPoints - power.cost,
        purchasedPowers: [...s.purchasedPowers.filter(id => id !== powerId), powerId],
      }
    })
  }, [])

  const usePower = useCallback((powerId: string, targetId?: string) => {
    setState(s => {
      const power = s.powers.find(p => p.id === powerId)
      if (!power || power.currentCooldown > 0) return s
      const newPowers = s.powers.map(p => p.id === powerId ? { ...p, currentCooldown: p.cooldown } : p)
      const newEffects = [...s.activeEffects, powerId]
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          activeEffects: prev.activeEffects.filter(e => e !== powerId),
        }))
      }, 5000)
      return { ...s, powers: newPowers, activeEffects: newEffects }
    })
  }, [])

  const leaveRoom = useCallback(() => {
    setState(s => ({ ...s, phase: "lobby" }))
  }, [])

  // Points increment for current holder
  useEffect(() => {
    if (state.phase !== "playing") return
    pointsIntervalRef.current = setInterval(() => {
      setState(s => {
        const updatedPlayers = s.players.map(p =>
          p.holding && !p.eliminated ? { ...p, points: p.points + 1 } : p
        )
        const myPoints = updatedPlayers.find(p => p.id === s.myId)?.points ?? s.myPoints
        return { ...s, players: updatedPlayers, myPoints }
      })
    }, 1000)
    return () => { if (pointsIntervalRef.current) clearInterval(pointsIntervalRef.current) }
  }, [state.phase])

  // Cooldown countdown
  useEffect(() => {
    cooldownIntervalRef.current = setInterval(() => {
      setState(s => ({
        ...s,
        powers: s.powers.map(p => p.currentCooldown > 0 ? { ...p, currentCooldown: p.currentCooldown - 1 } : p),
      }))
    }, 1000)
    return () => { if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current) }
  }, [])

  // Auto-pass demo: simulate bomb passing between players
  useEffect(() => {
    if (state.phase !== "playing") return
    const playerIds = state.players.filter(p => !p.eliminated).map(p => p.id)
    const passInterval = setInterval(() => {
      setState(s => {
        const alive = s.players.filter(p => !p.eliminated)
        if (alive.length < 2) return s
        const currentIdx = alive.findIndex(p => p.id === s.currentHolderId)
        const nextIdx = (currentIdx + 1) % alive.length
        const nextId = alive[nextIdx].id
        return {
          ...s,
          currentHolderId: nextId,
          players: s.players.map(p => ({ ...p, holding: p.id === nextId })),
        }
      })
    }, 4000)
    return () => clearInterval(passInterval)
  }, [state.phase])

  // Random explosion after some time
  useEffect(() => {
    if (state.phase !== "playing") return
    const timeout = setTimeout(() => {
      setState(s => {
        const holder = s.players.find(p => p.id === s.currentHolderId)
        if (!holder) return s
        return {
          ...s,
          explosionVisible: true,
          players: s.players.map(p =>
            p.id === s.currentHolderId ? { ...p, eliminated: true, holding: false } : p
          ),
          playersAlive: s.playersAlive - 1,
        }
      })
      setTimeout(() => {
        setState(s => ({ ...s, explosionVisible: false }))
      }, 2500)
    }, 20000 + Math.random() * 15000)
    return () => clearTimeout(timeout)
  }, [state.phase])

  return (
    <GameContext.Provider value={{
      state, connectWallet, disconnectWallet, createRoom, joinRoom,
      setReady, startMatch, passPotato, buyPower, usePower, leaveRoom,
    }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error("useGame must be used within GameProvider")
  return ctx
}
