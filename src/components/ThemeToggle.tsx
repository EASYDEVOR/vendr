'use client';
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('vendr-theme');
    if (saved === 'light') { setDark(false); applyLight(); }
  }, []);

  function applyLight() {
    document.documentElement.style.setProperty('--bg', '#F0F2F5');
    document.documentElement.style.setProperty('--s1', '#FFFFFF');
    document.documentElement.style.setProperty('--s2', '#F7F8FA');
    document.documentElement.style.setProperty('--s3', '#EAECEF');
    document.documentElement.style.setProperty('--b1', 'rgba(0,0,0,0.08)');
    document.documentElement.style.setProperty('--b2', 'rgba(0,0,0,0.14)');
    document.documentElement.style.setProperty('--t1', '#0D0D1A');
    document.documentElement.style.setProperty('--t2', '#555577');
    document.documentElement.style.setProperty('--t3', '#888899');
    document.body.style.background = '#F0F2F5';
  }

  function applyDark() {
    document.documentElement.style.setProperty('--bg', '#08080F');
    document.documentElement.style.setProperty('--s1', '#0F0F1C');
    document.documentElement.style.setProperty('--s2', '#15152A');
    document.documentElement.style.setProperty('--s3', '#1C1C35');
    document.documentElement.style.setProperty('--b1', 'rgba(255,255,255,0.07)');
    document.documentElement.style.setProperty('--b2', 'rgba(255,255,255,0.12)');
    document.documentElement.style.setProperty('--t1', '#ffffff');
    document.documentElement.style.setProperty('--t2', '#8888AA');
    document.documentElement.style.setProperty('--t3', '#44445A');
    document.body.style.background = '#08080F';
  }

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem('vendr-theme', next ? 'dark' : 'light');
    if (next) applyDark(); else applyLight();
  }

  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        position: 'fixed', bottom: 136, right: 24, zIndex: 998,
        width: 40, height: 40, borderRadius: '50%',
        background: dark ? '#1C1C35' : '#fff',
        border: `1px solid ${dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.15)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(0,0,0,.3)',
        transition: 'all .2s',
      }}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
