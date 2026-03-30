'use client';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { robinhoodTestnet } from './client';

export const wagmiConfig = getDefaultConfig({
  appName: 'VENDR Market',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '646329c631f448c680aa7b98ceb0723f',
  chains: [robinhoodTestnet],
  ssr: true,
});
