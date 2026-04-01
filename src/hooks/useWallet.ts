'use client';
import { useState, useEffect } from 'react';
import { publicClient } from '@/lib/client';
import { ERC20_ABI } from '@/abis';
import { KNOWN_TOKENS, CONTRACTS } from '@/lib/constants';
import { tokenColor } from '@/lib/utils';

export interface WalletToken {
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  balance: bigint;
  color: string;
}

// Fetch ALL ERC-20 token transfers for this address using getLogs
// then read balances for all unique token addresses found
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

      // Find all ERC-20 tokens via Transfer event logs (to or from this wallet)
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      const paddedAddr = userAddress.toLowerCase().replace('0x', '0x000000000000000000000000');

      const uniqueAddrs = new Set<string>();

      // Always include known tokens + USDT
      Object.keys(KNOWN_TOKENS).forEach(a => uniqueAddrs.add(a.toLowerCase()));
      uniqueAddrs.add(CONTRACTS.USDT.toLowerCase());

      try {
        // Get logs where user is the recipient (TO)
        const logsTo = await publicClient.getLogs({
          event: { type: 'event', name: 'Transfer', inputs: [{ type: 'address', indexed: true, name: 'from' }, { type: 'address', indexed: true, name: 'to' }, { type: 'uint256', indexed: false, name: 'value' }] },
          args: { to: userAddress },
          fromBlock: BigInt(0),
          toBlock: 'latest',
        });
        logsTo.forEach(log => { if (log.address) uniqueAddrs.add(log.address.toLowerCase()); });
      } catch (e) {
        // Fallback: try raw getLogs if typed version fails
        try {
          const logsTo = await publicClient.getLogs({
            topics: [transferTopic, null, paddedAddr],
            fromBlock: BigInt(0),
            toBlock: 'latest',
          });
          logsTo.forEach(log => { if (log.address) uniqueAddrs.add(log.address.toLowerCase()); });
        } catch {}
      }

      try {
        // Get logs where user is the sender (FROM)
        const logsFrom = await publicClient.getLogs({
          event: { type: 'event', name: 'Transfer', inputs: [{ type: 'address', indexed: true, name: 'from' }, { type: 'address', indexed: true, name: 'to' }, { type: 'uint256', indexed: false, name: 'value' }] },
          args: { from: userAddress },
          fromBlock: BigInt(0),
          toBlock: 'latest',
        });
        logsFrom.forEach(log => { if (log.address) uniqueAddrs.add(log.address.toLowerCase()); });
      } catch (e) {
        try {
          const logsFrom = await publicClient.getLogs({
            topics: [transferTopic, paddedAddr],
            fromBlock: BigInt(0),
            toBlock: 'latest',
          });
          logsFrom.forEach(log => { if (log.address) uniqueAddrs.add(log.address.toLowerCase()); });
        } catch {}
      }

      // Now read balance + info for every unique token address
      const results: WalletToken[] = [];
      const addrs = Array.from(uniqueAddrs) as `0x${string}`[];

      await Promise.all(addrs.map(async (addr) => {
        try {
          const [bal] = await Promise.all([
            publicClient.readContract({ address: addr, abi: ERC20_ABI, functionName: 'balanceOf', args: [userAddress] }),
          ]);
          if ((bal as bigint) === BigInt(0)) return; // skip zero balance

          const known = KNOWN_TOKENS[addr.toLowerCase()];
          if (known) {
            const [decimals] = await Promise.all([
              publicClient.readContract({ address: addr, abi: ERC20_ABI, functionName: 'decimals' }),
            ]);
            results.push({ address: addr, name: known.name, symbol: known.symbol, decimals: Number(decimals), balance: bal as bigint, color: known.color });
            return;
          }

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
            balance: bal as bigint,
            color: tokenColor(symbol as string),
          });
        } catch {}
      }));

      // Sort: known tokens first, then by balance desc
      results.sort((a, b) => {
        const aKnown = !!KNOWN_TOKENS[a.address.toLowerCase()];
        const bKnown = !!KNOWN_TOKENS[b.address.toLowerCase()];
        if (aKnown && !bKnown) return -1;
        if (!aKnown && bKnown) return 1;
        return Number(b.balance) - Number(a.balance);
      });

      setTokens(results);
      setLoading(false);
    };
    go();
  }, [userAddress]);

  return { tokens, ethBal, loading };
}

const tokenInfoCache: Record<string, { name: string; symbol: string; decimals: number; color: string }> = {};

export function useTokenInfo(address: `0x${string}` | null) {
  const [info, setInfo] = useState<{ name: string; symbol: string; decimals: number; color: string } | null>(null);

  useEffect(() => {
    if (!address) return;
    const lower = address.toLowerCase();
    if (tokenInfoCache[lower]) { setInfo(tokenInfoCache[lower]); return; }

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

    Promise.all([
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'name' }),
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'symbol' }),
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'decimals' }),
    ]).then(([name, symbol, decimals]) => {
      const result = { name: name as string, symbol: symbol as string, decimals: Number(decimals), color: tokenColor(symbol as string) };
      tokenInfoCache[lower] = result;
      setInfo(result);
    }).catch(() => {
      setInfo({ name: 'Unknown', symbol: '???', decimals: 18, color: '#888' });
    });
  }, [address]);

  return info;
}
