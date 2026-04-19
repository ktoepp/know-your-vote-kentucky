/** Reject if the promise (or thenable, e.g. Supabase query builder) does not settle within `ms`. */
export async function withTimeout<T>(promiseLike: PromiseLike<T>, ms: number, message?: string): Promise<T> {
  const promise = Promise.resolve(promiseLike);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(message || `Request timed out after ${Math.round(ms / 1000)}s`)),
      ms,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
