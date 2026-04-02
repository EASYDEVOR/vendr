'use client';
import { use, useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useRouter } from 'next/navigation';
import { parseEther, parseUnits, formatEther } from 'viem';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import BottomBar from '@/components/BottomBar';
import SuccessModal from '@/components/SuccessModal';
import { publicClient } from '@/lib/client';
import { useOTCListing, OTCOffer } from '@/hooks/useOTC';
import { useTokenInfo } from '@/hooks/useWallet';
import { CONTRACTS, FEES, KNOWN_TOKENS } from '@/lib/constants';
import { OTC_ABI, ERC20_ABI } from '@/abis';
import { short, fmtETH, fmtToken, ago, fillLabel, addrLink, tweetUrl, tokenColor } from '@/lib/utils';

const ZERO = '0x0000000000000000000000000000000000000000';

function VerifiedBadge() {
  return (
    <span title="Verified" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:14, height:14, borderRadius:'50%', background:'#1DA1F2', color:'#fff', fontSize:8, fontWeight:900, marginLeft:3 }}>✓</span>
  );
}

// Determine seller's accepted payment from listing data
function resolvePayMode(l: { acceptsAnyToken: boolean; acceptedTokens: readonly string[] }): 'eth' | 'usdt' | 'both' {
  if (l.acceptsAnyToken) return 'both';
  if (l.acceptedTokens && l.acceptedTokens.length > 0) return 'usdt';
  return 'eth';
}

// Auto-lookup token info hook
function useTokenLookup(ca: string, userAddress?: string) {
  const [info, setInfo] = useState<{ name:string; symbol:string; decimals:number; balance:bigint }|null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!ca || !ca.startsWith('0x') || ca.length !== 42) { setInfo(null); return; }
    setLoading(true);
    const addr = ca.toLowerCase();
    const known = KNOWN_TOKENS[addr];
    const calls: Promise<any>[] = known
      ? [Promise.resolve(known.name), Promise.resolve(known.symbol),
         publicClient.readContract({ address:ca as `0x${string}`, abi:ERC20_ABI, functionName:'decimals' })]
      : [publicClient.readContract({ address:ca as `0x${string}`, abi:ERC20_ABI, functionName:'name' }),
         publicClient.readContract({ address:ca as `0x${string}`, abi:ERC20_ABI, functionName:'symbol' }),
         publicClient.readContract({ address:ca as `0x${string}`, abi:ERC20_ABI, functionName:'decimals' })];
    if (userAddress) {
      calls.push(publicClient.readContract({ address:ca as `0x${string}`, abi:ERC20_ABI, functionName:'balanceOf', args:[userAddress as `0x${string}`] }));
    }
    Promise.all(calls)
      .then(([n,s,d,bal]) => setInfo({ name:n as string, symbol:s as string, decimals:Number(d), balance:(bal??BigInt(0)) as bigint }))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [ca, userAddress]);
  return { info, loading };
}

// Live ETH/USD price hook
function useETHPrice() {
  const [price, setPrice] = useState<number | null>(null);
  useEffect(() => {
    const fetch = async () => {
      try {
        const r = await window.fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const d = await r.json();
        setPrice(d.ethereum.usd);
      } catch {}
    };
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, []);
  return price;
}

export default function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const listingId = BigInt(id);
  const { address } = useAccount();
  const { data: wc } = useWalletClient();
  const router = useRouter();
  const ethPrice = useETHPrice();

  const { listing:l, offers, loading, refetch } = useOTCListing(listingId);
  const info = useTokenInfo(l?.tokenAddress ?? null);
  const pm = l ? resolvePayMode(l) : 'eth';

  const [tab, setTab] = useState<'buy'|'offer'>('buy');
  const [buyHalf, setBuyHalf] = useState(false);
  // buyer's chosen payment currency — default to what seller allows
  const [buyPayWith, setBuyPayWith] = useState<'eth'|'usdt'>('eth');

  // Offer state
  const [oTok, setOTok] = useState<'eth'|'usdt'|'other'>('eth');
  const [oCA, setOCA] = useState('');
  const { info:oCAInfo, loading:oCALoading } = useTokenLookup(oTok==='other' ? oCA : '', address);
  const [oAmt, setOAmt] = useState('');
  const [oHalf, setOHalf] = useState(false);
  const [oMsg, setOMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<{type:any;details?:any}|null>(null);

  const [userETHBal, setUserETHBal] = useState(BigInt(0));
  const [userUSDTBal, setUserUSDTBal] = useState(BigInt(0));

  const isSeller = l?.seller?.toLowerCase() === address?.toLowerCase();
  const filled = l && l.totalAmount > 0n ? Number((l.totalAmount - l.remainingAmount)*100n/l.totalAmount) : 0;
  const pageUrl = typeof window !== 'undefined' ? window.location.href : `https://vendr-pi.vercel.app/listing/${id}`;
  const verified = l ? !!KNOWN_TOKENS[l.tokenAddress.toLowerCase()]?.verified : false;

  // When listing loads, set default payment to what seller accepts
  useEffect(() => {
    if (!l) return;
    const mode = resolvePayMode(l);
    setBuyPayWith(mode === 'usdt' ? 'usdt' : 'eth');
  }, [l]);

  useEffect(() => {
    if (!address) return;
    Promise.all([
      publicClient.getBalance({ address: address as `0x${string}` }),
      publicClient.readContract({ address:CONTRACTS.USDT, abi:ERC20_ABI, functionName:'balanceOf', args:[address as `0x${string}`] }),
    ]).then(([eth, usdt]) => {
      setUserETHBal(eth as bigint);
      setUserUSDTBal(usdt as bigint);
    }).catch(() => {});
  }, [address]);

  // Compute how much buyer pays
  // Listing price is always stored in ETH (wei). For USDT payment, convert using live price.
  const priceWei = l ? (buyHalf ? l.pricePerHalf : l.priceForFull) : BigInt(0);
  const priceETH = parseFloat(formatEther(priceWei));
  const priceUSD = ethPrice ? priceETH * ethPrice : null;
  // USDT amount in 6-decimal units
  const priceUSDT = priceUSD ? Math.round(priceUSD * 1_000_000) : null;

  async function doBuy() {
    if (!wc || !l) return;
    setBusy(true);
    try {
      if (buyPayWith === 'eth') {
        toast.loading('Processing ETH purchase…');
        const tx = await wc.writeContract({
          address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'buyWithETH',
          args:[l.id, buyHalf], value:priceWei + FEES.BUY,
        });
        await publicClient.waitForTransactionReceipt({ hash:tx as `0x${string}` });
        toast.dismiss();
        setSuccess({ type:'bought', details:{ txHash:tx as `0x${string}`, amount:fmtToken(buyHalf?l.totalAmount/2n:l.remainingAmount, info?.decimals??18), token:info?.symbol }});
      } else {
        // USDT payment
        if (!priceUSDT) { toast.error('Cannot get USDT price — try ETH'); setBusy(false); return; }
        const usdtAmt = BigInt(priceUSDT);
        toast.loading('Step 1/2 — Approving USDT…');
        const ap = await wc.writeContract({ address:CONTRACTS.USDT, abi:ERC20_ABI, functionName:'approve', args:[CONTRACTS.OTC, usdtAmt] });
        await publicClient.waitForTransactionReceipt({ hash:ap as `0x${string}` });
        toast.dismiss(); toast.loading('Step 2/2 — Buying with USDT…');
        const tx = await wc.writeContract({
          address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'buyWithToken',
          args:[l.id, buyHalf, CONTRACTS.USDT, usdtAmt], value:FEES.BUY,
        });
        await publicClient.waitForTransactionReceipt({ hash:tx as `0x${string}` });
        toast.dismiss();
        setSuccess({ type:'bought', details:{ txHash:tx as `0x${string}`, amount:fmtToken(buyHalf?l.totalAmount/2n:l.remainingAmount, info?.decimals??18), token:info?.symbol }});
      }
      refetch();
    } catch(e:any){ toast.dismiss(); toast.error(e?.shortMessage??'Failed'); }
    setBusy(false);
  }

  async function doOffer() {
    if (!wc || !l || !oAmt) return;
    setBusy(true);
    try {
      if (oTok === 'eth') {
        const wei = parseEther(oAmt);
        toast.loading('Submitting ETH offer…');
        const tx = await wc.writeContract({ address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'makeOfferWithETH', args:[l.id, oHalf, oMsg], value:wei+FEES.OFFER });
        await publicClient.waitForTransactionReceipt({ hash:tx as `0x${string}` });
        toast.dismiss();
        setSuccess({ type:'offered', details:{ txHash:tx as `0x${string}` }});
      } else if (oTok === 'usdt') {
        const amt = parseUnits(oAmt, 6);
        toast.loading('Step 1/2 — Approving USDT…');
        const ap = await wc.writeContract({ address:CONTRACTS.USDT, abi:ERC20_ABI, functionName:'approve', args:[CONTRACTS.OTC, amt] });
        await publicClient.waitForTransactionReceipt({ hash:ap as `0x${string}` });
        toast.dismiss(); toast.loading('Step 2/2 — Submitting offer…');
        const tx = await wc.writeContract({ address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'makeOfferWithToken', args:[l.id, oHalf, CONTRACTS.USDT, amt, oMsg], value:FEES.OFFER });
        await publicClient.waitForTransactionReceipt({ hash:tx as `0x${string}` });
        toast.dismiss();
        setSuccess({ type:'offered', details:{ txHash:tx as `0x${string}` }});
      } else if (oTok === 'other' && oCAInfo) {
        const amt = parseUnits(oAmt, oCAInfo.decimals);
        const addr = oCA as `0x${string}`;
        toast.loading('Step 1/2 — Approving token…');
        const ap = await wc.writeContract({ address:addr, abi:ERC20_ABI, functionName:'approve', args:[CONTRACTS.OTC, amt] });
        await publicClient.waitForTransactionReceipt({ hash:ap as `0x${string}` });
        toast.dismiss(); toast.loading('Step 2/2 — Submitting offer…');
        const tx = await wc.writeContract({ address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'makeOfferWithToken', args:[l.id, oHalf, addr, amt, oMsg], value:FEES.OFFER });
        await publicClient.waitForTransactionReceipt({ hash:tx as `0x${string}` });
        toast.dismiss();
        setSuccess({ type:'offered', details:{ txHash:tx as `0x${string}` }});
      }
      refetch();
    } catch(e:any){ toast.dismiss(); toast.error(e?.shortMessage??'Failed'); }
    setBusy(false);
  }

  async function doAccept(offerId: bigint) {
    if (!wc) return; setBusy(true);
    try {
      toast.loading('Accepting offer…');
      const tx = await wc.writeContract({ address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'acceptOffer', args:[offerId] });
      await publicClient.waitForTransactionReceipt({ hash:tx as `0x${string}` });
      toast.dismiss(); toast.success('Offer accepted!');
      refetch();
      setSuccess({ type:'accepted', details:{ txHash:tx as `0x${string}` }});
    } catch(e:any){ toast.dismiss(); toast.error(e?.shortMessage??'Failed'); }
    setBusy(false);
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#08080F', display:'flex', flexDirection:'column' }}>
      <Navbar />
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span className="spinner" style={{ width:48, height:48, borderWidth:4 }} />
      </div>
      <BottomBar />
    </div>
  );

  if (!l || !l.active) return (
    <div style={{ minHeight:'100vh', background:'#08080F', display:'flex', flexDirection:'column' }}>
      <Navbar />
      <div className="empty" style={{ flex:1 }}>
        <div className="empty-icon">🚫</div>
        <div className="empty-title">Listing not found</div>
        <div className="empty-desc">This listing may have been cancelled or already settled.</div>
        <button className="btn btn-lime" style={{ marginTop:20, padding:'10px 26px', fontSize:13 }} onClick={()=>router.push('/otc')}>Browse OTC Market</button>
      </div>
      <BottomBar />
    </div>
  );

  const tweetMsg = `🔥 Token OTC listing on VENDR Market!\n\n📦 ${info?.name??'Token'} (${info?.symbol??''})\n💰 ${fmtETH(l.priceForFull)} ETH for ${fmtToken(l.remainingAmount,info?.decimals??18)} ${info?.symbol??''}\n🔗 ${pageUrl}\n\n#VENDR #RobinhoodChain #OTC`;

  // Price display string based on payment mode and buyer's choice
  const priceDisplay = buyPayWith === 'usdt' && priceUSD
    ? `$${priceUSD.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })} USDT`
    : `${fmtETH(priceWei)} ETH`;

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#08080F' }}>
      <Navbar />
      <div style={{ maxWidth:940, margin:'0 auto', padding:'24px 20px', width:'100%' }}>

        <button onClick={()=>router.push('/otc')} style={{ background:'none', border:'none', color:'#8888AA', fontSize:13, cursor:'pointer', marginBottom:20, display:'flex', alignItems:'center', gap:6, fontFamily:'DM Sans,sans-serif' }}>
          ← Back to OTC Market
        </button>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:20 }}>

          {/* ── LEFT ── */}
          <div>
            <div style={{ background:'#0F0F1C', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:24, marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:18 }}>
                <div style={{ width:60, height:60, borderRadius:'50%', background:'rgba(200,240,0,.1)', border:'2px solid rgba(200,240,0,.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:900, fontFamily:'Space Mono,monospace', color:'#C8F000', flexShrink:0 }}>
                  {info?.symbol?.slice(0,2)??'??'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:26, fontWeight:800, marginBottom:4, display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
                    {info?.name??'Unknown Token'}
                    {verified && <VerifiedBadge />}
                    <span style={{ color:'#8888AA', fontSize:16, fontWeight:400, marginLeft:4 }}>{info?.symbol}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'#44445A' }}>{l.tokenAddress}</span>
                    <a href={addrLink(l.tokenAddress)} target="_blank" rel="noopener noreferrer" className="scan-btn">🔍 BlockScan ↗</a>
                  </div>
                </div>
                <a href={tweetUrl(tweetMsg)} target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#000', border:'1px solid #333', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap', flexShrink:0 }}>
                  𝕏 Share
                </a>
              </div>

              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
                <span className={`badge ${l.fillTerms===0?'badge-green':'badge-lime'}`}>{fillLabel(l.fillTerms)}</span>
                <span className="badge badge-lime">{pm==='eth'?'ETH Only':pm==='usdt'?'USDT Only':'ETH + USDT'}</span>
                <span className="badge badge-gold">#{l.id.toString()}</span>
                {verified && <span className="badge" style={{ background:'rgba(29,161,242,.1)', color:'#1DA1F2', border:'1px solid rgba(29,161,242,.25)' }}>✓ Verified</span>}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                {[
                  { k:'Total Listed', v:fmtToken(l.totalAmount, info?.decimals??18) },
                  { k:'Remaining',    v:fmtToken(l.remainingAmount, info?.decimals??18) },
                  { k:'Price (100%)', v:`${fmtETH(l.priceForFull)} ETH`, c:'#C8F000' },
                  { k:'Offers',       v:l.offerCount.toString(), c:'#F5A623' },
                ].map(s=>(
                  <div key={s.k} style={{ background:'#1C1C35', borderRadius:10, padding:12, textAlign:'center' }}>
                    <div style={{ fontSize:9, color:'#44445A', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4, fontFamily:'Space Mono,monospace' }}>{s.k}</div>
                    <div style={{ fontFamily:'Space Mono,monospace', fontSize:14, fontWeight:700, color:s.c??'#fff' }}>{s.v}</div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#8888AA', marginBottom:5 }}>
                  <span>Fill progress</span>
                  <span style={{ color:filled>0?'#00C805':'#44445A' }}>{filled}% filled</span>
                </div>
                <div className="bar" style={{ height:6 }}><div className="bar-fill" style={{ width:`${filled}%` }} /></div>
              </div>

              {l.description && (
                <div style={{ marginTop:14, padding:12, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:8, fontSize:13, color:'#8888AA', lineHeight:1.6, fontStyle:'italic' }}>
                  "{l.description}"
                </div>
              )}

              <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:'rgba(200,240,0,.05)', border:'1px solid rgba(200,240,0,.12)', borderRadius:8 }}>
                <span style={{ fontSize:11, color:'#8888AA', flex:1, fontFamily:'Space Mono,monospace', wordBreak:'break-all' }}>{pageUrl}</span>
                <button onClick={()=>{ navigator.clipboard?.writeText(pageUrl); toast.success('Link copied!'); }}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#C8F000', fontSize:11, fontWeight:700, whiteSpace:'nowrap', fontFamily:'DM Sans,sans-serif' }}>
                  📋 Copy
                </button>
              </div>
            </div>

            {/* Seller */}
            <div style={{ background:'#0F0F1C', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:18, marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#8888AA', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10, fontFamily:'Space Mono,monospace' }}>Seller</div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'#1C1C35', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, fontFamily:'Space Mono,monospace', color:'#C8F000' }}>{l.seller.slice(2,4).toUpperCase()}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:12 }}>{l.seller}</div>
                  <div style={{ fontSize:10, color:'#44445A', marginTop:2 }}>Listed {ago(l.createdAt)}</div>
                </div>
                <a href={addrLink(l.seller)} target="_blank" rel="noopener noreferrer" className="scan-btn">🔍 View</a>
              </div>
            </div>

            {/* Offers */}
            <div style={{ background:'#0F0F1C', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,.07)', fontSize:14, fontWeight:700, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                Active Offers
                <span className="badge badge-gold">{offers.length} offer{offers.length!==1?'s':''}</span>
              </div>
              {offers.length === 0 ? (
                <div style={{ padding:'28px 18px', textAlign:'center', fontSize:13, color:'#44445A' }}>No offers yet — be the first.</div>
              ) : offers.map((o:OTCOffer)=>(
                <div key={o.id.toString()} style={{ padding:'13px 18px', borderBottom:'1px solid rgba(255,255,255,.03)', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:'#1C1C35', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, fontFamily:'Space Mono,monospace', flexShrink:0 }}>{o.offerMaker.slice(2,4).toUpperCase()}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'#8888AA' }}>{short(o.offerMaker)}</div>
                    <div style={{ fontSize:10, color:'#44445A', marginTop:1 }}>
                      {o.forHalf?'50%':'100%'} · {o.offerToken===ZERO?'ETH':'Token'} · {ago(o.createdAt)}{o.message?` · "${o.message}"` : ''}
                    </div>
                  </div>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:14, fontWeight:700, color:'#C8F000', marginRight:isSeller?12:0 }}>
                    {o.offerToken===ZERO ? `${fmtETH(o.offerAmount)} ETH` : fmtToken(o.offerAmount,6)}
                  </div>
                  {isSeller && (
                    <button disabled={busy} onClick={()=>doAccept(o.id)}
                      style={{ padding:'6px 16px', background:'#00C805', border:'none', borderRadius:6, color:'#000', fontSize:12, fontWeight:700, cursor:'pointer', opacity:busy?0.5:1 }}>
                      Accept
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT panel ── */}
          {!isSeller ? (
            <div>
              <div style={{ background:'#0F0F1C', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:20, position:'sticky', top:80 }}>
                <div style={{ display:'flex', gap:6, marginBottom:18 }}>
                  {(['buy','offer'] as const).map(t=>(
                    <button key={t} className={`sub-tab ${tab===t?'active':''}`} style={{ flex:1, fontSize:13 }} onClick={()=>setTab(t)}>
                      {t==='buy'?'⚡ Buy Now':'💬 Make Offer'}
                    </button>
                  ))}
                </div>

                {/* ── BUY TAB ── */}
                {tab==='buy' && (
                  <div>
                    {/* Fill selector */}
                    {l.fillTerms===0 && (
                      <div>
                        <label className="label">Fill Amount</label>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                          {[
                            { v:false, label:'100%', amt:l.remainingAmount, pWei:l.priceForFull },
                            { v:true,  label:'50%',  amt:l.totalAmount/2n,  pWei:l.pricePerHalf },
                          ].map(o=>{
                            const pEth = parseFloat(formatEther(o.pWei));
                            const pUsd = ethPrice ? pEth * ethPrice : null;
                            return (
                              <div key={String(o.v)} onClick={()=>setBuyHalf(o.v)} style={{ padding:12, cursor:'pointer', borderRadius:8, textAlign:'center', border:`1px solid ${buyHalf===o.v?'#C8F000':'rgba(255,255,255,.1)'}`, background:buyHalf===o.v?'rgba(200,240,0,.07)':'#1C1C35' }}>
                                <div style={{ fontSize:14, fontWeight:800 }}>{o.label}</div>
                                <div style={{ fontSize:11, color:'#8888AA', marginTop:2 }}>{fmtToken(o.amt,info?.decimals??18)} {info?.symbol}</div>
                                <div style={{ fontSize:13, fontWeight:700, color:'#C8F000', marginTop:4 }}>{fmtETH(o.pWei)} ETH</div>
                                {pUsd && <div style={{ fontSize:10, color:'#8888AA', marginTop:1 }}>≈ ${pUsd.toLocaleString('en-US',{maximumFractionDigits:2})} USDT</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Payment method — based strictly on seller's choice */}
                    <div style={{ marginBottom:14 }}>
                      <label className="label">Pay With</label>
                      {pm==='eth' && (
                        <div style={{ padding:'12px 14px', background:'rgba(200,240,0,.07)', border:'1px solid rgba(200,240,0,.2)', borderRadius:8, display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ fontSize:20 }}>⟠</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:700 }}>ETH Only</div>
                            <div style={{ fontSize:11, color:'#8888AA' }}>Your balance: {fmtETH(userETHBal,4)} ETH</div>
                          </div>
                          <span style={{ color:'#C8F000', fontSize:16 }}>✓</span>
                        </div>
                      )}
                      {pm==='usdt' && (
                        <div style={{ padding:'12px 14px', background:'rgba(200,240,0,.07)', border:'1px solid rgba(200,240,0,.2)', borderRadius:8, display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ fontSize:20 }}>💵</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:700 }}>USDT Only</div>
                            <div style={{ fontSize:11, color:'#8888AA' }}>Your balance: {(Number(userUSDTBal)/1_000_000).toFixed(2)} USDT</div>
                          </div>
                          <span style={{ color:'#C8F000', fontSize:16 }}>✓</span>
                        </div>
                      )}
                      {pm==='both' && (
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                          {[
                            { v:'eth' as const,  icon:'⟠', l:'ETH',  bal:`${fmtETH(userETHBal,4)} ETH` },
                            { v:'usdt' as const, icon:'💵', l:'USDT', bal:`${(Number(userUSDTBal)/1_000_000).toFixed(2)} USDT` },
                          ].map(o=>(
                            <div key={o.v} onClick={()=>setBuyPayWith(o.v)} style={{ padding:'11px 12px', cursor:'pointer', borderRadius:8, textAlign:'center', border:`1px solid ${buyPayWith===o.v?'#C8F000':'rgba(255,255,255,.1)'}`, background:buyPayWith===o.v?'rgba(200,240,0,.07)':'#1C1C35' }}>
                              <div style={{ fontSize:20, marginBottom:3 }}>{o.icon}</div>
                              <div style={{ fontSize:12, fontWeight:700 }}>{o.l}</div>
                              <div style={{ fontSize:10, color:'#8888AA', marginTop:2 }}>{o.bal}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Price summary — shows ETH or live USDT equivalent */}
                    <div style={{ padding:'12px 14px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:8, marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:12 }}>
                        <span style={{ color:'#8888AA' }}>You receive</span>
                        <span style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'#fff' }}>
                          {fmtToken(buyHalf?l.totalAmount/2n:l.remainingAmount, info?.decimals??18)} {info?.symbol??''}
                        </span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:12 }}>
                        <span style={{ color:'#8888AA' }}>Token price</span>
                        <span style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'#fff' }}>
                          {fmtETH(priceWei)} ETH
                          {priceUSD && <span style={{ color:'#8888AA', marginLeft:6 }}>≈ ${priceUSD.toLocaleString('en-US',{maximumFractionDigits:2})}</span>}
                        </span>
                      </div>
                      {buyPayWith==='usdt' && priceUSD && (
                        <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:12 }}>
                          <span style={{ color:'#8888AA' }}>Live ETH price</span>
                          <span style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'#F5A623' }}>${ethPrice?.toLocaleString('en-US',{maximumFractionDigits:2})} / ETH</span>
                        </div>
                      )}
                      <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:12 }}>
                        <span style={{ color:'#8888AA' }}>Protocol fee</span>
                        <span style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'#fff' }}>0.002 ETH</span>
                      </div>
                      <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', marginTop:4, paddingTop:8, display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontWeight:700 }}>You pay</span>
                        <div style={{ textAlign:'right' }}>
                          {buyPayWith==='usdt' && priceUSD ? (
                            <>
                              <div style={{ fontFamily:'Space Mono,monospace', fontSize:14, fontWeight:700, color:'#C8F000' }}>
                                ${priceUSD.toLocaleString('en-US',{maximumFractionDigits:2})} USDT
                              </div>
                              <div style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'#8888AA' }}>+ {fmtETH(FEES.BUY)} ETH fee</div>
                            </>
                          ) : (
                            <div style={{ fontFamily:'Space Mono,monospace', fontSize:14, fontWeight:700, color:'#C8F000' }}>
                              {fmtETH(priceWei + FEES.BUY)} ETH
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {buyPayWith==='usdt' && !priceUSD && (
                      <div style={{ padding:'8px 12px', background:'rgba(255,68,68,.07)', border:'1px solid rgba(255,68,68,.2)', borderRadius:7, fontSize:11, color:'#FF4444', marginBottom:14 }}>
                        ⚠️ Could not fetch live ETH price. Please try again or pay with ETH.
                      </div>
                    )}

                    <button className="btn btn-lime" style={{ width:'100%', padding:'13px 0', fontSize:14 }} disabled={busy||(buyPayWith==='usdt'&&!priceUSDT)} onClick={doBuy}>
                      {busy
                        ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><span className="spinner spinner-black"/>Processing…</span>
                        : buyPayWith==='usdt' && priceUSD
                          ? `Buy Now — $${priceUSD.toLocaleString('en-US',{maximumFractionDigits:2})} USDT`
                          : `Buy Now — ${fmtETH(priceWei+FEES.BUY)} ETH`}
                    </button>
                  </div>
                )}

                {/* ── OFFER TAB ── */}
                {tab==='offer' && (
                  <div>
                    <div style={{ padding:'9px 12px', background:'rgba(245,166,35,.07)', border:'1px solid rgba(245,166,35,.2)', borderRadius:7, fontSize:11, color:'#F5A623', marginBottom:14 }}>
                      ⚠️ Offer fee 0.001 ETH (non-refundable).
                    </div>

                    <label className="label">Offer With</label>
                    {[
                      { v:'eth',   icon:'⟠', l:'ETH',         d:`Bal: ${fmtETH(userETHBal,4)} ETH` },
                      { v:'usdt',  icon:'💵', l:'USDT',        d:`Bal: ${(Number(userUSDTBal)/1_000_000).toFixed(2)} USDT` },
                      { v:'other', icon:'🪙', l:'Other Token',  d:'Paste CA — auto-looks up instantly' },
                    ].map(o=>(
                      <div key={o.v} onClick={()=>setOTok(o.v as any)} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', marginBottom:7, borderRadius:8, cursor:'pointer', border:`1px solid ${oTok===o.v?'#C8F000':'rgba(255,255,255,.1)'}`, background:oTok===o.v?'rgba(200,240,0,.07)':'#1C1C35' }}>
                        <span style={{ fontSize:16 }}>{o.icon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:700 }}>{o.l}</div>
                          <div style={{ fontSize:10, color:'#8888AA' }}>{o.d}</div>
                        </div>
                      </div>
                    ))}

                    {oTok==='other' && (
                      <div style={{ marginBottom:12 }}>
                        <input className="input" placeholder="Token CA 0x…" value={oCA} onChange={e=>setOCA(e.target.value)} />
                        {oCALoading && <div style={{ fontSize:11, color:'#8888AA', marginTop:4 }}>Looking up…</div>}
                        {oCAInfo && !oCALoading && (
                          <div style={{ marginTop:6, padding:'8px 10px', background:oCAInfo.balance>0n?'rgba(0,200,5,.07)':'rgba(255,68,68,.07)', border:`1px solid ${oCAInfo.balance>0n?'rgba(0,200,5,.2)':'rgba(255,68,68,.2)'}`, borderRadius:6, fontSize:11, color:oCAInfo.balance>0n?'#00C805':'#FF4444' }}>
                            {oCAInfo.balance>0n
                              ? `✓ ${oCAInfo.name} (${oCAInfo.symbol}) — Bal: ${fmtToken(oCAInfo.balance,oCAInfo.decimals)} ${oCAInfo.symbol}`
                              : `⚠️ ${oCAInfo.name} — You have 0 of this token`}
                          </div>
                        )}
                        {oCA.length===42 && !oCAInfo && !oCALoading && <div style={{ fontSize:11, color:'#FF4444', marginTop:4 }}>Token not found</div>}
                      </div>
                    )}

                    {l.fillTerms===0 && (
                      <div style={{ marginBottom:12 }}>
                        <label className="label">Fill Amount</label>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                          {[{v:false,l:'100%'},{v:true,l:'50%'}].map(o=>(
                            <div key={String(o.v)} onClick={()=>setOHalf(o.v)} style={{ padding:'9px 0', cursor:'pointer', borderRadius:8, textAlign:'center', border:`1px solid ${oHalf===o.v?'#C8F000':'rgba(255,255,255,.1)'}`, background:oHalf===o.v?'rgba(200,240,0,.07)':'#1C1C35', fontSize:13, fontWeight:700 }}>
                              {o.l}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <input className="input" type="number" placeholder={`Amount (${oTok==='eth'?'ETH':oTok==='usdt'?'USDT':oCAInfo?.symbol??'tokens'})`} value={oAmt} onChange={e=>setOAmt(e.target.value)} style={{ marginBottom:10 }} />
                    <textarea className="input" rows={2} placeholder="Message to seller (optional)" value={oMsg} onChange={e=>setOMsg(e.target.value)} style={{ resize:'vertical', marginBottom:14 }} />

                    <button className="btn btn-lime" style={{ width:'100%', padding:'12px 0', fontSize:14 }}
                      disabled={busy||!oAmt||(oTok==='other'&&!oCAInfo)}
                      onClick={doOffer}>
                      {busy
                        ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><span className="spinner spinner-black"/>Processing…</span>
                        : 'Submit Offer — 0.001 ETH Fee'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ background:'#0F0F1C', border:'1px solid rgba(200,240,0,.14)', borderRadius:14, padding:20, height:'fit-content', position:'sticky', top:80 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>Your Listing</div>
              <div style={{ fontSize:13, color:'#8888AA', lineHeight:1.7, marginBottom:16 }}>
                Accept offers above. Go to Portfolio to edit price, payment terms or cancel.
              </div>
              <button className="btn btn-lime" style={{ width:'100%', padding:'10px 0', fontSize:13 }} onClick={()=>router.push('/portfolio')}>
                Manage in Portfolio →
              </button>
            </div>
          )}
        </div>
      </div>
      <BottomBar />
      {success && <SuccessModal type={success.type} details={success.details} onClose={()=>setSuccess(null)} />}
    </div>
  );
}
