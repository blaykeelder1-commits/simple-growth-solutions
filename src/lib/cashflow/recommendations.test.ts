import { describe, it, expect } from 'vitest';
import { generateRuleBasedRecommendations, RecommendationInput } from './recommendations';

describe('Recommendations Engine', () => {
  const baseInput: RecommendationInput = {
    clientName: 'Test Client',
    clientScore: 70,
    invoiceAmount: 100000, // $1,000 in cents
    daysPastDue: 0,
    totalOutstanding: 100000,
    paymentHistory: {
      avgDaysToPayment: 30,
      latePaymentRate: 0.2,
      totalPaid: 500000,
    },
  };

  describe('generateRuleBasedRecommendations', () => {
    it('should return recommendations for overdue invoices (1-7 days)', () => {
      const input = { ...baseInput, daysPastDue: 5 };
      const recommendations = generateRuleBasedRecommendations(input);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBe('collection_strategy');
      expect(recommendations[0].title).toContain('friendly');
    });

    it('should return escalation recommendations for 8-30 day overdue invoices', () => {
      const input = { ...baseInput, daysPastDue: 15 };
      const recommendations = generateRuleBasedRecommendations(input);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBe('collection_strategy');
      expect(recommendations[0].priority).toBe('high');
    });

    it('should return critical recommendations for 30+ day overdue invoices', () => {
      const input = { ...baseInput, daysPastDue: 45 };
      const recommendations = generateRuleBasedRecommendations(input);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].priority).toBe('critical');
    });

    it('should return client risk recommendations for low-scoring clients', () => {
      const input = { ...baseInput, clientScore: 30, daysPastDue: 5 };
      const recommendations = generateRuleBasedRecommendations(input);

      const riskRec = recommendations.find(r => r.type === 'client_risk');
      expect(riskRec).toBeDefined();
      expect(riskRec?.title.toLowerCase()).toContain('review');
      expect(riskRec?.title.toLowerCase()).toContain('payment terms');
    });

    it('should use suggestive language (could, might, consider)', () => {
      const input = { ...baseInput, daysPastDue: 10 };
      const recommendations = generateRuleBasedRecommendations(input);

      // All recommendations should use non-directive language
      recommendations.forEach(rec => {
        const hasDirective = /\bshould\b|\bmust\b|\bneed to\b/i.test(rec.description);
        expect(hasDirective).toBe(false);
      });
    });

    it('should include disclaimers on all recommendations', () => {
      const input = { ...baseInput, daysPastDue: 10 };
      const recommendations = generateRuleBasedRecommendations(input);

      recommendations.forEach(rec => {
        expect(rec.disclaimer).toBeDefined();
        expect(rec.disclaimer.length).toBeGreaterThan(0);
        expect(rec.isEducational).toBe(true);
      });
    });

    it('should return cash flow recommendations for large outstanding amounts', () => {
      const input = {
        ...baseInput,
        daysPastDue: 5,
        totalOutstanding: 6000000 // $60,000 in cents
      };
      const recommendations = generateRuleBasedRecommendations(input);

      const cashFlowRec = recommendations.find(r => r.type === 'cash_flow');
      expect(cashFlowRec).toBeDefined();
      expect(cashFlowRec?.title).toContain('concentration risk');
    });

    it('should return payment terms recommendations for slow payers', () => {
      const input = {
        ...baseInput,
        daysPastDue: 5,
        paymentHistory: {
          ...baseInput.paymentHistory,
          avgDaysToPayment: 60,
        }
      };
      const recommendations = generateRuleBasedRecommendations(input);

      const paymentTermsRec = recommendations.find(r => r.type === 'payment_terms');
      expect(paymentTermsRec).toBeDefined();
      expect(paymentTermsRec?.title).toContain('early payment incentives');
    });
  });
});
