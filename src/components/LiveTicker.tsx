'use client';

const ITEMS = [
  { type:'LISTED', text:'VENDR Market is live on Robinhood Chain Testnet — Chain ID 46630',  color:'#C8F000' },
  { type:'SOLD',   text:'Connect your wallet and list tokens with full on-chain escrow',       color:'#00C805' },
  { type:'OFFER',  text:'Claim 500 USDT free from the faucet every 24 hours',                 color:'#F5A623' },
  { type:'LISTED', text:'All trades protected by smart contract escrow — no trust needed',     color:'#C8F000' },
  { type:'SOLD',   text:'List tokens · Make offers · Trade peer-to-peer on Robinhood Chain',  color:'#00C805' },
];

export default function LiveTicker() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <span key={i} className="tick">
            <span style={{ width:5, height:5, borderRadius:'50%', background:item.color, display:'inline-block', flexShrink:0 }} />
            <span style={{ color:item.color, fontWeight:700 }}>{item.type}</span>
            <span>{item.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
