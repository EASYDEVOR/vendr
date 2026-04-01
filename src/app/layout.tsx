'use client';
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import { Toaster } from 'react-hot-toast';
import FloatingSupport from '@/components/FloatingSupport';
import ThemeToggle from '@/components/ThemeToggle';

const qc = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>VENDR Market — OTC Trading on Robinhood Chain</title>
        <meta name="description" content="Trade tokens peer-to-peer with full escrow on Robinhood Chain Testnet." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={qc}>
            <RainbowKitProvider
              theme={darkTheme({
                accentColor: '#C8F000',
                accentColorForeground: '#000000',
                borderRadius: 'medium',
                overlayBlur: 'small',
              })}
            >
              {children}
              <FloatingSupport />
              <ThemeToggle />
              <Toaster
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: '#0E0E1E', border: '1px solid rgba(200,240,0,.2)',
                    color: '#fff', fontFamily: 'DM Sans,sans-serif', fontSize: '13px',
                    marginBottom: '72px',
                  },
                  success: { iconTheme: { primary: '#C8F000', secondary: '#000' } },
                  error:   { iconTheme: { primary: '#FF4444', secondary: '#fff' } },
                }}
              />
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
