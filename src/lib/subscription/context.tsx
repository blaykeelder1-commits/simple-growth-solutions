"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SubscriptionTier, TierFeatures, TIER_FEATURES } from './types';

interface SubscriptionContextType {
  tier: SubscriptionTier;
  features: TierFeatures;
  isLoading: boolean;
  canAccess: (feature: keyof TierFeatures) => boolean;
  requiresUpgrade: (feature: keyof TierFeatures) => boolean;
  getUpgradeTier: (feature: keyof TierFeatures) => SubscriptionTier | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    // Get tier from session/organization
    // For now, default to free tier
    // In production, this would come from the organization's subscription status
    const orgTier = (session?.user as { subscriptionTier?: string })?.subscriptionTier;

    if (orgTier && ['free', 'cashflow_ai', 'business_chauffeur', 'enterprise'].includes(orgTier)) {
      setTier(orgTier as SubscriptionTier);
    } else {
      setTier('free');
    }

    setIsLoading(false);
  }, [session, status]);

  const features = TIER_FEATURES[tier];

  const canAccess = (feature: keyof TierFeatures): boolean => {
    const value = features[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    return false;
  };

  const requiresUpgrade = (feature: keyof TierFeatures): boolean => {
    return !canAccess(feature);
  };

  const getUpgradeTier = (feature: keyof TierFeatures): SubscriptionTier | null => {
    if (canAccess(feature)) return null;

    // Find the lowest tier that has this feature
    const tiers: SubscriptionTier[] = ['free', 'cashflow_ai', 'business_chauffeur', 'enterprise'];
    for (const t of tiers) {
      const tierFeatures = TIER_FEATURES[t];
      const value = tierFeatures[feature];
      const hasFeature = typeof value === 'boolean' ? value : value > 0;
      if (hasFeature) return t;
    }

    return 'business_chauffeur'; // Default upgrade target
  };

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        features,
        isLoading,
        canAccess,
        requiresUpgrade,
        getUpgradeTier,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// Convenience hook for checking a specific feature
export function useFeatureAccess(feature: keyof TierFeatures) {
  const { canAccess, requiresUpgrade, getUpgradeTier, tier } = useSubscription();

  return {
    hasAccess: canAccess(feature),
    needsUpgrade: requiresUpgrade(feature),
    upgradeTo: getUpgradeTier(feature),
    currentTier: tier,
  };
}
