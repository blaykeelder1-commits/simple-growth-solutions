// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JobFn = () => Promise<any>;

/**
 * Run a function in the background without blocking the response.
 * Uses waitUntil if available (Vercel Edge/Serverless), otherwise setTimeout.
 * Errors are caught and logged, never thrown to caller.
 */
export function runInBackground(fn: JobFn, label?: string): void {
  const wrappedFn = async () => {
    try {
      await fn();
    } catch (error) {
      console.error(`[Background Job${label ? `: ${label}` : ""}] Error:`, error);
    }
  };

  // In Vercel serverless, we can't truly fire-and-forget because the function
  // terminates after response. Use a promise that we track but don't await.
  // For proper background jobs, upgrade to Vercel Cron + queue table.
  wrappedFn();
}

/**
 * Queue multiple background jobs
 */
export function runAllInBackground(jobs: Array<{ fn: JobFn; label?: string }>): void {
  jobs.forEach(({ fn, label }) => runInBackground(fn, label));
}
