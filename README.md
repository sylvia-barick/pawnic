<p align="center">
  <img width="200" height="200" alt="SWIFT (17)" src="https://github.com/user-attachments/assets/3f56c753-c9e2-4bd9-b797-41c5df2aa8cb" />
</p>

<h1 align="center">PAWnic</h1>
<p align="center"><strong>Hold. Pass. Survive.</strong></p>

<p align="center">
  <img alt="Status" src="https://img.shields.io/badge/status-closed%20beta-FF007F?style=flat-square" />
  <img alt="Network" src="https://img.shields.io/badge/network-Stellar%20Testnet-9B8FE8?style=flat-square" />
  <img alt="Payments" src="https://img.shields.io/badge/on--chain%20payments-120%2B-00C49F?style=flat-square" />
  <img alt="Stack" src="https://img.shields.io/badge/stack-Next.js%20%2B%20Supabase%20%2B%20Stellar-0E0F14?style=flat-square" />
</p>

---

**PAWnic** is a real-time multiplayer party game where players pass a neon cat like a hot potato. Miss your pass window, and you explode. Last player standing takes the prize pool — settled on-chain, instantly.

> 🚧 **Currently in closed beta on Stellar Testnet.** Mainnet launch coming soon.

---

## The Game

Every room is a high-pressure standoff. A ticking cat bomb is passed between players. Each second you hold it earns you points — but if the timer hits zero while it's in your paws, you're out. The pot grows with every buy-in. The last player alive collects.

**The loop:**
1. Connect your Stellar wallet (Freighter)
2. Set a buy-in and create or join a room
3. The game starts when the host fires it up
4. Pass the cat. Don't hold too long. Survive.
5. Winner receives the room's XLM pot — paid out on-chain

---

## Powers (In-Game Economy)

Earn points by holding the cat. Spend them on powers mid-match.

| Power | Cost | Effect |
|:---|:---:|:---|
| 🔮 Mirror | 100 pts | Reflects the next incoming pass back to sender |
| ❄️ Freeze | 80 pts | Locks a target player for 3 seconds |
| 🌿 Catnip | 60 pts | Doubles your point gain for 10 seconds |
| ☁️ Smoke Screen | 70 pts | Hides the bomb holder from others for 4 seconds |
| 🐱 Nine Lives | 150 pts | Auto-saves you from one explosion |
| 🛡️ Shield | 50 pts | Bounces the bomb back to whoever passed it to you |

---

## On-Chain Layer — Stellar Testnet

PAWnic's buy-in and payout flow runs on the Stellar network. Every room entry is a real signed transaction. Every winner payout is an on-chain transfer.

**How it works:**

```
Player signs buy-in → XLM sent to Vault account → Horizon verifies tx hash
       ↓
   Game runs
       ↓
Last player alive → Vault distributes prize pool → On-chain payout tx
```

- **Network:** Stellar Testnet
- **Wallet:** [Freighter](https://www.freighter.app/) (browser extension)
- **Vault Account:** [`GBNOTQ...HOILT`](https://stellar.expert/explorer/testnet/account/GBNOTQMRR5OSU2R3ARUKFM3H6UGQXRPJ5OKSJ4Z7GVG45XXL6E6HOILT)
- **Minimum buy-in:** 0.1 XLM
- **Settlement:** Automatic on game completion

**Live evidence:**
- 🔗 [Vault on Stellar Expert Testnet](https://stellar.expert/explorer/testnet/account/GBNOTQMRR5OSU2R3ARUKFM3H6UGQXRPJ5OKSJ4Z7GVG45XXL6E6HOILT) — 120+ processed payments
- 📊 [User Payments Sheet](https://docs.google.com/spreadsheets/d/1Wj2h8oxt-n-SJclkCVpO8mBniTHW1Rhejr6Sei69AAQ/edit?gid=0#gid=0) — live beta metrics

---

## Screenshots

**Landing Screen**


<img width="1918" height="867" alt="image" src="https://github.com/user-attachments/assets/8c1626fc-7bce-4cb2-9f65-20cd0c5ad188" />



**Game Room**

<img width="1901" height="857" alt="image" src="https://github.com/user-attachments/assets/4d343799-8e7b-418f-8b37-43c52c99a164" />


**Disbursement / Winner Payout**

<img width="1917" height="857" alt="Screenshot 2026-07-04 142016" src="https://github.com/user-attachments/assets/00712fd0-43fb-4b82-bc74-4d7dbbeb5d94" />


---

## Beta Status

| Metric | Value |
|:---|:---|
| Beta phase | Closed beta (waitlist open) |
| Network | Stellar Testnet |
| On-chain payments processed | 120+ |
| Room settlement | Verified via Horizon API |
| Realtime sync | Supabase Realtime |

---

## Architecture

```
Player Browser
  ├── Next.js App (React 19)
  ├── Freighter Wallet → signs XLM transactions
  └── Supabase Realtime → live game state sync

Supabase (Postgres + Realtime)
  ├── rooms — game sessions, bomb state, round tracking
  ├── players — avatar, points, power inventory, alive status
  └── events — pass, explode, chat, power use feed

Stellar Testnet
  ├── Vault Account — holds buy-in pool
  ├── Horizon API — tx verification + payout submission
  └── Freighter — user-side signing (no key stored in app)
```

---

## Database Schema

Three core tables power every room:

- **`rooms`** — code, host, status (`waiting / playing / finished`), bomb holder, explosion timestamp, round number, buy-in amount
- **`players`** — nickname, avatar, points, alive/frozen/shield state, power inventory, Stellar address
- **`events`** — timestamped feed of every pass, explosion, power use, chat message, and join event

Full schema: [`supabase_schema.sql`](supabase_schema.sql)

---

## Tech Stack

| Layer | Technology |
|:---|:---|
| Framework | Next.js 16 + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (Postgres + Realtime) |
| Blockchain | Stellar Testnet via `@stellar/stellar-sdk` |
| Wallet | Freighter (`@stellar/freighter-api`) |
| Fonts | Space Grotesk · Fredoka · Geist Mono |
| Deployment | Vercel |

---

## Running Locally

**Prerequisites:** Node.js 20+, a Supabase project, a Stellar testnet keypair, Freighter wallet extension

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your keys
cp .env.example .env

# 3. Run the Supabase schema
# Paste supabase_schema.sql into your Supabase SQL Editor

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Required env vars:**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_STELLAR_VAULT_PUBLIC_KEY=
STELLAR_VAULT_SECRET_KEY=
```

---

## Repository Structure

```
app/
  page.tsx              — Landing page (wallet connect, create/join room)
  room/[code]/page.tsx  — Game room (lobby, arena, shop, finished overlay)
  actions/              — Server actions (createRoom, joinRoom, payout)
components/pawnic/      — GameNavBar, LobbyPanel, ArenaPanel, ShopPanel, FinishedOverlay
hooks/                  — useRoom (Supabase Realtime state management)
lib/
  stellar.ts            — Tx verification + vault payout logic
  types.ts              — Room, Player, GameEvent, Power types
supabase_schema.sql     — Full database setup script
```

---

## Roadmap

- [ ] Stellar Mainnet deployment
- [ ] Public open beta
- [ ] Spectator mode
- [ ] Tournament brackets with multi-round rooms
- [ ] Mobile-native touch controls
- [ ] Custom room themes and power sets

---

## Team

We combine specialized Web3 engineering with technical go-to-market execution.

### Sylvia Barick — Web3 Developer

Full-stack Web3 engineer specializing in smart contracts and decentralized applications. Sylvia handles the core on-chain development, session synchronization, and smart protocol architecture for PAWnic.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Sylvia%20Barick-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/sylvia-barick-081651321/)
[![X](https://img.shields.io/badge/X-@5__barick-000000?style=flat-square&logo=x)](https://x.com/5_barick)
[![GitHub](https://img.shields.io/badge/GitHub-sylvia--barick-181717?style=flat-square&logo=github)](https://github.com/sylvia-barick)

### Debojyoti De Majumder — GTM & Marketing

Technical marketer and community architect. Debojyoti drives user acquisition, waitlist onboarding strategies, community growth, and overall Go-To-Market execution. Also serves as Community Manager at HydraDB.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Debojyoti%20De%20Majumder-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/debojyotidm/)
[![X](https://img.shields.io/badge/X-@debojyotidm-000000?style=flat-square&logo=x)](https://x.com/debojyotidm)
[![GitHub](https://img.shields.io/badge/GitHub-debojyoti10CC-181717?style=flat-square&logo=github)](https://github.com/debojyoti10CC)

---

> Not financial advice. Testnet only — no real funds at risk.
