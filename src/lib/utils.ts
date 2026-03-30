import { formatEther } from 'viem';
import { EXPLORER, KNOWN_TOKENS } from './constants';

export function short(addr: string): string {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function fmtETH(wei: bigint, dp = 4): string {
  return parseFloat(formatEther(wei)).toFixed(dp);
}

export function fmtToken(amount: bigint, decimals = 18): string {
  const d = BigInt(10 ** decimals);
  const whole = amount / d;
  const rem   = amount % d;
  if (rem === BigInt(0)) return whole.toLocaleString();
  const frac = rem.toString().padStart(decimals, '0').slice(0, 4).replace(/0+$/, '');
  return `${whole.toLocaleString()}.${frac}`;
}

export function txLink(hash: string)  { return `${EXPLORER}/tx/${hash}`; }
export function addrLink(addr: string){ return `${EXPLORER}/address/${addr}`; }

export function ago(ts: bigint): string {
  const s = Math.floor(Date.now() / 1000) - Number(ts);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function fillLabel(ft: number): string {
  return ft === 0 ? '50% or 100%' : '100% only';
}

export function tokenColor(symbol: string): string {
  const map: Record<string, string> = {
    TSLA:'#CC0000', AMZN:'#FF9900', NFLX:'#E50914',
    PLTR:'#7289DA', AMD:'#ED1C24', ETH:'#627EEA',
    USDT:'#26A17B', BTC:'#F7931A',
  };
  return map[symbol] ?? '#C8F000';
}

export function getTokenMeta(addr: string) {
  return KNOWN_TOKENS[addr.toLowerCase()] ?? null;
}

export function tweetUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}
