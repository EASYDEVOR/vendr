'use client';
import { useEffect, useState } from 'react';

export default function BottomBar() {
  const [eth, setEth] = useState('--');
  useEffect(() => {
    const f = async () => {
      try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const d = await r.json();
        setEth(`$${d.ethereum.usd.toLocaleString()}`);
      } catch {}
    };
    f();
    const t = setInterval(f, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 20px', background:'#0F0F1C', borderTop:'1px solid rgba(255,255,255,.07)', fontFamily:'Space Mono,monospace', fontSize:11 }}>
      <div style={{ display:'flex', gap:16 }}>
        <span style={{ color:'#44445A' }}>ETH <span style={{ color:'#C8F000' }}>{eth}</span></span>
        <span style={{ color:'#44445A' }}>Chain ID <span style={{ color:'#8888AA' }}>46630</span></span>
        <a href="https://explorer.testnet.chain.robinhood.com" target="_blank" rel="noopener noreferrer" style={{ color:'#44445A', textDecoration:'none' }}>
          Explorer <span style={{ color:'#C8F000' }}>↗</span>
        </a>
      </div>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <a href="https://x.com/VENDR_XYZ"            target="_blank" rel="noopener noreferrer" style={{ padding:'3px 9px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:5, fontSize:11, color:'#8888AA', textDecoration:'none' }}>𝕏 @VENDR_XYZ</a>
        <a href="https://discord.gg/9suGUrAtag"       target="_blank" rel="noopener noreferrer" style={{ padding:'3px 9px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:5, fontSize:11, color:'#7289da', textDecoration:'none' }}>💬 Support</a>
      </div>
    </div>
  );
}
