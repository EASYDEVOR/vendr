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

  const applyDarkMode = () => {
    document.documentElement.style.setProperty('--bg', '#08080F');
    document.documentElement.style.setProperty('--text', '#ffffff');
    document.body.style.background = '#08080F';
    document.body.style.color = '#ffffff';
    removeCustomStyle();
  };

  const applyLightMode = () => {
    document.documentElement.style.setProperty('--bg', '#F8F9FC');
    document.documentElement.style.setProperty('--text', '#0F172A');
    document.body.style.background = '#F8F9FC';
    document.body.style.color = '#0F172A';

    removeCustomStyle();

    const style = document.createElement('style');
    style.id = 'vendr-light-mode';
    style.textContent = `
      /* Force clean white background + dark text everywhere */
      body, html, main, div, section, .card, .modal, .tbl, nav, header, footer,
      .portfolio-page, .otc-page, .listing-page, .empty, .ticker-wrap {
        background: #F8F9FC !important;
        color: #0F172A !important;
      }

      /* Cards, modals, containers */
      .card, .modal, [style*="background-color"], .bg-\\[\\#0F0F1C\\], .bg-\\[\\#08080F\\], .bg-\\[\\#15152A\\] {
        background: #FFFFFF !important;
        border: 1px solid rgba(15,23,42,0.08) !important;
        box-shadow: 0 2px 8px rgba(15,23,42,0.06) !important;
      }

      /* Text */
      .muted, .text-muted, [style*="color:#8888AA"], [style*="color:#44445A"], [style*="color:#ffffff"] {
        color: #475569 !important;
      }

      /* Tabs & Navigation */
      .sub-tab, .nav-tab, nav button {
        background: #FFFFFF !important;
        color: #475569 !important;
        border: 1px solid rgba(15,23,42,0.1) !important;
      }
      .sub-tab.active {
        background: rgba(132,204,22,0.1) !important;
        color: #4D7C0F !important;
        border-color: rgba(132,204,22,0.3) !important;
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
        background: rgba(132,204,22,0.04) !important;
      }

      /* Buttons */
      .btn-ghost {
        background: transparent !important;
        border: 1px solid rgba(15,23,42,0.15) !important;
        color: #0F172A !important;
      }
      .btn-ghost:hover {
        border-color: #84CC16 !important;
        color: #4D7C0F !important;
      }
      .btn-lime {
        background: #84CC16 !important;
        color: #1F2A0F !important;
      }
      .btn-danger {
        background: #EF4444 !important;
        color: white !important;
      }

      /* Inputs */
      .input, textarea {
        background: #F8F9FC !important;
        border: 1px solid rgba(15,23,42,0.12) !important;
        color: #0F172A !important;
      }
      .input:focus {
        border-color: #84CC16 !important;
        box-shadow: 0 0 0 3px rgba(132,204,22,0.12) !important;
      }

      /* Badges & Progress */
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

      /* Modal overlay */
      .modal-bg {
        background: rgba(15,23,42,0.55) !important;
      }

      /* Remove any remaining dark leftovers */
      .bg-\\[\\#0F0F1C\\], .bg-\\[\\#08080F\\], .text-\\[\\#ffffff\\], .text-white {
        background: #FFFFFF !important;
        color: #0F172A !important;
      }
    `;
    document.head.appendChild(style);
  };

  const removeCustomStyle = () => {
    const el = document.getElementById('vendr-light-mode');
    if (el) el.remove();
  };

  const toggle = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    localStorage.setItem('vendr-theme', nextDark ? 'dark' : 'light');
    if (nextDark) applyDarkMode();
    else applyLightMode();
  };

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
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.15)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        cursor: 'pointer',
        boxShadow: isDark ? '0 4px 14px rgba(0,0,0,0.5)' : '0 4px 14px rgba(15,23,42,0.12)',
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
