'use client';
import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { formatEther } from 'viem';
import toast from 'react-hot-toast';
import Navbar       from '@/components/Navbar';
import LiveTicker   from '@/components/LiveTicker';
import BottomBar    from '@/components/BottomBar';
import SuccessModal from '@/components/SuccessModal';
import { publicClient } from '@/lib/client';
import { useUserOTC, OTCListing, OTCOffer } from '@/hooks/useOTC';
import { useWalletTokens, useTokenInfo } from '@/hooks/useWallet';
import { CONTRACTS, FEES } from '@/lib/constants';
import { OTC_ABI, ERC20_ABI } from '@/abis';
import { short, fmtETH, fmtToken, ago, fillLabel, addrLink } from '@/lib/utils';

// ─── List Token from Portfolio Modal ─────────────────────────────────────────
function QuickListModal({ token, onClose, onSuccess }: { token:any; onClose:()=>void; onSuccess:(h:`0x${string}`)=>void }) {
  const { data:wc } = useWalletClient();
  const [price, setPrice]   = useState('');
  const [fill,  setFill]    = useState(0);
  const [anyTok,setAnyTok]  = useState(false);
  const [desc,  setDesc]    = useState('');
  const [amt,   setAmt]     = useState('');
  const [busy,  setBusy]    = useState(false);

  const submit = async () => {
    if (!wc || !price || !amt) return; setBusy(true);
    try {
      const tokenAmt = BigInt(Math.round(parseFloat(amt) * (10 ** token.decimals)));
      const priceWei = BigInt(Math.round(parseFloat(price) * 1e18));
      toast.loading('Step 1/2 — Approving…');
      const ap = await wc.writeContract({ address:token.address, abi:ERC20_ABI, functionName:'approve', args:[CONTRACTS.OTC, tokenAmt] });
      await publicClient.waitForTransactionReceipt({ hash:ap as `0x${string}` });
      toast.dismiss(); toast.loading('Step 2/2 — Listing…');
      const tx = await wc.writeContract({ address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'listToken', args:[token.address, tokenAmt, priceWei, [], anyTok, fill, desc], value:FEES.LIST });
      await publicClient.waitForTransactionReceipt({ hash:tx as `0x${string}` });
      toast.dismiss(); onSuccess(tx as `0x${string}`);
    } catch(e:any){ toast.dismiss(); toast.error(e?.shortMessage??'Failed'); }
    setBusy(false);
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">List {token.name}</div>
        <div className="modal-sub">Listing fee: 0.002 ETH · 2 transactions</div>

        <div style={{ padding:'10px 14px', background:'rgba(200,240,0,.06)', border:'1px solid rgba(200,240,0,.14)', borderRadius:8, fontSize:12, marginBottom:16 }}>
          Your balance: <strong style={{ color:'#C8F000' }}>{fmtToken(token.balance, token.decimals)} {token.symbol}</strong>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
          <div><label className="label">Amount to List *</label><input className="input" type="number" placeholder="e.g. 10000" value={amt} onChange={e=>setAmt(e.target.value)} /></div>
          <div><label className="label">Price for 100% (ETH) *</label><input className="input" type="number" placeholder="e.g. 0.1" value={price} onChange={e=>setPrice(e.target.value)} /></div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label className="label">Fill Terms</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[{v:0,l:'50% or 100%'},{v:1,l:'100% only'}].map(o=>(
              <div key={o.v} onClick={()=>setFill(o.v)} style={{ padding:'9px 12px', borderRadius:7, cursor:'pointer', textAlign:'center', fontWeight:700, fontSize:12, border:`1px solid ${fill===o.v?'#C8F000':'rgba(255,255,255,.1)'}`, background:fill===o.v?'rgba(200,240,0,.07)':'#1C1C35' }}>{o.l}</div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label className="label">Accepted Payment</label>
          {[{v:false,l:'ETH + USDT'},{v:true,l:'Any token (⚠️ verify values)'}].map(o=>(
            <div key={String(o.v)} onClick={()=>setAnyTok(o.v)} style={{ padding:'9px 12px', marginBottom:7, borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:600, border:`1px solid ${anyTok===o.v?'#C8F000':'rgba(255,255,255,.1)'}`, background:anyTok===o.v?'rgba(200,240,0,.07)':'#1C1C35' }}>{o.l}</div>
          ))}
        </div>

        <div style={{ marginBottom:16 }}>
          <label className="label">Description (optional)</label>
          <textarea className="input" rows={2} value={desc} onChange={e=>setDesc(e.target.value)} style={{ resize:'vertical' }} placeholder="Tell buyers about this token…" />
        </div>

        <button className="btn btn-lime" style={{ width:'100%', padding:'12px 0', fontSize:14 }} disabled={busy||!price||!amt} onClick={submit}>
          {busy?<span style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}><span className="spinner spinner-black"/>Processing…</span>:'Approve & List Token'}
        </button>
      </div>
    </div>
  );
}

// ─── Edit Listing Modal ───────────────────────────────────────────────────────
function EditModal({ listing, onClose, onSuccess }: { listing:OTCListing; onClose:()=>void; onSuccess:()=>void }) {
  const { data:wc } = useWalletClient();
  const info = useTokenInfo(listing.tokenAddress);
  const [price, setPrice] = useState(fmtETH(listing.priceForFull, 6));
  const [fill,  setFill]  = useState(listing.fillTerms);
  const [any,   setAny]   = useState(listing.acceptsAnyToken);
  const [desc,  setDesc]  = useState(listing.description);
  const [busy,  setBusy]  = useState(false);

  const submit = async () => {
    if (!wc || !price) return; setBusy(true);
    try {
      const priceWei = BigInt(Math.round(parseFloat(price) * 1e18));
      toast.loading('Editing listing…');
      const tx = await wc.writeContract({ address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'editListing', args:[listing.id, priceWei, [], any, fill, desc], value:FEES.EDIT });
      await publicClient.waitForTransactionReceipt({ hash:tx as `0x${string}` });
      toast.dismiss(); toast.success('Listing updated!'); onSuccess();
    } catch(e:any){ toast.dismiss(); toast.error(e?.shortMessage??'Failed'); }
    setBusy(false);
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">Edit Listing #{listing.id.toString()}</div>
        <div className="modal-sub">Edit fee: 0.001 ETH · Cannot change token or amount</div>
        <div style={{ padding:'9px 12px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:8, fontSize:12, color:'#8888AA', marginBottom:16 }}>
          Token: <strong style={{ color:'#fff' }}>{info?.name??short(listing.tokenAddress)}</strong> · Amount: <strong style={{ color:'#C8F000' }}>{fmtToken(listing.remainingAmount,info?.decimals??18)} {info?.symbol}</strong>
        </div>
        <div style={{ marginBottom:14 }}><label className="label">New Price for 100% (ETH)</label><input className="input" type="number" value={price} onChange={e=>setPrice(e.target.value)} /></div>
        {price && <div style={{ padding:'8px 12px', background:'rgba(200,240,0,.06)', border:'1px solid rgba(200,240,0,.14)', borderRadius:7, fontSize:11, color:'#C8F000', marginBottom:14 }}>50% = {(parseFloat(price||'0')/2).toFixed(5)} ETH · 100% = {price} ETH</div>}
        <div style={{ marginBottom:14 }}>
          <label className="label">Fill Terms</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[{v:0,l:'50% or 100%'},{v:1,l:'100% only'}].map(o=>(
              <div key={o.v} onClick={()=>setFill(o.v)} style={{ padding:'9px 12px', borderRadius:7, cursor:'pointer', textAlign:'center', fontWeight:700, fontSize:12, border:`1px solid ${fill===o.v?'#C8F000':'rgba(255,255,255,.1)'}`, background:fill===o.v?'rgba(200,240,0,.07)':'#1C1C35' }}>{o.l}</div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label className="label">Accepted Payment</label>
          {[{v:false,l:'ETH + USDT'},{v:true,l:'Any token'}].map(o=>(
            <div key={String(o.v)} onClick={()=>setAny(o.v)} style={{ padding:'9px 12px', marginBottom:7, borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:600, border:`1px solid ${any===o.v?'#C8F000':'rgba(255,255,255,.1)'}`, background:any===o.v?'rgba(200,240,0,.07)':'#1C1C35' }}>{o.l}</div>
          ))}
        </div>
        <div style={{ marginBottom:16 }}><label className="label">Description</label><textarea className="input" rows={2} value={desc} onChange={e=>setDesc(e.target.value)} style={{ resize:'vertical' }} /></div>
        <button className="btn btn-lime" style={{ width:'100%', padding:'12px 0', fontSize:14 }} disabled={busy||!price} onClick={submit}>
          {busy?<span style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}><span className="spinner spinner-black"/>Updating…</span>:'Save Changes — 0.001 ETH'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Portfolio Page ──────────────────────────────────────────────────────
export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { data:wc }              = useWalletClient();
  const addr = address as `0x${string}`|undefined;
  const { tokens, ethBal, loading:tokLoading } = useWalletTokens(addr);
  const { userListings, userOffers, loading:otcLoading } = useUserOTC(addr);
  const [tab,       setTab]      = useState<'tokens'|'listings'|'offers'|'activity'>('tokens');
  const [listToken, setListToken]= useState<any>(null);
  const [editL,     setEditL]    = useState<OTCListing|null>(null);
  const [success,   setSuccess]  = useState<{type:any;details?:any}|null>(null);

  const cancel = async (id:bigint) => {
    if (!wc) return;
    try {
      toast.loading('Cancelling listing…');
      const tx = await wc.writeContract({ address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'cancelListing', args:[id], value:FEES.CANCEL });
      await publicClient.waitForTransactionReceipt({ hash:tx as `0x${string}` });
      toast.dismiss(); setSuccess({ type:'cancelled', details:{ txHash:tx as `0x${string}` } });
    } catch(e:any){ toast.dismiss(); toast.error(e?.shortMessage??'Failed'); }
  };

  const activeL = userListings.filter(l=>l.active);
  const activeO = userOffers.filter(o=>o.active);
  const loading = tokLoading || otcLoading;

  if (!isConnected) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#08080F' }}>
      <Navbar /><LiveTicker />
      <div className="empty" style={{ flex:1 }}>
        <div className="empty-icon">👛</div>
        <div className="empty-title">Connect your wallet</div>
        <div className="empty-desc">Connect your wallet to view tokens, listings, offers and activity history.</div>
      </div>
      <BottomBar />
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#08080F' }}>
      <Navbar /><LiveTicker />
      <div style={{ padding:'20px 20px 0', flex:1 }}>

        {/* wallet card */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'#0F0F1C', border:'1px solid rgba(200,240,0,.14)', borderRadius:12, marginBottom:16 }}>
          <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(200,240,0,.08)', border:'2px solid rgba(200,240,0,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>👤</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'Space Mono,monospace', fontSize:12, fontWeight:700 }}>{address}</div>
            <div style={{ fontSize:11, color:'#8888AA', marginTop:2 }}>Connected · Robinhood Chain Testnet · Chain 46630</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-ghost" style={{ padding:'5px 10px', fontSize:11, borderRadius:6 }} onClick={()=>navigator.clipboard?.writeText(address??'').then(()=>toast.success('Copied!'))}>📋 Copy</button>
            <a href={addrLink(address??'')} target="_blank" rel="noopener noreferrer" className="scan-btn" style={{ padding:'6px 10px', fontSize:11 }}>🔍 BlockScan</a>
          </div>
        </div>

        {/* stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:16 }}>
          {[
            { l:'ETH Balance',     v:`${fmtETH(ethBal,4)} ETH`,               c:'#C8F000' },
            { l:'Tokens',          v:tokens.length.toString(),                  c:'#fff' },
            { l:'Active Listings', v:activeL.length.toString(),                 c:'#F5A623' },
            { l:'Active Offers',   v:activeO.length.toString(),                 c:'#F5A623' },
            { l:'All Listings',    v:userListings.length.toString(),             c:'#00C805' },
          ].map(s=>(
            <div key={s.l} style={{ background:'#0F0F1C', border:'1px solid rgba(255,255,255,.07)', borderRadius:9, padding:'12px 14px', textAlign:'center' }}>
              <div style={{ fontSize:9, color:'#44445A', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4, fontFamily:'Space Mono,monospace' }}>{s.l}</div>
              <div style={{ fontFamily:'Space Mono,monospace', fontSize:16, fontWeight:700, color:s.c }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:16 }}>
          {([
            { id:'tokens',   l:`Tokens (${tokens.length+1})` },
            { id:'listings', l:`Listings (${activeL.length})` },
            { id:'offers',   l:`Offers (${activeO.length})` },
            { id:'activity', l:'Activity' },
          ] as const).map(t=>(
            <button key={t.id} className={`sub-tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.l}</button>
          ))}
        </div>

        {loading && <div style={{ textAlign:'center', padding:48 }}><span className="spinner" style={{ width:32, height:32, borderWidth:3 }} /></div>}

        {/* ── Tokens tab ── */}
        {!loading && tab==='tokens' && (
          <div>
            {/* ETH row */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', background:'#0F0F1C', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(98,126,234,.1)', border:'1px solid rgba(98,126,234,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>⟠</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700 }}>Ethereum</div>
                  <div style={{ fontSize:10, color:'#44445A', fontFamily:'Space Mono,monospace', marginTop:1 }}>Native token · Robinhood Testnet</div>
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'Space Mono,monospace', fontSize:13, fontWeight:700 }}>{fmtETH(ethBal,6)} ETH</div>
              </div>
            </div>

            {/* ERC-20 tokens */}
            {tokens.length === 0 ? (
              <div style={{ padding:'20px 0', textAlign:'center' }}>
                <div style={{ fontSize:13, color:'#44445A', marginBottom:10 }}>No ERC-20 tokens found in your wallet.</div>
                <a href="/faucet" style={{ color:'#C8F000', fontSize:12, textDecoration:'none' }}>Claim free USDT from the faucet →</a>
              </div>
            ) : tokens.map(t=>(
              <div key={t.address} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', background:'#0F0F1C', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, marginBottom:8, cursor:'pointer', transition:'border-color .2s' }}
                onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(200,240,0,.25)')}
                onMouseLeave={e=>(e.currentTarget.style.borderColor='rgba(255,255,255,.07)')}
                onClick={()=>setListToken(t)}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:`${t.color}14`, border:`1px solid ${t.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, fontFamily:'Space Mono,monospace', color:t.color, flexShrink:0 }}>{t.symbol.slice(0,2)}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700 }}>{t.name} <span style={{ fontSize:10, color:'#44445A', fontWeight:400 }}>{t.symbol}</span></div>
                    <div style={{ fontSize:9, color:'#44445A', fontFamily:'Space Mono,monospace', marginTop:2, display:'flex', gap:5, alignItems:'center' }}>
                      {short(t.address)} <a href={addrLink(t.address)} target="_blank" rel="noopener noreferrer" className="scan-btn">🔍</a>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:13, fontWeight:700 }}>{fmtToken(t.balance,t.decimals)} {t.symbol}</div>
                  <div style={{ fontSize:10, color:'#C8F000', marginTop:3 }}>Click to list →</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Listings tab ── */}
        {!loading && tab==='listings' && (
          <div>
            {activeL.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📋</div>
                <div className="empty-title">No active listings</div>
                <div className="empty-desc">Go to the Token OTC page to list a token, or click any token in the Tokens tab.</div>
                <a href="/otc"><button className="btn btn-lime" style={{ marginTop:18, padding:'10px 22px', fontSize:13 }}>Go to Token OTC</button></a>
              </div>
            ) : activeL.map(l=>{
              const info = l; // just use listing data directly
              const filled = l.totalAmount > BigInt(0) ? Number((l.totalAmount-l.remainingAmount)*BigInt(100)/l.totalAmount) : 0;
              return (
                <div key={l.id.toString()} style={{ padding:'14px 16px', background:'#0F0F1C', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, marginBottom:10, display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:'rgba(200,240,0,.08)', border:'1px solid rgba(200,240,0,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🪙</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>Listing #{l.id.toString()} <span style={{ fontSize:10, color:'#44445A', fontWeight:400 }}>· {short(l.tokenAddress)}</span></div>
                    <div style={{ fontSize:11, color:'#8888AA', marginTop:3 }}>{fmtETH(l.priceForFull)} ETH · {fillLabel(l.fillTerms)} · {l.offerCount.toString()} offer(s) · {filled}% filled</div>
                    <div style={{ fontSize:10, color:'#44445A', marginTop:2, fontFamily:'Space Mono,monospace' }}>Listed {ago(l.createdAt)}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:'Space Mono,monospace', fontSize:13, fontWeight:700, color:'#C8F000', marginBottom:7 }}>{fmtETH(l.priceForFull)} ETH</div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-ghost" style={{ padding:'5px 10px', fontSize:11, borderRadius:5 }} onClick={()=>setEditL(l)}>Edit</button>
                      <button className="btn btn-danger" style={{ padding:'5px 10px', fontSize:11, borderRadius:5 }} onClick={()=>cancel(l.id)}>Cancel</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Offers tab ── */}
        {!loading && tab==='offers' && (
          <div>
            {activeO.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">💬</div>
                <div className="empty-title">No active offers</div>
                <div className="empty-desc">Make offers on listings in the Token OTC market to see them here.</div>
              </div>
            ) : activeO.map((o:OTCOffer)=>(
              <div key={o.id.toString()} style={{ padding:'14px 16px', background:'#0F0F1C', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, marginBottom:10, display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:8, background:'rgba(245,166,35,.08)', border:'1px solid rgba(245,166,35,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>💬</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>Offer on Listing #{o.listingId.toString()}</div>
                  <div style={{ fontSize:11, color:'#8888AA', marginTop:3 }}>{o.forHalf?'50%':'100%'} fill · {o.offerToken==='0x0000000000000000000000000000000000000000'?'ETH':'Token'} · {ago(o.createdAt)}</div>
                  {o.message && <div style={{ fontSize:10, color:'#44445A', fontStyle:'italic', marginTop:2 }}>"{o.message}"</div>}
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:13, fontWeight:700, color:'#C8F000' }}>
                    {o.offerToken==='0x0000000000000000000000000000000000000000' ? `${fmtETH(o.offerAmount)} ETH` : fmtToken(o.offerAmount, 6)}
                  </div>
                  <span className="badge badge-gold" style={{ marginTop:6, display:'inline-block' }}>PENDING</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Activity tab ── */}
        {!loading && tab==='activity' && (
          <div>
            {userListings.length === 0 && userOffers.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📊</div>
                <div className="empty-title">No activity yet</div>
                <div className="empty-desc">Your trades, listings and offers will appear here once you start trading.</div>
              </div>
            ) : (
              <table className="tbl">
                <thead><tr><th>Type</th><th>Item</th><th className="r">Amount</th><th className="r">Status</th><th className="r">Time</th></tr></thead>
                <tbody>
                  {[...userListings.map(l=>({...l,_type:'LISTED'})), ...userOffers.map(o=>({...o,_type:'OFFERED'}))]
                    .sort((a,b)=>Number((b as any).createdAt-(a as any).createdAt))
                    .slice(0,30)
                    .map((item:any,i)=>(
                      <tr key={i}>
                        <td><span className={`badge ${item._type==='LISTED'?'badge-lime':'badge-gold'}`}>{item._type}</span></td>
                        <td style={{ fontSize:12 }}>{item._type==='LISTED'?`Listing #${item.id}`:`Offer on #${item.listingId}`}</td>
                        <td className="r mono" style={{ fontSize:11, color:'#C8F000' }}>
                          {item._type==='LISTED'?`${fmtETH(item.priceForFull)} ETH`:`${fmtETH(item.offerAmount||BigInt(0))} ETH`}
                        </td>
                        <td className="r"><span style={{ fontSize:10, color:item.active?'#00C805':'#44445A' }}>{item.active?'Active':'Closed'}</span></td>
                        <td className="r muted mono" style={{ fontSize:10 }}>{ago(item.createdAt)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <div style={{ height:24 }} />
      <BottomBar />

      {listToken && <QuickListModal token={listToken} onClose={()=>setListToken(null)} onSuccess={h=>{ setListToken(null); setSuccess({type:'listed',details:{txHash:h}}); }} />}
      {editL     && <EditModal listing={editL} onClose={()=>setEditL(null)} onSuccess={()=>setEditL(null)} />}
      {success   && <SuccessModal type={success.type} details={success.details} onClose={()=>setSuccess(null)} />}
    </div>
  );
}
