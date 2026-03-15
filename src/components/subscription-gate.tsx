'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSubscriptions } from '@/hooks/useSubscription';

const PLAN_META: Record<
  string,
  { displayName: string; description: string; price: string }
> = {
  cashflow_ai: {
    displayName: 'Cash Flow AI',
    description:
      'Automate invoice recovery, predict cash flow, and get AI-powered collection strategies.',
    price: '$49/mo + 8% success fee',
  },
  chauffeur: {
    displayName: 'Business Chauffeur',
    description:
      'AI-powered business insights, POS and accounting integrations, and unified intelligence.',
    price: 'Starting at $79/mo',
  },
  cybersecurity: {
    displayName: 'Cybersecurity Shield',
    description:
      'Automated security scanning, vulnerability detection, SSL monitoring, and email security checks.',
    price: 'Included with Pro plans',
  },
};

interface SubscriptionGateProps {
  requiredPlan: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function SubscriptionGate({
  requiredPlan,
  children,
  fallback,
}: SubscriptionGateProps) {
  const { hasAccess, loading } = useSubscriptions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (hasAccess(requiredPlan)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <UpgradePrompt requiredPlan={requiredPlan} />;
}

function UpgradePrompt({ requiredPlan }: { requiredPlan: string }) {
  const meta = PLAN_META[requiredPlan] || {
    displayName: requiredPlan.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: 'Upgrade to access this premium feature.',
    price: '',
  };
  const [startingTrial, setStartingTrial] = useState(false);

  const handleStartTrial = async () => {
    setStartingTrial(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: requiredPlan, trial: true }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) {
          window.location.href = url;
          return;
        }
      }
      // Fallback to pricing page
      window.location.href = `/pricing?plan=${encodeURIComponent(requiredPlan)}`;
    } catch {
      window.location.href = `/pricing?plan=${encodeURIComponent(requiredPlan)}`;
    } finally {
      setStartingTrial(false);
    }
  };

  return (
    <Card className="border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white">
      <CardContent className="py-12">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-5">
            <Lock className="h-8 w-8 text-purple-600" />
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Upgrade to unlock {meta.displayName}
          </h3>

          <p className="text-gray-500 mb-6">{meta.description}</p>

          {meta.price && (
            <p className="text-sm text-gray-400 mb-6">{meta.price}</p>
          )}

          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={handleStartTrial}
              disabled={startingTrial}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {startingTrial ? 'Loading...' : 'Start Free Trial'}
            </Button>

            <Link href="/pricing">
              <Button variant="outline" className="bg-white/50 hover:bg-white">
                View Pricing
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            14-day free trial. No credit card required.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
