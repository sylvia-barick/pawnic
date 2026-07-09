'use client'

// Pin server actions to Mumbai (bom1) — matches Supabase ap-south-1
export const preferredRegion = 'bom1'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createRoom, joinRoom, getRoomBuyIn } from '@/app/actions/game'
import { AVATARS } from '@/lib/types'
import { PawLogo } from '@/components/pawnic/paw-logo'
import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk"
import { defaultModules } from '@creit-tech/stellar-wallets-kit/modules/utils'
import { SwkAppDarkTheme } from "@creit-tech/stellar-wallets-kit/types"
import { Horizon, TransactionBuilder, Networks, Asset, Operation } from '@stellar/stellar-sdk'

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

  // Stellar state
  const [walletAddress, setWalletAddress] = useState('')
  const [walletBalance, setWalletBalance] = useState('0.00')
  const [buyInAmount, setBuyInAmount] = useState('1.0') // Default 1.0 XLM

  useEffect(() => {
    setNickname(randomNickname())
    getOrCreateUserId() // ensure UUID is seeded

    if (typeof window !== 'undefined') {
      StellarWalletsKit.init({
        theme: SwkAppDarkTheme,
        modules: defaultModules(),
      })

      // Attempt auto-connect
      StellarWalletsKit.getAddress()
        .then(({ address }) => {
          if (address) {
            setWalletAddress(address)
            const server = new Horizon.Server('https://horizon-testnet.stellar.org')
            server.loadAccount(address).then(account => {
              const native = account.balances.find(b => b.asset_type === 'native')
              setWalletBalance(native ? Number(native.balance).toFixed(2) : '0.00')
            }).catch(console.error)
          }
        })
        .catch(() => {
          // Swallow error if wallet not connected yet
        })
    }
  }, [])

  async function connectWallet() {
    setError('')
    try {
      const { address } = await StellarWalletsKit.authModal()
      if (!address) {
        setError('Failed to retrieve public key.')
        return null
      }
      setWalletAddress(address)

      const server = new Horizon.Server('https://horizon-testnet.stellar.org')
      const account = await server.loadAccount(address)
      const native = account.balances.find(b => b.asset_type === 'native')
      setWalletBalance(native ? Number(native.balance).toFixed(2) : '0.00')
      return address
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to connect wallet.')
      return null
    }
  }

  async function payBuyInXlm(amount: number, senderAddress: string) {
    const vaultAddress = process.env.NEXT_PUBLIC_STELLAR_VAULT_PUBLIC_KEY
    if (!vaultAddress) {
      throw new Error('Vault address not configured on the server.')
    }

    const server = new Horizon.Server('https://horizon-testnet.stellar.org')
    const sourceAccount = await server.loadAccount(senderAddress)

    const tx = new TransactionBuilder(sourceAccount, {
      fee: '1000', // safe base fee (1000 stroops = 0.0001 XLM)
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: vaultAddress,
          asset: Asset.native(),
          amount: amount.toFixed(7),
        })
      )
      .setTimeout(60)
      .build()

    const signResult = await StellarWalletsKit.signTransaction(tx.toXDR(), {
      networkPassphrase: Networks.TESTNET,
      address: senderAddress,
    })
    if (!signResult || !signResult.signedTxXdr) {
      throw new Error('Transaction signing rejected or failed.')
    }
    const txEnvelope = TransactionBuilder.fromXDR(signResult.signedTxXdr, Networks.TESTNET)
    const result = await server.submitTransaction(txEnvelope)
    return result.hash
  }

  function handleCreate() {
    if (!nickname.trim()) { setError('Enter a nickname'); return }
    const amountVal = parseFloat(buyInAmount)
    if (isNaN(amountVal) || amountVal < 0.1) { setError('Minimum buy-in is 0.1 XLM'); return }
    setError('')
    startTransition(async () => {
      try {
        let addr = walletAddress
        if (!addr) {
          const connectedAddr = await connectWallet()
          if (!connectedAddr) return
          addr = connectedAddr
        }

        setError('Confirm the buy-in payment transaction in your wallet...')
        const txHash = await payBuyInXlm(amountVal, addr)
        setError('Verifying transaction on Horizon...')

        const userId = getOrCreateUserId()
        const result = await createRoom(userId, nickname.trim(), avatar, amountVal, addr, txHash)
        if ('error' in result && result.error) { setError(result.error); return }
        if ('code' in result && result.code) router.push(`/room/${result.code}`)
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Transaction or room creation failed.')
      }
    })
  }

  function handleJoin() {
    if (!nickname.trim()) { setError('Enter a nickname'); return }
    if (!joinCode.trim()) { setError('Enter a room code'); return }
    const amountVal = parseFloat(buyInAmount)
    if (isNaN(amountVal) || amountVal < 0.1) { setError('Minimum buy-in is 0.1 XLM'); return }
    setError('')
    startTransition(async () => {
      try {
        let addr = walletAddress
        if (!addr) {
          const connectedAddr = await connectWallet()
          if (!connectedAddr) return
          addr = connectedAddr
        }

        setError(`Confirm your buy-in payment of ${amountVal} XLM in your wallet...`)
        const txHash = await payBuyInXlm(amountVal, addr)
        setError('Verifying transaction on Horizon...')

        const userId = getOrCreateUserId()
        const result = await joinRoom(userId, joinCode.trim(), nickname.trim(), avatar, addr, txHash, amountVal)
        if ('error' in result && result.error) { setError(result.error); return }
        if ('code' in result && result.code) router.push(`/room/${result.code}`)
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Transaction or room joining failed.')
      }
    })
  }

  return (
    <main
      className="min-h-screen cyber-grid flex flex-col justify-center items-center md:items-start p-6 md:p-12 md:pl-28 relative overflow-hidden font-sans select-none"
      style={{
        backgroundImage: "linear-gradient(rgba(6, 6, 10, 0.15), rgba(6, 6, 10, 0.15)), url('/back2.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'right center',
        backgroundRepeat: 'no-repeat'
      }}
    >

      {/* Dynamic ambient shadows (no blur glows) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none bg-[#FF007F]/5" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none bg-[#A855F7]/2" />

      {/* Logo Section */}
      <div className="flex flex-col items-center md:items-start gap-3 mb-6 z-10">
        <div className="text-center md:text-left">
          <h1 className="font-display text-6xl md:text-7xl font-black tracking-tight text-[#F8FAFC] leading-[0.9] drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
            PAW<span className="text-[#FF007F] text-brand-glow-pink animate-glow-pulse inline-block">nic</span>
          </h1>
          <div className="flex items-center justify-center md:justify-start gap-2.5 mt-3">
            <span className="h-[2px] w-8 bg-gradient-to-r from-transparent to-[#FF007F]" />
            <p className="text-[#F8FAFC]/70 text-[11px] tracking-[0.35em] uppercase font-display font-bold">
              Hold. Pass. Survive.
            </p>
            <span className="h-[2px] w-8 bg-gradient-to-l from-transparent to-[#FF007F] md:hidden" />
          </div>
        </div>
      </div>

      {/* Roster & Form card */}
      <div className="glass-panel glow-pink rounded-2xl w-full max-w-md overflow-hidden z-10 shadow-[0_12px_48px_rgba(255,0,127,0.18)]">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border/80">
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-4 text-xs font-display font-black tracking-[0.2em] uppercase transition-all ${tab === t
                  ? 'text-[#FF007F] border-b-2 border-[#FF007F] bg-white/2'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {t === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 space-y-3.5">
          {/* Wallet status */}
          <div className="p-3 rounded-xl border-3 border-white bg-[#06060A] shadow-[3px_3px_0px_0px_#000000] flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-display font-bold block">
                Stellar Wallet
              </span>
              <span className="text-xs font-mono text-[#F8FAFC]">
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} (${walletBalance} XLM)` : 'Not Connected'}
              </span>
            </div>
            {!walletAddress ? (
              <button
                type="button"
                onClick={connectWallet}
                className="px-4 py-2 border-3 border-white bg-[#FF007F] text-white hover:bg-[#FF007F]/90 font-display font-bold text-xs uppercase tracking-wider rounded-lg shadow-[2px_2px_0px_0px_#000000] transition-all"
              >
                Connect
              </button>
            ) : (
              <button
                type="button"
                onClick={connectWallet}
                className="px-4 py-2 border-3 border-white bg-slate-700 text-white hover:bg-slate-600 font-display font-bold text-xs uppercase tracking-wider rounded-lg shadow-[2px_2px_0px_0px_#000000] transition-all"
              >
                Reconnect
              </button>
            )}
          </div>

          {/* Avatar selector */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-display font-bold block mb-1 text-left">
              Select Avatar
            </label>
            <div className="flex justify-between gap-1">
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all border overflow-hidden ${avatar === a
                      ? 'border-[#FF007F] bg-[#FF007F]/10 scale-105 shadow-[0_0_10px_rgba(255,0,127,0.25)]'
                      : 'border-border/60 bg-white/2 hover:border-white/20'
                    }`}
                >
                  {a.endsWith('.png') ? (
                    <img src={`/${a}`} alt="Cat" className="w-9 h-9 object-contain rounded" />
                  ) : (
                    <span className="text-lg">{a}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Nickname input */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-display font-bold block mb-1 text-left">
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

          {/* Buy-in input (Always visible in both tabs) */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-display font-bold block mb-1 text-left">
              Buy-in Amount (XLM)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={buyInAmount}
              onChange={e => setBuyInAmount(e.target.value)}
              placeholder="1.0"
              className="w-full text-center"
            />
          </div>

          {/* Join Code (for Join Tab only) */}
          {tab === 'join' && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-display font-bold block mb-1 text-left">
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
            className="group w-full py-3.5 rounded-xl font-display font-black text-sm tracking-[0.2em] uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center gap-2"
            style={{
              background: '#FF007F',
              boxShadow: '0 0 24px rgba(255, 0, 127, 0.4)',
              border: '1px solid #FF007F',
            }}
          >
            {isPending ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                {tab === 'create' ? 'Creating...' : 'Joining...'}
              </>
            ) : (
              <>
                {tab === 'create' ? 'Create Room' : 'Join Room'}
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </>
            )}
          </button>
        </div>
      </div>

      <p className="mt-5 text-[10px] text-muted-foreground text-center md:text-left max-w-xs leading-relaxed uppercase tracking-wider font-display font-bold z-10">
        Pass the neon cat. Survive the explosion. Last cat standing wins.
      </p>
    </main>
  )
}
