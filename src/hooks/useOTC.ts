'use client';
import { useState, useEffect, useCallback } from 'react';
import { publicClient } from '@/lib/client';
import { CONTRACTS } from '@/lib/constants';
import { OTC_ABI } from '@/abis';

export interface OTCListing {
  id: bigint;
  seller: `0x${string}`;
  tokenAddress: `0x${string}`;
  totalAmount: bigint;
  remainingAmount: bigint;
  pricePerHalf: bigint;
  priceForFull: bigint;
  acceptedTokens: readonly `0x${string}`[];
  acceptsAnyToken: boolean;
  fillTerms: number;
  description: string;
  active: boolean;
  createdAt: bigint;
  editedAt: bigint;
  offerCount: bigint;
}

export interface OTCOffer {
  id: bigint;
  listingId: bigint;
  offerMaker: `0x${string}`;
  offerToken: `0x${string}`;
  offerAmount: bigint;
  forHalf: boolean;
  message: string;
  active: boolean;
  accepted: boolean;
  createdAt: bigint;
}

// Fetch all active listings
export function useOTCListings() {
  const [listings, setListings] = useState<OTCListing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const count = await publicClient.readContract({
        address: CONTRACTS.OTC, abi: OTC_ABI, functionName: 'listingCount',
      });
      const n = Number(count as bigint);
      if (n === 0) { setListings([]); return; }

      const calls = Array.from({ length: n }, (_, i) =>
        publicClient.readContract({
          address: CONTRACTS.OTC, abi: OTC_ABI,
          functionName: 'getListing', args: [BigInt(i + 1)],
        }).catch(() => null)
      );
      const results = await Promise.all(calls);
      const active  = (results.filter(r => r && (r as OTCListing).active) as OTCListing[]).reverse();
      setListings(active);
    } catch (e) {
      console.error('[useOTCListings]', e);
      setError('Could not load listings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { listings, loading, error, refetch: load };
}

// Fetch single listing + its offers
export function useOTCListing(id: bigint | null) {
  const [listing, setListing] = useState<OTCListing | null>(null);
  const [offers,  setOffers]  = useState<OTCOffer[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [l, ids] = await Promise.all([
        publicClient.readContract({ address: CONTRACTS.OTC, abi: OTC_ABI, functionName: 'getListing',       args: [id] }),
        publicClient.readContract({ address: CONTRACTS.OTC, abi: OTC_ABI, functionName: 'getListingOffers', args: [id] }),
      ]);
      setListing(l as OTCListing);

      const offerData = await Promise.all(
        (ids as bigint[]).map(oid =>
          publicClient.readContract({ address: CONTRACTS.OTC, abi: OTC_ABI, functionName: 'getOffer', args: [oid] }).catch(() => null)
        )
      );
      setOffers((offerData.filter(o => o && (o as OTCOffer).active)) as OTCOffer[]);
    } catch (e) {
      console.error('[useOTCListing]', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  return { listing, offers, loading, refetch: load };
}

// Fetch listings and offers for a specific user (portfolio)
export function useUserOTC(address: `0x${string}` | undefined) {
  const [userListings, setUserListings] = useState<OTCListing[]>([]);
  const [userOffers,   setUserOffers]   = useState<OTCOffer[]>([]);
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    const go = async () => {
      try {
        const [lIds, oIds] = await Promise.all([
          publicClient.readContract({ address: CONTRACTS.OTC, abi: OTC_ABI, functionName: 'getUserListings', args: [address] }),
          publicClient.readContract({ address: CONTRACTS.OTC, abi: OTC_ABI, functionName: 'getUserOffers',   args: [address] }),
        ]);

        const [ls, os] = await Promise.all([
          Promise.all((lIds as bigint[]).map(id =>
            publicClient.readContract({ address: CONTRACTS.OTC, abi: OTC_ABI, functionName: 'getListing', args: [id] }).catch(() => null)
          )),
          Promise.all((oIds as bigint[]).map(id =>
            publicClient.readContract({ address: CONTRACTS.OTC, abi: OTC_ABI, functionName: 'getOffer', args: [id] }).catch(() => null)
          )),
        ]);

        setUserListings((ls.filter(Boolean) as OTCListing[]).reverse());
        setUserOffers(  (os.filter(Boolean) as OTCOffer[]).reverse());
      } catch (e) {
        console.error('[useUserOTC]', e);
      } finally {
        setLoading(false);
      }
    };
    go();
  }, [address]);

  return { userListings, userOffers, loading };
}
