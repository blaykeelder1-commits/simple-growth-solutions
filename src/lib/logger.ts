import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // In development, use pino-pretty if available
  ...(isProduction ? {} : {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard',
      },
    },
  }),
});

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
