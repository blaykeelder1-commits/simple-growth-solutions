"use client";

import { ReactNode, useState } from 'react';
import { useFeatureAccess } from '@/lib/subscription/context';
import { TierFeatures, FEATURE_LABELS, TIER_PRICING } from '@/lib/subscription/types';
import { Lock, Sparkles, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeatureGateProps {
  feature: keyof TierFeatures;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  const { hasAccess, upgradeTo } = useFeatureAccess(feature);
  const [showModal, setShowModal] = useState(false);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  const featureLabel = FEATURE_LABELS[feature];
  const upgradeTierInfo = upgradeTo ? TIER_PRICING[upgradeTo] : null;

  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent z-10 flex items-center justify-center">
          <div className="text-center p-6 max-w-sm">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Unlock {featureLabel}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Upgrade to {upgradeTierInfo?.name || 'Business Chauffeur'} to access this feature
            </p>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </div>
        <div className="opacity-30 pointer-events-none blur-sm">
          {children}
        </div>
      </div>

      {showModal && (
        <UpgradeModal
          feature={feature}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// Locked feature card for showing premium features
interface LockedFeatureCardProps {
  feature: keyof TierFeatures;
  title?: string;
  description?: string;
  icon?: ReactNode;
}

export function LockedFeatureCard({
  feature,
  title,
  description,
  icon,
}: LockedFeatureCardProps) {
  const { hasAccess, upgradeTo } = useFeatureAccess(feature);
  const [showModal, setShowModal] = useState(false);

  const featureLabel = title || FEATURE_LABELS[feature];
  const upgradeTierInfo = upgradeTo ? TIER_PRICING[upgradeTo] : null;

  if (hasAccess) {
    return null; // Don't show locked card if user has access
  }

  return (
    <>
      <div
        className="relative overflow-hidden rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6 cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setShowModal(true)}
      >
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-full">
            <Lock className="h-3 w-3 text-purple-600" />
            <span className="text-xs font-medium text-purple-600">
              {upgradeTierInfo?.name || 'Premium'}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            {icon || <Sparkles className="h-6 w-6 text-purple-600" />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{featureLabel}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {description || `Unlock ${featureLabel.toLowerCase()} with ${upgradeTierInfo?.name || 'Business Chauffeur'}`}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center text-purple-600 text-sm font-medium">
          Learn more
          <ArrowRight className="h-4 w-4 ml-1" />
        </div>
      </div>

      {showModal && (
        <UpgradeModal
          feature={feature}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// Upgrade Modal
interface UpgradeModalProps {
  feature?: keyof TierFeatures;
  onClose: () => void;
}

export function UpgradeModal({ feature, onClose }: UpgradeModalProps) {
  const featureLabel = feature ? FEATURE_LABELS[feature] : null;

  const handleUpgrade = async (tier: 'cashflow_ai' | 'business_chauffeur') => {
    // Redirect to Stripe checkout
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Upgrade Your Plan
              </h2>
              {featureLabel && (
                <p className="text-gray-500 mt-1">
                  Unlock {featureLabel} and more powerful features
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* CashFlow AI Pro */}
            <div className="border border-gray-200 rounded-xl p-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">CashFlow AI Pro</h3>
                <div className="mt-2">
                  <span className="text-4xl font-bold text-gray-900">$49</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Advanced AR automation with forecasting
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                {[
                  'Everything in Free',
                  '2 Accounting Integrations',
                  'Industry Benchmarks',
                  'Advanced Forecasting',
                  'Priority Email Support',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleUpgrade('cashflow_ai')}
                variant="outline"
                className="w-full"
              >
                Upgrade to Pro
              </Button>
            </div>

            {/* Business Chauffeur */}
            <div className="border-2 border-purple-500 rounded-xl p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 bg-purple-500 text-white text-xs font-medium rounded-full">
                  MOST POPULAR
                </span>
              </div>

              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Business Chauffeur</h3>
                <div className="mt-2">
                  <span className="text-4xl font-bold text-gray-900">$149</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Complete business intelligence suite
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                {[
                  'Everything in Pro',
                  'Unlimited Integrations',
                  'POS Integrations (Square, Clover)',
                  'Review Monitoring (Google, Yelp)',
                  'Payroll Analytics',
                  'Competitor Analysis',
                  'Unlimited AI Chat',
                  'Priority Support',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleUpgrade('business_chauffeur')}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to Chauffeur
              </Button>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            All plans include a 14-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
