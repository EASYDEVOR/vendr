'use client';
import { ConnectButton }  from '@rainbow-me/rainbowkit';
import { usePathname, useRouter } from 'next/navigation';

const TABS = [
  { label:'Home',       path:'/' },
  { label:'Token OTC',  path:'/otc' },
  { label:'NFT',        path:'/nft',     badge:'SOON',  bc:'#F5A623', btc:'#000' },
  { label:'Faucet',     path:'/faucet',  badge:'FREE',  bc:'#00C805', btc:'#000' },
  { label:'Social OTC', path:'/social',  badge:'SOON',  bc:'#F5A623', btc:'#000' },
  { label:'Portfolio',  path:'/portfolio' },
];

export default function Navbar() {
  const path   = usePathname();
  const router = useRouter();
  return (
    <nav style={{ display:'flex', alignItems:'center', padding:'0 20px', height:58, background:'rgba(8,8,15,.97)', borderBottom:'1px solid rgba(255,255,255,.07)', position:'sticky', top:0, zIndex:100, backdropFilter:'blur(20px)' }}>
      <div className="logo" onClick={() => router.push('/')} style={{ marginRight:22 }}>VENDR</div>
      <div style={{ display:'flex', alignItems:'center', gap:2, flex:1 }}>
        {TABS.map(t => (
          <button key={t.path} className={`nav-tab ${path === t.path ? 'active' : ''}`} onClick={() => router.push(t.path)}>
            {t.label}
            {t.badge && <span style={{ background:t.bc, color:t.btc, fontSize:8, fontWeight:700, padding:'1px 4px', borderRadius:4, marginLeft:4, verticalAlign:'middle' }}>{t.badge}</span>}
          </button>
        ))}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:12 }}>
        {[
          { href:'https://x.com/VENDR_XYZ',             label:'𝕏',  hc:'#C8F000' },
          { href:'https://discord.gg/9suGUrAtag',        label:'💬', hc:'#7289da' },
        ].map(s => (
          <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer"
            style={{ width:30, height:30, borderRadius:6, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', justifyContent:'center', color:'#888', textDecoration:'none', fontSize:14, transition:'all .2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = s.hc; (e.currentTarget as HTMLElement).style.borderColor = s.hc; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#888'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.07)'; }}>
            {s.label}
          </a>
        ))}
      </div>
      <ConnectButton />
    </nav>
  );
}
