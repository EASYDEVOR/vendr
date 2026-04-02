'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useRouter } from 'next/navigation';
import { parseEther, parseUnits } from 'viem';
import toast from 'react-hot-toast';

import Navbar from '@/components/Navbar';
import LiveTicker from '@/components/LiveTicker';
import BottomBar from '@/components/BottomBar';
import SuccessModal from '@/components/SuccessModal';
import { publicClient } from '@/lib/client';
import { useUserOTC, useOTCListing, OTCListing, OTCOffer } from '@/hooks/useOTC';
import { useWalletTokens, useTokenInfo } from '@/hooks/useWallet';
import { CONTRACTS, FEES } from '@/lib/constants';
import { OTC_ABI, ERC20_ABI } from '@/abis';
import { short, fmtETH, fmtToken, ago, fillLabel, addrLink, tokenColor } from '@/lib/utils';

// ── Listing Detail Modal ───────────────────────────────
function ListingDetailModal({ id, userAddr, onClose }: {
  id: bigint;
  userAddr: `0x${string}` | undefined;
  onClose: () => void;
}) {
  const { listing: l, offers, loading, refetch } = useOTCListing(id);
  const info = useTokenInfo(l?.tokenAddress ?? null);
  const router = useRouter();
  const { data: wc } = useWalletClient();
  const [busy, setBusy] = useState(false);

  async function doAccept(offerId: bigint) {
    if (!wc) return;
    setBusy(true);
    try {
      toast.loading('Accepting offer…');
      const tx = await wc.writeContract({ address: CONTRACTS.OTC, abi: OTC_ABI, functionName: 'acceptOffer', args: [offerId] });
      await publicClient.waitForTransactionReceipt({ hash: tx as `0x${string}` });
      toast.dismiss();
      toast.success('Offer accepted!');
      refetch();
    } catch (e: any) {
      toast.dismiss();
      toast.error(e?.shortMessage ?? 'Failed');
    }
    setBusy(false);
  }

  async function doIgnore(offerId: bigint) {
    if (!wc) return;
    setBusy(true);
    try {
      toast.loading('Ignoring offer…');
      const tx = await wc.writeContract({ address: CONTRACTS.OTC, abi: OTC_ABI, functionName: 'ignoreOffer', args: [offerId] });
      await publicClient.waitForTransactionReceipt({ hash: tx as `0x${string}` });
      toast.dismiss();
      toast.success('Offer ignored — funds returned');
      refetch();
    } catch (e: any) {
      toast.dismiss();
      toast.error(e?.shortMessage ?? 'Failed');
    }
    setBusy(false);
  }

  if (loading || !l) {
    return (
      <div className="modal-bg" onClick={onClose}>
        <div className="modal" style={{ textAlign: 'center', padding: 60 }}>
          <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        </div>
      </div>
    );
  }

  const filled = l.totalAmount > 0n ? Number((l.totalAmount - l.remainingAmount) * 100n / l.totalAmount) : 0;
  const col = info ? tokenColor(info.symbol) : '#C8F000';
  const ZERO = '0x0000000000000000000000000000000000000000';

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: col + '20', border: '1px solid ' + col + '40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, fontFamily: 'Space Mono,monospace', color: col, flexShrink: 0 }}>
            {info?.symbol?.slice(0, 2) ?? '??'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{info?.name ?? short(l.tokenAddress)}</div>
            <div style={{ fontSize: 11, color: '#8888AA' }}>{info?.symbol}</div>
          </div>
        </div>

        {/* Add more modal content from your original if needed */}
        <button className="modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ── useTokenLookup ───────────────────────────────
function useTokenLookup(ca: string, userAddress?: string) {
  const [info, setInfo] = useState<{ name: string; symbol: string; decimals: number; balance: bigint } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ca || !ca.startsWith('0x') || ca.length !== 42) {
      setInfo(null);
      return;
    }

    const fetchToken = async () => {
      setLoading(true);
      try {
        const address = ca.toLowerCase() as `0x${string}`;
        const [name, symbol, decimals, balance] = await Promise.all([
          publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'name' }),
          publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'symbol' }),
          publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'decimals' }),
          userAddress ? publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'balanceOf', args: [userAddress as `0x${string}`] }) : Promise.resolve(BigInt(0)),
        ]);
        setInfo({ name: name as string, symbol: symbol as string, decimals: Number(decimals), balance: balance as bigint });
      } catch (err) {
        console.error("Failed to fetch token info:", err);
        setInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [ca, userAddress]);

  return { info, loading };
}

// ── QuickListModal (FULL JSX) ─────────────────────────────────────────────
function QuickListModal({ token, onClose, onSuccess }: { token: any; onClose: () => void; onSuccess: (h: `0x${string}`) => void }) {
  const { data: wc } = useWalletClient();
  const [price, setPrice] = useState('');
  const [fill, setFill] = useState(0);
  const [payMode, setPayMode] = useState(0);
  const [desc, setDesc] = useState('');
  const [amt, setAmt] = useState('');
  const [busy, setBusy] = useState(false);

  const PAY_MODES = [
    { v: 0, icon: '⟠', l: 'ETH Only', d: 'Buyers must pay with ETH' },
    { v: 1, icon: '💵', l: 'USDT Only', d: 'Buyers must pay with USDT' },
    { v: 2, icon: '💱', l: 'ETH + USDT', d: 'Buyer can choose ETH or USDT' },
  ];

  async function submit() {
    if (!wc || !price || !amt) return;
    setBusy(true);
    try {
      const tokenAmt = parseUnits(amt, token.decimals);
      const priceWei = parseEther(price);
      const acceptsAny = payMode === 2;
      const acceptedTokens: `0x${string}`[] = payMode === 1 ? [CONTRACTS.USDT] : [];

      toast.loading('Approving token…');
      const ap = await wc.writeContract({ address: token.address as `0x${string}`, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACTS.OTC, tokenAmt] });
      await publicClient.waitForTransactionReceipt({ hash: ap as `0x${string}` });

      toast.dismiss();
      toast.loading('Listing token…');
      const tx = await wc.writeContract({
        address: CONTRACTS.OTC,
        abi: OTC_ABI,
        functionName: 'listToken',
        args: [token.address as `0x${string}`, tokenAmt, priceWei, acceptedTokens, acceptsAny, fill, desc],
        value: FEES.LIST
      });
      await publicClient.waitForTransactionReceipt({ hash: tx as `0x${string}` });

      toast.dismiss();
      onSuccess(tx as `0x${string}`);
    } catch (e: any) {
      toast.dismiss();
      toast.error(e?.shortMessage ?? 'Failed');
    }
    setBusy(false);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">List {token.name}</div>

        <div style={{ marginBottom: 14 }}>
          <label className="label">Accepted Payment</label>
          {PAY_MODES.map(o => (
            <div key={o.v} onClick={() => setPayMode(o.v)} style={{ padding: '10px', marginBottom: 8, borderRadius: 8, cursor: 'pointer', border: payMode === o.v ? '2px solid #C8F000' : '1px solid #333' }}>
              {o.icon} {o.l}
            </div>
          ))}
        </div>

        <div>
          <label className="label">Amount to List</label>
          <input className="input" type="number" value={amt} onChange={e => setAmt(e.target.value)} />
        </div>

        <div>
          <label className="label">Price for 100% (ETH)</label>
          <input className="input" type="number" value={price} onChange={e => setPrice(e.target.value)} />
        </div>

        <button className="btn btn-lime" style={{ width: '100%', marginTop: 20 }} disabled={busy || !price || !amt} onClick={submit}>
          {busy ? 'Processing...' : 'List Token'}
        </button>
      </div>
    </div>
  );
}

// ── Edit Modal (FULL JSX) ─────────────────────────────────────────────
function EditModal({ listing, onClose, onSuccess }: { listing: OTCListing; onClose: () => void; onSuccess: () => void }) {
  const { data: wc } = useWalletClient();
  const info = useTokenInfo(listing.tokenAddress);
  const [price, setPrice] = useState(fmtETH(listing.priceForFull, 6));
  const [fill, setFill] = useState(listing.fillTerms);
  const [payMode, setPayMode] = useState(listing.acceptsAnyToken ? 2 : 1);
  const [desc, setDesc] = useState(listing.description || '');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!wc || !price) return;
    setBusy(true);
    try {
      const priceWei = parseEther(price);
      const tx = await wc.writeContract({
        address: CONTRACTS.OTC,
        abi: OTC_ABI,
        functionName: 'editListing',
        args: [listing.id, priceWei, listing.acceptsAnyToken ? [] : [CONTRACTS.USDT], listing.acceptsAnyToken, fill, desc],
        value: FEES.EDIT
      });
      await publicClient.waitForTransactionReceipt({ hash: tx as `0x${string}` });
      toast.success('Listing updated');
      onSuccess();
    } catch (e: any) {
      toast.error(e?.shortMessage ?? 'Failed');
    }
    setBusy(false);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">Edit Listing #{listing.id.toString()}</div>

        <div>
          <label className="label">New Price (ETH)</label>
          <input className="input" type="number" value={price} onChange={e => setPrice(e.target.value)} />
        </div>

        <button className="btn btn-lime" style={{ width: '100%', marginTop: 20 }} disabled={busy || !price} onClick={submit}>
          {busy ? 'Updating...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ── Main Portfolio Page ───────────────────────────────────────────────────────
export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { data: wc } = useWalletClient();
  const addr = address as `0x${string}` | undefined;
  const { tokens, ethBal, loading: tokLoading } = useWalletTokens(addr);
  const { userListings, userOffers, loading: otcLoading } = useUserOTC(addr);

  const [tab, setTab] = useState<'tokens' | 'listings' | 'offers' | 'activity'>('tokens');
  const [listToken, setListToken] = useState<any>(null);
  const [editL, setEditL] = useState<OTCListing | null>(null);
  const [viewListId, setViewListId] = useState<bigint | null>(null);
  const [success, setSuccess] = useState<{ type: any; details?: any } | null>(null);

  const activeL = userListings.filter(l => l.active);
  const activeO = userOffers.filter(o => o.active);
  const loading = tokLoading || otcLoading;

  async function cancel(id: bigint) {
    if (!wc) return;
    try {
      toast.loading('Cancelling listing…');
      const tx = await wc.writeContract({ address: CONTRACTS.OTC, abi: OTC_ABI, functionName: 'cancelListing', args: [id], value: FEES.CANCEL });
      await publicClient.waitForTransactionReceipt({ hash: tx as `0x${string}` });
      toast.dismiss();
      setSuccess({ type: 'cancelled', details: { txHash: tx as `0x${string}` } });
    } catch (e: any) {
      toast.dismiss();
      toast.error(e?.shortMessage ?? 'Failed');
    }
  }

  async function cancelOffer(offerId: bigint) {
    if (!wc) {
      toast.error('Wallet not connected');
      return;
    }
    try {
      toast.loading('Cancelling offer… Assets returning to wallet');
      const tx = await wc.writeContract({
        address: CONTRACTS.OTC,
        abi: OTC_ABI,
        functionName: 'ignoreOffer',
        args: [offerId]
      });
      await publicClient.waitForTransactionReceipt({ hash: tx as `0x${string}` });
      toast.dismiss();
      toast.success('Offer cancelled. Assets returned to your wallet.');
    } catch (e: any) {
      toast.dismiss();
      toast.error(e?.shortMessage ?? 'Failed to cancel offer');
    }
  }

  if (!isConnected) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#08080F' }}>
        <Navbar /><LiveTicker />
        <div className="empty" style={{ flex: 1 }}>
          <div className="empty-icon">👛</div>
          <div className="empty-title">Connect your wallet</div>
          <div className="empty-desc">Connect to view your portfolio.</div>
        </div>
        <BottomBar />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#08080F' }}>
      <Navbar /><LiveTicker />

      <div style={{ padding: '20px 20px 0', flex: 1 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {[
            { id: 'tokens', label: `Tokens (${tokens.length})` },
            { id: 'listings', label: `Listings (${activeL.length})` },
            { id: 'offers', label: `Offers (${activeO.length})` },
            { id: 'activity', label: 'Activity' },
          ].map(t => (
            <button
              key={t.id}
              className={`sub-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id as any)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* OFFERS TAB */}
        {tab === 'offers' && !loading && (
          <div>
            {activeO.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">💬</div>
                <div className="empty-title">No active offers</div>
              </div>
            ) : (
              activeO.map((o: OTCOffer) => (
                <div key={o.id.toString()} style={{ padding: '14px 16px', background: '#0F0F1C', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245,166,35,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💬</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>Offer on Listing #{o.listingId.toString()}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{ago(o.createdAt)}</div>
                    </div>
                    <div style={{ textAlign: 'right', color: '#C8F000', fontWeight: 700 }}>
                      {fmtETH(o.offerAmount)} ETH
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => router.push(`/listing/${o.listingId}`)}>
                      👁 View Listing
                    </button>
                    <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => cancelOffer(o.id)}>
                      ✕ Cancel Offer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Other tabs (tokens, listings, activity) – add your existing code here if needed */}
      </div>

      <div style={{ height: 24 }} />
      <BottomBar />

      {listToken && <QuickListModal token={listToken} onClose={() => setListToken(null)} onSuccess={h => { setListToken(null); setSuccess({ type: 'listed', details: { txHash: h } }); }} />}
      {editL && <EditModal listing={editL} onClose={() => setEditL(null)} onSuccess={() => setEditL(null)} />}
      {viewListId !== null && <ListingDetailModal id={viewListId} userAddr={addr} onClose={() => setViewListId(null)} />}
      {success && <SuccessModal type={success.type} details={success.details} onClose={() => setSuccess(null)} />}
    </div>
  );
}
