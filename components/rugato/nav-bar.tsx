"use client"

import { useGame } from "./game-context"
import { Wallet, Settings, User, ChevronDown, Zap, Home, PlusCircle, LogIn, Trophy, History, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const navLinks = [
  { icon: Home, label: "Home" },
  { icon: PlusCircle, label: "Create Room" },
  { icon: LogIn, label: "Join Room" },
  { icon: Trophy, label: "Leaderboard" },
  { icon: History, label: "History" },
  { icon: HelpCircle, label: "How to Play" },
]

export function NavBar() {
  const { state, connectWallet, disconnectWallet } = useGame()
  const { walletConnected, walletAddress, balance } = state

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center px-3 gap-3"
      style={{
        background: "oklch(0.08 0.03 275 / 95%)",
        borderBottom: "1px solid oklch(0.38 0.12 270 / 30%)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 2px 20px oklch(0.55 0.20 300 / 15%)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2 shrink-0">
        <div className="relative">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-black"
            style={{
              background: "oklch(0.55 0.22 22)",
              boxShadow: "0 0 12px oklch(0.62 0.26 22 / 70%)",
              fontFamily: "var(--font-orbitron)",
            }}>
            R
          </div>
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-black tracking-widest text-foreground leading-none"
            style={{ fontFamily: "var(--font-orbitron)", letterSpacing: "0.15em" }}>
            RUGATO
          </div>
          <div className="text-[9px] text-muted-foreground leading-none tracking-widest opacity-70 mt-0.5">
            HOLD · PASS · SURVIVE
          </div>
        </div>
      </div>

      {/* Ticker bar */}
      <div className="flex-1 overflow-hidden mx-2 hidden md:block">
        <div className="flex items-center gap-1 overflow-hidden">
          <Zap size={10} className="text-yellow-400 shrink-0 opacity-80" />
          <div className="overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }}>
            <div className="flex gap-8 text-[10px] whitespace-nowrap animate-ticker" style={{ width: "200%" }}>
              {["ROOM-4421 · 12 XLM Pool", "Alice just RUGGED · -0.5 XLM", "ROOM-9933 · 8 Players", "Bob won 6.5 XLM", "New room: ROOM-1187", "Charlie holding 🥔 for 38s",
                "ROOM-4421 · 12 XLM Pool", "Alice just RUGGED · -0.5 XLM", "ROOM-9933 · 8 Players", "Bob won 6.5 XLM", "New room: ROOM-1187", "Charlie holding 🥔 for 38s"].map((item, i) => (
                <span key={i} className="text-muted-foreground/70">
                  <span className="text-[oklch(0.65_0.22_240)] mr-1">◆</span>{item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Center Nav */}
      <div className="hidden lg:flex items-center gap-0.5">
        {navLinks.map(({ icon: Icon, label }) => (
          <button key={label}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold tracking-wide transition-all duration-200 text-muted-foreground hover:text-foreground"
            style={{ fontFamily: "var(--font-orbitron)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "oklch(0.20 0.06 270 / 60%)"
              ;(e.currentTarget as HTMLElement).style.color = "oklch(0.95 0.01 220)"
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent"
              ;(e.currentTarget as HTMLElement).style.color = ""
            }}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        {walletConnected ? (
          <div className="flex items-center gap-2">
            {/* Balance */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs"
              style={{
                background: "oklch(0.13 0.04 240 / 80%)",
                border: "1px solid oklch(0.65 0.22 240 / 30%)",
              }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[oklch(0.65_0.22_240)] animate-pulse" />
              <span className="text-[oklch(0.65_0.22_240)] font-bold" style={{ fontFamily: "var(--font-orbitron)", fontSize: "10px" }}>
                {balance.toFixed(2)} XLM
              </span>
            </div>

            {/* Wallet address */}
            <button
              onClick={disconnectWallet}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] transition-all duration-200"
              style={{
                background: "oklch(0.13 0.04 270 / 80%)",
                border: "1px solid oklch(0.38 0.12 270 / 40%)",
                fontFamily: "var(--font-geist-mono)",
                color: "oklch(0.80 0.08 270)",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ boxShadow: "0 0 6px #4ade80" }} />
              {walletAddress}
              <ChevronDown size={10} />
            </button>

            {/* Avatar */}
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer"
              style={{
                background: "oklch(0.35 0.14 300)",
                border: "2px solid oklch(0.55 0.20 300 / 60%)",
                boxShadow: "0 0 10px oklch(0.55 0.20 300 / 40%)",
                fontFamily: "var(--font-orbitron)",
              }}>
              Y
            </div>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-wide transition-all duration-200 hover:scale-105"
            style={{
              background: "oklch(0.65 0.22 240)",
              color: "oklch(0.05 0.01 240)",
              boxShadow: "0 0 12px oklch(0.65 0.22 240 / 50%)",
              fontFamily: "var(--font-orbitron)",
              letterSpacing: "0.08em",
            }}
          >
            <Wallet size={12} />
            Connect Freighter
          </button>
        )}

        <button className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
          style={{ background: "oklch(0.14 0.03 270 / 60%)", border: "1px solid oklch(0.30 0.08 270 / 30%)" }}>
          <Settings size={13} />
        </button>
      </div>
    </nav>
  )
}
