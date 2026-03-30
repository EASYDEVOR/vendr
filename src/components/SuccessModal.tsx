'use client';
import { useEffect } from 'react';
import { tweetUrl } from '@/lib/utils';

interface Props {
  type: 'listed'|'bought'|'offered'|'accepted'|'cancelled'|'claimed'|'edited';
  details?: { txHash?:`0x${string}`; amount?:string; token?:string };
  onClose: () => void;
}

const CFG = {
  listed:    { emoji:'👍', title:'Token Listed!',       desc:'Your token is live on VENDR OTC market.',              tweet:(d:any) => `Just listed ${d?.amount||''} ${d?.token||'tokens'} on VENDR Market! 🔥 vendr.market #VENDR #RobinhoodChain` },
  bought:    { emoji:'🤝', title:'Deal Sealed!',         desc:'Tokens are now in your wallet via escrow.',            tweet:(d:any) => `Just snagged ${d?.amount||''} ${d?.token||'tokens'} on VENDR Market 👀 vendr.market` },
  offered:   { emoji:'✈️', title:'Offer Sent!',          desc:"Offer is live — waiting for the seller to respond.",   tweet:()     => `Just made an offer on VENDR Market! 💬 P2P OTC on Robinhood Chain — vendr.market` },
  accepted:  { emoji:'✅', title:'Offer Accepted!',      desc:'Trade complete. Check your portfolio.',                tweet:()     => `Deal done on VENDR Market! ✅ P2P OTC trading with on-chain escrow — vendr.market` },
  cancelled: { emoji:'↩️', title:'Listing Cancelled',   desc:'Tokens + all pending offers returned automatically.',  tweet:null },
  claimed:   { emoji:'💰', title:'500 USDT Claimed!',   desc:'Your USDT is in your wallet. Come back in 24 hours.',  tweet:()     => `Just claimed free USDT from VENDR Faucet on Robinhood Chain! 💰 vendr.market/faucet` },
  edited:    { emoji:'✏️', title:'Listing Updated!',    desc:'Your listing has been updated successfully.',           tweet:null },
} as const;

export default function SuccessModal({ type, details, onClose }: Props) {
  const c = CFG[type];
  useEffect(() => { const t = setTimeout(onClose, 9000); return () => clearTimeout(t); }, [onClose]);

  return (
    <div className="success-overlay" onClick={onClose}>
      <div className="success-card" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:64, marginBottom:16 }}>{c.emoji}</div>
        <div style={{ fontSize:22, fontWeight:800, color:'#C8F000', marginBottom:8 }}>{c.title}</div>
        <div style={{ fontSize:13, color:'#8888AA', lineHeight:1.6, marginBottom:20 }}>{c.desc}</div>

        {details?.txHash && (
          <a href={`https://explorer.testnet.chain.robinhood.com/tx/${details.txHash}`} target="_blank" rel="noopener noreferrer"
            style={{ display:'block', padding:'8px 14px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, fontFamily:'Space Mono,monospace', fontSize:11, color:'#8888AA', textDecoration:'none', marginBottom:16, wordBreak:'break-all' }}>
            🔍 View on Explorer ↗
          </a>
        )}

        {c.tweet && (
          <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, padding:14, marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, marginBottom:6, color:'#8888AA' }}>Share to find buyers faster</div>
            <div style={{ display:'flex', gap:8 }}>
              <a href={tweetUrl(c.tweet(details))} target="_blank" rel="noopener noreferrer"
                style={{ flex:1, padding:'7px 0', background:'#000', border:'1px solid #333', borderRadius:7, color:'#fff', fontSize:12, fontWeight:700, textAlign:'center', textDecoration:'none', display:'block' }}>
                𝕏 Post on X
              </a>
              <button onClick={() => navigator.clipboard?.writeText(c.tweet!(details))}
                style={{ flex:1, padding:'7px 0', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:7, color:'#8888AA', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                📋 Copy
              </button>
            </div>
          </div>
        )}

        <button className="btn btn-lime" style={{ width:'100%', padding:'12px 0', fontSize:14 }} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
