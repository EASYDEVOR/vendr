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
    r.setProperty('--text', '#ffffff');
    r.setProperty('--text-muted', '#8888AA');

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
    r.setProperty('--text', '#0F172A');
    r.setProperty('--text-muted', '#475569');

    document.body.style.background = '#F8F9FC';
    document.body.style.color = '#0F172A';

    removeThemeStyle();

    const s = document.createElement('style');
    s.id = 'vendr-theme-style';
    s.textContent = `
      /* Force white backgrounds everywhere */
      body, html, main, div, section, article, header, nav, footer,
      .card, .modal, .tbl, .sub-tab, .ticker-wrap, .empty, .navbar,
      .portfolio-page, .otc-page, .listing-page {
        background: #F8F9FC !important;
        color: #0F172A !important;
      }

      /* Cards & Containers */
      .card, .modal, [style*="background"], .bg-\\[\\#0F0F1C\\], .bg-\\[\\#08080F\\] {
        background: #FFFFFF !important;
        border-color: rgba(0,0,0,0.08) !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
      }

      /* Text */
      .muted, .text-muted, [style*="color: #8888AA"], [style*="color: #44445A"] {
        color: #475569 !important;
      }

      /* Tabs & Navigation */
      .sub-tab, .nav-tab, nav button, .tab {
        background: #FFFFFF !important;
        color: #475569 !important;
        border-color: rgba(0,0,0,0.1) !important;
      }
      .sub-tab.active, .nav-tab.active {
        background: rgba(132, 204, 22, 0.08) !important;
        color: #4D7C0F !important;
        border-color: rgba(132, 204, 22, 0.25) !important;
      }

      /* Tables */
      .tbl th {
        background: #F1F3F9 !important;
        color: #64748B !important;
      }
      .tbl td {
        background: #FFFFFF !important;
        color: #0F172A !important;
      }
      .tbl tbody tr:hover {
        background: rgba(132, 204, 22, 0.05) !important;
      }

      /* Buttons */
      .btn-ghost {
        background: transparent !important;
        border: 1px solid rgba(0,0,0,0.15) !important;
        color: #0F172A !important;
      }
      .btn-ghost:hover {
        border-color: #84CC16 !important;
        color: #4D7C0F !important;
      }
      .btn-lime, .btn-danger {
        color: white !important;
      }

      /* Inputs & Modals */
      .input, textarea {
        background: #F8F9FC !important;
        border: 1px solid rgba(0,0,0,0.12) !important;
        color: #0F172A !important;
      }
      .input:focus {
        border-color: #84CC16 !important;
        box-shadow: 0 0 0 3px rgba(132,204,22,0.15) !important;
      }

      /* Badges & Bars */
      .badge-lime, .badge-green {
        background: rgba(132,204,22,0.12) !important;
        color: #4D7C0F !important;
      }
      .bar {
        background: #E2E8F0 !important;
      }
      .bar-fill {
        background: #84CC16 !important;
      }

      /* Other common dark leftovers */
      [class*="dark"], .bg-\\[\\#0F0F1C\\], .bg-\\[\\#15152A\\], .text-white, .text-\\[\\#ffffff\\] {
        background: #FFFFFF !important;
        color: #0F172A !important;
      }

      .modal-bg {
        background: rgba(15, 23, 42, 0.5) !important;
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
        bottom: 140,
        right: 24,
        zIndex: 999,
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: isDark ? '#1C1C35' : '#FFFFFF',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        cursor: 'pointer',
        boxShadow: isDark ? '0 4px 14px rgba(0,0,0,0.5)' : '0 4px 14px rgba(0,0,0,0.12)',
        transition: 'all 0.25s ease',
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
