'use client';

import { useState, useEffect, useCallback } from 'react';

export interface SubscriptionRecord {
  id: string;
  plan: string;
  status: string;
  priceMonthly: number;
  currentPeriodEnd: string | null;
  trialEndDate: string | null;
}

interface UseSubscriptionReturn {
  subscriptions: SubscriptionRecord[];
  hasAccess: (plan: string) => boolean;
  getSubscription: (plan: string) => SubscriptionRecord | undefined;
  trialDaysRemaining: (plan: string) => number | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

let cachedSubscriptions: SubscriptionRecord[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 minute

export function useSubscriptions(): UseSubscriptionReturn {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>(
    cachedSubscriptions || []
  );
  const [loading, setLoading] = useState(!cachedSubscriptions);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    // Use cache if fresh
    if (cachedSubscriptions && Date.now() - cacheTimestamp < CACHE_TTL) {
      setSubscriptions(cachedSubscriptions);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const res = await fetch('/api/billing/subscriptions');
      if (!res.ok) {
        throw new Error('Failed to fetch subscriptions');
      }
      const data = await res.json();
      const subs: SubscriptionRecord[] = data.subscriptions || [];

      cachedSubscriptions = subs;
      cacheTimestamp = Date.now();
      setSubscriptions(subs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const hasAccess = useCallback(
    (plan: string): boolean => {
      return subscriptions.some(
        (sub) =>
          sub.plan === plan &&
          (sub.status === 'active' || sub.status === 'trialing')
      );
    },
    [subscriptions]
  );

  const getSubscription = useCallback(
    (plan: string): SubscriptionRecord | undefined => {
      return subscriptions.find((sub) => sub.plan === plan);
    },
    [subscriptions]
  );

  const trialDaysRemaining = useCallback(
    (plan: string): number | null => {
      const sub = subscriptions.find(
        (s) => s.plan === plan && s.status === 'trialing' && s.trialEndDate
      );
      if (!sub?.trialEndDate) return null;
      const ms = new Date(sub.trialEndDate).getTime() - Date.now();
      return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    },
    [subscriptions]
  );

  const refetch = useCallback(async () => {
    cachedSubscriptions = null;
    cacheTimestamp = 0;
    setLoading(true);
    await fetchSubscriptions();
  }, [fetchSubscriptions]);

  return {
    subscriptions,
    hasAccess,
    getSubscription,
    trialDaysRemaining,
    loading,
    error,
    refetch,
  };
}
