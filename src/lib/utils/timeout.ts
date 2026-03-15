/**
 * Wrap a promise with a timeout. If the promise doesn't resolve within
 * the specified time, it rejects with a TimeoutError.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label?: string
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timeout${label ? ` (${label})` : ""}: exceeded ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
