import pino from 'pino';
import pretty from 'pino-pretty';

const isProduction = process.env.NODE_ENV === 'production';

// Avoid pino's worker-thread `transport` in Next.js: webpack can't bundle the
// worker script and crashes with MODULE_NOT_FOUND. Use pino-pretty as a sync
// destination stream in dev; ship JSON to stdout in prod.
const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  isProduction
    ? undefined
    : pretty({
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard',
      })
);

// Create child loggers for different modules
export const arEngineLogger = logger.child({ module: 'ar-engine' });
export const authLogger = logger.child({ module: 'auth' });
export const apiLogger = logger.child({ module: 'api' });
export const cashflowLogger = logger.child({ module: 'cashflow' });
export const payrollLogger = logger.child({ module: 'payroll' });
export const integrationsLogger = logger.child({ module: 'integrations' });
export const aiLogger = logger.child({ module: 'ai' });

// Helper function to create a logger for a specific context
export function createLogger(module: string) {
  return logger.child({ module });
}

export { logger };
