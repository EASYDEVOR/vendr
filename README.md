# VENDR - OTC Token Marketplace

A simple, transparent, and fully on-chain Over-The-Counter (OTC) marketplace for tokens on **Robinhood Chain Testnet**.

Built for fair trading with full escrow protection — no rugs, no middlemen.

### Live App
→ [https://vendr-pi.vercel.app](https://vendr-pi.vercel.app)

### Features
- List your tokens for sale in ETH or USDT
- Make offers with ETH or USDT
- Full on-chain escrow (funds are safe until trade completes)
- Portfolio management (your listings, offers, and activity)
- Light & Dark mode
- Clean and mobile-friendly UI

### Tech Stack
- Next.js 16 + React 19
- wagmi + viem (for wallet & contract interaction)
- Fully on-chain — **no backend server**

### Smart Contracts
All contracts are deployed on Robinhood Chain Testnet (Chain ID: 46630) and can be verified on BlockScan.
- OTC Contract: 0x4B73f7eFd4cfa7a3b4Ddb0678e21FD1FD490C7d0 (verified on BlockScan) https://explorer.testnet.chain.robinhood.com/address/0x4B73f7eFd4cfa7a3b4Ddb0678e21FD1FD490C7d0
- All transactions are fully visible on BlockScan.

### Security & Transparency
- **100% open source** — You can audit every line of code
- All transactions happen directly with the smart contract
- No server can steal funds or manipulate trades
- Testnet only — Use only test tokens

### How to Test (Testnet)
1. Switch your wallet to **Robinhood Chain Testnet** (Chain ID 46630)
2. Get test ETH + USDT from the in-app faucet
3. Connect wallet and start listing or making offers
