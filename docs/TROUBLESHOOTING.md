# Developer & Player Troubleshooting Guide

This document lists common technical errors, wallet connection glitches, and state sync bugs, along with solutions to resolve them.

---

## 1. Wallet Connection Issues

### Problem: "Freighter wallet is not detected" or the Connect button does nothing
* **Reason**: Freighter is not installed or has not loaded yet when the page renders.
* **Troubleshooting Steps**:
  1. Verify the Freighter browser extension is installed and enabled in your browser.
  2. Confirm your browser is not blocking script execution.
  3. Reload the page to trigger initialization of the extension API.

### Problem: "Wallet does not authorize network access"
* **Reason**: Freighter has not granted access permission to the PAWnic domain.
* **Troubleshooting Steps**:
  1. Click on your browser's Freighter extension icon.
  2. Enter your password to unlock the wallet.
  3. Approve the permissions request matching the PAWnic URL (`http://localhost:3000` or production domain).

---

## 2. Escrow & Buy-In Errors

### Problem: Player cannot join the lobby after submitting a transaction
* **Reason**: The transaction hash was not registered or verified.
* **Troubleshooting Steps**:
  1. Look up the transaction hash on [Stellar Expert](https://stellar.expert) (Testnet/Mainnet).
  2. Check that the transfer amount matches the required room buy-in.
  3. Verify the transaction memo contains the exact 6-character room code.
  4. Ensure your Stellar balance has enough XLM to pay network fees (0.00001 XLM base fee).

---

## 3. Real-Time Sync Glitches

### Problem: Player list, chat messages, or bomb passes do not update
* **Reason**: The database subscription has dropped or is blocked.
* **Troubleshooting Steps**:
  1. Check browser console logs for websocket connection issues.
  2. Verify that Supabase realtime replication is enabled for the tables (`rooms`, `players`, `events`) as described in the Database Guide.
  3. Refresh the page to restart the socket connection channel.
