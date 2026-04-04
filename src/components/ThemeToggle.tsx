'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('vendr-theme');
    if (saved === 'light') {
      setIsDark(false);
      applyLightMode();
    } else {
      applyDarkMode();
    }
  }, []);

  function applyDarkMode() {
    const r = document.documentElement.style;
    r.setProperty('--bg', '#08080F');
    r.setProperty('--s1', '#0F0F1C');
    r.setProperty('--s2', '#15152A');
    r.setProperty('--s3', '#1C1C35');
    r.setProperty('--b1', 'rgba(255,255,255,0.07)');
    r.setProperty('--b2', 'rgba(255,255,255,0.12)');
    r.setProperty('--t1', '#ffffff');
    r.setProperty('--t2', '#8888AA');
    r.setProperty('--t3', '#44445A');

    document.body.style.background = '#08080F';
    document.body.style.color = '#ffffff';

    removeThemeStyle();
  }

  function applyLightMode() {
    const r = document.documentElement.style;
    r.setProperty('--bg', '#F8F9FC');
    r.setProperty('--s1', '#FFFFFF');
    r.setProperty('--s2', '#F1F3F9');
    r.setProperty('--s3', '#E6E9F2');
    r.setProperty('--b1', 'rgba(0,0,0,0.06)');
    r.setProperty('--b2', 'rgba(0,0,0,0.10)');
    r.setProperty('--t1', '#0F172A');
    r.setProperty('--t2', '#475569');
    r.setProperty('--t3', '#64748B');

    document.body.style.background = '#F8F9FC';
    document.body.style.color = '#0F172A';

    const style = document.getElementById('vendr-theme-style');
    if (style) style.remove();

    const s = document.createElement('style');
    s.id = 'vendr-theme-style';
    s.textContent = `
      nav, .navbar {
        background: rgba(255,255,255,0.98) !important;
        border-bottom: 1px solid rgba(0,0,0,0.08) !important;
        box-shadow: 0 1px 0 rgba(0,0,0,0.04) !important;
      }
      .vendr-logo { 
        color: #0F172A !important; 
        text-shadow: none !important;
      }
      .card, .modal, .tbl, .sub-tab {
        background: #FFFFFF !important;
        border-color: rgba(0,0,0,0.08) !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
      }
      .modal {
        box-shadow: 0 10px 40px rgba(0,0,0,0.12) !important;
      }
      .modal-bg { background: rgba(15,23,42,0.45) !important; }
      .input {
        background: #F8F9FC !important;
        border-color: rgba(0,0,0,0.12) !important;
        color: #0F172A !important;
      }
      .input:focus {
        border-color: #84CC16 !important;
        box-shadow: 0 0 0 3px rgba(132,204,22,0.15) !important;
      }
      .tbl th { color: #64748B !important; }
      .tbl td { color: #0F172A !important; }
      .tbl tbody tr:hover { background: rgba(132,204,22,0.04) !important; }
      .sub-tab { color: #475569 !important; }
      .sub-tab.active {
        background: rgba(132,204,22,0.08) !important;
        color: #4D7C0F !important;
        border-color: rgba(132,204,22,0.25) !important;
      }
      .btn-ghost {
        border-color: rgba(0,0,0,0.12) !important;
        color: #0F172A !important;
      }
      .btn-ghost:hover {
        border-color: #84CC16 !important;
        color: #4D7C0F !important;
      }
      .btn-danger { background: #EF4444 !important; color: white !important; }
      .btn-lime { background: #84CC16 !important; color: #1F2A0F !important; }
      .badge-lime, .badge-green {
        background: rgba(132,204,22,0.12) !important;
        color: #4D7C0F !important;
        border: 1px solid rgba(132,204,22,0.25) !important;
      }
      .badge-gold {
        background: rgba(245,158,11,0.12) !important;
        color: #B45309 !important;
      }
      .bar { background: #E2E8F0 !important; }
      .bar-fill { background: #84CC16 !important; }
      .empty-title, .muted { color: #64748B !important; }
      .success-card { background: #FFFFFF !important; border-color: rgba(132,204,22,0.3) !important; }
      .ticker-wrap {
        background: #FFFFFF !important;
        border-bottom: 1px solid rgba(0,0,0,0.08) !important;
      }
    `;
    document.head.appendChild(s);
  }

  function removeThemeStyle() {
    const style = document.getElementById('vendr-theme-style');
    if (style) style.remove();
  }

  function toggle() {
    const nextDark = !isDark;
    setIsDark(nextDark);
    localStorage.setItem('vendr-theme', nextDark ? 'dark' : 'light');

    if (nextDark) {
      applyDarkMode();
    } else {
      applyLightMode();
    }
  }

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        position: 'fixed',
        bottom: 136,
        right: 24,
        zIndex: 998,
        width: 42,
        height: 42,
        borderRadius: '50%',
        background: isDark ? '#1C1C35' : '#FFFFFF',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        cursor: 'pointer',
        boxShadow: isDark 
          ? '0 4px 14px rgba(0,0,0,0.5)' 
          : '0 4px 14px rgba(0,0,0,0.12)',
        transition: 'all 0.25s ease',
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
