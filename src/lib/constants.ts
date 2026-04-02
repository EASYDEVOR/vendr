export const CONTRACTS = {
  USDT:        '0xa667073d044DD24Ea9F1cD932FF9C0c9B983ecd3' as `0x${string}`,
  FAUCET:      '0x06E476a5E1Da4dcc1Fe9E2908EE8B96EdCe23b6B' as `0x${string}`,
  OTC:         '0x4B73f7eFd4cfa7a3b4Ddb0678e21FD1FD490C7d0' as `0x${string}`,
  NFT_FACTORY: '0xB78e9a1De481317DC7818c410c25645c6c145750' as `0x${string}`,
  NFT_MARKET:  '0xf26934511E1ce9993803Fb8B5551F0e216D87eB4' as `0x${string}`,
} as const;

export const FEES = {
  LIST:   BigInt('2000000000000000'),
  BUY:    BigInt('2000000000000000'),
  OFFER:  BigInt('1000000000000000'),
  EDIT:   BigInt('1000000000000000'),
  CANCEL: BigInt('1000000000000000'),
} as const;

export const EXPLORER = 'https://explorer.testnet.chain.robinhood.com';
export const RPC      = 'https://rpc.testnet.chain.robinhood.com';
export const LIME     = '#C8F000';
export const PROTOCOL_WALLET = '0x13d62412243b1A462704052bafB0c0E457C1F048' as `0x${string}`;

// ✅ Blue-tick verified tokens on Robinhood Chain Testnet
export const KNOWN_TOKENS: Record<string, { name: string; symbol: string; color: string; verified: boolean }> = {
  '0xa667073d044dd24ea9f1cd932ff9c0c9b983ecd3': { name: 'Tether USD',    symbol: 'USDT', color: '#26A17B', verified: true  },
  '0xc9f9c86933092bbbfff3ccb4b105a4a94bf3bd4e': { name: 'Tesla Token',   symbol: 'TSLA', color: '#CC0000', verified: true  },
  '0x71178bac73cbeb415514eb542a8995b82669778d': { name: 'AMD Token',      symbol: 'AMD',  color: '#ED1C24', verified: true  },
  '0x5884ad2f920c162cfbbaccc88c9c51aa75ec09e02': { name: 'Amazon Token', symbol: 'AMZN', color: '#FF9900', verified: true  },
  '0x3b8262a63d25f0477c4dde23f83cfe22cb768c93': { name: 'Netflix Token',  symbol: 'NFLX', color: '#E50914', verified: true  },
  '0x1fbe1a0e43594b3455993b5de5fd0a7a266298d0': { name: 'Palantir Token', symbol: 'PLTR', color: '#7289DA', verified: true  },
};
