"use client"

import { useGame } from "./game-context"
import { useEffect, useRef, useState } from "react"
import { MessageCircle, ShoppingBag, Smile, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

// Floating XLM coins
function FloatingCoins() {
  const coins = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: 5 + (i * 13) % 90,
    top: 10 + (i * 17) % 80,
    delay: i * 0.4,
    size: 10 + (i % 3) * 4,
  }))
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {coins.map(coin => (
        <div key={coin.id}
          className="absolute animate-float-coin text-yellow-400/40 font-black select-none"
          style={{
            left: `${coin.left}%`,
            top: `${coin.top}%`,
            fontSize: `${coin.size}px`,
            animationDelay: `${coin.delay}s`,
            fontFamily: "var(--font-orbitron)",
          }}>
          ✦
        </div>
      ))}
    </div>
  )
}

// Particle sparks around bomb
function BombSparks({ active }: { active: boolean }) {
  const sparks = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i / 12) * 360,
    distance: 40 + Math.random() * 30,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 1.5,
  }))
  if (!active) return null
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {sparks.map(spark => (
        <div key={spark.id}
          className="absolute rounded-full"
          style={{
            width: spark.size,
            height: spark.size,
            background: `oklch(${0.6 + Math.random() * 0.3} 0.28 ${20 + Math.random() * 20})`,
            transform: `rotate(${spark.angle}deg) translateX(${spark.distance}px)`,
            animation: `spark 0.8s ease-out ${spark.delay}s infinite`,
            boxShadow: `0 0 4px oklch(0.62 0.26 22)`,
          }} />
      ))}
    </div>
  )
}

// Explosion overlay
function ExplosionOverlay({ visible, playerName }: { visible: boolean; playerName: string }) {
  if (!visible) return null
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 animate-screen-flash"
        style={{ background: "oklch(0.62 0.26 22)", borderRadius: "inherit" }} />
      <div className="text-center animate-explosion z-10 select-none">
        <div className="text-5xl mb-2 font-black"
          style={{
            fontFamily: "var(--font-orbitron)",
            color: "oklch(0.98 0.01 0)",
            textShadow: "0 0 30px oklch(0.62 0.26 22), 0 0 60px oklch(0.62 0.26 22 / 50%)",
          }}>
          💥 RUGGED 💥
        </div>
        <div className="text-xl text-red-300 font-bold"
          style={{ fontFamily: "var(--font-orbitron)", textShadow: "0 0 10px oklch(0.62 0.26 22 / 80%)" }}>
          {playerName} is eliminated
        </div>
      </div>
    </div>
  )
}

// Player node in the circle
function PlayerNode({ player, index, total, isHolder }: {
  player: { id: string; name: string; avatar: string; points: number; eliminated: boolean; mirrorActive: boolean }
  index: number
  total: number
  isHolder: boolean
}) {
  const angle = (index / total) * 360 - 90
  const rad = angle * (Math.PI / 180)
  const radius = 38
  const cx = 50 + radius * Math.cos(rad)
  const cy = 50 + radius * Math.sin(rad)

  return (
    <div className={cn("absolute flex flex-col items-center gap-0.5 transition-all duration-500", player.eliminated && "opacity-30")}
      style={{
        left: `${cx}%`,
        top: `${cy}%`,
        transform: "translate(-50%, -50%)",
      }}>
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold relative transition-all duration-300"
        style={{
          background: isHolder
            ? "oklch(0.45 0.22 22)"
            : player.mirrorActive
              ? "oklch(0.30 0.12 300)"
              : "oklch(0.22 0.07 270)",
          border: isHolder
            ? "2px solid oklch(0.70 0.26 22)"
            : "2px solid oklch(0.35 0.10 270 / 60%)",
          boxShadow: isHolder
            ? "0 0 16px oklch(0.62 0.26 22 / 80%), 0 0 30px oklch(0.62 0.26 22 / 40%)"
            : player.mirrorActive
              ? "0 0 10px oklch(0.55 0.20 300 / 60%)"
              : "none",
          animation: isHolder ? "pulse-red 1.0s ease-in-out infinite" : "none",
          fontFamily: "var(--font-orbitron)",
          color: "oklch(0.95 0.01 220)",
        }}>
        {player.avatar}
        {isHolder && (
          <div className="absolute -top-1 -right-1 text-base leading-none animate-bounce">💣</div>
        )}
        {player.mirrorActive && (
          <div className="absolute -bottom-0.5 -right-0.5 text-xs leading-none">🪞</div>
        )}
      </div>
      <div className="text-center">
        <div className="text-[9px] font-bold truncate max-w-12"
          style={{
            fontFamily: "var(--font-orbitron)",
            color: isHolder ? "oklch(0.80 0.22 22)" : "oklch(0.75 0.06 240)",
            textShadow: isHolder ? "0 0 6px oklch(0.62 0.26 22 / 60%)" : "none",
          }}>
          {player.name}
        </div>
        <div className="text-[8px] font-semibold" style={{ color: "oklch(0.70 0.14 75)" }}>
          {player.points}pts
        </div>
      </div>
    </div>
  )
}

// Animated bomb
function CyberBomb({ phase }: { phase: "lobby" | "playing" | "exploded" | "finished" }) {
  const isActive = phase === "playing"
  return (
    <div className={cn("relative flex items-center justify-center", isActive && "animate-bomb-bounce")}
      style={{ width: 90, height: 90 }}>
      {/* Outer glow rings */}
      {isActive && <>
        <div className="absolute rounded-full opacity-20 animate-ping"
          style={{ width: 90, height: 90, background: "oklch(0.62 0.26 22 / 40%)", animationDuration: "1.2s" }} />
        <div className="absolute rounded-full opacity-10 animate-ping"
          style={{ width: 110, height: 110, background: "oklch(0.62 0.26 22 / 30%)", animationDuration: "1.8s", animationDelay: "0.3s" }} />
      </>}

      {/* Bomb body */}
      <div
        className={cn("w-16 h-16 rounded-full flex items-center justify-center text-3xl relative z-10 select-none", isActive && "animate-bomb-pulse")}
        style={{
          background: isActive
            ? "radial-gradient(circle at 35% 35%, oklch(0.30 0.06 270), oklch(0.10 0.03 270))"
            : "oklch(0.15 0.04 270)",
          border: `3px solid ${isActive ? "oklch(0.62 0.26 22)" : "oklch(0.30 0.08 270)"}`,
          boxShadow: isActive
            ? "0 0 20px oklch(0.62 0.26 22 / 80%), 0 0 50px oklch(0.62 0.26 22 / 40%), inset 0 0 20px oklch(0.62 0.26 22 / 20%)"
            : "0 0 10px oklch(0.38 0.12 270 / 30%)",
        }}>
        🥔
        {/* Fuse */}
        {isActive && (
          <div className="absolute -top-3 right-4 w-0.5 h-4 rounded-full animate-pulse"
            style={{ background: "oklch(0.75 0.18 75)", boxShadow: "0 0 6px oklch(0.75 0.18 75)" }} />
        )}
      </div>

      <BombSparks active={isActive} />
    </div>
  )
}

export function CenterPanel() {
  const { state, passPotato } = useGame()
  const { players, phase, currentHolderId, round, playersAlive, prizePool, explosionVisible, myId } = state

  const alivePlayers = players.filter(p => !p.eliminated)
  const currentHolder = players.find(p => p.id === currentHolderId)
  const amHolder = currentHolderId === myId

  const [chatMsg, setChatMsg] = useState("")
  const [chatLog, setChatLog] = useState([
    { id: 1, name: "Alice", msg: "No way I'm passing this 😂" },
    { id: 2, name: "Bob", msg: "Alice is going down!" },
    { id: 3, name: "Charlie", msg: "Mirror shield ready 🪞" },
  ])

  const sendChat = () => {
    if (!chatMsg.trim()) return
    setChatLog(prev => [...prev.slice(-9), { id: Date.now(), name: "You", msg: chatMsg }])
    setChatMsg("")
  }

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      {/* Stats Bar */}
      <div className="flex items-center gap-2 shrink-0">
        {[
          { label: "Prize Pool", value: `${prizePool.toFixed(1)} XLM`, color: "oklch(0.80 0.18 75)" },
          { label: "Round", value: `#${round}`, color: "oklch(0.65 0.22 240)" },
          { label: "Alive", value: `${alivePlayers.length}/${players.length}`, color: "oklch(0.65 0.22 100)" },
          { label: "Holder", value: currentHolder?.name ?? "—", color: "oklch(0.72 0.22 22)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex-1 rounded py-1.5 px-2 text-center"
            style={{
              background: "oklch(0.11 0.03 275 / 85%)",
              border: "1px solid oklch(0.30 0.08 270 / 35%)",
            }}>
            <div className="text-[8px] font-bold tracking-widest text-muted-foreground uppercase mb-0.5"
              style={{ fontFamily: "var(--font-orbitron)" }}>{label}</div>
            <div className="text-[11px] font-black" style={{ fontFamily: "var(--font-orbitron)", color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Arena */}
      <div className="flex-1 relative rounded-xl overflow-hidden"
        style={{
          background: "oklch(0.08 0.03 270)",
          border: "1px solid oklch(0.35 0.12 270 / 35%)",
          boxShadow: "inset 0 0 40px oklch(0.55 0.20 300 / 10%)",
          minHeight: 0,
        }}>
        {/* Grid floor */}
        <div className="absolute inset-0 cyber-grid opacity-40" />

        {/* Scan line */}
        <div className="absolute left-0 right-0 h-px opacity-5 pointer-events-none"
          style={{
            background: "oklch(0.65 0.22 240)",
            animation: "scanline 4s linear infinite",
          }} />

        {/* Corner accents */}
        {[["top-0 left-0", "border-t border-l"], ["top-0 right-0", "border-t border-r"], ["bottom-0 left-0", "border-b border-l"], ["bottom-0 right-0", "border-b border-r"]].map(([pos, border], i) => (
          <div key={i} className={`absolute ${pos} w-5 h-5 ${border}`}
            style={{ borderColor: "oklch(0.65 0.22 240 / 40%)" }} />
        ))}

        <FloatingCoins />

        {/* Players in circle */}
        <div className="absolute inset-0">
          {alivePlayers.map((player, i) => (
            <PlayerNode
              key={player.id}
              player={player}
              index={i}
              total={alivePlayers.length}
              isHolder={player.id === currentHolderId}
            />
          ))}
        </div>

        {/* Center bomb */}
        <div className="absolute inset-0 flex items-center justify-center">
          <CyberBomb phase={phase} />
        </div>

        {/* Explosion overlay */}
        <ExplosionOverlay visible={explosionVisible} playerName={currentHolder?.name ?? "Player"} />

        {/* Lobby overlay */}
        {phase === "lobby" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ background: "oklch(0.06 0.02 270 / 70%)" }}>
            <div className="text-2xl font-black text-center text-balance"
              style={{ fontFamily: "var(--font-orbitron)", color: "oklch(0.65 0.22 240)", textShadow: "0 0 20px oklch(0.65 0.22 240 / 50%)" }}>
              WAITING FOR PLAYERS
            </div>
            <div className="text-sm text-muted-foreground text-center"
              style={{ fontFamily: "var(--font-orbitron)" }}>
              {players.filter(p => p.ready).length}/{players.length} players ready
            </div>
            <div className="flex gap-1">
              {players.map((p, i) => (
                <div key={i} className={cn("w-2 h-2 rounded-full transition-all", p.ready ? "bg-green-400 scale-125" : "bg-muted-foreground/30")}
                  style={{ boxShadow: p.ready ? "0 0 6px #4ade80" : "none" }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => {
            const nextPlayer = alivePlayers.find(p => p.id !== currentHolderId)
            if (nextPlayer) passPotato(nextPlayer.id)
          }}
          disabled={!amHolder || phase !== "playing"}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-black tracking-wide transition-all duration-200",
            amHolder && phase === "playing"
              ? "hover:scale-105 cursor-pointer"
              : "opacity-30 cursor-not-allowed"
          )}
          style={{
            background: amHolder ? "oklch(0.55 0.22 22)" : "oklch(0.15 0.04 22 / 60%)",
            border: `1px solid oklch(0.62 0.26 22 / ${amHolder ? "80%" : "20%"})`,
            color: "oklch(0.98 0.01 0)",
            boxShadow: amHolder ? "0 0 20px oklch(0.62 0.26 22 / 50%)" : "none",
            fontFamily: "var(--font-orbitron)",
            fontSize: "10px",
            letterSpacing: "0.15em",
          }}>
          <ArrowRight size={13} />
          PASS POTATO
        </button>
        <button className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[10px] font-bold tracking-wide transition-all duration-200 hover:scale-105"
          style={{
            background: "oklch(0.22 0.08 270 / 80%)",
            border: "1px solid oklch(0.55 0.20 300 / 40%)",
            color: "oklch(0.75 0.14 300)",
            fontFamily: "var(--font-orbitron)",
          }}>
          <ShoppingBag size={12} />BUY POWER
        </button>
        <button className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[10px] font-bold tracking-wide transition-all duration-200 hover:scale-105"
          style={{
            background: "oklch(0.22 0.06 240 / 80%)",
            border: "1px solid oklch(0.65 0.22 240 / 40%)",
            color: "oklch(0.65 0.22 240)",
            fontFamily: "var(--font-orbitron)",
          }}>
          <Smile size={12} />EMOTE
        </button>
      </div>

      {/* Chat */}
      <div className="rounded-lg p-2 flex flex-col gap-1.5 shrink-0"
        style={{
          background: "oklch(0.10 0.03 275 / 85%)",
          border: "1px solid oklch(0.28 0.08 270 / 30%)",
          height: 96,
        }}>
        <div className="flex-1 overflow-y-auto flex flex-col gap-0.5" style={{ scrollbarWidth: "thin" }}>
          {chatLog.map(msg => (
            <div key={msg.id} className="text-[10px] flex gap-1.5">
              <span className="font-bold shrink-0" style={{ color: "oklch(0.65 0.22 240)" }}>{msg.name}:</span>
              <span className="text-muted-foreground truncate">{msg.msg}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            value={chatMsg}
            onChange={e => setChatMsg(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendChat()}
            placeholder="Type a message..."
            className="flex-1 rounded px-2 py-1 text-[10px] outline-none placeholder:text-muted-foreground/50"
            style={{
              background: "oklch(0.13 0.04 270 / 60%)",
              border: "1px solid oklch(0.30 0.08 270 / 40%)",
              color: "oklch(0.90 0.02 220)",
            }}
          />
          <button onClick={sendChat}
            className="px-2 py-1 rounded text-[10px] font-bold transition-all duration-200 hover:scale-105"
            style={{
              background: "oklch(0.65 0.22 240 / 20%)",
              border: "1px solid oklch(0.65 0.22 240 / 40%)",
              color: "oklch(0.65 0.22 240)",
            }}>
            <MessageCircle size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
