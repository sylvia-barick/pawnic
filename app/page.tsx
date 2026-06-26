'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createRoom, joinRoom } from '@/app/actions/game'
import { AVATARS } from '@/lib/types'
import { PawLogo } from '@/components/pawnic/paw-logo'

const ADJECTIVES = ['Sneaky', 'Fluffy', 'Grumpy', 'Speedy', 'Tiny', 'Jumpy', 'Dizzy', 'Fuzzy', 'Wacky', 'Sly']
const NOUNS = ['Paw', 'Claw', 'Purr', 'Meow', 'Hiss', 'Nip', 'Flop', 'Zap', 'Bop', 'Yowl']

function randomNickname() {
  return ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)] +
    NOUNS[Math.floor(Math.random() * NOUNS.length)]
}

function getOrCreateUserId(): string {
  let id = localStorage.getItem('pawnic_user_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('pawnic_user_id', id)
  }
  return id
}

export default function LandingPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setNickname(randomNickname())
    getOrCreateUserId() // ensure UUID is seeded
  }, [])

  function handleCreate() {
    if (!nickname.trim()) { setError('Enter a nickname'); return }
    setError('')
    startTransition(async () => {
      const userId = getOrCreateUserId()
      const result = await createRoom(userId, nickname.trim(), avatar)
      if ('error' in result && result.error) { setError(result.error); return }
      if ('code' in result && result.code) router.push(`/room/${result.code}`)
    })
  }

  function handleJoin() {
    if (!nickname.trim()) { setError('Enter a nickname'); return }
    if (!joinCode.trim()) { setError('Enter a room code'); return }
    setError('')
    startTransition(async () => {
      const userId = getOrCreateUserId()
      const result = await joinRoom(userId, joinCode.trim(), nickname.trim(), avatar)
      if ('error' in result && result.error) { setError(result.error); return }
      if ('code' in result && result.code) router.push(`/room/${result.code}`)
    })
  }

  return (
    <main className="min-h-screen cyber-grid flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background font-sans select-none">
      {/* Dynamic ambient shadows (no blur glows) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none bg-[#FF5F1F]/2" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none bg-[#A855F7]/2" />

      {/* Logo Section */}
      <div className="flex flex-col items-center gap-2.5 mb-8 z-10">
        <div className="text-5xl animate-bomb-bounce">🐾</div>
        <div className="text-center">
          <h1 className="font-display text-5xl font-black tracking-widest text-[#F8FAFC]">
            PAW<span className="text-[#FF5F1F] text-brand-glow">nic</span>
          </h1>
          <p className="text-muted-foreground text-[10px] tracking-[0.3em] mt-1.5 uppercase font-display font-semibold">
            Hold. Pass. Survive.
          </p>
        </div>
      </div>

      {/* Roster & Form card */}
      <div className="glass-panel glow-orange rounded-2xl w-full max-w-md overflow-hidden z-10">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border/80">
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-4 text-xs font-display font-bold tracking-widest uppercase transition-all ${
                tab === t
                  ? 'text-[#FF5F1F] border-b-2 border-[#FF5F1F] bg-white/2'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar selector */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-display font-bold block mb-2 text-left">
              Select Avatar
            </label>
            <div className="flex flex-wrap gap-2.5">
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all border ${
                    avatar === a
                      ? 'border-[#FF5F1F] bg-[#FF5F1F]/10 scale-105 shadow-[0_0_10px_rgba(255,95,31,0.25)]'
                      : 'border-border/60 bg-white/2 hover:border-white/20'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Nickname input */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-display font-bold block mb-2 text-left">
              Nickname
            </label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') tab === 'create' ? handleCreate() : handleJoin() }}
              maxLength={20}
              placeholder="Enter your nickname..."
              className="w-full"
            />
          </div>

          {/* Join Code (for Join Tab only) */}
          {tab === 'join' && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-display font-bold block mb-2 text-left">
                Room Code
              </label>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
                maxLength={6}
                placeholder="ABC123"
                className="w-full text-center tracking-[0.25em] font-display font-bold text-lg"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 text-center py-2 px-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              {error}
            </p>
          )}

          {/* Execute Action trigger */}
          <button
            onClick={tab === 'create' ? handleCreate : handleJoin}
            disabled={isPending}
            className="w-full py-4 rounded-xl font-display font-black text-xs tracking-widest uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white"
            style={{
              background: '#FF5F1F',
              boxShadow: '0 0 20px rgba(255, 95, 31, 0.3)',
              border: '1px solid #FF5F1F',
            }}
          >
            {isPending
              ? (tab === 'create' ? 'Creating...' : 'Joining...')
              : (tab === 'create' ? 'Create Room' : 'Join Room')}
          </button>
        </div>
      </div>

      <p className="mt-8 text-[10px] text-muted-foreground text-center max-w-xs leading-relaxed uppercase tracking-wider font-display font-bold">
        2–8 players. Pass the potato bomb. Survive the explosion. Last cat standing wins.
      </p>
    </main>
  )
}
