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
import { CONTRACTS, FEES, KNOWN_TOKENS } from '@/lib/constants';
import { OTC_ABI, ERC20_ABI } from '@/abis';
import { short, fmtETH, fmtToken, ago, fillLabel, addrLink, tokenColor } from '@/lib/utils';

// ── OfferRow — shows full token name, amount, scan link for any offer ────────
function OfferRow({ o, isSeller, busy, onAccept }: {
  o: OTCOffer;
  isSeller: boolean;
  busy: boolean;
  onAccept: (id: bigint) => void;
}) {
  const ZERO = '0x0000000000000000000000000000000000000000';
  const isETH = o.offerToken === ZERO;
  const tokenInfo = useTokenInfo(isETH ? null : o.offerToken as `0x${string}`);

  const tokenName = isETH ? 'ETH' : (tokenInfo?.symbol ?? o.offerToken.slice(0,8)+'…');
  const tokenFull = isETH ? 'Ethereum (ETH)' : (tokenInfo ? `${tokenInfo.name} (${tokenInfo.symbol})` : o.offerToken);
  const decimals  = isETH ? 18 : (tokenInfo?.decimals ?? 18);
  const amountStr = isETH ? `${fmtETH(o.offerAmount)} ETH` : `${fmtToken(o.offerAmount, decimals)} ${tokenName}`;
  const isVerified = !isETH && !!KNOWN_TOKENS[o.offerToken.toLowerCase()]?.verified;

  return (
    <div style={{ padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,.03)', display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ width:32, height:32, borderRadius:'50%', background:'#1C1C35', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, fontFamily:'Space Mono,monospace', flexShrink:0, color:'#8888AA' }}>
        {o.offerMaker.slice(2,4).toUpperCase()}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
          <span style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'#8888AA' }}>{short(o.offerMaker)}</span>
          <span className={`badge ${o.forHalf ? 'badge-gold' : 'badge-lime'}`} style={{ fontSize:9 }}>{o.forHalf ? '50%' : '100%'}</span>
        </div>
        <div style={{ fontSize:10, color:'#44445A' }}>{ago(o.createdAt)}{o.message ? ` · "${o.message}"` : ''}</div>
      </div>
      <div style={{ textAlign:'right', marginRight: isSeller ? 10 : 0 }}>
        <div style={{ fontFamily:'Space Mono,monospace', fontSize:13, fontWeight:700, color:'#C8F000' }}>{amountStr}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:4, marginTop:2 }}>
          {isETH ? (
            <span style={{ fontSize:10, color:'#8888AA' }}>⟠ Ethereum</span>
          ) : (
            <>
              <span style={{ fontSize:10, color:'#8888AA' }}>{tokenFull}</span>
              {isVerified && <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:11, height:11, borderRadius:'50%', background:'#1DA1F2', color:'#fff', fontSize:7, fontWeight:900 }}>✓</span>}
              <a href={addrLink(o.offerToken)} target="_blank" rel="noopener noreferrer" className="scan-btn" style={{ fontSize:9 }}>🔍</a>
            </>
          )}
        </div>
      </div>
      {isSeller && (
        <button disabled={busy} onClick={() => onAccept(o.id)}
          style={{ padding:'6px 12px', background:'#00C805', border:'none', borderRadius:6, color:'#000', fontSize:11, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
          Accept
        </button>
      )}
    </div>
  );
}

// ── Listing Detail Modal ──────────────────────────────────────────────────────
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
  const [success, setSuccess] = useState<{ type: any; details?: any } | null>(null);

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
      setSuccess({ type: 'accepted', details: { txHash: tx as `0x${string}` } });
    } catch (e: any) { toast.dismiss(); toast.error(e?.shortMessage ?? 'Failed'); }
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
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>
              {info?.name ?? short(l.tokenAddress)}
              <span className="muted" style={{ fontSize: 14, fontWeight: 400, marginLeft: 6 }}>{info?.symbol}</span>
            </div>
            <div style={{ fontFamily: 'Space Mono,monospace', fontSize: 9, color: '#44445A', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              {l.tokenAddress}
              <a href={addrLink(l.tokenAddress)} target="_blank" rel="noopener noreferrer" className="scan-btn">🔍 BlockScan ↗</a>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className={`badge ${l.fillTerms === 0 ? 'badge-green' : 'badge-lime'}`}>{fillLabel(l.fillTerms)}</span>
              <span className="badge badge-lime">{l.acceptsAnyToken ? 'Any token' : 'ETH / USDT'}</span>
              <span className="badge badge-gold">Listing #{l.id.toString()}</span>
              <span className="badge badge-lime">Your Listing</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9, marginBottom: 14 }}>
          {[
            { k: 'Total Listed', v: fmtToken(l.totalAmount, info?.decimals ?? 18) },
            { k: 'Remaining', v: fmtToken(l.remainingAmount, info?.decimals ?? 18) },
            { k: 'Price (100%)', v: `${fmtETH(l.priceForFull)} ETH`, c: '#C8F000' },
            { k: 'Offers', v: l.offerCount.toString(), c: '#F5A623' },
          ].map(s => (
            <div key={s.k} style={{ background: '#0F0F1C', border: '1px solid rgba(255,255,255,.07)', borderRadius: 9, padding: 11, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#44445A', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4, fontFamily: 'Space Mono,monospace' }}>{s.k}</div>
              <div style={{ fontFamily: 'Space Mono,monospace', fontSize: 14, fontWeight: 700, color: s.c ?? '#fff' }}>{s.v}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8888AA', marginBottom: 5 }}>
            <span>Fill progress</span>
            <span style={{ color: filled > 0 ? '#00C805' : '#44445A' }}>{filled}% filled</span>
          </div>
          <div className="bar"><div className="bar-fill" style={{ width: `${filled}%` }} /></div>
        </div>

        {l.description && (
          <div style={{ padding: 12, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 8, fontSize: 12, color: '#8888AA', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 14 }}>
            "{l.description}"
          </div>
        )}

        {offers.length > 0 ? (
          <div style={{ background: '#0F0F1C', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '11px 14px', borderBottom: '1px solid rgba(255,255,255,.07)', fontSize: 13, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Active Offers
              <span className="badge badge-gold">{offers.length} offer{offers.length > 1 ? 's' : ''}</span>
            </div>
            {offers.map((o: OTCOffer) => (
              <OfferRow key={o.id.toString()} o={o} isSeller={true} busy={busy} onAccept={doAccept} />
            ))}
          </div>
        ) : (
          <div style={{ padding: '20px 14px', background: '#0F0F1C', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: '#44445A' }}>No active offers yet.</div>
          </div>
        )}

        <div style={{ padding: '12px 14px', background: 'rgba(200,240,0,.04)', border: '1px solid rgba(200,240,0,.12)', borderRadius: 8, fontSize: 12, color: '#8888AA', textAlign: 'center' }}>
          Go to Portfolio listings to <strong style={{ color: '#C8F000' }}>Edit</strong> or <strong style={{ color: '#FF4444' }}>Cancel</strong> this listing.
        </div>

        {success && <SuccessModal type={success.type} details={success.details} onClose={() => setSuccess(null)} />}
      </div>
    </div>
  );
}

// ── useTokenLookup Hook ───────────────────────────────────────────────────────
function useTokenLookup(ca: string, userAddress?: string) {
  const [info, setInfo] = useState<{ name: string; symbol: string; decimals: number; balance: bigint } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ca || !ca.startsWith('0x') || ca.length !== 42) { setInfo(null); return; }
    setLoading(true);
    const address = ca.toLowerCase() as `0x${string}`;
    Promise.all([
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'name' }),
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'symbol' }),
      publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'decimals' }),
      userAddress
        ? publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'balanceOf', args: [userAddress as `0x${string}`] })
        : Promise.resolve(BigInt(0)),
    ])
      .then(([name, symbol, decimals, balance]) => setInfo({ name: name as string, symbol: symbol as string, decimals: Number(decimals), balance: balance as bigint }))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [ca, userAddress]);

  return { info, loading };
}

// ── Quick List Modal ──────────────────────────────────────────────────────────
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
      toast.loading('Step 1/2 — Approving…');
      const ap = await wc.writeContract({ address: token.address as `0x${string}`, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACTS.OTC, tokenAmt] });
      await publicClient.waitForTransactionReceipt({ hash: ap as `0x${string}` });
      toast.dismiss(); toast.loading('Step 2/2 — Listing…');
      const tx = await wc.writeContract({ address: CONTRACTS.OTC, abi: OTC_ABI, functionName: 'listToken', args: [token.address as `0x${string}`, tokenAmt, priceWei, acceptedTokens, acceptsAny, fill, desc], value: FEES.LIST });
      await publicClient.waitForTransactionReceipt({ hash: tx as `0x${string}` });
      toast.dismiss(); onSuccess(tx as `0x${string}`);
    } catch (e: any) { toast.dismiss(); toast.error(e?.shortMessage ?? 'Failed'); }
    setBusy(false);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">List {token.name}</div>
        <div className="modal-sub">Listing fee: 0.002 ETH · 2 transactions</div>
        <div style={{ padding: '10px 14px', background: 'rgba(200,240,0,.06)', border: '1px solid rgba(200,240,0,.14)', borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
          Your balance: <strong style={{ color: '#C8F000' }}>{fmtToken(token.balance, token.decimals)} {token.symbol}</strong>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="label">① Accepted Payment — choose first</label>
          {PAY_MODES.map(o => (
            <div key={o.v} onClick={() => setPayMode(o.v)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', marginBottom: 7, borderRadius: 7, cursor: 'pointer', border: `1px solid ${payMode === o.v ? '#C8F000' : 'rgba(255,255,255,.1)'}`, background: payMode === o.v ? 'rgba(200,240,0,.07)' : '#1C1C35' }}>
              <span style={{ fontSize: 14 }}>{o.icon}</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700 }}>{o.l}</div><div style={{ fontSize: 10, color: '#8888AA' }}>{o.d}</div></div>
              {payMode === o.v && <span style={{ color: '#C8F000' }}>✓</span>}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="label">② Amount to List *</label>
            <input className="input" type="number" placeholder="e.g. 10000" value={amt} onChange={e => setAmt(e.target.value)} />
          </div>
          <div>
            <label className="label">{payMode === 1 ? '③ Price for 100% (USDT) *' : '③ Price for 100% (ETH) *'}</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type="number" placeholder={payMode === 1 ? 'e.g. 2500' : 'e.g. 0.1'} value={price} onChange={e => setPrice(e.target.value)} style={{ paddingRight: 50 }} />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#8888AA', fontFamily: 'Space Mono,monospace', pointerEvents: 'none' }}>{payMode === 1 ? 'USDT' : 'ETH'}</span>
            </div>
          </div>
        </div>
        {price && <div style={{ padding: '8px 12px', background: 'rgba(200,240,0,.06)', border: '1px solid rgba(200,240,0,.15)', borderRadius: 7, fontSize: 11, color: '#C8F000', marginBottom: 14 }}>50% = {(parseFloat(price || '0') / 2).toFixed(payMode === 1 ? 2 : 5)} {payMode === 1 ? 'USDT' : 'ETH'} · 100% = {price} {payMode === 1 ? 'USDT' : 'ETH'}</div>}
        <div style={{ marginBottom: 14 }}>
          <label className="label">④ Fill Terms</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[{ v: 0, l: '50% or 100%' }, { v: 1, l: '100% only' }].map(o => (
              <div key={o.v} onClick={() => setFill(o.v)} style={{ padding: '9px 12px', borderRadius: 7, cursor: 'pointer', textAlign: 'center', fontWeight: 700, fontSize: 12, border: `1px solid ${fill === o.v ? '#C8F000' : 'rgba(255,255,255,.1)'}`, background: fill === o.v ? 'rgba(200,240,0,.07)' : '#1C1C35' }}>{o.l}</div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="label">Description (optional)</label>
          <textarea className="input" rows={2} value={desc} onChange={e => setDesc(e.target.value)} style={{ resize: 'vertical' }} placeholder="Tell buyers about this token…" />
        </div>
        <button className="btn btn-lime" style={{ width: '100%', padding: '12px 0', fontSize: 14 }} disabled={busy || !price || !amt} onClick={submit}>
          {busy ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span className="spinner spinner-black" />Processing…</span> : 'Approve & List Token'}
        </button>
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ listing, onClose, onSuccess }: { listing: OTCListing; onClose: () => void; onSuccess: () => void }) {
  const { data: wc } = useWalletClient();
  const info = useTokenInfo(listing.tokenAddress);
  const [price, setPrice] = useState(fmtETH(listing.priceForFull, 6));
  const [fill, setFill] = useState(listing.fillTerms);
  const initPayMode = listing.acceptsAnyToken ? 2 : listing.acceptedTokens && listing.acceptedTokens.length > 0 ? 1 : 0;
  const [payMode, setPayMode] = useState(initPayMode);
  const [desc, setDesc] = useState(listing.description);
  const [busy, setBusy] = useState(false);

  const PAY_MODES = [
    { v: 0, icon: '⟠', l: 'ETH Only', d: 'Buyers must pay with ETH' },
    { v: 1, icon: '💵', l: 'USDT Only', d: 'Buyers must pay with USDT' },
    { v: 2, icon: '💱', l: 'ETH + USDT', d: 'Buyer can choose ETH or USDT' },
  ];

  async function submit() {
    if (!wc || !price) return;
    setBusy(true);
    try {
      const priceWei = parseEther(price);
      const acceptsAny = payMode === 2;
      const acceptedTokens: `0x${string}`[] = payMode === 1 ? [CONTRACTS.USDT] : [];
      toast.loading('Editing listing…');
      const tx = await wc.writeContract({ address: CONTRACTS.OTC, abi: OTC_ABI, functionName: 'editListing', args: [listing.id, priceWei, acceptedTokens, acceptsAny, fill, desc], value: FEES.EDIT });
      await publicClient.waitForTransactionReceipt({ hash: tx as `0x${string}` });
      toast.dismiss(); toast.success('Listing updated!'); onSuccess();
    } catch (e: any) { toast.dismiss(); toast.error(e?.shortMessage ?? 'Failed'); }
    setBusy(false);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">Edit Listing #{listing.id.toString()}</div>
        <div className="modal-sub">Edit fee: 0.001 ETH · Cannot change token or amount</div>
        <div style={{ padding: '9px 12px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 8, fontSize: 12, color: '#8888AA', marginBottom: 16 }}>
          Token: <strong style={{ color: '#fff' }}>{info?.name ?? short(listing.tokenAddress)}</strong>
          &nbsp;· Remaining: <strong style={{ color: '#C8F000' }}>{fmtToken(listing.remainingAmount, info?.decimals ?? 18)} {info?.symbol}</strong>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="label">① Accepted Payment</label>
          {PAY_MODES.map(o => (
            <div key={o.v} onClick={() => setPayMode(o.v)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', marginBottom: 7, borderRadius: 7, cursor: 'pointer', border: `1px solid ${payMode === o.v ? '#C8F000' : 'rgba(255,255,255,.1)'}`, background: payMode === o.v ? 'rgba(200,240,0,.07)' : '#1C1C35' }}>
              <span style={{ fontSize: 14 }}>{o.icon}</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700 }}>{o.l}</div><div style={{ fontSize: 10, color: '#8888AA' }}>{o.d}</div></div>
              {payMode === o.v && <span style={{ color: '#C8F000' }}>✓</span>}
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="label">② New Price for 100% {payMode === 1 ? '(USDT)' : '(ETH)'}</label>
          <div style={{ position: 'relative' }}>
            <input className="input" type="number" value={price} onChange={e => setPrice(e.target.value)} style={{ paddingRight: 50 }} />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#8888AA', fontFamily: 'Space Mono,monospace', pointerEvents: 'none' }}>{payMode === 1 ? 'USDT' : 'ETH'}</span>
          </div>
        </div>
        {price && <div style={{ padding: '8px 12px', background: 'rgba(200,240,0,.06)', border: '1px solid rgba(200,240,0,.14)', borderRadius: 7, fontSize: 11, color: '#C8F000', marginBottom: 14 }}>50% = {(parseFloat(price || '0') / 2).toFixed(payMode === 1 ? 2 : 5)} {payMode === 1 ? 'USDT' : 'ETH'} · 100% = {price} {payMode === 1 ? 'USDT' : 'ETH'}</div>}
        <div style={{ marginBottom: 14 }}>
          <label className="label">③ Fill Terms</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[{ v: 0, l: '50% or 100%' }, { v: 1, l: '100% only' }].map(o => (
              <div key={o.v} onClick={() => setFill(o.v)} style={{ padding: '9px 12px', borderRadius: 7, cursor: 'pointer', textAlign: 'center', fontWeight: 700, fontSize: 12, border: `1px solid ${fill === o.v ? '#C8F000' : 'rgba(255,255,255,.1)'}`, background: fill === o.v ? 'rgba(200,240,0,.07)' : '#1C1C35' }}>{o.l}</div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={desc} onChange={e => setDesc(e.target.value)} style={{ resize: 'vertical' }} />
        </div>
        <button className="btn btn-lime" style={{ width: '100%', padding: '12px 0', fontSize: 14 }} disabled={busy || !price} onClick={submit}>
          {busy ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span className="spinner spinner-black" />Updating…</span> : 'Save Changes — 0.001 ETH'}
        </button>
      </div>
    </div>
  );
}

// ── Withdraw Offer Modal ──────────────────────────────────────────────────────
// The deployed contract's ignoreOffer requires msg.sender == seller.
// There is no buyer-side withdrawal function in this contract.
// This modal explains the situation clearly and gives the buyer action options.
function WithdrawOfferModal({ offer, onClose }: { offer: OTCOffer; onClose: () => void }) {
  const router = useRouter();
  const ZERO = '0x0000000000000000000000000000000000000000';
  const offerAmt = offer.offerToken === ZERO ? `${fmtETH(offer.offerAmount)} ETH` : fmtToken(offer.offerAmount, 6) + ' USDT';
  const listingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/listing/${offer.listingId.toString()}`;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>💬</div>
          <div className="modal-title">Withdraw Your Offer</div>
          <div className="modal-sub">Offer #{offer.id.toString()} · {offerAmt} locked in escrow</div>
        </div>

        <div style={{ padding: '14px', background: 'rgba(245,166,35,.07)', border: '1px solid rgba(245,166,35,.2)', borderRadius: 10, marginBottom: 16, fontSize: 12, color: '#F5A623', lineHeight: 1.7 }}>
          <strong>How to get your {offerAmt} back:</strong><br />
          Your funds are safely locked in the escrow contract. The seller must either:<br />
          • <strong>Accept your offer</strong> → you get the tokens, seller gets your funds<br />
          • <strong>Ignore your offer</strong> → your {offerAmt} is returned to you instantly<br />
          • <strong>Cancel their listing</strong> → all offers including yours are returned automatically
        </div>

        <div style={{ fontSize: 12, color: '#8888AA', marginBottom: 16, lineHeight: 1.6, padding: '0 2px' }}>
          To request your funds back, go to the listing page and contact the seller. You can share the listing link with the seller directly.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-lime" style={{ width: '100%', padding: '11px 0', fontSize: 13 }}
            onClick={() => { router.push(`/listing/${offer.listingId.toString()}`); onClose(); }}>
            👁 Go to Listing — Request Return
          </button>
          <button onClick={() => {
            navigator.clipboard?.writeText(listingUrl);
            toast.success('Listing link copied! Send it to the seller.');
          }}
            style={{ width: '100%', padding: '11px 0', fontSize: 13, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 20, color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 700 }}>
            📋 Copy Listing Link
          </button>
          <button className="btn btn-ghost" style={{ width: '100%', padding: '10px 0', fontSize: 13 }} onClick={onClose}>
            Keep Offer Active
          </button>
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: '#44445A', textAlign: 'center', lineHeight: 1.5 }}>
          Your {offerAmt} is fully secured by the smart contract and cannot be taken by anyone. It will return to your wallet the moment the seller responds.
        </div>
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
  const [withdrawOffer, setWithdrawOffer] = useState<OTCOffer | null>(null);
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
    } catch (e: any) { toast.dismiss(); toast.error(e?.shortMessage ?? 'Failed'); }
  }

  if (!isConnected) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#08080F' }}>
        <Navbar /><LiveTicker />
        <div className="empty" style={{ flex: 1 }}>
          <div className="empty-icon">👛</div>
          <div className="empty-title">Connect your wallet</div>
          <div className="empty-desc">Connect to view your tokens, listings, offers and activity.</div>
        </div>
        <BottomBar />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#08080F' }}>
      <Navbar /><LiveTicker />

      <div style={{ padding: '20px 20px 0', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: '#0F0F1C', border: '1px solid rgba(200,240,0,.14)', borderRadius: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(200,240,0,.08)', border: '2px solid rgba(200,240,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>👤</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Space Mono,monospace', fontSize: 12, fontWeight: 700 }}>{address}</div>
            <div style={{ fontSize: 11, color: '#8888AA', marginTop: 2 }}>Connected · Robinhood Chain Testnet · Chain 46630</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6 }}
              onClick={() => navigator.clipboard?.writeText(address ?? '').then(() => toast.success('Copied!'))}>📋 Copy</button>
            <a href={addrLink(address ?? '')} target="_blank" rel="noopener noreferrer" className="scan-btn" style={{ padding: '6px 10px', fontSize: 11 }}>🔍 BlockScan</a>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { l: 'ETH Balance', v: `${fmtETH(ethBal, 4)} ETH`, c: '#C8F000' },
            { l: 'Tokens', v: tokens.length.toString(), c: '#fff' },
            { l: 'Active Listings', v: activeL.length.toString(), c: '#F5A623' },
            { l: 'Active Offers', v: activeO.length.toString(), c: '#F5A623' },
            { l: 'Total Listings', v: userListings.length.toString(), c: '#00C805' },
          ].map(s => (
            <div key={s.l} style={{ background: '#0F0F1C', border: '1px solid rgba(255,255,255,.07)', borderRadius: 9, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#44445A', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4, fontFamily: 'Space Mono,monospace' }}>{s.l}</div>
              <div style={{ fontFamily: 'Space Mono,monospace', fontSize: 16, fontWeight: 700, color: s.c }}>{s.v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {([
            { id: 'tokens', l: `Tokens (${tokens.length + 1})` },
            { id: 'listings', l: `Listings (${activeL.length})` },
            { id: 'offers', l: `Offers (${activeO.length})` },
            { id: 'activity', l: 'Activity' },
          ] as const).map(t => (
            <button key={t.id} className={`sub-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.l}</button>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>}

        {/* TOKENS */}
        {!loading && tab === 'tokens' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: '#0F0F1C', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(98,126,234,.1)', border: '1px solid rgba(98,126,234,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⟠</div>
                <div><div style={{ fontSize: 13, fontWeight: 700 }}>Ethereum</div><div style={{ fontSize: 10, color: '#44445A', fontFamily: 'Space Mono,monospace', marginTop: 1 }}>Native token</div></div>
              </div>
              <div style={{ fontFamily: 'Space Mono,monospace', fontSize: 13, fontWeight: 700 }}>{fmtETH(ethBal, 6)} ETH</div>
            </div>
            {tokens.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#44445A', marginBottom: 10 }}>No ERC-20 tokens found in your wallet.</div>
                <a href="/faucet" style={{ color: '#C8F000', fontSize: 12, textDecoration: 'none' }}>Claim free USDT from the faucet →</a>
              </div>
            ) : tokens.map(t => (
              <div key={t.address} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: '#0F0F1C', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, marginBottom: 8, cursor: 'pointer' }}
                onClick={() => setListToken(t)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: t.color + '20', border: '1px solid ' + t.color + '40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, fontFamily: 'Space Mono,monospace', color: t.color, flexShrink: 0 }}>{t.symbol.slice(0, 2)}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{t.name} <span style={{ fontSize: 10, color: '#44445A', fontWeight: 400 }}>{t.symbol}</span></div>
                    <div style={{ fontSize: 9, color: '#44445A', fontFamily: 'Space Mono,monospace', marginTop: 2, display: 'flex', gap: 5, alignItems: 'center' }}>
                      {short(t.address)}<a href={addrLink(t.address)} target="_blank" rel="noopener noreferrer" className="scan-btn" onClick={e => e.stopPropagation()}>🔍</a>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Space Mono,monospace', fontSize: 13, fontWeight: 700 }}>{fmtToken(t.balance, t.decimals)} {t.symbol}</div>
                  <div style={{ fontSize: 10, color: '#C8F000', marginTop: 3 }}>Click to list →</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LISTINGS */}
        {!loading && tab === 'listings' && (
          <div>
            {activeL.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📋</div>
                <div className="empty-title">No active listings</div>
                <div className="empty-desc">Go to Token OTC to list your tokens.</div>
                <a href="/otc"><button className="btn btn-lime" style={{ marginTop: 18, padding: '10px 22px', fontSize: 13 }}>Go to OTC Market</button></a>
              </div>
            ) : activeL.map(l => {
              const filled = l.totalAmount > 0n ? Number((l.totalAmount - l.remainingAmount) * 100n / l.totalAmount) : 0;
              return (
                <div key={l.id.toString()} style={{ padding: '14px 16px', background: '#0F0F1C', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 10 }} onClick={() => router.push(`/listing/${l.id.toString()}`)}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(200,240,0,.08)', border: '1px solid rgba(200,240,0,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🪙</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Listing #{l.id.toString()} <span style={{ fontSize: 10, color: '#44445A', fontWeight: 400, marginLeft: 6 }}>{short(l.tokenAddress)}</span></div>
                      <div style={{ fontSize: 11, color: '#8888AA', marginTop: 2 }}>{fmtETH(l.priceForFull)} ETH · {fillLabel(l.fillTerms)} · {filled}% filled</div>
                      <div style={{ fontSize: 10, color: '#44445A', marginTop: 2, fontFamily: 'Space Mono,monospace' }}>Listed {ago(l.createdAt)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Space Mono,monospace', fontSize: 13, fontWeight: 700, color: '#C8F000' }}>{fmtETH(l.priceForFull)} ETH</div>
                      <span className="badge badge-gold" style={{ marginTop: 5, display: 'inline-block' }}>💬 {l.offerCount.toString()} offer{l.offerCount.toString() !== '1' ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="bar" style={{ marginBottom: 10 }}><div className="bar-fill" style={{ width: `${filled}%` }} /></div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" style={{ flex: 1, padding: '7px 0', fontSize: 12 }} onClick={() => router.push(`/listing/${l.id.toString()}`)}>👁 View Offers</button>
                    <button className="btn btn-ghost" style={{ flex: 1, padding: '7px 0', fontSize: 12 }} onClick={() => setEditL(l)}>✏️ Edit</button>
                    <button className="btn btn-danger" style={{ flex: 1, padding: '7px 0', fontSize: 12 }} onClick={() => cancel(l.id)}>✕ Cancel</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* OFFERS */}
        {!loading && tab === 'offers' && (
          <div>
            {activeO.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">💬</div>
                <div className="empty-title">No active offers</div>
                <div className="empty-desc">Make offers on listings in the Token OTC market.</div>
              </div>
            ) : (
              <>
                <div style={{ padding: '10px 14px', background: 'rgba(245,166,35,.07)', border: '1px solid rgba(245,166,35,.2)', borderRadius: 8, marginBottom: 14, fontSize: 12, color: '#F5A623' }}>
                  ℹ️ Your offer funds are locked in escrow. To withdraw, visit the listing and ask the seller to return your offer, or wait for the listing to be cancelled.
                </div>
                {activeO.map((o: OTCOffer) => {
                  const ZERO = '0x0000000000000000000000000000000000000000';
                  const offerAmt = o.offerToken === ZERO ? `${fmtETH(o.offerAmount)} ETH` : fmtToken(o.offerAmount, 6) + ' USDT';
                  return (
                    <div key={o.id.toString()} style={{ padding: '14px 16px', background: '#0F0F1C', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245,166,35,.08)', border: '1px solid rgba(245,166,35,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>💬</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>Offer on Listing #{o.listingId.toString()}</div>
                          <div style={{ fontSize: 11, color: '#8888AA', marginTop: 3 }}>
                            {o.forHalf ? '50%' : '100%'} fill · {o.offerToken === ZERO ? 'ETH' : 'USDT'} · {ago(o.createdAt)}
                          </div>
                          {o.message && <div style={{ fontSize: 10, color: '#44445A', fontStyle: 'italic', marginTop: 2 }}>"{o.message}"</div>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'Space Mono,monospace', fontSize: 14, fontWeight: 700, color: '#C8F000' }}>{offerAmt}</div>
                          <span className="badge badge-gold" style={{ marginTop: 5, display: 'inline-block' }}>IN ESCROW</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost" style={{ flex: 1, padding: '7px 0', fontSize: 12 }}
                          onClick={() => router.push(`/listing/${o.listingId.toString()}`)}>
                          👁 View Listing
                        </button>
                        <button
                          style={{ flex: 1, padding: '7px 0', fontSize: 12, background: 'rgba(255,68,68,.08)', border: '1px solid rgba(255,68,68,.25)', borderRadius: 8, color: '#FF6666', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 700 }}
                          onClick={() => setWithdrawOffer(o)}>
                          ↩️ Withdraw Offer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ACTIVITY */}
        {!loading && tab === 'activity' && (
          <div>
            {userListings.length === 0 && userOffers.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📊</div>
                <div className="empty-title">No activity yet</div>
                <div className="empty-desc">Your trades, listings and offers will appear here.</div>
              </div>
            ) : (
              <table className="tbl">
                <thead><tr><th>Type</th><th>Item</th><th className="r">Amount</th><th className="r">Status</th><th className="r">Time</th></tr></thead>
                <tbody>
                  {[...userListings.map(l => ({ ...l, _type: 'LISTED' })), ...userOffers.map(o => ({ ...o, _type: 'OFFERED' }))]
                    .sort((a, b) => Number((b as any).createdAt - (a as any).createdAt))
                    .slice(0, 30)
                    .map((item: any, i) => (
                      <tr key={i}>
                        <td><span className={`badge ${item._type === 'LISTED' ? 'badge-lime' : 'badge-gold'}`}>{item._type}</span></td>
                        <td style={{ fontSize: 12 }}>{item._type === 'LISTED' ? `Listing #${item.id}` : `Offer on #${item.listingId}`}</td>
                        <td className="r mono" style={{ fontSize: 11, color: '#C8F000' }}>{item._type === 'LISTED' ? `${fmtETH(item.priceForFull)} ETH` : `${fmtETH(item.offerAmount ?? 0n)} ETH`}</td>
                        <td className="r"><span style={{ fontSize: 10, color: item.active ? '#00C805' : '#44445A' }}>{item.active ? 'Active' : 'Closed'}</span></td>
                        <td className="r muted mono" style={{ fontSize: 10 }}>{ago(item.createdAt)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <div style={{ height: 24 }} />
      <BottomBar />

      {listToken && <QuickListModal token={listToken} onClose={() => setListToken(null)} onSuccess={h => { setListToken(null); setSuccess({ type: 'listed', details: { txHash: h } }); }} />}
      {editL && <EditModal listing={editL} onClose={() => setEditL(null)} onSuccess={() => setEditL(null)} />}
      {viewListId !== null && <ListingDetailModal id={viewListId} userAddr={addr} onClose={() => setViewListId(null)} />}
      {withdrawOffer && <WithdrawOfferModal offer={withdrawOffer} onClose={() => setWithdrawOffer(null)} />}
      {success && <SuccessModal type={success.type} details={success.details} onClose={() => setSuccess(null)} />}
    </div>
  );
}
