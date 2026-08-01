import { ApiError, isAbortError } from "@/shared/api/httpClient";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000;

/**
 * Retries `fn` up to 3 times (3 s apart) when the backend returns a 5xx or
 * a non-ApiError (network error, EAGAIN, etc.).  Aborts cleanly if `signal`
 * fires.  Calls `onRetry` before each retry so callers can surface a banner.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  signal?: AbortSignal,
  onRetry?: () => void
): Promise<T> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (attempt > 0) {
      await new Promise<void>(resolve => {
        const id = window.setTimeout(resolve, RETRY_DELAY_MS);
        signal?.addEventListener("abort", () => { clearTimeout(id); resolve(); }, { once: true });
      });
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    }

    try {
      return await fn();
    } catch (err) {
      if (isAbortError(err)) throw err;

      const isTransient = !(err instanceof ApiError) || err.status >= 500;
      if (isTransient && attempt < MAX_ATTEMPTS - 1) {
        onRetry?.();
        continue;
      }
      throw err;
    }
  }
  // unreachable — loop always returns or throws
  throw new Error("withRetry: exhausted attempts");
}
