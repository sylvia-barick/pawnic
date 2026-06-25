import { GameProvider } from "@/components/rugato/game-context"
import { NavBar } from "@/components/rugato/nav-bar"
import { LeftPanel } from "@/components/rugato/left-panel"
import { CenterPanel } from "@/components/rugato/center-panel"
import { RightPanel } from "@/components/rugato/right-panel"

export default function Home() {
  return (
    <GameProvider>
      <div className="flex flex-col" style={{ height: "100vh", background: "oklch(0.07 0.02 275)", overflow: "hidden" }}>
        <NavBar />
        <main
          className="flex gap-2 px-2 pb-2"
          style={{ marginTop: "48px", height: "calc(100vh - 48px)", overflow: "hidden" }}
        >
          {/* Left Panel */}
          <div className="w-56 shrink-0 flex flex-col overflow-hidden pt-2">
            <LeftPanel />
          </div>

          {/* Center Panel */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden pt-2">
            <CenterPanel />
          </div>

          {/* Right Panel */}
          <div className="w-56 shrink-0 flex flex-col overflow-hidden pt-2">
            <RightPanel />
          </div>
        </main>
      </div>
    </GameProvider>
  )
}
