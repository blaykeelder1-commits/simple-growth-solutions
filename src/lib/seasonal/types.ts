/**
 * Seasonal Pattern Types
 *
 * Types for detecting and applying seasonal payment patterns
 */

/**
 * Monthly multipliers (1.0 = normal, >1.0 = faster payments, <1.0 = slower)
 */
export interface MonthlyMultipliers {
  january: number;
  february: number;
  march: number;
  april: number;
  may: number;
  june: number;
  july: number;
  august: number;
  september: number;
  october: number;
  november: number;
  december: number;
}

/**
 * Quarterly multipliers for quick lookups
 */
export interface QuarterlyMultipliers {
  q1: number; // Jan-Mar
  q2: number; // Apr-Jun
  q3: number; // Jul-Sep
  q4: number; // Oct-Dec
}

/**
 * Complete seasonal pattern for a client
 */
export interface SeasonalPattern {
  clientId: string;
  monthly: MonthlyMultipliers;
  quarterly: QuarterlyMultipliers;
  dataPoints: number;
  confidenceScore: number; // 0-1
  lastUpdated: Date;
}

/**
 * Pattern confidence assessment
 */
export interface PatternConfidence {
  score: number; // 0-1
  level: 'low' | 'medium' | 'high';
  dataPoints: number;
  yearsOfData: number;
  message: string;
}

/**
 * Prediction adjustment based on seasonal pattern
 */
export interface PredictionAdjustment {
  originalDaysToPay: number;
  adjustedDaysToPay: number;
  seasonalMultiplier: number;
  month: number;
  quarter: number;
  confidence: number;
  reasoning: string;
}

/**
 * Seasonal risk period
 */
export interface SeasonalRiskPeriod {
  month: number;
  monthName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  multiplier: number;
  expectedDaysDelay: number;
  recommendation: string;
}

/**
 * Seasonal cash flow forecast
 */
export interface SeasonalCashFlowForecast {
  clientId: string;
  clientName?: string;
  forecastMonths: Array<{
    month: number;
    monthName: string;
    year: number;
    expectedInflow: number;
    seasonalMultiplier: number;
    adjustedInflow: number;
    confidence: number;
  }>;
  totalExpected: number;
  totalAdjusted: number;
  calculatedAt: Date;
}

/**
 * Payment timing data for pattern detection
 */
export interface PaymentTimingData {
  paymentDate: Date;
  dueDate: Date;
  amount: number;
  daysFromDue: number;
  month: number;
  quarter: number;
  year: number;
}

/**
 * Anomaly detection result
 */
export interface SeasonalAnomaly {
  invoiceId?: string;
  paymentDate: Date;
  expectedMultiplier: number;
  actualBehavior: number;
  deviation: number; // How many std devs from expected
  isAnomaly: boolean;
  severity: 'minor' | 'moderate' | 'significant';
  explanation: string;
}

/**
 * Stored seasonal pattern matching Prisma model
 */
export interface StoredSeasonalPattern {
  id: string;
  clientId: string;
  januaryMultiplier: number;
  februaryMultiplier: number;
  marchMultiplier: number;
  aprilMultiplier: number;
  mayMultiplier: number;
  juneMultiplier: number;
  julyMultiplier: number;
  augustMultiplier: number;
  septemberMultiplier: number;
  octoberMultiplier: number;
  novemberMultiplier: number;
  decemberMultiplier: number;
  q1Multiplier: number;
  q2Multiplier: number;
  q3Multiplier: number;
  q4Multiplier: number;
  dataPoints: number;
  confidenceScore: number;
  lastUpdated: Date;
  createdAt: Date;
}

/**
 * Month names for display
 */
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * Month keys for multipliers
 */
export const MONTH_KEYS: (keyof MonthlyMultipliers)[] = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];
