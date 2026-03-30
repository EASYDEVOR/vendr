'use client';
import { useState } from 'react';

export default function FloatingSupport() {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:999, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:10 }}>
      <a href="https://x.com/VENDR_XYZ" target="_blank" rel="noopener noreferrer" title="Follow on X"
        style={{ width:40, height:40, borderRadius:'50%', background:'#000', border:'1px solid rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', textDecoration:'none', fontSize:16, boxShadow:'0 4px 14px rgba(0,0,0,.4)' }}>
        𝕏
      </a>
      <a href="https://discord.gg/9suGUrAtag" target="_blank" rel="noopener noreferrer" title="Support"
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        style={{ display:'flex', alignItems:'center', gap:8, padding: hovered ? '10px 16px' : '10px', background:'#5865F2', border:'1px solid rgba(255,255,255,.15)', borderRadius:50, color:'#fff', textDecoration:'none', fontSize:13, fontWeight:700, fontFamily:'DM Sans,sans-serif', boxShadow:'0 4px 20px rgba(88,101,242,.4)', transition:'all .25s cubic-bezier(.34,1.56,.64,1)', whiteSpace:'nowrap', overflow:'hidden', maxWidth: hovered ? 160 : 44 }}>
        <span style={{ fontSize:18, flexShrink:0 }}>💬</span>
        {hovered && <span>Support</span>}
      </a>
    </div>
  );
}
