# Stellar Integration Details

PAWnic connects web gameplay mechanics with the Stellar blockchain to perform decentralized room buy-ins and secure reward payouts.

---

## 1. Client-Side Wallet Connection (Freighter)

Freighter handles transaction signing. Client integrations use `@stellar/freighter-api` to request user confirmation.

### Checking connection and active address
```typescript
import { isAllowed, getPublicKey } from "@stellar/freighter-api";

async function connectWallet() {
  const allowed = await isAllowed();
  if (allowed) {
    const pubKey = await getPublicKey();
    return pubKey; // Stored as player's Stellar address
  }
}
```

---

## 2. Buy-In Flow

Every player joining a room configured with a non-zero buy-in size must submit a transfer of XLM to the room's Vault Escrow Account.

### Buy-In Transaction Construction (Client-Side)
The transaction is built using `@stellar/stellar-sdk` pointing to the public key of the Escrow Vault:
* **Asset**: Native XLM
* **Destination**: `NEXT_PUBLIC_STELLAR_VAULT_PUBLIC_KEY`
* **Amount**: Specified by the room configuration (e.g. `0.1` XLM)
* **Memo**: A `MEMO_TEXT` containing the `room_code` to prevent spoofing.

Once signed, the transaction is submitted to the Horizon network. The returned transaction hash `buyin_tx_hash` is sent to the server action to verify joining.

---

## 3. Server-Side Buy-In Validation

When a player triggers `joinRoom`, the server action validates the payment hash before registering them in the room database:

1. Connects to the Horizon server.
2. Retrieves the transaction details via `server.transactions().transaction(txHash).call()`.
3. Verifies:
   * **Source Account**: Matches the player's provided Stellar wallet address.
   * **Destination Account**: Matches the vault key.
   * **Amount**: Equals or exceeds the room's buy-in size.
   * **Memo**: Matches the room code.
   * **Status**: Transaction is successful.

If any checks fail, the join operation is rejected.

---

## 4. Payout Flow

Upon room completion, the host or server action calls the reward payout:

1. Reads the number of players who successfully joined and paid.
2. Sums the total buy-ins to calculate the reward pool (minus platform fee).
3. The server builds a payment transaction using `@stellar/stellar-sdk` pointing from the vault account to the winner's wallet address.
4. The transaction is signed server-side using the `STELLAR_VAULT_SECRET_KEY` environment variable.
5. The signed transaction is sent to Horizon. Upon success, the payout hash is saved to the room record and streamed to the client UI.
