'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { publicClient } from '@/lib/client';
import { CONTRACTS } from '@/lib/constants';
import { OTC_ABI } from '@/abis';
import Navbar     from '@/components/Navbar';
import LiveTicker from '@/components/LiveTicker';
import BottomBar  from '@/components/BottomBar';

export default function HomePage() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [stats, setStats] = useState({ listings:0, trades:0 });

  const SLIDES = [
    { tag:'OTC TRADING', title:'The OTC Market', hi:'for Robinhood Chain',
      desc:'Trade any token peer-to-peer with full on-chain escrow. Set your price, fill terms, accept offers — entirely on your terms.',
      a:'Explore Listings', aPath:'/otc', b:'List a Token', bPath:'/otc' },
    { tag:'ESCROW PROTECTED', title:'Every Deal', hi:'Protected by Escrow',
      desc:'Tokens lock in the smart contract the moment you list. Buyers pay, escrow releases — no trust between strangers required.',
      a:'View OTC Market', aPath:'/otc', b:'Get Free USDT', bPath:'/faucet' },
    { tag:'COMING SOON', title:'More Features', hi:'On The Way',
      desc:'NFT marketplace and Social OTC (trade X accounts, Reddit, Instagram, wallets) are being built. Join Discord for early access.',
      a:'Join Discord', aPath:'https://discord.gg/9suGUrAtag', b:'Follow X', bPath:'https://x.com/VENDR_XYZ' },
  ];

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % 3), 5500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    Promise.all([
      publicClient.readContract({ address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'listingCount' }).catch(() => BigInt(0)),
      publicClient.readContract({ address:CONTRACTS.OTC, abi:OTC_ABI, functionName:'totalTrades'  }).catch(() => BigInt(0)),
    ]).then(([l, t]) => setStats({ listings:Number(l as bigint), trades:Number(t as bigint) }));
  }, []);

  const s = SLIDES[slide];
  const ext = (p:string) => p.startsWith('http');

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#08080F' }}>
      <Navbar />
      <LiveTicker />

      <div style={{ minHeight:340, background:'radial-gradient(ellipse at 68% 50%, rgba(200,240,0,.09) 0%, transparent 60%), #0C0C18', display:'flex', alignItems:'center', padding:'44px 36px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:100, top:'50%', transform:'translateY(-50%)', width:220, height:220, borderRadius:'50%', border:'1px solid rgba(200,240,0,.08)', display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <div style={{ width:140, height:140, borderRadius:'50%', border:'1px solid rgba(200,240,0,.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:52 }}>🤝</div>
        </div>
        <div key={slide} style={{ maxWidth:560, animation:'fadeUp .45s ease' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px', background:'rgba(200,240,0,.08)', border:'1px solid rgba(200,240,0,.18)', borderRadius:20, fontSize:10, color:'#C8F000', fontWeight:700, letterSpacing:'.06em', marginBottom:14 }}>
            <span className="live-dot" />{s.tag}
          </div>
          <h1 style={{ fontFamily:'Boogaloo,cursive', fontSize:48, lineHeight:1.1, marginBottom:12 }}>
            {s.title}<br/><span style={{ color:'#C8F000' }}>{s.hi}</span>
          </h1>
          <p style={{ fontSize:14, color:'#8888AA', lineHeight:1.7, marginBottom:24, maxWidth:430 }}>{s.desc}</p>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-lime" style={{ padding:'11px 26px', fontSize:13 }} onClick={() => ext(s.aPath) ? window.open(s.aPath,'_blank') : router.push(s.aPath)}>{s.a}</button>
            <button className="btn btn-ghost" style={{ padding:'11px 26px', fontSize:13 }} onClick={() => ext(s.bPath) ? window.open(s.bPath,'_blank') : router.push(s.bPath)}>{s.b}</button>
          </div>
          <div style={{ display:'flex', gap:6, marginTop:20 }}>
            {[0,1,2].map(i => <div key={i} onClick={() => setSlide(i)} style={{ width:i===slide?22:7, height:3, borderRadius:2, background:i===slide?'#C8F000':'rgba(255,255,255,.12)', cursor:'pointer', transition:'all .3s' }} />)}
          </div>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', padding:'10px 20px', background:'#0F0F1C', borderBottom:'1px solid rgba(255,255,255,.07)', overflowX:'auto' }}>
        {[
          { label:'Active Listings', value:stats.listings.toString(), color:'#C8F000' },
          { label:'Total Trades',    value:stats.trades.toString(),   color:'#00C805' },
          { label:'Network',         value:'Robinhood Testnet',       color:'#00C805' },
          { label:'Chain ID',        value:'46630',                   color:'#8888AA' },
          { label:'Escrow',          value:'On-chain Protected',      color:'#C8F000' },
        ].map((st,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:7, padding:'0 20px', borderRight:'1px solid rgba(255,255,255,.07)', flexShrink:0 }}>
            <span style={{ fontSize:10, color:'#44445A', fontFamily:'Space Mono,monospace' }}>{st.label}</span>
            <span style={{ fontFamily:'Space Mono,monospace', fontSize:13, fontWeight:700, color:st.color }}>{st.value}</span>
          </div>
        ))}
      </div>

      <div style={{ padding:'28px 20px 0', flex:1 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:28 }}>
          {[
            { icon:'🪙', title:'Token OTC',       badge:'LIVE', bc:'#C8F000', path:'/otc',    desc:'List any token on Robinhood Chain. Set price, fill terms, accepted tokens. Every deal escrow-protected.' },
            { icon:'🖼️', title:'NFT Marketplace', badge:'SOON', bc:'#F5A623', path:'/nft',    desc:'Full NFT marketplace coming. Create collections, mint, list at fixed price or open to offers.' },
            { icon:'💬', title:'Social OTC',       badge:'SOON', bc:'#F5A623', path:'/social', desc:'Trade social accounts — X, Reddit, Instagram, wallets and more. The first marketplace for social assets.' },
          ].map(f => (
            <div key={f.title} className="card" onClick={() => router.push(f.path)} style={{ padding:20, cursor:'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(200,240,0,.3)'; (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,.07)'; (e.currentTarget as HTMLElement).style.transform='translateY(0)'; }}>
              <div style={{ fontSize:28, marginBottom:10 }}>{f.icon}</div>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>{f.title}</div>
              <div style={{ fontSize:12, color:'#44445A', lineHeight:1.6, marginBottom:12 }}>{f.desc}</div>
              <span className={`badge ${f.bc==='#C8F000'?'badge-lime':'badge-gold'}`}>{f.badge}</span>
            </div>
          ))}
        </div>

        <div className="card" onClick={() => router.push('/faucet')} style={{ padding:'18px 24px', marginBottom:28, cursor:'pointer', borderColor:'rgba(0,200,5,.15)', background:'linear-gradient(135deg,rgba(0,200,5,.04),rgba(0,200,5,.01)),#0F0F1C', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>💰 Free USDT Faucet</div>
            <div style={{ fontSize:13, color:'#8888AA' }}>Claim 500 free USDT every 24 hours — use it to buy tokens and make offers.</div>
          </div>
          <button className="btn btn-lime" style={{ padding:'9px 22px', fontSize:13, flexShrink:0, marginLeft:20, background:'#00C805', boxShadow:'0 0 16px rgba(0,200,5,.3)' }}>Claim Free →</button>
        </div>

        <div style={{ marginBottom:32 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>🪙 Token OTC Market</div>
            <button className="btn btn-ghost" style={{ padding:'5px 12px', fontSize:12 }} onClick={() => router.push('/otc')}>View all →</button>
          </div>
          {stats.listings === 0 ? (
            <div className="card" style={{ padding:'44px 20px', textAlign:'center' }}>
              <div className="empty-icon">🪙</div>
              <div className="empty-title">No listings yet — be the first</div>
              <div className="empty-desc" style={{ marginBottom:18 }}>List a token and let buyers find you. All trades protected by on-chain escrow.</div>
              <button className="btn btn-lime" style={{ padding:'10px 26px', fontSize:13 }} onClick={() => router.push('/otc')}>List a Token Now</button>
            </div>
          ) : (
            <div className="card" style={{ padding:'24px', textAlign:'center' }}>
              <div style={{ fontSize:36, fontWeight:800, color:'#C8F000', fontFamily:'Space Mono,monospace', marginBottom:6 }}>{stats.listings}</div>
              <div style={{ fontSize:13, color:'#8888AA', marginBottom:16 }}>Active token listings on the market</div>
              <button className="btn btn-lime" style={{ padding:'10px 26px', fontSize:13 }} onClick={() => router.push('/otc')}>Browse Listings →</button>
            </div>
          )}
        </div>
      </div>
      <BottomBar />
    </div>
  );
}
