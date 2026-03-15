'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscriptions } from '@/hooks/useSubscription';

const DISMISS_KEY = 'sgs-upgrade-banner-dismissed';

export function UpgradeBanner() {
  const { subscriptions, loading } = useSubscriptions();
  const [dismissed, setDismissed] = useState(true); // Default to hidden to avoid flash

  useEffect(() => {
    // Check if dismissed in this session
    try {
      const stored = sessionStorage.getItem(DISMISS_KEY);
      setDismissed(stored === 'true');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (loading || dismissed) return null;

  // Find any trialing subscription to show the banner
  const trialingSub = subscriptions.find((s) => s.status === 'trialing' && s.trialEndDate);

  // If no trialing subs and no active subs, show generic upgrade banner
  const hasAnyActiveSub = subscriptions.some(
    (s) => s.status === 'active' || s.status === 'trialing'
  );

  if (hasAnyActiveSub && !trialingSub) return null;

  let message: string;
  let urgencyClass: string;

  if (trialingSub?.trialEndDate) {
    const daysLeft = Math.max(
      0,
      Math.ceil(
        (new Date(trialingSub.trialEndDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    );

    if (daysLeft <= 1) {
      message = `Your free trial ends today! Upgrade now to keep your features.`;
      urgencyClass = 'from-red-600 to-orange-600';
    } else if (daysLeft <= 3) {
      message = `Your free trial ends in ${daysLeft} days. Upgrade now to keep your features.`;
      urgencyClass = 'from-amber-600 to-orange-600';
    } else {
      message = `You're on a free trial — ${daysLeft} days remaining. Upgrade now to keep your features.`;
      urgencyClass = 'from-blue-600 to-indigo-600';
    }
  } else {
    // No subscriptions at all
    message =
      'You\'re on the free plan. Upgrade to unlock Cash Flow AI, Business Chauffeur, and more.';
    urgencyClass = 'from-blue-600 to-indigo-600';
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // sessionStorage not available
    }
  };

  return (
    <div
      className={`relative rounded-xl bg-gradient-to-r ${urgencyClass} text-white px-4 py-3 mb-6 shadow-lg`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <p className="text-sm font-medium truncate">{message}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/pricing">
            <Button
              size="sm"
              className="bg-white text-gray-900 hover:bg-white/90 shadow-md text-xs font-semibold"
            >
              Upgrade Now
            </Button>
          </Link>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
