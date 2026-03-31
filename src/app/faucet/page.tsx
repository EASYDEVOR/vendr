'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import LiveTicker from '@/components/LiveTicker';
import BottomBar from '@/components/BottomBar';
import SuccessModal from '@/components/SuccessModal';
import { publicClient } from '@/lib/client';
import { CONTRACTS } from '@/lib/constants';
import { FAUCET_ABI, ERC20_ABI } from '@/abis';

const NINE_B = BigInt('9000000000000000');
function pad(n: number) { return String(n).padStart(2, '0'); }

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const { data: wc } = useWalletClient();

  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [txHash,    setTxHash]    = useState<`0x${string}` | undefined>();
  const [faucetBal, setFaucetBal] = useState(BigInt(0));
  const [userBal,   setUserBal]   = useState(BigInt(0));
  const [cd,        setCd]        = useState(0);
  const [total,     setTotal]     = useState(BigInt(0));
  const [claimers,  setClaimers]  = useState(BigInt(0));
  const [dataLoad,  setDataLoad]  = useState(true);

  // Social verification state
  const [followedX,      setFollowedX]      = useState(false);
  const [joinedDiscord,  setJoinedDiscord]  = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [fb, tc, cl] = await Promise.all([
        publicClient.readContract({ address: CONTRACTS.FAUCET, abi: FAUCET_ABI, functionName: 'faucetBalance' }),
        publicClient.readContract({ address: CONTRACTS.FAUCET, abi: FAUCET_ABI, functionName: 'totalClaimed' }),
        publicClient.readContract({ address: CONTRACTS.FAUCET, abi: FAUCET_ABI, functionName: 'totalClaimers' }),
      ]);
      setFaucetBal(fb as bigint);
      setTotal(tc as bigint);
      setClaimers(cl as bigint);

      if (address) {
        const [ub, cdSec] = await Promise.all([
          publicClient.readContract({ address: CONTRACTS.USDT, abi: ERC20_ABI, functionName: 'balanceOf', args: [address as `0x${string}`] }),
          publicClient.readContract({ address: CONTRACTS.FAUCET, abi: FAUCET_ABI, functionName: 'timeUntilNextClaim', args: [address as `0x${string}`] }),
        ]);
        setUserBal(ub as bigint);
        setCd(Number(cdSec as bigint));
      }
    } catch (e) { console.error(e); }
    setDataLoad(false);
  }, [address]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (cd <= 0) return;
    const t = setInterval(() => setCd(p => { if (p <= 1) { clearInterval(t); return 0; } return p - 1; }), 1000);
    return () => clearInterval(t);
  }, [cd]);

  async function claim() {
    if (!wc || !address) { toast.error('Connect wallet first'); return; }
    if (!followedX)     { toast.error('Please follow @VENDR_XYZ on X first'); return; }
    if (!joinedDiscord) { toast.error('Please join our Discord first'); return; }
    setLoading(true);
    try {
      toast.loading('Claiming 500 USDT…');
      const tx = await wc.writeContract({ address: CONTRACTS.FAUCET, abi: FAUCET_ABI, functionName: 'claim' });
      await publicClient.waitForTransactionReceipt({ hash: tx as `0x${string}` });
      toast.dismiss();
      setTxHash(tx as `0x${string}`);
      setSuccess(true);
      setCd(86400);
      loadData();
    } catch (e: any) {
      toast.dismiss();
      const m = e?.shortMessage ?? e?.message ?? 'Claim failed';
      toast.error(m.includes('Wait 24') ? 'Already claimed today — come back in 24 hours' : m);
    }
    setLoading(false);
  }

  const fmtU  = (v: bigint) => (Number(v) / 1_000_000).toLocaleString();
  const pct   = faucetBal > BigInt(0) ? Math.min(100, Number((faucetBal * BigInt(100)) / NINE_B)) : 0;
  const cdStr = `${pad(Math.floor(cd / 3600))}:${pad(Math.floor((cd % 3600) / 60))}:${pad(cd % 60)}`;
  const canClaim = isConnected && followedX && joinedDiscord && cd === 0 && !loading;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#08080F' }}>
      <Navbar />
      <LiveTicker />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 62, marginBottom: 12 }}>💰</div>
          <h1 style={{ fontFamily: 'Boogaloo,cursive', fontSize: 42, color: '#C8F000', marginBottom: 8 }}>USDT Faucet</h1>
          <p style={{ fontSize: 14, color: '#8888AA', maxWidth: 420, lineHeight: 1.65 }}>
            Claim 500 free USDT every 24 hours. Follow us and join Discord to unlock.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, width: '100%', maxWidth: 520, marginBottom: 26 }}>
          {[
            { l: 'Faucet Balance',  v: dataLoad ? '--' : `${fmtU(faucetBal)} USDT`, c: '#C8F000' },
            { l: 'Total Claimed',   v: dataLoad ? '--' : `${fmtU(total)} USDT`,      c: '#fff' },
            { l: 'Total Claimers',  v: dataLoad ? '--' : claimers.toString(),         c: '#00C805' },
          ].map(s => (
            <div key={s.l} className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#44445A', fontFamily: 'Space Mono,monospace', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{s.l}</div>
              <div style={{ fontFamily: 'Space Mono,monospace', fontSize: 15, fontWeight: 700, color: s.c }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Reserve bar */}
        <div style={{ width: '100%', maxWidth: 520, marginBottom: 26 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8888AA', marginBottom: 5, fontFamily: 'Space Mono,monospace' }}>
            <span>Faucet reserves</span>
            <span style={{ color: '#C8F000' }}>{pct.toFixed(1)}% remaining</span>
          </div>
          <div className="bar" style={{ height: 8, borderRadius: 4 }}>
            <div className="bar-fill" style={{ width: `${pct}%`, borderRadius: 4 }} />
          </div>
        </div>

        {/* Main claim card */}
        <div className="card" style={{ width: '100%', maxWidth: 420, padding: 28, borderColor: 'rgba(200,240,0,.18)' }}>

          {/* Step 1: Follow X */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8888AA', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: 'Space Mono,monospace' }}>
              Step 1 — Follow on X
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: followedX ? 'rgba(0,200,5,.07)' : 'rgba(255,255,255,.03)', border: `1px solid ${followedX ? 'rgba(0,200,5,.25)' : 'rgba(255,255,255,.1)'}`, borderRadius: 10 }}>
              <div style={{ fontSize: 24 }}>𝕏</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Follow @VENDR_XYZ</div>
                <div style={{ fontSize: 11, color: '#44445A' }}>Stay updated with latest listings and features</div>
              </div>
              {followedX ? (
                <div style={{ color: '#00C805', fontWeight: 700, fontSize: 18 }}>✓</div>
              ) : (
                <a
                  href="https://x.com/VENDR_XYZ"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setTimeout(() => setFollowedX(true), 2000)}
                  style={{ padding: '7px 14px', background: '#000', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  Follow →
                </a>
              )}
            </div>
          </div>

          {/* Step 2: Join Discord */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8888AA', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: 'Space Mono,monospace' }}>
              Step 2 — Join Discord
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: joinedDiscord ? 'rgba(0,200,5,.07)' : 'rgba(255,255,255,.03)', border: `1px solid ${joinedDiscord ? 'rgba(0,200,5,.25)' : 'rgba(255,255,255,.1)'}`, borderRadius: 10 }}>
              <div style={{ fontSize: 24 }}>💬</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Join VENDR Discord</div>
                <div style={{ fontSize: 11, color: '#44445A' }}>Connect with traders and get support</div>
              </div>
              {joinedDiscord ? (
                <div style={{ color: '#00C805', fontWeight: 700, fontSize: 18 }}>✓</div>
              ) : (
                <a
                  href="https://discord.gg/9suGUrAtag"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setTimeout(() => setJoinedDiscord(true), 2000)}
                  style={{ padding: '7px 14px', background: '#5865F2', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  Join →
                </a>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', marginBottom: 20 }} />

          {/* Claim section */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#8888AA', marginBottom: 4 }}>You will receive</div>
            <div style={{ fontFamily: 'Boogaloo,cursive', fontSize: 52, color: '#C8F000', marginBottom: 2 }}>500</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>USDT</div>

            {isConnected && (
              <div style={{ padding: '9px 14px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
                <span style={{ color: '#44445A', fontFamily: 'Space Mono,monospace', fontSize: 10 }}>YOUR USDT BALANCE </span>
                <span style={{ fontFamily: 'Space Mono,monospace', fontSize: 14, fontWeight: 700, color: '#C8F000' }}>
                  {dataLoad ? '--' : `${fmtU(userBal)} USDT`}
                </span>
              </div>
            )}

            {cd > 0 ? (
              <div>
                <div style={{ padding: 14, background: 'rgba(245,166,35,.07)', border: '1px solid rgba(245,166,35,.2)', borderRadius: 10, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: '#F5A623', marginBottom: 5 }}>⏱ Next claim available in</div>
                  <div style={{ fontFamily: 'Space Mono,monospace', fontSize: 28, fontWeight: 700, color: '#F5A623' }}>{cdStr}</div>
                </div>
                <button className="btn btn-lime" style={{ width: '100%', padding: '12px 0', fontSize: 14 }} disabled>
                  Come back later
                </button>
              </div>
            ) : (
              <button
                className="btn btn-lime"
                style={{ width: '100%', padding: '13px 0', fontSize: 15 }}
                disabled={!canClaim}
                onClick={claim}
              >
                {!isConnected
                  ? 'Connect Wallet to Claim'
                  : !followedX
                  ? 'Follow @VENDR_XYZ first'
                  : !joinedDiscord
                  ? 'Join Discord first'
                  : loading
                  ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span className="spinner spinner-black" />Claiming…</span>
                  : 'Claim 500 USDT Free →'}
              </button>
            )}
          </div>

          <div style={{ fontSize: 11, color: '#44445A', marginTop: 14, textAlign: 'center', lineHeight: 1.6 }}>
            One claim per wallet per 24 hours.<br />
            Use USDT to buy tokens and make offers on VENDR.
          </div>
        </div>

        {/* How to use */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, maxWidth: 520, width: '100%', marginTop: 28 }}>
          {[
            { icon: '🪙', t: 'Buy Tokens',   d: 'Purchase tokens listed in USDT on the OTC market' },
            { icon: '💬', t: 'Make Offers',  d: 'Offer USDT for any token listing you want' },
            { icon: '📋', t: 'List Tokens',  d: 'Set USDT as the accepted payment when listing' },
          ].map(i => (
            <div key={i.t} className="card" style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{i.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{i.t}</div>
              <div style={{ fontSize: 11, color: '#44445A', lineHeight: 1.5 }}>{i.d}</div>
            </div>
          ))}
        </div>
      </div>

      <BottomBar />
      {success && <SuccessModal type="claimed" details={{ txHash }} onClose={() => setSuccess(false)} />}
    </div>
  );
}
