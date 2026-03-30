'use client';
import { useState, useEffect } from 'react';
import { publicClient } from '@/lib/client';
import { ERC20_ABI } from '@/abis';
import { KNOWN_TOKENS, CONTRACTS } from '@/lib/constants';

export interface WalletToken {
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  balance: bigint;
  color: string;
}

export function useWalletTokens(userAddress: `0x${string}` | undefined) {
  const [tokens,  setTokens]  = useState<WalletToken[]>([]);
  const [ethBal,  setEthBal]  = useState<bigint>(BigInt(0));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userAddress) return;
    setLoading(true);

    const go = async () => {
      // ETH balance
      try {
        const b = await publicClient.getBalance({ address: userAddress });
        setEthBal(b);
      } catch {}

      // Known ERC-20 tokens + USDT
      const addrs = Object.keys(KNOWN_TOKENS) as `0x${string}`[];
      if (!addrs.includes(CONTRACTS.USDT.toLowerCase() as `0x${string}`)) {
        addrs.push(CONTRACTS.USDT.toLowerCase() as `0x${string}`);
      }

      const results: WalletToken[] = [];
      await Promise.all(addrs.map(async (addr) => {
        try {
          const [name, symbol, decimals, balance] = await Promise.all([
            publicClient.readContract({ address: addr, abi: ERC20_ABI, functionName: 'name'     }),
            publicClient.readContract({ address: addr, abi: ERC20_ABI, functionName: 'symbol'   }),
            publicClient.readContract({ address: addr, abi: ERC20_ABI, functionName: 'decimals' }),
            publicClient.readContract({ address: addr, abi: ERC20_ABI, functionName: 'balanceOf', args: [userAddress] }),
          ]);
          if ((balance as bigint) > BigInt(0)) {
            results.push({
              address: addr,
              name:     name    as string,
              symbol:   symbol  as string,
              decimals: Number(decimals),
              balance:  balance as bigint,
              color: KNOWN_TOKENS[addr.toLowerCase()]?.color ?? '#C8F000',
            });
          }
        } catch {}
      }));

      setTokens(results);
      setLoading(false);
    };
    go();
  }, [userAddress]);

  return { tokens, ethBal, loading };
}

export function useTokenInfo(address: `0x${string}` | null) {
  const [info, setInfo] = useState<{ name:string; symbol:string; decimals:number; color:string } | null>(null);

  useEffect(() => {
    if (!address) return;
    // Check known first
    const known = KNOWN_TOKENS[address.toLowerCase()];
    if (known) {
      // Still need decimals
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'decimals' })
        .then(d => setInfo({ ...known, decimals: Number(d) }))
        .catch(() => setInfo({ ...known, decimals: 18 }));
      return;
    }
    Promise.all([
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'name'     }),
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'symbol'   }),
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'decimals' }),
    ]).then(([name, symbol, decimals]) => {
      setInfo({ name: name as string, symbol: symbol as string, decimals: Number(decimals), color: '#C8F000' });
    }).catch(() => {
      setInfo({ name: 'Unknown', symbol: '???', decimals: 18, color: '#888' });
    });
  }, [address]);

  return info;
}
