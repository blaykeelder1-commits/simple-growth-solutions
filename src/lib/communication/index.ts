/**
 * Communication Effectiveness Module Exports
 *
 * Centralized exports for communication timing functions and types
 */

// Type exports
export * from './types';

// Effectiveness tracking
export {
  recordCommunicationAttempt,
  calculateEffectivenessRate,
  getEffectivenessByDayHour,
  getStoredEffectiveness,
} from './effectiveness';

// Recommendations
export {
  getBestContactTime,
  getBestContactTimeByTier,
  getOptimalSchedule,
  updateClientBestContactTime,
} from './recommendations';

// Analytics
export {
  aggregateCommunicationStats,
  getChannelEffectiveness,
  updateEffectivenessTable,
  getCommunicationTrends,
  type CommunicationStats,
} from './analytics';
