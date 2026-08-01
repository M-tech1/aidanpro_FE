import { appConfig } from "@/shared/config/appConfig";
import { authSession } from "@/shared/session/authSession";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
};

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function getErrorMessage(payload: unknown): string {
  if (typeof payload === "object" && payload && "error" in payload) {
    const maybeError = (payload as { error?: unknown }).error;
    if (typeof maybeError === "string") {
      return maybeError;
    }
  }
  return "Something went wrong. Please try again.";
}

function isValidJwt(token: string | null): token is string {
  return !!token && token.trim().split(".").length === 3;
}

// Merge a caller-supplied signal with a timeout signal so either can abort the request.
function mergeSignals(callerSignal: AbortSignal | undefined, timeoutSignal: AbortSignal): AbortSignal {
  if (!callerSignal) return timeoutSignal;
  const controller = new AbortController();
  const abort = (reason?: unknown) => controller.abort(reason);
  if (callerSignal.aborted) { abort(callerSignal.reason); return controller.signal; }
  if (timeoutSignal.aborted) { abort(timeoutSignal.reason); return controller.signal; }
  callerSignal.addEventListener("abort", () => abort(callerSignal.reason), { once: true });
  timeoutSignal.addEventListener("abort", () => abort(timeoutSignal.reason), { once: true });
  return controller.signal;
}

const REQUEST_TIMEOUT_MS = 15_000;

// ── Session refresh / expiry handling ───────────────────────────────────────
//
// The access token issued by Supabase expires (typically after ~1 hour). When
// it does, protected endpoints return 401. Rather than surfacing "jwt expired"
// to the user — or leaving them stuck on the dashboard — we transparently:
//   1. try to mint a fresh access token from the stored refresh token, and
//   2. only if that fails, clear the session and redirect to the login page.
//
// Concurrent requests share a single in-flight refresh so we never fire the
// /auth/refresh endpoint (which is itself rate-limited) more than once at a time.

let refreshInFlight: Promise<boolean> | null = null;
let redirecting = false;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = authSession.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(joinUrl(appConfig.apiBaseUrl, "/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    if (!res.ok) return false;

    const data = (await res.json().catch(() => null)) as {
      session?: { access_token?: string; refresh_token?: string; expires_at?: number };
    } | null;
    const session = data?.session;
    if (!session?.access_token) return false;

    authSession.setTokens({
      accessToken: session.access_token.trim(),
      refreshToken: session.refresh_token?.trim() ?? refreshToken,
      isSuperAdmin: authSession.isSuperAdmin(),
      expiresAt: session.expires_at
    });
    return true;
  } catch {
    return false;
  }
}

function ensureRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// Session is unrecoverable: wipe it and bounce to the login screen. The full
// navigation reloads the SPA, which also clears the in-memory API cache.
function handleSessionExpired(): void {
  authSession.clear();
  if (typeof window === "undefined" || redirecting) return;
  const { pathname } = window.location;
  if (pathname.startsWith("/auth/")) return; // already on an auth page — don't loop
  redirecting = true;
  window.location.assign("/auth/login");
}

const SESSION_EXPIRED = () =>
  new ApiError("Your session has expired. Please sign in again.", 401, { error: "Session expired" });

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return executeRequest<T>(path, options, true);
}

async function executeRequest<T>(
  path: string,
  options: RequestOptions,
  allowRetry: boolean
): Promise<T> {
  const { method = "GET", body, auth = false, signal } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (auth) {
    // Proactively refresh a token we already know is expired, so we don't waste
    // a round-trip just to get a 401 back.
    if (allowRetry && authSession.isExpired() && authSession.getRefreshToken()) {
      await ensureRefresh();
    }

    let token = authSession.getAccessToken();
    if (!isValidJwt(token)) {
      // No usable access token in hand — attempt a refresh before giving up.
      const refreshed = allowRetry ? await ensureRefresh() : false;
      token = authSession.getAccessToken();
      if (!refreshed || !isValidJwt(token)) {
        handleSessionExpired();
        throw SESSION_EXPIRED();
      }
    }
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  const combinedSignal = mergeSignals(signal, timeoutController.signal);

  let response: Response;
  try {
    response = await fetch(joinUrl(appConfig.apiBaseUrl, path), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: combinedSignal
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    // Re-throw AbortError so callers can distinguish cancellation from real failures
    if (isAbortError(networkErr)) throw networkErr;
    throw new ApiError(
      "Server is unreachable right now. Please wait a few seconds and try again.",
      0,
      { error: networkErr instanceof Error ? networkErr.message : "Network error" }
    );
  }
  clearTimeout(timeoutId);

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      payload = { error: raw };
    }
  }

  if (!response.ok) {
    // An expired/invalid session on an authenticated request: try one refresh
    // and replay the request; if that fails, send the user back to login.
    if (response.status === 401 && auth && allowRetry) {
      const refreshed = await ensureRefresh();
      if (refreshed) {
        return executeRequest<T>(path, options, false);
      }
      handleSessionExpired();
      throw SESSION_EXPIRED();
    }
    throw new ApiError(getErrorMessage(payload), response.status, payload);
  }

  return payload as T;
}
