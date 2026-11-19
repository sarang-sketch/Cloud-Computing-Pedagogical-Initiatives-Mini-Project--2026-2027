interface PostgrestLikeError {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
  statusCode?: number;
}

export class AppError extends Error {
  code?: string;
  /** Machine-readable hint from our database functions, e.g. "admin_session_required". */
  hint?: string;
  constructor(message: string, code?: string, hint?: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.hint = hint;
  }
}

/** Codes raised by our own database functions carry user-facing messages. */
const FRIENDLY_CODES = new Set(["22023", "23505", "42501", "28000", "P0001"]);

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const e = (error ?? {}) as PostgrestLikeError;
  const code = typeof e.code === "string" ? e.code : undefined;
  const message = typeof e.message === "string" ? e.message : "";
  const hint = typeof e.hint === "string" && e.hint ? e.hint : undefined;

  if (/row-level security/i.test(message)) {
    return new AppError("You don't have permission to do that.", code, hint);
  }
  if (/failed to fetch|network|fetch failed|timeout/i.test(message)) {
    return new AppError("Network problem. Check your connection and try again.", code, hint);
  }
  if (/jwt|token/i.test(message) && !FRIENDLY_CODES.has(code ?? "")) {
    return new AppError("Your session expired. Refresh the page to sign in again.", code, hint);
  }
  if (code && FRIENDLY_CODES.has(code) && message) {
    return new AppError(message, code, hint);
  }
  if (code === "23503") return new AppError("That item no longer exists.", code, hint);
  return new AppError(message && message.length < 160 ? message : "Something went wrong. Please try again.", code, hint);
}

export function errorHint(error: unknown): string | undefined {
  return toAppError(error).hint;
}

export function errorMessage(error: unknown): string {
  return toAppError(error).message;
}

/** True when a request failed because the device is offline or the connection dropped. */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message = String(((error ?? {}) as PostgrestLikeError).message ?? "");
  return /failed to fetch|network|fetch failed|load failed|timeout/i.test(message);
}

/**
 * Runs `send`, retrying when the connection is the problem: offline, it waits for
 * the device to come back online; otherwise it backs off and tries again a few times.
 * Callers pass an idempotency key with the request, so a retry can't create a copy.
 */
export async function withNetworkRetry<T>(send: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await send();
    } catch (error) {
      if (attempt >= attempts || !isNetworkError(error)) throw error;
      await waitForConnection(1500 * (attempt + 1));
    }
  }
}

function waitForConnection(delay: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      window.removeEventListener("online", done);
      window.clearTimeout(timer);
      resolve();
    };
    // Offline: wait for the "online" event. Online but failing: wait out the delay.
    const timer = window.setTimeout(() => {
      if (navigator.onLine) done();
    }, delay);
    window.addEventListener("online", done);
  });
}

export function isDuplicate(error: unknown): boolean {
  return ((error ?? {}) as PostgrestLikeError).code === "23505";
}
