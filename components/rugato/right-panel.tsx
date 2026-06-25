"use client"

import { useGame } from "./game-context"
import { ShoppingBag, Zap, Shield, Timer } from "lucide-react"
import { cn } from "@/lib/utils"

function PowerCard({
  power,
  owned,
  onBuy,
  onUse,
  myPoints,
}: {
  power: { id: string; name: string; icon: string; description: string; cost: number; cooldown: number; currentCooldown: number }
  owned: boolean
  onBuy: () => void
  onUse: () => void
  myPoints: number
}) {
  const canBuy = myPoints >= power.cost && !owned
  const canUse = owned && power.currentCooldown === 0
  const onCooldown = owned && power.currentCooldown > 0

  return (
    <div className={cn("rounded-lg p-2.5 flex flex-col gap-2 transition-all duration-200 relative overflow-hidden",
      owned && "ring-1 ring-[oklch(0.55_0.20_300_/_40%)]"
    )}
      style={{
        background: owned
          ? "oklch(0.13 0.05 290 / 85%)"
          : "oklch(0.11 0.03 275 / 80%)",
        border: owned
          ? "1px solid oklch(0.55 0.20 300 / 35%)"
          : "1px solid oklch(0.28 0.08 270 / 30%)",
      }}>

      {/* Owned glow */}
      {owned && (
        <div className="absolute top-0 right-0 w-12 h-12 pointer-events-none opacity-10 rounded-bl-full"
          style={{ background: "oklch(0.55 0.20 300)" }} />
      )}

      {/* Cooldown overlay */}
      {onCooldown && (
        <div className="absolute inset-0 rounded-lg flex items-center justify-center pointer-events-none"
          style={{ background: "oklch(0.06 0.02 270 / 70%)" }}>
          <div className="flex flex-col items-center gap-1">
            <Timer size={14} className="text-muted-foreground" />
            <span className="text-xs font-black" style={{ fontFamily: "var(--font-orbitron)", color: "oklch(0.70 0.14 75)" }}>
              {power.currentCooldown}s
            </span>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{
            background: owned
              ? "oklch(0.22 0.08 300 / 60%)"
              : "oklch(0.16 0.05 270 / 60%)",
            border: owned
              ? "1px solid oklch(0.55 0.20 300 / 40%)"
              : "1px solid oklch(0.28 0.08 270 / 30%)",
          }}>
          {power.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-black leading-tight text-foreground text-balance"
            style={{ fontFamily: "var(--font-orbitron)" }}>
            {power.name}
          </div>
          <div className="text-[9px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
            {power.description}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
          style={{
            background: "oklch(0.70 0.14 75 / 15%)",
            border: "1px solid oklch(0.70 0.14 75 / 25%)",
            color: "oklch(0.75 0.16 75)",
            fontFamily: "var(--font-orbitron)",
          }}>
          <Zap size={8} />
          {power.cost} pts
        </div>

        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px]"
          style={{ color: "oklch(0.50 0.06 240)" }}>
          <Timer size={8} />
          <span style={{ fontFamily: "var(--font-orbitron)", fontSize: "8px" }}>{power.cooldown}s cd</span>
        </div>

        <div className="ml-auto">
          {owned ? (
            <button
              onClick={onUse}
              disabled={!canUse}
              className={cn("px-2.5 py-1 rounded text-[9px] font-black tracking-wide transition-all duration-200",
                canUse ? "hover:scale-105" : "opacity-40 cursor-not-allowed"
              )}
              style={{
                background: canUse ? "oklch(0.55 0.20 300)" : "oklch(0.20 0.06 270 / 60%)",
                color: "oklch(0.98 0.01 0)",
                boxShadow: canUse ? "0 0 10px oklch(0.55 0.20 300 / 50%)" : "none",
                fontFamily: "var(--font-orbitron)",
              }}>
              USE
            </button>
          ) : (
            <button
              onClick={onBuy}
              disabled={!canBuy}
              className={cn("px-2.5 py-1 rounded text-[9px] font-black tracking-wide transition-all duration-200",
                canBuy ? "hover:scale-105" : "opacity-30 cursor-not-allowed"
              )}
              style={{
                background: canBuy ? "oklch(0.65 0.22 240)" : "oklch(0.18 0.05 240 / 60%)",
                color: canBuy ? "oklch(0.05 0.01 240)" : "oklch(0.50 0.06 240)",
                boxShadow: canBuy ? "0 0 10px oklch(0.65 0.22 240 / 40%)" : "none",
                fontFamily: "var(--font-orbitron)",
              }}>
              BUY
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function RightPanel() {
  const { state, buyPower, usePower } = useGame()
  const { powers, myPoints, purchasedPowers, activeEffects } = state

  return (
    <aside className="flex flex-col gap-2 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 px-1">
        <div className="flex items-center gap-2">
          <ShoppingBag size={13} style={{ color: "oklch(0.55 0.20 300)" }} />
          <span className="text-[10px] font-black tracking-widest text-foreground"
            style={{ fontFamily: "var(--font-orbitron)" }}>POWER SHOP</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded"
          style={{
            background: "oklch(0.70 0.14 75 / 15%)",
            border: "1px solid oklch(0.70 0.14 75 / 30%)",
          }}>
          <Zap size={10} style={{ color: "oklch(0.75 0.16 75)" }} />
          <span className="text-[11px] font-black" style={{ fontFamily: "var(--font-orbitron)", color: "oklch(0.80 0.16 75)" }}>
            {myPoints}
          </span>
          <span className="text-[8px] text-muted-foreground" style={{ fontFamily: "var(--font-orbitron)" }}>PTS</span>
        </div>
      </div>

      {/* Powers List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-0.5" style={{ scrollbarWidth: "thin" }}>
        {powers.map(power => (
          <PowerCard
            key={power.id}
            power={power}
            owned={purchasedPowers.includes(power.id)}
            onBuy={() => buyPower(power.id)}
            onUse={() => usePower(power.id)}
            myPoints={myPoints}
          />
        ))}
      </div>

      {/* Active Effects & Inventory */}
      <div className="shrink-0 rounded-lg p-2.5 flex flex-col gap-2"
        style={{
          background: "oklch(0.11 0.03 275 / 85%)",
          border: "1px solid oklch(0.28 0.08 270 / 30%)",
        }}>
        <div className="text-[8px] font-bold tracking-widest text-muted-foreground uppercase"
          style={{ fontFamily: "var(--font-orbitron)" }}>Inventory &amp; Effects</div>

        {/* Purchased Powers */}
        <div className="flex flex-wrap gap-1">
          {purchasedPowers.length > 0 ? purchasedPowers.map(pid => {
            const p = powers.find(pw => pw.id === pid)
            if (!p) return null
            const isActive = activeEffects.includes(pid)
            return (
              <div key={pid}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] transition-all"
                style={{
                  background: isActive ? "oklch(0.22 0.08 300 / 70%)" : "oklch(0.16 0.05 270 / 60%)",
                  border: isActive ? "1px solid oklch(0.55 0.20 300 / 60%)" : "1px solid oklch(0.28 0.08 270 / 30%)",
                  boxShadow: isActive ? "0 0 8px oklch(0.55 0.20 300 / 40%)" : "none",
                  color: isActive ? "oklch(0.80 0.14 300)" : "oklch(0.70 0.04 240)",
                  fontFamily: "var(--font-orbitron)",
                }}>
                {p.icon} {p.name}
                {isActive && <span className="animate-pulse ml-0.5">✦</span>}
              </div>
            )
          }) : (
            <span className="text-[9px] text-muted-foreground/50">No powers owned yet</span>
          )}
        </div>

        {/* Cooldown timers */}
        {powers.filter(p => purchasedPowers.includes(p.id) && p.currentCooldown > 0).length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="text-[8px] font-bold tracking-widest text-muted-foreground/60 uppercase"
              style={{ fontFamily: "var(--font-orbitron)" }}>Cooldowns</div>
            {powers.filter(p => purchasedPowers.includes(p.id) && p.currentCooldown > 0).map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground min-w-16 truncate">{p.icon} {p.name}</span>
                <div className="flex-1 rounded-full overflow-hidden h-1"
                  style={{ background: "oklch(0.18 0.05 270 / 60%)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${((p.cooldown - p.currentCooldown) / p.cooldown) * 100}%`,
                      background: "oklch(0.65 0.22 240)",
                    }} />
                </div>
                <span className="text-[8px] font-bold" style={{ fontFamily: "var(--font-orbitron)", color: "oklch(0.70 0.14 75)" }}>
                  {p.currentCooldown}s
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard mini */}
      <div className="shrink-0 rounded-lg p-2.5 flex flex-col gap-1.5"
        style={{
          background: "oklch(0.11 0.03 275 / 85%)",
          border: "1px solid oklch(0.28 0.08 270 / 30%)",
        }}>
        <div className="flex items-center gap-2">
          <Shield size={10} style={{ color: "oklch(0.65 0.22 240)" }} />
          <span className="text-[8px] font-bold tracking-widest text-muted-foreground uppercase"
            style={{ fontFamily: "var(--font-orbitron)" }}>Live Rankings</span>
        </div>
        {[...state.players].filter(p => !p.eliminated).sort((a, b) => b.points - a.points).slice(0, 5).map((player, i) => (
          <div key={player.id} className="flex items-center gap-1.5">
            <span className="text-[9px] min-w-4 text-center" style={{ color: "oklch(0.65 0.22 240)" }}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
            </span>
            <span className={cn("flex-1 text-[9px] truncate font-semibold",
              player.id === state.myId ? "text-[oklch(0.65_0.22_240)]" : "text-foreground"
            )} style={{ fontFamily: "var(--font-orbitron)" }}>
              {player.name}{player.id === state.myId ? " (You)" : ""}
            </span>
            <span className="text-[9px] font-bold tabular-nums" style={{ color: "oklch(0.75 0.16 75)" }}>
              {player.points}
            </span>
          </div>
        ))}
      </div>
    </aside>
  )
}
