/**
 * Communication Effectiveness Types
 *
 * Types for tracking and analyzing communication timing effectiveness
 */

/**
 * Communication attempt data for tracking
 */
export interface CommunicationAttempt {
  organizationId: string;
  clientId: string;
  invoiceId?: string;
  actionType: ActionType;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  hourOfDay: number; // 0-23
  outcome: CommunicationOutcome;
  ledToPayment: boolean;
  daysToPayment?: number;
  responseTimeMs?: number;
  clientTier?: string;
  industry?: string;
  attemptDate: Date;
}

/**
 * Types of communication actions
 */
export type ActionType = 'email' | 'call' | 'sms' | 'meeting' | 'escalation';

/**
 * Possible outcomes of communication attempts
 */
export type CommunicationOutcome =
  | 'no_response'
  | 'promised_payment'
  | 'dispute'
  | 'partial_payment'
  | 'paid'
  | 'escalated'
  | 'callback_requested';

/**
 * Effectiveness metrics for a time slot
 */
export interface EffectivenessMetrics {
  totalAttempts: number;
  successfulAttempts: number;
  successRate: number; // 0-1
  avgResponseTimeMs?: number;
  avgDaysToPayment?: number;
  confidence: number; // 0-1, based on sample size
}

/**
 * Contact time recommendation
 */
export interface ContactRecommendation {
  clientId: string;
  clientName?: string;
  recommendedDay: string;
  recommendedDayNumber: number;
  recommendedHour: number;
  expectedSuccessRate: number;
  confidence: number;
  reasoning: string[];
  alternativeTimes: Array<{
    day: string;
    dayNumber: number;
    hour: number;
    successRate: number;
  }>;
  calculatedAt: Date;
}

/**
 * Day-hour effectiveness heatmap data
 */
export interface TimingHeatmapData {
  day: number;
  dayName: string;
  hour: number;
  successRate: number;
  attempts: number;
  confidence: number;
}

/**
 * Effectiveness by channel
 */
export interface ChannelEffectiveness {
  channel: ActionType;
  totalAttempts: number;
  successfulAttempts: number;
  successRate: number;
  avgDaysToPayment: number | null;
  bestDay: string | null;
  bestHour: number | null;
}

/**
 * Stored effectiveness data matching Prisma model
 */
export interface StoredCommunicationEffectiveness {
  id: string;
  organizationId: string;
  clientTier: string | null;
  industry: string | null;
  actionType: string;
  sundayRate: number;
  mondayRate: number;
  tuesdayRate: number;
  wednesdayRate: number;
  thursdayRate: number;
  fridayRate: number;
  saturdayRate: number;
  hourlyRates: Record<string, number> | null;
  bestDay: string | null;
  bestHour: number | null;
  bestDayHourRate: number | null;
  totalAttempts: number;
  successfulAttempts: number;
  lastUpdated: Date;
}

/**
 * Options for generating contact recommendations
 */
export interface ContactRecommendationOptions {
  preferredDays?: number[];
  preferredHoursStart?: number;
  preferredHoursEnd?: number;
  excludeWeekends?: boolean;
  minConfidence?: number;
}

/**
 * Scheduling constraints for batch optimization
 */
export interface SchedulingConstraints {
  maxContactsPerHour: number;
  maxContactsPerDay: number;
  businessHoursStart: number;
  businessHoursEnd: number;
  excludeWeekends: boolean;
  timezone: string;
}

/**
 * Scheduled follow-up in optimized schedule
 */
export interface ScheduledFollowUp {
  invoiceId: string;
  clientId: string;
  clientName?: string;
  scheduledDate: Date;
  scheduledHour: number;
  actionType: ActionType;
  expectedSuccessRate: number;
  priority: number;
}

/**
 * Day name mapping
 */
export const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type DayName = typeof DAY_NAMES[number];
