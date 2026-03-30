'use client';
import Navbar    from '@/components/Navbar';
import LiveTicker from '@/components/LiveTicker';
import BottomBar from '@/components/BottomBar';
import { useRouter } from 'next/navigation';

// Fake blur-layer activity items
const FAKE = [
  { img:'🎨', name:'Cosmic Ape #142',   col:'Cosmic Apes',     price:'0.45 ETH' },
  { img:'🌊', name:'Wave Form #7',       col:'Wave Forms',      price:'1.2 ETH'  },
  { img:'🔮', name:'Crystal Mind #33',   col:'Crystal Minds',   price:'0.8 ETH'  },
  { img:'👾', name:'Pixel Ghost #201',   col:'Pixel Ghosts',    price:'0.3 ETH'  },
  { img:'🦋', name:'Neon Wing #88',      col:'Neon Wings',      price:'2.1 ETH'  },
  { img:'🌌', name:'Void Walker #9',     col:'Void Walkers',    price:'0.6 ETH'  },
  { img:'🐉', name:'Chain Dragon #55',   col:'Chain Dragons',   price:'1.5 ETH'  },
  { img:'💎', name:'Diamond Hands #12',  col:'Diamond Hands',   price:'0.9 ETH'  },
  { img:'🚀', name:'Rocket Club #77',    col:'Rocket Club',     price:'0.4 ETH'  },
  { img:'🌸', name:'Sakura Pass #301',   col:'Sakura Pass',     price:'0.7 ETH'  },
];

export default function NFTPage() {
  const router = useRouter();
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#08080F' }}>
      <Navbar /><LiveTicker />
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>

        {/* ── blurry background activity ── */}
        <div style={{ padding:'20px 20px 0', userSelect:'none', pointerEvents:'none' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:16 }}>
            {FAKE.map((n,i)=>(
              <div key={i} className="card" style={{ overflow:'hidden', opacity:.7 }}>
                <div style={{ height:140, background:`linear-gradient(135deg,#1C1C35,#15152A)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:52 }}>{n.img}</div>
                <div style={{ padding:'10px 12px 12px' }}>
                  <div style={{ fontSize:11, color:'#44445A', marginBottom:2 }}>{n.col}</div>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>{n.name}</div>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:12, fontWeight:700, color:'#C8F000' }}>{n.price}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12 }}>
            {[...FAKE].reverse().map((n,i)=>(
              <div key={i} className="card" style={{ overflow:'hidden', opacity:.45 }}>
                <div style={{ height:100, background:`linear-gradient(135deg,#0F0F1C,#1C1C35)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:40 }}>{n.img}</div>
                <div style={{ padding:'8px 12px 10px' }}>
                  <div style={{ fontSize:11, fontWeight:700, marginBottom:4 }}>{n.name}</div>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'#8888AA' }}>{n.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── blur + coming soon overlay ── */}
        <div style={{ position:'absolute', inset:0, backdropFilter:'blur(14px)', background:'rgba(8,8,15,.75)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:10 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', background:'rgba(245,166,35,.1)', border:'1px solid rgba(245,166,35,.25)', borderRadius:20, fontSize:10, color:'#F5A623', fontWeight:700, letterSpacing:'.08em', marginBottom:18 }}>
            🔒 COMING SOON
          </div>

          <div style={{ fontSize:72, marginBottom:14 }}>🖼️</div>
          <h1 style={{ fontFamily:'Boogaloo,cursive', fontSize:44, marginBottom:10, textAlign:'center' }}>
            NFT Marketplace<br/><span style={{ color:'#C8F000' }}>is on the way</span>
          </h1>
          <p style={{ fontSize:14, color:'#8888AA', maxWidth:480, textAlign:'center', lineHeight:1.7, marginBottom:30 }}>
            Create collections, mint NFTs and list them at a fixed price or open to offers. Full on-chain escrow, royalties and a MagicEden-style browsing experience — building now.
          </p>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, maxWidth:500, width:'100%', marginBottom:30 }}>
            {[
              { icon:'🎨', t:'Create Collections', d:'Deploy ERC-721 with royalties' },
              { icon:'🖼️', t:'Mint & List',        d:'Mint directly to marketplace' },
              { icon:'💬', t:'Offers & Auctions',  d:'Fixed price, offers, bidding' },
            ].map(f=>(
              <div key={f.t} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, padding:16, textAlign:'center' }}>
                <div style={{ fontSize:26, marginBottom:8 }}>{f.icon}</div>
                <div style={{ fontSize:12, fontWeight:700, marginBottom:4 }}>{f.t}</div>
                <div style={{ fontSize:11, color:'#44445A' }}>{f.d}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-lime" style={{ padding:'10px 24px', fontSize:13 }} onClick={()=>router.push('/otc')}>Trade Tokens Now →</button>
            <a href="https://discord.gg/9suGUrAtag" target="_blank" rel="noopener noreferrer"
              className="btn btn-ghost" style={{ padding:'10px 24px', fontSize:13, display:'flex', alignItems:'center', gap:6, textDecoration:'none', borderRadius:20 }}>
              💬 Get Notified
            </a>
          </div>
        </div>
      </div>
      <BottomBar />
    </div>
  );
}
