'use client';
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('vendr-theme');
    if (saved === 'light') { setDark(false); applyLight(); }
  }, []);

  function applyLight() {
    const r = document.documentElement.style;
    r.setProperty('--bg',  '#F5F6FA');
    r.setProperty('--s1',  '#FFFFFF');
    r.setProperty('--s2',  '#F0F1F5');
    r.setProperty('--s3',  '#E4E6EE');
    r.setProperty('--b1',  'rgba(0,0,0,0.08)');
    r.setProperty('--b2',  'rgba(0,0,0,0.14)');
    r.setProperty('--t1',  '#0D0D20');
    r.setProperty('--t2',  '#4A4A6A');
    r.setProperty('--t3',  '#8888AA');
    document.body.style.background = '#F5F6FA';
    document.body.style.color = '#0D0D20';
    // Navbar
    const style = document.getElementById('vendr-theme-style');
    if (style) style.remove();
    const s = document.createElement('style');
    s.id = 'vendr-theme-style';
    s.textContent = `
      nav { background: rgba(255,255,255,0.97) !important; border-bottom: 1px solid rgba(0,0,0,0.08) !important; }
      .vendr-logo { text-shadow: 0 0 20px rgba(160,200,0,0.4), 0 2px 0 #5a7a00 !important; }
      .nav-tab { color: #4A4A6A !important; }
      .nav-tab:hover { color: #0D0D20 !important; }
      .nav-tab.active { color: #6a9a00 !important; background: rgba(100,150,0,0.08) !important; }
      .card { background: #FFFFFF !important; border-color: rgba(0,0,0,0.08) !important; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
      .card:hover { border-color: rgba(100,150,0,0.3) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
      .modal { background: #FFFFFF !important; border-color: rgba(0,0,0,0.1) !important; box-shadow: 0 8px 40px rgba(0,0,0,0.12) !important; }
      .modal-bg { background: rgba(0,0,0,0.4) !important; }
      .input { background: #F0F1F5 !important; border-color: rgba(0,0,0,0.12) !important; color: #0D0D20 !important; }
      .input:focus { border-color: #8aaa00 !important; box-shadow: 0 0 0 3px rgba(100,150,0,0.1) !important; }
      .input::placeholder { color: #8888AA !important; }
      .tbl tbody tr:hover { background: rgba(100,150,0,0.04) !important; }
      .tbl th { color: #8888AA !important; }
      .tbl td { color: #0D0D20 !important; }
      .sub-tab { color: #4A4A6A !important; }
      .sub-tab.active { background: rgba(100,150,0,0.08) !important; color: #5a8000 !important; border-color: rgba(100,150,0,0.2) !important; }
      .btn-ghost { border-color: rgba(0,0,0,0.15) !important; color: #0D0D20 !important; }
      .btn-ghost:hover { border-color: #8aaa00 !important; color: #5a8000 !important; }
      .scan-btn { background: rgba(100,150,0,0.08) !important; border-color: rgba(100,150,0,0.18) !important; color: #5a8000 !important; }
      .badge-lime { background: rgba(100,150,0,0.1) !important; color: #5a8000 !important; border-color: rgba(100,150,0,0.2) !important; }
      .badge-green { background: rgba(0,160,5,0.08) !important; color: #006a00 !important; }
      .badge-gold { background: rgba(180,120,0,0.08) !important; color: #8a6000 !important; }
      .bar { background: #E4E6EE !important; }
      .ticker-wrap { background: #FFFFFF !important; border-bottom: 1px solid rgba(0,0,0,0.08) !important; }
      .empty-title { color: #4A4A6A !important; }
      .success-card { background: #FFFFFF !important; }
    `;
    document.head.appendChild(s);
  }

  function applyDark() {
    const r = document.documentElement.style;
    r.setProperty('--bg',  '#08080F');
    r.setProperty('--s1',  '#0F0F1C');
    r.setProperty('--s2',  '#15152A');
    r.setProperty('--s3',  '#1C1C35');
    r.setProperty('--b1',  'rgba(255,255,255,0.07)');
    r.setProperty('--b2',  'rgba(255,255,255,0.12)');
    r.setProperty('--t1',  '#ffffff');
    r.setProperty('--t2',  '#8888AA');
    r.setProperty('--t3',  '#44445A');
    document.body.style.background = '#08080F';
    document.body.style.color = '#ffffff';
    const style = document.getElementById('vendr-theme-style');
    if (style) style.remove();
  }

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem('vendr-theme', next ? 'dark' : 'light');
    if (next) applyDark(); else applyLight();
  }

  return (
    <button onClick={toggle} title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        position:'fixed', bottom:136, right:24, zIndex:998,
        width:40, height:40, borderRadius:'50%',
        background: dark ? '#1C1C35' : '#FFFFFF',
        border: `1px solid ${dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.15)'}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:18, cursor:'pointer',
        boxShadow: dark ? '0 4px 14px rgba(0,0,0,.4)' : '0 4px 14px rgba(0,0,0,.15)',
        transition:'all .2s',
      }}>
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
