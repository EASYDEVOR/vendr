'use client';

import { useState, useEffect } from 'react';
import { publicClient } from '@/lib/client';
import { ERC20_ABI } from '@/abis';
import { KNOWN_TOKENS, CONTRACTS } from '@/lib/constants';
import { tokenColor } from '@/lib/utils';
import { parseAbiItem } from 'viem';

export interface WalletToken {
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  balance: bigint;
  color: string;
}

// Transfer event definition for viem v2
const transferEvent = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
);

export function useWalletTokens(userAddress: `0x${string}` | undefined) {
  const [tokens, setTokens] = useState<WalletToken[]>([]);
  const [ethBal, setEthBal] = useState<bigint>(BigInt(0));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userAddress) {
      setTokens([]);
      setEthBal(BigInt(0));
      return;
    }

    setLoading(true);

    const fetchTokens = async () => {
      try {
        // ETH balance
        const balance = await publicClient.getBalance({ address: userAddress });
        setEthBal(balance);

        const uniqueAddrs = new Set<string>();

        // Add known tokens + USDT
        Object.keys(KNOWN_TOKENS).forEach(a => uniqueAddrs.add(a.toLowerCase()));
        uniqueAddrs.add(CONTRACTS.USDT.toLowerCase());

        // Discover tokens received
        try {
          const logsTo = await publicClient.getLogs({
            event: transferEvent,
            args: { to: userAddress },
            fromBlock: BigInt(0),
            toBlock: 'latest',
          });
          logsTo.forEach(log => {
            if (log.address) uniqueAddrs.add(log.address.toLowerCase());
          });
        } catch (e) {
          console.warn('Failed to fetch received logs:', e);
        }

        // Discover tokens sent
        try {
          const logsFrom = await publicClient.getLogs({
            event: transferEvent,
            args: { from: userAddress },
            fromBlock: BigInt(0),
            toBlock: 'latest',
          });
          logsFrom.forEach(log => {
            if (log.address) uniqueAddrs.add(log.address.toLowerCase());
          });
        } catch (e) {
          console.warn('Failed to fetch sent logs:', e);
        }

        // Fetch metadata + balance for each address
        const results: WalletToken[] = [];

        await Promise.all(
          Array.from(uniqueAddrs).map(async (addrLower) => {
            const addr = addrLower as `0x${string}`;
            try {
              const bal = await publicClient.readContract({
                address: addr,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [userAddress],
              }) as bigint;

              if (bal === BigInt(0)) return;

              const known = KNOWN_TOKENS[addrLower];

              if (known) {
                const decimals = await publicClient.readContract({
                  address: addr,
                  abi: ERC20_ABI,
                  functionName: 'decimals',
                }) as number;

                results.push({
                  address: addr,
                  name: known.name,
                  symbol: known.symbol,
                  decimals: Number(decimals),
                  balance: bal,
                  color: known.color || tokenColor(known.symbol),
                });
                return;
              }

              // Unknown token - fetch metadata
              const [name, symbol, decimals] = await Promise.all([
                publicClient.readContract({ address: addr, abi: ERC20_ABI, functionName: 'name' }),
                publicClient.readContract({ address: addr, abi: ERC20_ABI, functionName: 'symbol' }),
                publicClient.readContract({ address: addr, abi: ERC20_ABI, functionName: 'decimals' }),
              ]);

              results.push({
                address: addr,
                name: name as string,
                symbol: symbol as string,
                decimals: Number(decimals),
                balance: bal,
                color: tokenColor(symbol as string),
              });
            } catch (err) {
              // Silently skip tokens that fail to load
            }
          })
        );

        // Sort: known tokens first
        results.sort((a, b) => {
          const aKnown = !!KNOWN_TOKENS[a.address.toLowerCase()];
          const bKnown = !!KNOWN_TOKENS[b.address.toLowerCase()];
          if (aKnown && !bKnown) return -1;
          if (!aKnown && bKnown) return 1;
          return 0;
        });

        setTokens(results);
      } catch (error) {
        console.error('Error fetching wallet tokens:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [userAddress]);

  return { tokens, ethBal, loading };
}

// Token info with cache (used in many places)
const tokenInfoCache: Record<string, { name: string; symbol: string; decimals: number; color: string }> = {};

export function useTokenInfo(address: `0x${string}` | null) {
  const [info, setInfo] = useState<{ name: string; symbol: string; decimals: number; color: string } | null>(null);

  useEffect(() => {
    if (!address) {
      setInfo(null);
      return;
    }

    const lower = address.toLowerCase();

    if (tokenInfoCache[lower]) {
      setInfo(tokenInfoCache[lower]);
      return;
    }

    const known = KNOWN_TOKENS[lower];
    if (known) {
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'decimals' })
        .then(d => {
          const result = { ...known, decimals: Number(d) };
          tokenInfoCache[lower] = result;
          setInfo(result);
        })
        .catch(() => {
          const result = { ...known, decimals: 18 };
          tokenInfoCache[lower] = result;
          setInfo(result);
        });
      return;
    }

    // Unknown token
    Promise.all([
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'name' }),
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'symbol' }),
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'decimals' }),
    ])
      .then(([name, symbol, decimals]) => {
        const result = {
          name: name as string,
          symbol: symbol as string,
          decimals: Number(decimals),
          color: tokenColor(symbol as string),
        };
        tokenInfoCache[lower] = result;
        setInfo(result);
      })
      .catch(() => {
        const fallback = { name: 'Unknown Token', symbol: '???', decimals: 18, color: '#888888' };
        tokenInfoCache[lower] = fallback;
        setInfo(fallback);
      });
  }, [address]);

  return info;
}
