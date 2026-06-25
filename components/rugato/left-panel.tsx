"use client"

import { useGame } from "./game-context"
import { Copy, LogOut, Play, PlusCircle, LogIn, CheckCircle, Circle, Skull } from "lucide-react"
import { cn } from "@/lib/utils"

const RANK_ICONS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" }

export function LeftPanel() {
  const { state, createRoom, joinRoom, setReady, startMatch, leaveRoom } = useGame()
  const { players, roomCode, hostName, maxPlayers, buyIn, prizePool, phase, myId } = state

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {})
  }

  return (
    <aside className="flex flex-col gap-2 h-full overflow-hidden">
      {/* Room Info */}
      <div className="rounded-lg p-3 flex flex-col gap-2 shrink-0"
        style={{
          background: "oklch(0.11 0.03 275 / 85%)",
          border: "1px solid oklch(0.38 0.12 270 / 35%)",
          backdropFilter: "blur(12px)",
        }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
            style={{ fontFamily: "var(--font-orbitron)" }}>Current Room</span>
          <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wide",
            phase === "playing" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
          )} style={{ fontFamily: "var(--font-orbitron)" }}>
            {phase === "playing" ? "LIVE" : "LOBBY"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-base font-black tracking-wider"
            style={{ fontFamily: "var(--font-orbitron)", color: "oklch(0.65 0.22 240)", textShadow: "0 0 10px oklch(0.65 0.22 240 / 50%)" }}>
            {roomCode}
          </span>
          <button onClick={copyRoomCode}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: "oklch(0.16 0.04 270 / 50%)" }}>
            <Copy size={11} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "Host", value: hostName },
            { label: "Players", value: `${players.length}/${maxPlayers}` },
            { label: "Buy-In", value: `${buyIn} XLM` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded p-1.5 text-center"
              style={{ background: "oklch(0.14 0.04 270 / 60%)", border: "1px solid oklch(0.30 0.08 270 / 30%)" }}>
              <div className="text-[8px] text-muted-foreground tracking-wide uppercase mb-0.5"
                style={{ fontFamily: "var(--font-orbitron)" }}>{label}</div>
              <div className="text-[11px] font-bold text-foreground" style={{ fontFamily: "var(--font-orbitron)" }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="rounded p-2 flex items-center justify-between"
          style={{ background: "oklch(0.13 0.06 22 / 30%)", border: "1px solid oklch(0.62 0.26 22 / 25%)" }}>
          <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
            style={{ fontFamily: "var(--font-orbitron)" }}>Prize Pool</span>
          <span className="text-sm font-black" style={{ fontFamily: "var(--font-orbitron)", color: "oklch(0.75 0.18 75)", textShadow: "0 0 12px oklch(0.75 0.18 75 / 60%)" }}>
            {prizePool.toFixed(1)} XLM
          </span>
        </div>
      </div>

      {/* Players List */}
      <div className="flex-1 overflow-y-auto rounded-lg flex flex-col gap-1.5 pr-0.5"
        style={{ scrollbarWidth: "thin" }}>
        {players.map((player, idx) => (
          <div key={player.id}
            className={cn(
              "rounded-lg p-2 flex items-center gap-2 transition-all duration-300 relative overflow-hidden",
              player.eliminated && "opacity-40"
            )}
            style={{
              background: player.holding
                ? "oklch(0.14 0.08 22 / 70%)"
                : "oklch(0.11 0.03 275 / 80%)",
              border: player.holding
                ? "1px solid oklch(0.62 0.26 22 / 70%)"
                : "1px solid oklch(0.30 0.08 270 / 30%)",
              boxShadow: player.holding
                ? "0 0 14px oklch(0.62 0.26 22 / 35%), inset 0 0 20px oklch(0.62 0.26 22 / 10%)"
                : "none",
              animation: player.holding ? "pulse-red 1.2s ease-in-out infinite" : "none",
            }}>

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: player.holding
                    ? "oklch(0.45 0.22 22)"
                    : idx < 3
                      ? ["oklch(0.55 0.20 75)", "oklch(0.50 0.08 230)", "oklch(0.50 0.10 190)"][idx]
                      : "oklch(0.28 0.08 270)",
                  fontFamily: "var(--font-orbitron)",
                  color: "oklch(0.95 0.01 220)",
                }}>
                {player.avatar}
              </div>
              {player.eliminated && (
                <div className="absolute inset-0 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0.10 0.02 0 / 80%)" }}>
                  <Skull size={12} className="text-red-400" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[9px]">{RANK_ICONS[idx + 1] ?? ""}</span>
                <span className="text-[11px] font-bold truncate text-foreground"
                  style={{ fontFamily: "var(--font-orbitron)" }}>{player.name}</span>
                {player.id === myId && (
                  <span className="text-[8px] px-1 py-0.5 rounded text-[oklch(0.65_0.22_240)] font-bold"
                    style={{ background: "oklch(0.65 0.22 240 / 15%)", fontFamily: "var(--font-orbitron)" }}>YOU</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-bold" style={{ color: "oklch(0.80 0.14 75)" }}>
                  {player.points} pts
                </span>
                {player.mirrorActive && (
                  <span className="text-[8px] px-1 rounded" style={{ background: "oklch(0.55 0.20 300 / 20%)", color: "oklch(0.75 0.16 300)" }}>
                    🪞 Mirror
                  </span>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <div className="flex items-center gap-1">
                {player.walletConnected
                  ? <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ boxShadow: "0 0 4px #4ade80" }} />
                  : <div className="w-1.5 h-1.5 rounded-full bg-red-400 opacity-50" />
                }
                {player.ready
                  ? <CheckCircle size={10} className="text-green-400" />
                  : <Circle size={10} className="text-muted-foreground/50" />
                }
              </div>
              {player.holding && (
                <span className="text-[8px] font-black tracking-wide animate-pulse"
                  style={{ color: "oklch(0.75 0.22 22)", fontFamily: "var(--font-orbitron)" }}>
                  💣 BOMB
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-1.5 shrink-0">
        <button onClick={createRoom}
          className="flex items-center justify-center gap-1 py-2 rounded text-[9px] font-bold tracking-wide transition-all duration-200 hover:scale-105"
          style={{
            background: "oklch(0.25 0.08 240 / 60%)",
            border: "1px solid oklch(0.65 0.22 240 / 40%)",
            color: "oklch(0.65 0.22 240)",
            fontFamily: "var(--font-orbitron)",
          }}>
          <PlusCircle size={11} />Create Room
        </button>
        <button onClick={joinRoom}
          className="flex items-center justify-center gap-1 py-2 rounded text-[9px] font-bold tracking-wide transition-all duration-200 hover:scale-105"
          style={{
            background: "oklch(0.25 0.08 240 / 60%)",
            border: "1px solid oklch(0.65 0.22 240 / 40%)",
            color: "oklch(0.65 0.22 240)",
            fontFamily: "var(--font-orbitron)",
          }}>
          <LogIn size={11} />Join Room
        </button>
        {phase !== "playing" && (
          <button onClick={startMatch}
            className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded text-[10px] font-bold tracking-wide transition-all duration-200 hover:scale-105"
            style={{
              background: "oklch(0.55 0.22 22)",
              color: "oklch(0.98 0.01 0)",
              boxShadow: "0 0 16px oklch(0.62 0.26 22 / 50%)",
              fontFamily: "var(--font-orbitron)",
              letterSpacing: "0.12em",
            }}>
            <Play size={12} />START MATCH
          </button>
        )}
        <button onClick={leaveRoom}
          className={cn("flex items-center justify-center gap-1 py-1.5 rounded text-[9px] font-bold transition-all duration-200 hover:opacity-80",
            phase !== "playing" ? "col-span-2" : "col-span-2"
          )}
          style={{
            background: "oklch(0.14 0.04 22 / 50%)",
            border: "1px solid oklch(0.40 0.15 22 / 30%)",
            color: "oklch(0.60 0.16 22)",
            fontFamily: "var(--font-orbitron)",
          }}>
          <LogOut size={11} />Leave Room
        </button>
      </div>
    </aside>
  )
}
