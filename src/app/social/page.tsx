'use client';
import { useState } from 'react';
import Navbar    from '@/components/Navbar';
import LiveTicker from '@/components/LiveTicker';
import BottomBar from '@/components/BottomBar';
import toast from 'react-hot-toast';

const ASSETS = [
  { icon:'𝕏',  name:'X (Twitter) Accounts',   desc:'Monetised accounts, high followers, aged handles, niche communities. The most traded social asset on OTC.' },
  { icon:'📷', name:'Instagram Accounts',      desc:'Niche pages, business accounts, influencer profiles. Verified or high-engagement accounts.' },
  { icon:'🤖', name:'Reddit Accounts',         desc:'High karma, aged accounts, subreddit moderator positions. Trusted community standing.' },
  { icon:'📱', name:'TikTok Accounts',         desc:'Creators with large followings, trending niches, ad-monetised profiles.' },
  { icon:'👛', name:'Crypto Wallets',          desc:'Wallets with specific on-chain history, early-holder status, NFT collections, ENS names.' },
  { icon:'🎮', name:'Gaming Accounts',         desc:'Rare items, high-ranked profiles, limited skins — CS2, Fortnite, Valorant, Roblox.' },
  { icon:'📢', name:'Telegram Channels',       desc:'Large member channels, bots, invite links with proven reach in crypto communities.' },
  { icon:'🌐', name:'Domains & Websites',      desc:'Aged domains, SEO-valued URLs, established traffic sites and niche blogs.' },
];

export default function SocialPage() {
  const [email, setEmail] = useState('');
  const [done,  setDone]  = useState(false);

  const notify = () => {
    if (!email) { toast.error('Enter your email or wallet address'); return; }
    setDone(true);
    toast.success('You\'re on the list!');
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#08080F' }}>
      <Navbar /><LiveTicker />
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'50px 20px', textAlign:'center' }}>

        <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', background:'rgba(245,166,35,.1)', border:'1px solid rgba(245,166,35,.25)', borderRadius:20, fontSize:10, color:'#F5A623', fontWeight:700, letterSpacing:'.08em', marginBottom:20 }}>
          💬 COMING SOON
        </div>

        <h1 style={{ fontFamily:'Boogaloo,cursive', fontSize:44, marginBottom:12 }}>
          Social OTC<br/><span style={{ color:'#C8F000' }}>Trade Social Assets</span>
        </h1>

        <p style={{ fontSize:14, color:'#8888AA', maxWidth:520, lineHeight:1.7, marginBottom:10 }}>
          Social OTC is a marketplace for <strong style={{ color:'#fff' }}>social accounts, wallets, gaming assets and digital identities</strong>. People already trade these on Telegram and Discord — VENDR brings it on-chain with escrow, reputation and verifiable ownership.
        </p>
        <p style={{ fontSize:13, color:'#44445A', maxWidth:480, lineHeight:1.6, marginBottom:36 }}>
          Buyer puts funds in escrow → seller transfers account → escrow releases. Simple, safe, trustless.
        </p>

        {/* asset grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, maxWidth:680, width:'100%', marginBottom:40 }}>
          {ASSETS.map(a=>(
            <div key={a.name} className="card" style={{ padding:16, textAlign:'left' }}>
              <div style={{ fontSize:28, marginBottom:10 }}>{a.icon}</div>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:5 }}>{a.name}</div>
              <div style={{ fontSize:11, color:'#44445A', lineHeight:1.55 }}>{a.desc}</div>
            </div>
          ))}
        </div>

        {/* how it will work */}
        <div style={{ maxWidth:560, width:'100%', marginBottom:40 }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>How Social OTC will work</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {[
              { n:'01', t:'List',    d:'Seller lists social asset with proof of ownership & price' },
              { n:'02', t:'Escrow',  d:'Buyer deposits payment into on-chain escrow smart contract' },
              { n:'03', t:'Transfer',d:'Seller transfers account credentials / ownership to buyer' },
              { n:'04', t:'Release', d:'Buyer confirms receipt → escrow releases payment to seller' },
            ].map(s=>(
              <div key={s.n} style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, padding:14 }}>
                <div style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'#C8F000', marginBottom:6 }}>{s.n}</div>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>{s.t}</div>
                <div style={{ fontSize:11, color:'#44445A', lineHeight:1.5 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>

        {!done ? (
          <>
            <div style={{ fontSize:14, fontWeight:700, color:'#8888AA', marginBottom:12 }}>Get notified when Social OTC launches</div>
            <div style={{ display:'flex', gap:8 }}>
              <input className="input" style={{ width:260 }} placeholder="Email or wallet address…" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&notify()} />
              <button className="btn btn-lime" style={{ padding:'10px 22px', fontSize:13 }} onClick={notify}>Notify Me</button>
            </div>
          </>
        ) : (
          <div style={{ padding:'14px 26px', background:'rgba(200,240,0,.07)', border:'1px solid rgba(200,240,0,.2)', borderRadius:10, fontSize:14, color:'#C8F000', fontWeight:600 }}>
            ✓ You're on the list — we'll notify you when Social OTC launches!
          </div>
        )}

        <div style={{ marginTop:32, fontSize:12, color:'#44445A' }}>
          In the meantime →{' '}
          <a href="/otc" style={{ color:'#C8F000', textDecoration:'none' }}>Trade Tokens on OTC</a>{' '}or{' '}
          <a href="https://discord.gg/9suGUrAtag" target="_blank" rel="noopener noreferrer" style={{ color:'#7289da', textDecoration:'none' }}>Join Discord</a>
        </div>
      </div>
      <BottomBar />
    </div>
  );
}
