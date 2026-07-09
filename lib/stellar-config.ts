import { Networks } from '@stellar/stellar-sdk'

export const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'public' ? 'public' : 'testnet'

export const HORIZON_URL = STELLAR_NETWORK === 'public'
  ? 'https://horizon.stellar.org'
  : 'https://horizon-testnet.stellar.org'

export const NETWORK_PASSPHRASE = STELLAR_NETWORK === 'public'
  ? Networks.PUBLIC
  : Networks.TESTNET

export function getExplorerTxUrl(txHash: string): string {
  return STELLAR_NETWORK === 'public'
    ? `https://stellar.expert/explorer/public/tx/${txHash}`
    : `https://stellar.expert/explorer/testnet/tx/${txHash}`
}
