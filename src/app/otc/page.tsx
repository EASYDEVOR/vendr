'use client';
import { useState, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { parseEther, parseUnits, formatEther } from 'viem';
import toast from 'react-hot-toast';
import Navbar       from '@/components/Navbar';
import LiveTicker   from '@/components/LiveTicker';
import BottomBar    from '@/components/BottomBar';
import SuccessModal from '@/components/SuccessModal';
import { publicClient } from '@/lib/client';
import { useOTCListings, useOTCListing, OTCListing, OTCOffer } from '@/hooks/useOTC';
import { useTokenInfo } from '@/hooks/useWallet';
import { CONTRACTS, FEES } from '@/lib/constants';
import { OTC_ABI, ERC20_ABI } from '@/abis';
import { short, fmtETH, fmtToken, ago, fillLabel, addrLink, tokenColor } from '@/lib/utils';

// ─── helpers ────────────────────────────────────────────────────────────────

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

function TokenAvatar({ address, size=32 }: { address:`0x${string}`; size?:number }) {
  const info = useTokenInfo(address);
  const sym  = info?.symbol?.slice(0,2) ?? '??';
  const col  = info ? tokenColor(info.symbol) : '#C8F000';
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:`${col}14`, border:`1px solid ${col}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.32, fontWeight:900, fontFamily:'Space Mono,monospace', color:col, flexShrink:0 }}>
      {sym}
    </div>
  );
}

// ─── Row in the OTC table ────────────────────────────────────────────────────
function ListingRow({ l, onSelect }: { l:OTCListing; onSelect:()=>void }) {
  const info   = useTokenInfo(l.tokenAddress);
  const filled = l.totalAmount > BigInt(0) ? Number((l.totalAmount - l.remainingAmount) * BigInt(100) / l.totalAmount) : 0;

  return (
    <tr onClick={onSelect}>
      <td className="muted mono" style={{ fontSize:11 }}>#{l.id.toString()}</td>
      <td>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <TokenAvatar address={l.tokenAddress} size={30} />
          <div>
            <div style={{ fontSize:12, fontWeight:700 }}>
              {info?.name ?? short(l.tokenAddress)}
              <span className="muted" style={{ fontWeight:400, fontSize:10, marginLeft:4 }}>{info?.symbol}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
              <span className="mono muted" style={{ fontSize:9 }}>{short(l.tokenAddress)}</span>
              <a href={addrLink(l.tokenAddress)} target="_blank" rel="noopener noreferrer" className="scan-btn">🔍 Scan</a>
            </div>
          </div>
        </div>
      </td>
      <td className="r mono" style={{ fontSize:11 }}>{fmtToken(l.remainingAmount, info?.decimals??18)}</td>
      <td className="r mono" style={{ fontSize:11, color:'#C8F000' }}>{fmtETH(l.priceForFull)} ETH</td>
      <td className="r" style={{ fontSize:11 }}>{l.acceptsAnyToken ? 'Any' : 'ETH/USDT'}</td>
      <td className="r">
        <span className={`badge ${l.fillTerms===0?'badge-green':'badge-lime'}`} style={{ fontSize:9 }}>{fillLabel(l.fillTerms)}</span>
      </td>
      <td className="r">
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
          <span style={{ fontSize:11, color:filled>0?'#00C805':'#44445A' }}>{filled}%</span>
          <div className="bar" style={{ width:52 }}><div className="bar-fill" style={{ width:`${filled}%` }} /></div>
        </div>
      </td>
      <td className="r">
        <span className="badge badge-gold" style={{ fontSize:9 }}>💬 {l.offerCount.toString()}</span>
      </td>
      <td className="r muted mono" style={{ fontSize:10 }}>{ago(l.createdAt)}</td>
      <td className="r" onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
          <button className="btn btn-lime" style={{ padding:'5px 9px', fontSize:11, borderRadius:6 }} onClick={onSelect}>Buy</button>
          <button className="btn btn-ghost" style={{ padding:'5px 9px', fontSize:11, borderRadius:6 }} onClick={onSelect}>Offer</button>
        </div>
      </td>
    </tr>
  );
}

// ─── List Token Modal ────────────────────────────────────────────────────────
function ListModal({ onClose, onSuccess }: { onClose:()=>void; onSuccess:(h:`0x${string}`)=>void }) {
  const { data:wc }   = useWalletClient();
  const [step,    setStep]    = useState<'form'|'approving'|'listing'>('form');
  const [tokenCA, setTokenCA] = useState('');
  const [tokenInfo, setTI]    = useState<{name:string;symbol:string;decimals:number}|null>(null);
  const [amount,   setAmount] = useState('');
  const [price,    setPrice]  = useState('');
  const [fill,     setFill]   = useState(0);
  const [anyTok,   setAnyTok] = useState(false);
  const [desc,     setDesc]   = useState('');
  const [loading,  setLoading]= useState(false);

  const lookup = async () => {
    if (!tokenCA.startsWith('0x')) { toast.error('Enter a valid contract address'); return; }
    try {
      const [n,s,d] = await Promise.all([
        publicClient.readContract({ address:tokenCA as `0x${string}`, abi:ERC20_ABI, functionName:'name'     }),
        publicClient.readContract({ address:tokenCA as `0x${string}`, abi:ERC20_ABI, functionName:'symbol'   }),
        publicClient.readContract({ address:tokenCA as `0x${string}`, abi:ERC20_ABI, functionName:'decimals' }),
      ]);
      setTI({ name:n as string, symbol:s as string, decimals:Number(d) });
      toast.success(`Found: ${n} (${s})`);
    } catch { toast.error('Token not found on Robinhood Chain'); }
  };

  const submit = async () => {
    if (!wc || !tokenInfo || !amount || !price) return;
    setLoading(true);
    try {
      const tokenAmt = parseUnits(amount, tokenInfo.decimals);
      const priceWei = parseEther(price);
      const addr     = tokenCA as `0x${string}`;

      setStep('approving');
      toast.loading('Step 1/2 — Approving token spend…');
      const appTx = await wc.writeContract({ address:addr, abi:ERC20_ABI, functionName:'approve', args:[CONTRACTS.OTC, tokenAmt] });
      await publicClient.waitForTransactionReceipt({ hash: appTx as `0x${string}` });
      toast.dismiss(); toast.success('Approved!');

      setStep('listing');
      toast.loading('Step 2/2 — Listing token…');
      const listTx = await wc.writeContract({
        address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'listToken',
        args:[addr, tokenAmt, priceWei, [], anyTok, fill, desc],
        value: FEES.LIST,
      });
      await publicClient.waitForTransactionReceipt({ hash: listTx as `0x${string}` });
      toast.dismiss();
      onSuccess(listTx as `0x${string}`);
    } catch(e:any) {
      toast.dismiss();
      toast.error(e?.shortMessage ?? e?.message ?? 'Transaction failed');
      setStep('form');
    }
    setLoading(false);
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth:480 }} onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">List Your Token</div>
        <div className="modal-sub">Listing fee: 0.002 ETH · 2 transactions</div>

        {/* steps */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:20 }}>
          {['Approve','List'].map((lbl,i) => (
            <div key={lbl} style={{ display:'flex', alignItems:'center', gap:6, flex:i<1?'none':1 }}>
              <div className={`step ${step==='approving'&&i===0?'step-active':step==='listing'&&i===1?'step-active':step==='form'&&i===0?'step-todo':i===0?'step-done':'step-todo'}`}>{i===0&&step!=='form'&&step!=='approving'?'✓':i+1}</div>
              <span style={{ fontSize:11, color:'#8888AA' }}>{lbl}</span>
              {i<1 && <div style={{ flex:1, height:1, background:'rgba(255,255,255,.1)' }} />}
            </div>
          ))}
        </div>

        {/* Token CA */}
        <div style={{ marginBottom:14 }}>
          <label className="label">Token Contract Address *</label>
          <div style={{ display:'flex', gap:8 }}>
            <input className="input" placeholder="0x…" value={tokenCA} onChange={e=>setTokenCA(e.target.value)} style={{ flex:1 }} />
            <button className="btn btn-ghost" style={{ padding:'0 14px', fontSize:12, borderRadius:8, whiteSpace:'nowrap' }} onClick={lookup}>Look up</button>
          </div>
          {tokenInfo && <div style={{ marginTop:6, padding:'7px 10px', background:'rgba(0,200,5,.07)', border:'1px solid rgba(0,200,5,.15)', borderRadius:6, fontSize:11, color:'#00C805' }}>✓ {tokenInfo.name} ({tokenInfo.symbol}) · {tokenInfo.decimals} decimals</div>}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
          <div>
            <label className="label">Amount to List *</label>
            <input className="input" type="number" placeholder="e.g. 50000" value={amount} onChange={e=>setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label">Price for 100% (ETH) *</label>
            <input className="input" type="number" placeholder="e.g. 0.15" value={price} onChange={e=>setPrice(e.target.value)} />
          </div>
        </div>

        {price && fill===0 && <div style={{ padding:'8px 12px', background:'rgba(200,240,0,.06)', border:'1px solid rgba(200,240,0,.15)', borderRadius:7, fontSize:11, color:'#C8F000', marginBottom:14 }}>50% price = {(parseFloat(price)/2).toFixed(5)} ETH · 100% price = {price} ETH</div>}

        <div style={{ marginBottom:14 }}>
          <label className="label">Fill Terms</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[{v:0,l:'50% or 100%',d:'Buyers can fill half or all'},{v:1,l:'100% only',d:'Buyer must take everything'}].map(o=>(
              <div key={o.v} onClick={()=>setFill(o.v)} style={{ padding:10, borderRadius:7, cursor:'pointer', border:`1px solid ${fill===o.v?'#C8F000':'rgba(255,255,255,.1)'}`, background:fill===o.v?'rgba(200,240,0,.07)':'#1C1C35' }}>
                <div style={{ fontSize:12, fontWeight:700, marginBottom:2 }}>{o.l}</div>
                <div style={{ fontSize:10, color:'#8888AA' }}>{o.d}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label className="label">Accepted Payment</label>
          {[{v:false,l:'ETH + USDT',d:'Accept Ether and USDT only'},{v:true,l:'Any token',d:'⚠️ Verify values — anyone can offer any token'}].map(o=>(
            <div key={String(o.v)} onClick={()=>setAnyTok(o.v)} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', marginBottom:7, borderRadius:7, cursor:'pointer', border:`1px solid ${anyTok===o.v?'#C8F000':'rgba(255,255,255,.1)'}`, background:anyTok===o.v?'rgba(200,240,0,.07)':'#1C1C35' }}>
              <div style={{ fontSize:14 }}>{o.v?'🔄':'💱'}</div>
              <div><div style={{ fontSize:12, fontWeight:700 }}>{o.l}</div><div style={{ fontSize:10, color:'#8888AA' }}>{o.d}</div></div>
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

        <button className="btn btn-lime" style={{ width:'100%', padding:'12px 0', fontSize:14 }} disabled={loading||!tokenInfo||!amount||!price} onClick={submit}>
          {loading ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><span className="spinner spinner-black" />Processing…</span> : 'Approve & List Token'}
        </button>
      </div>
    </div>
  );
}

// ─── Token Detail Modal (buy / offer / seller actions) ────────────────────────
function DetailModal({ id, userAddr, onClose, onBuy, onOffer, onAccept }: {
  id:bigint; userAddr:`0x${string}`|undefined;
  onClose:()=>void; onBuy:(h:`0x${string}`,d:any)=>void;
  onOffer:(h:`0x${string}`)=>void; onAccept:(h:`0x${string}`)=>void;
}) {
  const { listing:l, offers, loading, refetch } = useOTCListing(id);
  const info     = useTokenInfo(l?.tokenAddress ?? null);
  const { data:wc } = useWalletClient();
  const [tab,    setTab]    = useState<'buy'|'offer'>('buy');
  const [buyHalf,setBuyHalf]= useState(false);
  const [oTok,   setOTok]   = useState<'eth'|'usdt'|'other'>('eth');
  const [oCA,    setOCA]    = useState('');
  const [oAmt,   setOAmt]   = useState('');
  const [oHalf,  setOHalf]  = useState(false);
  const [oMsg,   setOMsg]   = useState('');
  const [busy,   setBusy]   = useState(false);
  const isSeller = l?.seller?.toLowerCase() === userAddr?.toLowerCase();
  const filled   = l && l.totalAmount > BigInt(0) ? Number((l.totalAmount - l.remainingAmount) * BigInt(100) / l.totalAmount) : 0;

  const doBuy = async () => {
    if (!wc || !l) return; setBusy(true);
    try {
      toast.loading('Processing purchase…');
      const price = buyHalf ? l.pricePerHalf : l.priceForFull;
      const tx = await wc.writeContract({
        address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'buyWithETH',
        args:[l.id, buyHalf], value:price + FEES.BUY,
      });
      await publicClient.waitForTransactionReceipt({ hash:tx as `0x${string}` });
      toast.dismiss();
      onBuy(tx as `0x${string}`, { amount:fmtToken(buyHalf?l.totalAmount/BigInt(2):l.remainingAmount, info?.decimals??18), token:info?.symbol });
    } catch(e:any) { toast.dismiss(); toast.error(e?.shortMessage??'Failed'); }
    setBusy(false);
  };

  const doOffer = async () => {
    if (!wc || !l || !oAmt) return; setBusy(true);
    try {
      toast.loading('Submitting offer…');
      let tx:`0x${string}`;
      if (oTok === 'eth') {
        const wei = parseEther(oAmt);
        tx = await wc.writeContract({ address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'makeOfferWithETH', args:[l.id, oHalf, oMsg], value:wei + FEES.OFFER }) as `0x${string}`;
      } else {
        const tokenAddr = oTok==='usdt' ? CONTRACTS.USDT : oCA as `0x${string}`;
        const decimals  = oTok==='usdt' ? 6 : 18;
        const amt       = parseUnits(oAmt, decimals);
        const appTx     = await wc.writeContract({ address:tokenAddr, abi:ERC20_ABI, functionName:'approve', args:[CONTRACTS.OTC, amt] });
        await publicClient.waitForTransactionReceipt({ hash:appTx as `0x${string}` });
        tx = await wc.writeContract({ address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'makeOfferWithToken', args:[l.id, oHalf, tokenAddr, amt, oMsg], value:FEES.OFFER }) as `0x${string}`;
      }
      await publicClient.waitForTransactionReceipt({ hash:tx });
      toast.dismiss(); onOffer(tx);
    } catch(e:any) { toast.dismiss(); toast.error(e?.shortMessage??'Failed'); }
    setBusy(false);
  };

  const doAccept = async (offerId:bigint) => {
    if (!wc) return; setBusy(true);
    try {
      toast.loading('Accepting offer…');
      const tx = await wc.writeContract({ address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'acceptOffer', args:[offerId] });
      await publicClient.waitForTransactionReceipt({ hash:tx as `0x${string}` });
      toast.dismiss(); refetch(); onAccept(tx as `0x${string}`);
    } catch(e:any) { toast.dismiss(); toast.error(e?.shortMessage??'Failed'); }
    setBusy(false);
  };

  const doIgnore = async (offerId:bigint) => {
    if (!wc) return; setBusy(true);
    try {
      toast.loading('Ignoring offer…');
      const tx = await wc.writeContract({ address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'ignoreOffer', args:[offerId] });
      await publicClient.waitForTransactionReceipt({ hash:tx as `0x${string}` });
      toast.dismiss(); toast.success('Offer ignored — funds returned to maker'); refetch();
    } catch(e:any) { toast.dismiss(); toast.error(e?.shortMessage??'Failed'); }
    setBusy(false);
  };

  if (loading || !l) {
    return (
      <div className="modal-bg" onClick={onClose}>
        <div className="modal" style={{ textAlign:'center', padding:60 }}>
          <span className="spinner" style={{ width:36, height:36, borderWidth:3 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth:600 }} onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* header */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:16 }}>
          <TokenAvatar address={l.tokenAddress} size={50} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:20, fontWeight:800, marginBottom:2 }}>{info?.name??short(l.tokenAddress)} <span className="muted" style={{ fontSize:14, fontWeight:400 }}>{info?.symbol}</span></div>
            <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'#44445A', display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
              {l.tokenAddress}
              <a href={addrLink(l.tokenAddress)} target="_blank" rel="noopener noreferrer" className="scan-btn">🔍 BlockScan ↗</a>
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <span className={`badge ${l.fillTerms===0?'badge-green':'badge-lime'}`}>{fillLabel(l.fillTerms)}</span>
              <span className="badge badge-lime">{l.acceptsAnyToken?'Any token':'ETH / USDT'}</span>
              <span className="badge badge-gold">#{l.id.toString()}</span>
              {l.editedAt > BigInt(0) && <span className="badge" style={{ background:'rgba(255,255,255,.05)', color:'#8888AA', border:'1px solid rgba(255,255,255,.1)' }}>Edited</span>}
            </div>
          </div>
        </div>

        {/* stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:9, marginBottom:14 }}>
          {[
            { k:'Total Listed', v:fmtToken(l.totalAmount, info?.decimals??18) },
            { k:'Remaining',    v:fmtToken(l.remainingAmount, info?.decimals??18) },
            { k:'Price (100%)', v:`${fmtETH(l.priceForFull)} ETH`, c:'#C8F000' },
            { k:'Offers',       v:l.offerCount.toString(), c:'#F5A623' },
          ].map(s=>(
            <div key={s.k} style={{ background:'#0F0F1C', border:'1px solid rgba(255,255,255,.07)', borderRadius:9, padding:11, textAlign:'center' }}>
              <div style={{ fontSize:9, color:'#44445A', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4, fontFamily:'Space Mono,monospace' }}>{s.k}</div>
              <div style={{ fontFamily:'Space Mono,monospace', fontSize:14, fontWeight:700, color:s.c??'#fff' }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* fill bar */}
        <div style={{ marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#8888AA', marginBottom:5 }}>
            <span>Fill progress</span><span style={{ color:filled>0?'#00C805':'#44445A' }}>{filled}% filled</span>
          </div>
          <div className="bar"><div className="bar-fill" style={{ width:`${filled}%` }} /></div>
        </div>

        {l.description && <div style={{ padding:12, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:8, fontSize:12, color:'#8888AA', lineHeight:1.6, fontStyle:'italic', marginBottom:14 }}>"{l.description}"</div>}

        {/* offers list */}
        {offers.length > 0 && (
          <div style={{ background:'#0F0F1C', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, marginBottom:14, overflow:'hidden' }}>
            <div style={{ padding:'11px 14px', borderBottom:'1px solid rgba(255,255,255,.07)', fontSize:13, fontWeight:700, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              Active Offers
              <span className="badge badge-gold">{offers.length} offer{offers.length>1?'s':''}</span>
            </div>
            {offers.map((o:OTCOffer) => (
              <div key={o.id.toString()} style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,.03)', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'#1C1C35', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, fontFamily:'Space Mono,monospace', flexShrink:0 }}>
                  {o.offerMaker.slice(2,4).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'#8888AA' }}>{short(o.offerMaker)}</div>
                  <div style={{ fontSize:10, color:'#44445A', marginTop:1 }}>{o.forHalf?'50%':'100%'} · {o.offerToken===ZERO_ADDR?'ETH':'Token'} {o.message&&`· "${o.message}"`}</div>
                </div>
                <div style={{ textAlign:'right', marginRight:8 }}>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:12, fontWeight:700, color:'#C8F000' }}>
                    {o.offerToken===ZERO_ADDR ? `${fmtETH(o.offerAmount)} ETH` : fmtToken(o.offerAmount,6)}
                  </div>
                  <div style={{ fontSize:10, color:'#44445A', fontFamily:'Space Mono,monospace' }}>{ago(o.createdAt)}</div>
                </div>
                {isSeller && (
                  <div style={{ display:'flex', gap:4' }}>
                    <button onClick={()=>doAccept(o.id)} disabled={busy} style={{ padding:'4px 8px', background:'#00C805', border:'none', borderRadius:4, color:'#000', fontSize:10, fontWeight:700, cursor:'pointer' }}>Accept</button>
                    <button onClick={()=>doIgnore(o.id)} disabled={busy} style={{ padding:'4px 8px', background:'#1C1C35', border:'1px solid rgba(255,255,255,.1)', borderRadius:4, color:'#8888AA', fontSize:10, fontWeight:700, cursor:'pointer' }}>Ignore</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* buy / offer tabs — hidden for seller */}
        {!isSeller && (
          <div style={{ background:'#0F0F1C', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, padding:16 }}>
            <div style={{ display:'flex', gap:6, marginBottom:16 }}>
              {(['buy','offer'] as const).map(t=>(
                <button key={t} className={`sub-tab ${tab===t?'active':''}`} style={{ flex:1 }} onClick={()=>setTab(t)}>
                  {t==='buy'?'Buy Now':'Make Offer'}
                </button>
              ))}
            </div>

            {tab==='buy' && (
              <>
                {l.fillTerms===0 && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                    {[{v:false,l:'100%',amt:l.remainingAmount,p:l.priceForFull},{v:true,l:'50%',amt:l.totalAmount/BigInt(2),p:l.pricePerHalf}].map(o=>(
                      <div key={String(o.v)} onClick={()=>setBuyHalf(o.v)} style={{ padding:10, cursor:'pointer', borderRadius:7, textAlign:'center', border:`1px solid ${buyHalf===o.v?'#C8F000':'rgba(255,255,255,.1)'}`, background:buyHalf===o.v?'rgba(200,240,0,.07)':'#1C1C35' }}>
                        <div style={{ fontSize:13, fontWeight:700 }}>{o.l}</div>
                        <div style={{ fontSize:10, color:'#8888AA' }}>{fmtToken(o.amt,info?.decimals??18)} {info?.symbol}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:'#C8F000', marginTop:3 }}>{fmtETH(o.p)} ETH</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding:'10px 14px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:8, marginBottom:14 }}>
                  {[
                    { k:'You receive', v:`${fmtToken(buyHalf?l.totalAmount/BigInt(2):l.remainingAmount,info?.decimals??18)} ${info?.symbol??''}` },
                    { k:'Token price',  v:`${fmtETH(buyHalf?l.pricePerHalf:l.priceForFull)} ETH` },
                    { k:'Protocol fee', v:'0.002 ETH' },
                    { k:'Total',        v:`${fmtETH((buyHalf?l.pricePerHalf:l.priceForFull)+FEES.BUY)} ETH`, bold:true, c:'#C8F000' },
                  ].map(r=>(
                    <div key={r.k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:12, borderTop:r.bold?'1px solid rgba(255,255,255,.07)':'none', marginTop:r.bold?4:0, paddingTop:r.bold?8:4 }}>
                      <span style={{ color:r.bold?'#fff':'#8888AA', fontWeight:r.bold?700:400 }}>{r.k}</span>
                      <span style={{ fontFamily:'Space Mono,monospace', fontWeight:r.bold?700:600, color:r.c??'#fff', fontSize:r.bold?14:12 }}>{r.v}</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-lime" style={{ width:'100%', padding:'12px 0', fontSize:14 }} disabled={busy} onClick={doBuy}>
                  {busy?<span style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}><span className="spinner spinner-black"/>Processing…</span>:`Buy Now — ${fmtETH((buyHalf?l.pricePerHalf:l.priceForFull)+FEES.BUY)} ETH`}
                </button>
              </>
            )}

            {tab==='offer' && (
              <>
                <div style={{ padding:'9px 12px', background:'rgba(245,166,35,.07)', border:'1px solid rgba(245,166,35,.2)', borderRadius:7, fontSize:11, color:'#F5A623', marginBottom:14 }}>
                  ⚠️ Offer fee 0.001 ETH (non-refundable). If offering unknown tokens, seller may ignore — verify value first.
                </div>
                <label className="label">Offer With</label>
                {[{v:'eth',icon:'⟠',l:'ETH',d:'Native Ether'},{v:'usdt',icon:'💵',l:'USDT',d:'Testnet stablecoin'},{v:'other',icon:'🪙',l:'Other Token',d:'⚠️ Seller may ignore unrecognised tokens'}].map(o=>(
                  <div key={o.v} onClick={()=>setOTok(o.v as any)} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', marginBottom:7, borderRadius:7, cursor:'pointer', border:`1px solid ${oTok===o.v?'#C8F000':'rgba(255,255,255,.1)'}`, background:oTok===o.v?'rgba(200,240,0,.07)':'#1C1C35' }}>
                    <span style={{ fontSize:16 }}>{o.icon}</span>
                    <div><div style={{ fontSize:12, fontWeight:700 }}>{o.l}</div><div style={{ fontSize:10, color:'#8888AA' }}>{o.d}</div></div>
                  </div>
                ))}
                {oTok==='other' && <input className="input" placeholder="Token contract address 0x…" value={oCA} onChange={e=>setOCA(e.target.value)} style={{ marginBottom:12 }} />}
                {l.fillTerms===0 && (
                  <>
                    <label className="label" style={{ marginTop:4 }}>Fill Amount</label>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                      {[{v:false,l:'100%'},{v:true,l:'50%'}].map(o=>(
                        <div key={String(o.v)} onClick={()=>setOHalf(o.v)} style={{ padding:'8px 0', cursor:'pointer', borderRadius:7, textAlign:'center', border:`1px solid ${oHalf===o.v?'#C8F000':'rgba(255,255,255,.1)'}`, background:oHalf===o.v?'rgba(200,240,0,.07)':'#1C1C35', fontSize:13, fontWeight:700 }}>{o.l}</div>
                      ))}
                    </div>
                  </>
                )}
                <input className="input" type="number" placeholder={`Offer amount (${oTok==='eth'?'ETH':oTok==='usdt'?'USDT':'tokens'})`} value={oAmt} onChange={e=>setOAmt(e.target.value)} style={{ marginBottom:10 }} />
                <textarea className="input" rows={2} placeholder="Message to seller (optional)" value={oMsg} onChange={e=>setOMsg(e.target.value)} style={{ resize:'vertical', marginBottom:14 }} />
                <button className="btn btn-lime" style={{ width:'100%', padding:'12px 0', fontSize:14 }} disabled={busy||!oAmt} onClick={doOffer}>
                  {busy?<span style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}><span className="spinner spinner-black"/>Processing…</span>:'Submit Offer — Pay 0.001 ETH Fee'}
                </button>
              </>
            )}
          </div>
        )}

        {isSeller && <div style={{ marginTop:14, padding:'12px 14px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:8, fontSize:12, color:'#8888AA', textAlign:'center' }}>This is your listing. Accept / ignore offers above, or go to Portfolio to edit / cancel.</div>}
      </div>
    </div>
  );
}

// ─── Main OTC Page ────────────────────────────────────────────────────────────
export default function OTCPage() {
  const { address, isConnected } = useAccount();
  const { listings, loading, error, refetch } = useOTCListings();
  const [showList, setShowList] = useState(false);
  const [selected, setSelected] = useState<bigint|null>(null);
  const [tab,      setTab]      = useState<'listed'|'settled'>('listed');
  const [search,   setSearch]   = useState('');
  const [success,  setSuccess]  = useState<{type:any;details?:any}|null>(null);

  const filtered = listings.filter(l => search==='' || l.tokenAddress.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#08080F' }}>
      <Navbar />
      <LiveTicker />

      {/* sub nav */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 20px', borderBottom:'1px solid rgba(255,255,255,.07)', background:'#0F0F1C' }}>
        <div style={{ display:'flex', gap:4 }}>
          <button className={`sub-tab ${tab==='listed'?'active':''}`}  onClick={()=>setTab('listed')}>Listed Market</button>
          <button className={`sub-tab ${tab==='settled'?'active':''}`} onClick={()=>setTab('settled')}>Settled Market</button>
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

      {/* table */}
      <div style={{ padding:'0 20px 20px', flex:1 }}>
        {loading && (
          <div style={{ textAlign:'center', padding:64 }}>
            <span className="spinner" style={{ width:36, height:36, borderWidth:3 }} />
            <div style={{ marginTop:12, fontSize:13, color:'#44445A' }}>Loading listings from Robinhood Chain…</div>
          </div>
        )}
        {error && !loading && (
          <div style={{ textAlign:'center', padding:64 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
            <div style={{ fontSize:14, color:'#FF4444', marginBottom:8 }}>Could not load listings</div>
            <div style={{ fontSize:12, color:'#44445A', marginBottom:20 }}>{error}</div>
            <button className="btn btn-ghost" style={{ padding:'9px 22px' }} onClick={refetch}>Retry</button>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="empty">
            <div className="empty-icon">🪙</div>
            <div className="empty-title">{search ? 'No listings match your search' : 'No listings yet'}</div>
            <div className="empty-desc">{search ? 'Try a different contract address.' : 'Be the first to list a token on VENDR Market.'}</div>
            {!search && <button className="btn btn-lime" style={{ marginTop:20, padding:'10px 26px', fontSize:13 }} onClick={() => isConnected?setShowList(true):toast.error('Connect wallet first')}>+ List Your First Token</button>}
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <table className="tbl" style={{ marginTop:4 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Token</th>
                <th className="r">Remaining</th>
                <th className="r">Price (100%)</th>
                <th className="r">Accepts</th>
                <th className="r">Fill</th>
                <th className="r">Filled</th>
                <th className="r">Offers</th>
                <th className="r">Listed</th>
                <th className="r">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => <ListingRow key={l.id.toString()} l={l} onSelect={()=>setSelected(l.id)} />)}
            </tbody>
          </table>
        )}
      </div>

      <BottomBar />

      {showList && (
        <ListModal
          onClose={()=>setShowList(false)}
          onSuccess={h=>{ setShowList(false); setSuccess({type:'listed',details:{txHash:h}}); refetch(); }}
        />
      )}
      {selected!==null && (
        <DetailModal
          id={selected}
          userAddr={address as `0x${string}`|undefined}
          onClose={()=>setSelected(null)}
          onBuy={(h,d)=>{ setSelected(null); setSuccess({type:'bought',details:{...d,txHash:h}}); refetch(); }}
          onOffer={h=>{ setSelected(null); setSuccess({type:'offered',details:{txHash:h}}); refetch(); }}
          onAccept={h=>{ setSelected(null); setSuccess({type:'accepted',details:{txHash:h}}); refetch(); }}
        />
      )}
      {success && <SuccessModal type={success.type} details={success.details} onClose={()=>setSuccess(null)} />}
    </div>
  );
}
