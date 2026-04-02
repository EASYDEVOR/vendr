'use client';
import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { parseEther, parseUnits } from 'viem';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import LiveTicker from '@/components/LiveTicker';
import BottomBar from '@/components/BottomBar';
import SuccessModal from '@/components/SuccessModal';
import { publicClient } from '@/lib/client';
import { useOTCListings, OTCListing } from '@/hooks/useOTC';
import { useTokenInfo } from '@/hooks/useWallet';
import { CONTRACTS, FEES, KNOWN_TOKENS } from '@/lib/constants';
import { OTC_ABI, ERC20_ABI } from '@/abis';
import { short, fmtETH, fmtToken, ago, fillLabel, addrLink, tokenColor } from '@/lib/utils';

// ── helpers ────────────────────────────────────────────────────────────────────
function VerifiedBadge() {
  return (
    <span title="Verified token" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:14, height:14, borderRadius:'50%', background:'#1DA1F2', color:'#fff', fontSize:8, fontWeight:900, marginLeft:3, flexShrink:0 }}>✓</span>
  );
}

function Avatar({ address, size }: { address: string; size: number }) {
  const info = useTokenInfo(address as `0x${string}`);
  const sym = info?.symbol?.slice(0,2) ?? '??';
  const col = info ? tokenColor(info.symbol) : '#C8F000';
  const verified = !!KNOWN_TOKENS[address.toLowerCase()]?.verified;
  return (
    <div style={{ position:'relative', flexShrink:0 }}>
      <div style={{ width:size, height:size, borderRadius:'50%', background:col+'20', border:'1px solid '+col+'40', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.32, fontWeight:900, fontFamily:'Space Mono,monospace', color:col }}>
        {sym}
      </div>
      {verified && <span style={{ position:'absolute', bottom:-1, right:-1, width:12, height:12, borderRadius:'50%', background:'#1DA1F2', border:'2px solid #08080F', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, color:'#fff', fontWeight:900 }}>✓</span>}
    </div>
  );
}

// resolve payment mode from contract fields
function payMode(l: OTCListing): 'eth' | 'usdt' | 'both' {
  if (l.acceptsAnyToken) return 'both';
  if (l.acceptedTokens && l.acceptedTokens.length > 0) return 'usdt';
  return 'eth';
}

function Row({ l }: { l: OTCListing }) {
  const info = useTokenInfo(l.tokenAddress);
  const router = useRouter();
  const filled = l.totalAmount > 0n ? Number((l.totalAmount - l.remainingAmount) * 100n / l.totalAmount) : 0;
  const pm = payMode(l);
  return (
    <tr onClick={() => router.push(`/listing/${l.id.toString()}`)}>
      <td className="muted mono" style={{ fontSize:11 }}>#{l.id.toString()}</td>
      <td>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <Avatar address={l.tokenAddress} size={30} />
          <div>
            <div style={{ fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:2 }}>
              {info?.name ?? short(l.tokenAddress)}
              {KNOWN_TOKENS[l.tokenAddress.toLowerCase()]?.verified && <VerifiedBadge />}
              <span className="muted" style={{ fontWeight:400, fontSize:10, marginLeft:3 }}>{info?.symbol}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
              <span className="mono muted" style={{ fontSize:9 }}>{short(l.tokenAddress)}</span>
              <a href={addrLink(l.tokenAddress)} target="_blank" rel="noopener noreferrer" className="scan-btn" onClick={e => e.stopPropagation()}>🔍 Scan</a>
            </div>
          </div>
        </div>
      </td>
      <td className="r mono" style={{ fontSize:11 }}>{fmtToken(l.remainingAmount, info?.decimals??18)}</td>
      <td className="r mono" style={{ fontSize:11, color:'#C8F000' }}>{fmtETH(l.priceForFull)} ETH</td>
      <td className="r" style={{ fontSize:11 }}>{pm==='eth'?'ETH':pm==='usdt'?'USDT':'ETH+USDT'}</td>
      <td className="r"><span className={`badge ${l.fillTerms===0?'badge-green':'badge-lime'}`} style={{ fontSize:9 }}>{fillLabel(l.fillTerms)}</span></td>
      <td className="r">
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
          <span style={{ fontSize:11, color:filled>0?'#00C805':'#44445A' }}>{filled}%</span>
          <div className="bar" style={{ width:52 }}><div className="bar-fill" style={{ width:`${filled}%` }} /></div>
        </div>
      </td>
      <td className="r"><span className="badge badge-gold" style={{ fontSize:9 }}>💬 {l.offerCount.toString()}</span></td>
      <td className="r muted mono" style={{ fontSize:10 }}>{ago(l.createdAt)}</td>
      <td className="r" onClick={e=>e.stopPropagation()}>
        <button className="btn btn-lime" style={{ padding:'5px 9px', fontSize:11, borderRadius:6 }}
          onClick={() => router.push(`/listing/${l.id.toString()}`)}>View</button>
      </td>
    </tr>
  );
}

function SettledRow({ l }: { l: OTCListing }) {
  const info = useTokenInfo(l.tokenAddress);
  const filled = l.totalAmount > 0n ? Number((l.totalAmount - l.remainingAmount)*100n/l.totalAmount) : 0;
  return (
    <tr>
      <td className="muted mono" style={{ fontSize:11 }}>#{l.id.toString()}</td>
      <td>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Avatar address={l.tokenAddress} size={26} />
          <div>
            <div style={{ fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:2 }}>
              {info?.name ?? short(l.tokenAddress)}
              {KNOWN_TOKENS[l.tokenAddress.toLowerCase()]?.verified && <VerifiedBadge />}
              <span className="muted" style={{ fontWeight:400, fontSize:10, marginLeft:3 }}>{info?.symbol}</span>
            </div>
            <a href={addrLink(l.tokenAddress)} target="_blank" rel="noopener noreferrer" className="scan-btn">🔍</a>
          </div>
        </div>
      </td>
      <td className="r mono" style={{ fontSize:11 }}>{fmtToken(l.totalAmount, info?.decimals??18)}</td>
      <td className="r mono" style={{ fontSize:11 }}>{fmtETH(l.priceForFull)} ETH</td>
      <td className="r">
        <span style={{ fontSize:11, color:filled===100?'#00C805':filled>0?'#F5A623':'#44445A' }}>
          {filled===100?'✅ Fully Sold':filled>0?`${filled}% Sold`:'↩️ Cancelled'}
        </span>
      </td>
      <td className="r muted mono" style={{ fontSize:10 }}>{short(l.seller)}</td>
      <td className="r muted mono" style={{ fontSize:10 }}>{ago(l.createdAt)}</td>
    </tr>
  );
}

// ── Shared token lookup hook (auto-lookups when CA changes) ────────────────────
function useTokenLookup(ca: string, userAddress?: string) {
  const [info, setInfo] = useState<{ name:string; symbol:string; decimals:number; balance:bigint } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ca || !ca.startsWith('0x') || ca.length !== 42) { setInfo(null); return; }
    setLoading(true);
    const addr = ca.toLowerCase();
    const known = KNOWN_TOKENS[addr];
    const calls: Promise<any>[] = known
      ? [
          Promise.resolve(known.name),
          Promise.resolve(known.symbol),
          publicClient.readContract({ address:ca as `0x${string}`, abi:ERC20_ABI, functionName:'decimals' }),
        ]
      : [
          publicClient.readContract({ address:ca as `0x${string}`, abi:ERC20_ABI, functionName:'name' }),
          publicClient.readContract({ address:ca as `0x${string}`, abi:ERC20_ABI, functionName:'symbol' }),
          publicClient.readContract({ address:ca as `0x${string}`, abi:ERC20_ABI, functionName:'decimals' }),
        ];
    if (userAddress) calls.push(publicClient.readContract({ address:ca as `0x${string}`, abi:ERC20_ABI, functionName:'balanceOf', args:[userAddress as `0x${string}`] }));

    Promise.all(calls)
      .then(([n,s,d,bal]) => setInfo({ name:n as string, symbol:s as string, decimals:Number(d), balance:(bal??BigInt(0)) as bigint }))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [ca, userAddress]);

  return { info, loading };
}

// ── List Modal ─────────────────────────────────────────────────────────────────
function ListModal({ onClose, onSuccess }: { onClose:()=>void; onSuccess:(h:`0x${string}`)=>void }) {
  const { data:wc } = useWalletClient();
  const { address } = useAccount();
  const [tokenCA, setTokenCA] = useState('');
  const { info:tokenInfo, loading:lookupLoading } = useTokenLookup(tokenCA, address);
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [fill, setFill] = useState(0);
  const [payMode, setPayMode] = useState(0); // 0=ETH 1=USDT 2=ETH+USDT
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);

  const SUGGESTED = Object.entries(KNOWN_TOKENS).map(([addr,t])=>({ addr, ...t }));
  const PAY_MODES = [
    { v:0, icon:'⟠', l:'ETH Only',   d:'Buyers must pay with ETH' },
    { v:1, icon:'💵', l:'USDT Only',  d:'Buyers must pay with USDT' },
    { v:2, icon:'💱', l:'ETH + USDT', d:'Buyer can choose ETH or USDT' },
  ];

  async function submit() {
    if (!wc || !tokenInfo || !amount || !price) return;
    setBusy(true);
    try {
      const addr = tokenCA as `0x${string}`;
      const tokenAmt = parseUnits(amount, tokenInfo.decimals);
      const priceWei = parseEther(price);
      const acceptsAny = payMode === 2;
      const acceptedTokens: `0x${string}`[] = payMode === 1 ? [CONTRACTS.USDT] : [];

      setStep(1);
      toast.loading('Step 1/2 — Approving token…');
      const ap = await wc.writeContract({ address:addr, abi:ERC20_ABI, functionName:'approve', args:[CONTRACTS.OTC, tokenAmt] });
      await publicClient.waitForTransactionReceipt({ hash:ap as `0x${string}` });
      toast.dismiss(); toast.success('Approved!');

      setStep(2);
      toast.loading('Step 2/2 — Listing…');
      const tx = await wc.writeContract({
        address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'listToken',
        args:[addr, tokenAmt, priceWei, acceptedTokens, acceptsAny, fill, desc],
        value:FEES.LIST,
      });
      await publicClient.waitForTransactionReceipt({ hash:tx as `0x${string}` });
      toast.dismiss();
      onSuccess(tx as `0x${string}`);
    } catch(e:any){ toast.dismiss(); toast.error(e?.shortMessage??'Transaction failed'); setStep(0); }
    setBusy(false);
  }

  const balOk = tokenInfo && tokenInfo.balance > 0n;
  const overBal = tokenInfo && amount && parseFloat(amount) > 0 && parseUnits(amount, tokenInfo.decimals) > tokenInfo.balance;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth:500 }} onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">List Your Token</div>
        <div className="modal-sub">Fee: 0.002 ETH · 2 transactions</div>

        {/* Steps */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
          {['Approve','List'].map((lbl,i) => (
            <div key={lbl} style={{ display:'flex', alignItems:'center', gap:6, flex:i<1?'none':1 }}>
              <div className={`step ${step>i?'step-done':step===i?'step-active':'step-todo'}`}>{step>i?'✓':i+1}</div>
              <span style={{ fontSize:11, color:'#8888AA' }}>{lbl}</span>
              {i<1 && <div style={{ flex:1, height:1, background:'rgba(255,255,255,.1)' }} />}
            </div>
          ))}
        </div>

        {/* Suggested tokens */}
        <div style={{ marginBottom:12 }}>
          <label className="label">Suggested Tokens</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {SUGGESTED.map(t => (
              <button key={t.addr} onClick={() => setTokenCA(t.addr)}
                style={{ padding:'4px 10px', background:tokenCA===t.addr?'rgba(200,240,0,.1)':'rgba(255,255,255,.04)', border:`1px solid ${tokenCA===t.addr?'#C8F000':'rgba(255,255,255,.1)'}`, borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', color:tokenCA===t.addr?'#C8F000':'#8888AA', fontFamily:'DM Sans,sans-serif', display:'flex', alignItems:'center', gap:3 }}>
                {t.symbol} {t.verified && <span style={{ color:'#1DA1F2', fontSize:10 }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Token CA — auto-lookup on change */}
        <div style={{ marginBottom:14 }}>
          <label className="label">Token Contract Address *</label>
          <input className="input" placeholder="0x… (auto-looks up as you type)" value={tokenCA} onChange={e=>setTokenCA(e.target.value)} />
          {lookupLoading && <div style={{ marginTop:5, fontSize:11, color:'#8888AA' }}>Looking up token…</div>}
          {tokenInfo && !lookupLoading && (
            <div style={{ marginTop:6, padding:'8px 10px', background:balOk?'rgba(0,200,5,.07)':'rgba(245,166,35,.07)', border:`1px solid ${balOk?'rgba(0,200,5,.2)':'rgba(245,166,35,.2)'}`, borderRadius:6, fontSize:11, color:balOk?'#00C805':'#F5A623' }}>
              {KNOWN_TOKENS[tokenCA.toLowerCase()]?.verified && <span style={{ marginRight:5 }}>✅ Verified</span>}
              {tokenInfo.name} ({tokenInfo.symbol}) · {tokenInfo.decimals} decimals
              · Balance: <strong>{fmtToken(tokenInfo.balance, tokenInfo.decimals)} {tokenInfo.symbol}</strong>
              {!balOk && ' ⚠️ You have 0 of this token'}
            </div>
          )}
          {tokenCA.length===42 && !tokenInfo && !lookupLoading && (
            <div style={{ marginTop:5, fontSize:11, color:'#FF4444' }}>Token not found on Robinhood Chain</div>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
          <div>
            <label className="label">Amount to List *</label>
            <input className="input" type="number" placeholder="e.g. 50000" value={amount} onChange={e=>setAmount(e.target.value)} />
            {overBal && <div style={{ fontSize:10, color:'#FF4444', marginTop:4 }}>⚠️ Exceeds your balance</div>}
          </div>
          <div>
            <label className="label">Price for 100% (ETH) *</label>
            <input className="input" type="number" placeholder="e.g. 0.15" value={price} onChange={e=>setPrice(e.target.value)} />
          </div>
        </div>

        {price && fill===0 && (
          <div style={{ padding:'8px 12px', background:'rgba(200,240,0,.06)', border:'1px solid rgba(200,240,0,.15)', borderRadius:7, fontSize:11, color:'#C8F000', marginBottom:14 }}>
            50% = {(parseFloat(price)/2).toFixed(5)} ETH · 100% = {price} ETH
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <label className="label">Fill Terms</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[{v:0,l:'50% or 100%',d:'Buyers can fill half or all'},{v:1,l:'100% only',d:'Must buy everything'}].map(o=>(
              <div key={o.v} onClick={()=>setFill(o.v)} style={{ padding:10, borderRadius:7, cursor:'pointer', border:`1px solid ${fill===o.v?'#C8F000':'rgba(255,255,255,.1)'}`, background:fill===o.v?'rgba(200,240,0,.07)':'#1C1C35' }}>
                <div style={{ fontSize:12, fontWeight:700, marginBottom:2 }}>{o.l}</div>
                <div style={{ fontSize:10, color:'#8888AA' }}>{o.d}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label className="label">Accepted Payment</label>
          {PAY_MODES.map(o=>(
            <div key={o.v} onClick={()=>setPayMode(o.v)} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', marginBottom:7, borderRadius:7, cursor:'pointer', border:`1px solid ${payMode===o.v?'#C8F000':'rgba(255,255,255,.1)'}`, background:payMode===o.v?'rgba(200,240,0,.07)':'#1C1C35' }}>
              <span style={{ fontSize:14 }}>{o.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700 }}>{o.l}</div>
                <div style={{ fontSize:10, color:'#8888AA' }}>{o.d}</div>
              </div>
              {payMode===o.v && <span style={{ color:'#C8F000', fontSize:14 }}>✓</span>}
            </div>
          ))}
        </div>

        <div style={{ marginBottom:16 }}>
          <label className="label">Description (optional)</label>
          <textarea className="input" rows={2} placeholder="Tell buyers about this token…" value={desc} onChange={e=>setDesc(e.target.value)} style={{ resize:'vertical' }} />
        </div>

        <div style={{ padding:'10px 14px', background:'rgba(200,240,0,.05)', border:'1px solid rgba(200,240,0,.14)', borderRadius:7, fontSize:11, color:'#8888AA', marginBottom:16 }}>
          Protocol fee: <strong style={{ color:'#C8F000' }}>0.002 ETH</strong> (non-refundable)
        </div>

        <button className="btn btn-lime" style={{ width:'100%', padding:'12px 0', fontSize:14 }} disabled={busy||!tokenInfo||!amount||!price||!!overBal} onClick={submit}>
          {busy ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><span className="spinner spinner-black"/>Processing…</span> : 'Approve & List Token'}
        </button>
      </div>
    </div>
  );
}

// ── Main OTC Page ──────────────────────────────────────────────────────────────
export default function OTCPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const { listings, settled, loading, error, refetch } = useOTCListings();
  const [showList, setShowList] = useState(false);
  const [tab, setTab] = useState<'listed'|'settled'>('listed');
  const [search, setSearch] = useState('');
  const [success, setSuccess] = useState<{type:any;details?:any}|null>(null);

  const filtered = listings.filter(l => search==='' || l.tokenAddress.toLowerCase().includes(search.toLowerCase()));
  const filteredSettled = settled.filter(l => search==='' || l.tokenAddress.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#08080F' }}>
      <Navbar />
      <LiveTicker />

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 20px', borderBottom:'1px solid rgba(255,255,255,.07)', background:'#0F0F1C' }}>
        <div style={{ display:'flex', gap:4 }}>
          <button className={`sub-tab ${tab==='listed'?'active':''}`} onClick={()=>setTab('listed')}>
            Listed Market {!loading && <span style={{ fontSize:10, color:'#8888AA', marginLeft:4 }}>({listings.length})</span>}
          </button>
          <button className={`sub-tab ${tab==='settled'?'active':''}`} onClick={()=>setTab('settled')}>
            Settled Market {!loading && <span style={{ fontSize:10, color:'#8888AA', marginLeft:4 }}>({settled.length})</span>}
          </button>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:6 }}>
            <span style={{ color:'#44445A', fontSize:12 }}>🔍</span>
            <input style={{ background:'none', border:'none', outline:'none', color:'#fff', fontSize:12, width:180, fontFamily:'DM Sans,sans-serif' }} placeholder="Search by token address…" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <button className="btn btn-lime" style={{ padding:'7px 16px', fontSize:12, borderRadius:8 }}
            onClick={() => isConnected ? setShowList(true) : toast.error('Connect your wallet first')}>
            + List Token
          </button>
        </div>
      </div>

      <div style={{ padding:'0 20px 20px', flex:1 }}>
        {loading && (
          <div style={{ textAlign:'center', padding:64 }}>
            <span className="spinner" style={{ width:36, height:36, borderWidth:3 }} />
            <div style={{ marginTop:12, fontSize:13, color:'#44445A' }}>Loading listings…</div>
          </div>
        )}
        {!loading && error && (
          <div style={{ textAlign:'center', padding:64 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
            <div style={{ fontSize:14, color:'#FF4444', marginBottom:16 }}>Could not load listings</div>
            <button className="btn btn-ghost" style={{ padding:'9px 22px' }} onClick={refetch}>Retry</button>
          </div>
        )}
        {!loading && !error && tab==='listed' && (
          filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🪙</div>
              <div className="empty-title">{search?'No listings match your search':'No listings yet'}</div>
              <div className="empty-desc">{search?'Try a different contract address.':'Be the first to list a token.'}</div>
              {!search && <button className="btn btn-lime" style={{ marginTop:20, padding:'10px 26px', fontSize:13 }} onClick={()=>isConnected?setShowList(true):toast.error('Connect wallet first')}>+ List Your First Token</button>}
            </div>
          ) : (
            <table className="tbl" style={{ marginTop:4 }}>
              <thead>
                <tr>
                  <th>#</th><th>Token</th>
                  <th className="r">Remaining</th><th className="r">Price (100%)</th>
                  <th className="r">Accepts</th><th className="r">Fill</th>
                  <th className="r">Filled</th><th className="r">Offers</th>
                  <th className="r">Listed</th><th className="r">Action</th>
                </tr>
              </thead>
              <tbody>{filtered.map(l => <Row key={l.id.toString()} l={l} />)}</tbody>
            </table>
          )
        )}
        {!loading && !error && tab==='settled' && (
          filteredSettled.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📊</div>
              <div className="empty-title">No settled trades yet</div>
              <div className="empty-desc">Completed and cancelled listings appear here.</div>
            </div>
          ) : (
            <table className="tbl" style={{ marginTop:4 }}>
              <thead>
                <tr>
                  <th>#</th><th>Token</th><th className="r">Amount</th>
                  <th className="r">Listed Price</th><th className="r">Status</th>
                  <th className="r">Seller</th><th className="r">Date</th>
                </tr>
              </thead>
              <tbody>{filteredSettled.map(l => <SettledRow key={l.id.toString()} l={l} />)}</tbody>
            </table>
          )
        )}
      </div>

      <BottomBar />
      {showList && <ListModal onClose={()=>setShowList(false)} onSuccess={h=>{ setShowList(false); setSuccess({type:'listed',details:{txHash:h}}); refetch(); }} />}
      {success && <SuccessModal type={success.type} details={success.details} onClose={()=>setSuccess(null)} />}
    </div>
  );
}
