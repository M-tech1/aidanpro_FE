export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
  isSuperAdmin?: boolean;
  /** Unix epoch seconds when the access token expires (from Supabase session.expires_at). */
  expiresAt?: number;
};

const ACCESS_TOKEN_KEY  = "auth.access_token";
const REFRESH_TOKEN_KEY = "auth.refresh_token";
const SUPER_ADMIN_KEY   = "auth.is_super_admin";
const EXPIRES_AT_KEY    = "auth.expires_at";

export const authSession = {
  getAccessToken(): string | null {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken(): string | null {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  isSuperAdmin(): boolean {
    return window.localStorage.getItem(SUPER_ADMIN_KEY) === "true";
  },
  getExpiresAt(): number | null {
    const raw = window.localStorage.getItem(EXPIRES_AT_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  },
  /**
   * True when we can tell the access token is at (or within `skewSeconds` of)
   * its expiry. Returns false when no expiry is known, so callers fall back to
   * the reactive 401 refresh path rather than refreshing blindly.
   */
  isExpired(skewSeconds = 30): boolean {
    const expiresAt = this.getExpiresAt();
    if (!expiresAt) return false;
    return Date.now() / 1000 >= expiresAt - skewSeconds;
  },
  setTokens(tokens: AuthTokens): void {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    if (tokens.refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
    window.localStorage.setItem(SUPER_ADMIN_KEY, tokens.isSuperAdmin ? "true" : "false");
    if (typeof tokens.expiresAt === "number") {
      window.localStorage.setItem(EXPIRES_AT_KEY, String(tokens.expiresAt));
    }
  },
  clear(): void {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(SUPER_ADMIN_KEY);
    window.localStorage.removeItem(EXPIRES_AT_KEY);
  }
};
