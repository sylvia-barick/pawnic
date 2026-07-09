import { Horizon, Keypair, TransactionBuilder, Asset, Operation } from '@stellar/stellar-sdk'
import { HORIZON_URL, NETWORK_PASSPHRASE, STELLAR_NETWORK } from './stellar-config'

const server = new Horizon.Server(HORIZON_URL)

/**
 * Verify that a given transaction hash corresponds to a valid XLM payment
 * to the vault from the expected player address matching the expected amount.
 */
export async function verifyBuyInTransaction(
  txHash: string,
  expectedAmount: string,
  playerAddress: string
): Promise<boolean> {
  const vaultAddress = process.env.NEXT_PUBLIC_STELLAR_VAULT_PUBLIC_KEY
  if (!vaultAddress) {
    console.error('Missing NEXT_PUBLIC_STELLAR_VAULT_PUBLIC_KEY in env')
    return false
  }

  try {
    // 1. Fetch transaction details
    const tx = await server.transactions().transaction(txHash).call()
    if (!tx || !tx.successful) {
      console.warn(`Transaction ${txHash} not successful or not found`)
      return false
    }

    // 2. Fetch transaction operations
    const opsPage = await server.operations().forTransaction(txHash).call()
    
    // 3. Find the payment operation from player to vault
    const paymentOp = opsPage.records.find(op => 
      op.type === 'payment' &&
      op.to === vaultAddress &&
      op.from === playerAddress &&
      Number(op.amount) >= Number(expectedAmount) &&
      op.asset_type === 'native' // XLM
    )

    if (!paymentOp) {
      console.warn(`No valid payment op found in tx ${txHash} for address ${playerAddress}`)
      return false
    }

    return true
  } catch (err) {
    console.error(`Stellar Tx Verification failed for ${txHash}:`, err)
    return false
  }
}

/**
 * Automatically fetch Friendbot to fund the vault address if its balance falls below 100 XLM.
 */
export async function fundVaultIfLow(): Promise<void> {
  if (STELLAR_NETWORK === 'public') {
    return
  }
  const vaultAddress = process.env.NEXT_PUBLIC_STELLAR_VAULT_PUBLIC_KEY
  if (!vaultAddress) return

  try {
    const account = await server.loadAccount(vaultAddress)
    const nativeBalanceRecord = account.balances.find(b => b.asset_type === 'native')
    const balance = nativeBalanceRecord ? Number(nativeBalanceRecord.balance) : 0

    if (balance < 100) {
      console.log(`Vault balance low (${balance} XLM). Requesting Friendbot top-up...`)
      const res = await fetch(`https://friendbot.stellar.org/?addr=${vaultAddress}`)
      if (res.ok) {
        console.log(`Vault successfully funded by Friendbot.`)
        // Delay slightly for ledger ingestion
        await new Promise(resolve => setTimeout(resolve, 3000))
      } else {
        const text = await res.text()
        console.warn(`Friendbot request failed: ${text}`)
      }
    }
  } catch (err) {
    console.error('Error checking or funding vault balance:', err)
  }
}

/**
 * Send survival payouts to a target player address from the vault.
 */
export async function sendPayout(targetAddress: string, amount: string): Promise<string | null> {
  const secretKey = process.env.STELLAR_VAULT_SECRET_KEY
  if (!secretKey) {
    console.error('Missing STELLAR_VAULT_SECRET_KEY in env')
    return null
  }

  // Ensure vault has funds
  await fundVaultIfLow()

  try {
    const pair = Keypair.fromSecret(secretKey)
    const vaultAddress = pair.publicKey()

    // 1. Load vault account sequence
    const sourceAccount = await server.loadAccount(vaultAddress)
    
    // 2. Fetch current base fee
    const fee = await server.fetchBaseFee()

    // 3. Construct transaction
    const tx = new TransactionBuilder(sourceAccount, {
      fee: fee.toString(),
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination: targetAddress,
          asset: Asset.native(),
          amount: amount,
        })
      )
      .setTimeout(30)
      .build()

    // 4. Sign and submit
    tx.sign(pair)
    const response = await server.submitTransaction(tx)
    
    console.log(`Payout transaction successful. Hash: ${response.hash}`)
    return response.hash
  } catch (err) {
    console.error(`Failed to send Stellar payout to ${targetAddress}:`, err)
    return null
  }
}
