'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signInAnon, createRoom, joinRoom } from '@/app/actions/game'
import { AVATARS } from '@/lib/types'
import { PawLogo } from '@/components/pawnic/paw-logo'

const ADJECTIVES = ['Sneaky', 'Fluffy', 'Grumpy', 'Speedy', 'Tiny', 'Jumpy', 'Dizzy', 'Fuzzy', 'Wacky', 'Sly']
const NOUNS      = ['Paw', 'Claw', 'Purr', 'Meow', 'Hiss', 'Nip', 'Flop', 'Zap', 'Bop', 'Yowl']
function randomNickname() {
  return ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)] +
    NOUNS[Math.floor(Math.random() * NOUNS.length)]
}

export default function LandingPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    setNickname(randomNickname())
    signInAnon().then(({ error }) => {
      if (error) setError('Auth failed: ' + error)
      else setAuthed(true)
    })
  }, [])

  function handleCreate() {
    if (!nickname.trim()) { setError('Enter a nickname'); return }
    setError('')
    startTransition(async () => {
      const result = await createRoom(nickname.trim(), avatar)
      if ('error' in result && result.error) { setError(result.error); return }
      if ('code' in result && result.code) router.push(`/room/${result.code}`)
    })
  }

  function handleJoin() {
    if (!nickname.trim()) { setError('Enter a nickname'); return }
    if (!joinCode.trim()) { setError('Enter a room code'); return }
    setError('')
    startTransition(async () => {
      const result = await joinRoom(joinCode.trim(), nickname.trim(), avatar)
      if ('error' in result && result.error) { setError(result.error); return }
      if ('code' in result && result.code) router.push(`/room/${result.code}`)
    })
  }

  return (
    <main className="min-h-screen cyber-grid flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, oklch(0.70 0.22 45 / 8%) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, oklch(0.62 0.26 22 / 6%) 0%, transparent 70%)' }} />

      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <PawLogo size={72} />
        <div className="text-center">
          <h1 className="font-display text-5xl font-black tracking-widest text-brand-glow">PAWnic</h1>
          <p className="text-muted-foreground text-sm tracking-widest mt-1 uppercase font-display">
            Hold. Pass. Survive.
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="glass-panel rounded-2xl w-full max-w-md glow-brand overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3.5 text-xs font-display font-bold tracking-widest uppercase transition-all ${
                tab === t
                  ? 'text-brand-glow border-b-2 border-b-[oklch(0.70_0.22_45)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">
          {/* Avatar */}
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-display block mb-2">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all border ${
                    avatar === a
                      ? 'border-[oklch(0.70_0.22_45/80%)] bg-[oklch(0.70_0.22_45/15%)] scale-110'
                      : 'border-border bg-[oklch(0.10_0.03_270)] hover:border-[oklch(0.70_0.22_45/40%)]'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Nickname */}
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-display block mb-2">Nickname</label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={20}
              placeholder="Your name..."
              className="w-full bg-[oklch(0.10_0.03_270)] border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.70_0.22_45/70%)] transition-colors"
            />
          </div>

          {tab === 'join' && (
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-display block mb-2">Room Code</label>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="ABC123"
                className="w-full bg-[oklch(0.10_0.03_270)] border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.70_0.22_45/70%)] transition-colors font-display text-xl tracking-[0.3em] text-center uppercase"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <button
            onClick={tab === 'create' ? handleCreate : handleJoin}
            disabled={isPending || !authed}
            className="w-full py-4 rounded-xl font-display font-black text-sm tracking-widest uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed text-black"
            style={{ background: 'oklch(0.70 0.22 45)', boxShadow: '0 0 24px oklch(0.70 0.22 45 / 60%)' }}
          >
            {isPending ? 'Loading...' : !authed ? 'Connecting...' : tab === 'create' ? 'Create Room' : 'Join Room'}
          </button>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
        2–8 players. Pass the potato bomb. Survive the explosion. Last cat standing wins.
      </p>
    </main>
  )
}
