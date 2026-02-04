import { describe, it, expect } from 'vitest';
import {
  calculatePaymentScore,
  getRiskLevel,
  calculateRecoveryLikelihood,
  predictPaymentDate,
  PaymentHistory,
} from './scoring';

describe('Payment Scoring System', () => {
  describe('calculatePaymentScore', () => {
    it('should return 50 for new clients with no history', () => {
      const score = calculatePaymentScore([]);
      expect(score).toBe(50);
    });

    it('should return high score for clients who always pay on time', () => {
      const history: PaymentHistory[] = [
        { invoiceId: '1', amount: 10000, dueDate: new Date('2024-01-01'), paidDate: new Date('2024-01-01'), daysLate: 0 },
        { invoiceId: '2', amount: 10000, dueDate: new Date('2024-02-01'), paidDate: new Date('2024-01-28'), daysLate: -4 },
        { invoiceId: '3', amount: 10000, dueDate: new Date('2024-03-01'), paidDate: new Date('2024-03-01'), daysLate: 0 },
      ];
      const score = calculatePaymentScore(history);
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it('should return low score for clients who consistently pay late', () => {
      const history: PaymentHistory[] = [
        { invoiceId: '1', amount: 10000, dueDate: new Date('2024-01-01'), paidDate: new Date('2024-01-30'), daysLate: 29 },
        { invoiceId: '2', amount: 10000, dueDate: new Date('2024-02-01'), paidDate: new Date('2024-03-01'), daysLate: 28 },
        { invoiceId: '3', amount: 10000, dueDate: new Date('2024-03-01'), paidDate: new Date('2024-04-05'), daysLate: 35 },
      ];
      const score = calculatePaymentScore(history);
      expect(score).toBeLessThan(50);
    });

    it('should weight recent payments more heavily', () => {
      // Client used to pay late but now pays on time
      const improvingHistory: PaymentHistory[] = [
        { invoiceId: '1', amount: 10000, dueDate: new Date('2024-01-01'), paidDate: new Date('2024-02-01'), daysLate: 31 },
        { invoiceId: '2', amount: 10000, dueDate: new Date('2024-02-01'), paidDate: new Date('2024-02-15'), daysLate: 14 },
        { invoiceId: '3', amount: 10000, dueDate: new Date('2024-03-01'), paidDate: new Date('2024-03-01'), daysLate: 0 },
        { invoiceId: '4', amount: 10000, dueDate: new Date('2024-04-01'), paidDate: new Date('2024-04-01'), daysLate: 0 },
        { invoiceId: '5', amount: 10000, dueDate: new Date('2024-05-01'), paidDate: new Date('2024-05-01'), daysLate: 0 },
      ];
      const improvingScore = calculatePaymentScore(improvingHistory);

      // Client used to pay on time but now pays late
      const decliningHistory: PaymentHistory[] = [
        { invoiceId: '1', amount: 10000, dueDate: new Date('2024-01-01'), paidDate: new Date('2024-01-01'), daysLate: 0 },
        { invoiceId: '2', amount: 10000, dueDate: new Date('2024-02-01'), paidDate: new Date('2024-02-01'), daysLate: 0 },
        { invoiceId: '3', amount: 10000, dueDate: new Date('2024-03-01'), paidDate: new Date('2024-03-01'), daysLate: 0 },
        { invoiceId: '4', amount: 10000, dueDate: new Date('2024-04-01'), paidDate: new Date('2024-04-15'), daysLate: 14 },
        { invoiceId: '5', amount: 10000, dueDate: new Date('2024-05-01'), paidDate: new Date('2024-06-01'), daysLate: 31 },
      ];
      const decliningScore = calculatePaymentScore(decliningHistory);

      expect(improvingScore).toBeGreaterThan(decliningScore);
    });
  });

  describe('getRiskLevel', () => {
    it('should return low for scores >= 80', () => {
      expect(getRiskLevel(80)).toBe('low');
      expect(getRiskLevel(100)).toBe('low');
      expect(getRiskLevel(95)).toBe('low');
    });

    it('should return medium for scores 60-79', () => {
      expect(getRiskLevel(60)).toBe('medium');
      expect(getRiskLevel(79)).toBe('medium');
      expect(getRiskLevel(70)).toBe('medium');
    });

    it('should return high for scores 40-59', () => {
      expect(getRiskLevel(40)).toBe('high');
      expect(getRiskLevel(59)).toBe('high');
      expect(getRiskLevel(50)).toBe('high');
    });

    it('should return critical for scores < 40', () => {
      expect(getRiskLevel(39)).toBe('critical');
      expect(getRiskLevel(0)).toBe('critical');
      expect(getRiskLevel(20)).toBe('critical');
    });
  });

  describe('calculateRecoveryLikelihood', () => {
    const baseInvoice = {
      amount: 100000, // $1,000 in cents
      dueDate: new Date('2024-01-15'),
      daysPastDue: 0,
    };

    it('should return high likelihood for good clients with current invoices', () => {
      const likelihood = calculateRecoveryLikelihood(baseInvoice, 90);
      expect(likelihood).toBeGreaterThan(0.8);
    });

    it('should decrease likelihood as days past due increases', () => {
      const current = calculateRecoveryLikelihood({ ...baseInvoice, daysPastDue: 0 }, 70);
      const oneWeek = calculateRecoveryLikelihood({ ...baseInvoice, daysPastDue: 7 }, 70);
      const oneMonth = calculateRecoveryLikelihood({ ...baseInvoice, daysPastDue: 30 }, 70);
      const twoMonths = calculateRecoveryLikelihood({ ...baseInvoice, daysPastDue: 60 }, 70);

      expect(oneWeek).toBeLessThan(current);
      expect(oneMonth).toBeLessThan(oneWeek);
      expect(twoMonths).toBeLessThan(oneMonth);
    });

    it('should reduce likelihood for very large invoices', () => {
      const small = calculateRecoveryLikelihood({ ...baseInvoice, amount: 500000 }, 70); // $5k
      const large = calculateRecoveryLikelihood({ ...baseInvoice, amount: 2000000 }, 70); // $20k
      const veryLarge = calculateRecoveryLikelihood({ ...baseInvoice, amount: 10000000 }, 70); // $100k

      expect(large).toBeLessThan(small);
      expect(veryLarge).toBeLessThan(large);
    });

    it('should never return less than 5% or more than 99%', () => {
      const veryLow = calculateRecoveryLikelihood(
        { ...baseInvoice, daysPastDue: 365 },
        10
      );
      const veryHigh = calculateRecoveryLikelihood(
        { ...baseInvoice, amount: 1000 },
        100
      );

      expect(veryLow).toBeGreaterThanOrEqual(0.05);
      expect(veryHigh).toBeLessThanOrEqual(0.99);
    });
  });

  describe('predictPaymentDate', () => {
    const dueDate = new Date('2024-06-01');

    it('should predict early payment for high-scoring clients', () => {
      const prediction = predictPaymentDate(dueDate, 30, 85);
      const daysAfterDue = Math.round(
        (prediction.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysAfterDue).toBeLessThanOrEqual(5);
    });

    it('should use avgDaysToPayment for medium-scoring clients', () => {
      const prediction = predictPaymentDate(dueDate, 15, 65);
      const daysAfterDue = Math.round(
        (prediction.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysAfterDue).toBe(15);
    });

    it('should add buffer for low-scoring clients', () => {
      const avgDays = 20;
      const prediction = predictPaymentDate(dueDate, avgDays, 35);
      const daysAfterDue = Math.round(
        (prediction.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysAfterDue).toBeGreaterThan(avgDays);
    });
  });
});
