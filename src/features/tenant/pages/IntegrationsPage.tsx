import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { tenantApi } from "@/features/tenant/api/tenantApi";
import {
  googleCalendarApi,
  type GoogleCalendarConnectionResponse
} from "@/features/tenant/api/googleCalendarApi";
import { hubspotApi, type HubspotConnectionResponse } from "@/features/tenant/api/hubspotApi";
import { ApiError, isAbortError } from "@/shared/api/httpClient";
import { withRetry } from "@/shared/utils/withRetry";

const MANAGER_ROLES = new Set(["owner", "admin"]);

function canManageIntegrations(role: string | undefined): boolean {
  if (!role) return false;
  return MANAGER_ROLES.has(role.toLowerCase());
}

function buildOAuthReturnUrl(): string {
  return `${window.location.origin}/dashboard/integrations`;
}

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconHubSpot = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconWarn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export function IntegrationsPage() {
  const [, setSearchParams] = useSearchParams();
  const didInit = useRef(false);

  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [googleConnection, setGoogleConnection] = useState<GoogleCalendarConnectionResponse | null>(null);
  const [hubspotConnection, setHubspotConnection] = useState<HubspotConnectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gcStatusError, setGcStatusError] = useState<string | null>(null);
  const [hsStatusError, setHsStatusError] = useState<string | null>(null);

  const [oauthBanner, setOauthBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleDisconnecting, setGoogleDisconnecting] = useState(false);

  const [hubspotToken, setHubspotToken] = useState("");
  const [hubspotSubmitting, setHubspotSubmitting] = useState(false);
  const [hubspotDisconnecting, setHubspotDisconnecting] = useState(false);
  const [hubspotMessage, setHubspotMessage] = useState<string | null>(null);
  const [hubspotError, setHubspotError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  // Promise.allSettled — a single failing integration check never nukes the whole page.
  // Only a profile failure (needed to determine role/permissions) surfaces as a global error.
  const loadAll = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setLoadError(null);
    setGcStatusError(null);
    setHsStatusError(null);

    const [profileResult, gcResult, hsResult] = await Promise.allSettled([
      withRetry(() => tenantApi.getProfile()),
      withRetry(() => googleCalendarApi.getConnection()),
      withRetry(() => hubspotApi.getConnection())
    ]);

    // Profile is critical — determines permission level
    if (profileResult.status === "fulfilled") {
      setUserRole(profileResult.value.user_role);
    } else if (!isAbortError(profileResult.reason)) {
      const err = profileResult.reason;
      setLoadError(err instanceof ApiError ? err.message : "Failed to load profile");
    }

    // Integration checks — surface per-card errors; never clear previously good state
    if (gcResult.status === "fulfilled") {
      setGoogleConnection(gcResult.value);
    } else if (!isAbortError(gcResult.reason)) {
      const err = gcResult.reason;
      setGcStatusError(err instanceof ApiError ? err.message : "Could not check Google Calendar status");
    }

    if (hsResult.status === "fulfilled") {
      setHubspotConnection(hsResult.value);
    } else if (!isAbortError(hsResult.reason)) {
      const err = hsResult.reason;
      setHsStatusError(err instanceof ApiError ? err.message : "Could not check HubSpot status");
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  // Single init effect — prevents the double-load race that occurred when both the
  // "always load" effect and the "OAuth callback" effect fired concurrently on mount.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    // Read initial params before they're cleaned from the URL
    const params = new URLSearchParams(window.location.search);
    const integration = params.get("integration");
    const status = params.get("status");
    const reason = params.get("reason");

    if (integration === "google_calendar" && status) {
      if (status === "connected") {
        setOauthBanner({ type: "success", text: "Google Calendar connected successfully." });
      } else if (status === "error") {
        const decoded = reason ? decodeURIComponent(reason) : "";
        setOauthBanner({
          type: "error",
          text: decoded ? `Google Calendar connection failed: ${decoded}` : "Google Calendar connection failed."
        });
      }
      setSearchParams(
        p => { const n = new URLSearchParams(p); n.delete("integration"); n.delete("status"); n.delete("reason"); return n; },
        { replace: true }
      );
    }

    void loadAll(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnectGoogleCalendar = async () => {
    setActionError(null);
    setGoogleConnecting(true);
    try {
      const { authorization_url } = await googleCalendarApi.startOAuth({
        frontend_redirect_url: buildOAuthReturnUrl()
      });
      window.location.assign(authorization_url);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not start Google Calendar connection");
      setGoogleConnecting(false);
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    if (!window.confirm("Disconnect Google Calendar from this tenant? The AI agent will no longer access your calendar.")) {
      return;
    }
    setActionError(null);
    setGoogleDisconnecting(true);
    try {
      await googleCalendarApi.disconnect();
      setOauthBanner({ type: "success", text: "Google Calendar disconnected." });
      await loadAll(true);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not disconnect Google Calendar");
    } finally {
      setGoogleDisconnecting(false);
    }
  };

  const handleConnectHubspot = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = hubspotToken.trim();
    if (!token) {
      setHubspotError("Enter your HubSpot private app access token (or OAuth access token).");
      return;
    }
    setHubspotError(null);
    setHubspotMessage(null);
    setActionError(null);
    setHubspotSubmitting(true);
    try {
      const res = await hubspotApi.connect({ access_token: token });
      setHubspotMessage(res.message || "HubSpot connected successfully.");
      setHubspotToken("");
      await loadAll(true);
    } catch (err) {
      setHubspotError(err instanceof ApiError ? err.message : "Could not connect HubSpot");
    } finally {
      setHubspotSubmitting(false);
    }
  };

  const handleDisconnectHubspot = async () => {
    if (!window.confirm("Disconnect HubSpot from this tenant? CRM features for the AI agent will stop using HubSpot.")) {
      return;
    }
    setHubspotError(null);
    setHubspotMessage(null);
    setActionError(null);
    setHubspotDisconnecting(true);
    try {
      await hubspotApi.disconnect();
      setHubspotMessage("HubSpot disconnected successfully.");
      await loadAll(true);
    } catch (err) {
      setHubspotError(err instanceof ApiError ? err.message : "Could not disconnect HubSpot");
    } finally {
      setHubspotDisconnecting(false);
    }
  };

  const canManage = canManageIntegrations(userRole);

  const gcConnected = Boolean(googleConnection?.connected);
  const gcIntegration = googleConnection?.integration;

  const hsConnected = Boolean(hubspotConnection?.connected);
  const hsIntegration = hubspotConnection?.integration;

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="page-hero">
          <div>
            <div className="skeleton-block" style={{ width: 200, height: 26, marginBottom: 8 }} />
            <div className="skeleton-block" style={{ width: 160, height: 18 }} />
          </div>
        </div>
        <div className="skeleton-block" style={{ height: 140, borderRadius: 14, marginBottom: 16 }} />
        <div className="skeleton-block" style={{ height: 140, borderRadius: 14 }} />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-hero">
        <div>
          <h1>Integrations</h1>
          <p className="page-subtitle">Connect tools your AI agent can use, scoped to your tenant</p>
        </div>
        <button
          type="button"
          onClick={() => void loadAll(true)}
          className="dashboard-button-secondary"
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {loadError    ? <div className="form-status error" style={{ marginBottom: 16 }}>{loadError}</div> : null}
      {oauthBanner?.type === "success" ? <div className="form-status"       style={{ marginBottom: 16 }}>{oauthBanner.text}</div> : null}
      {oauthBanner?.type === "error"   ? <div className="form-status error" style={{ marginBottom: 16 }}>{oauthBanner.text}</div> : null}
      {actionError  ? <div className="form-status error" style={{ marginBottom: 16 }}>{actionError}</div> : null}

      {/* ── Google Calendar ── */}
      <div className="info-banner" style={{ marginBottom: 20 }}>
        <span className="info-banner-icon"><IconInfo /></span>
        <div className="info-banner-content">
          <p className="info-banner-title">Google Calendar</p>
          <p className="info-banner-desc">
            OAuth runs on your backend: the browser is sent to Google, then back to your app after tokens are stored for this tenant.
            Only owners and admins can connect or disconnect.
          </p>
        </div>
      </div>

      <div className="detail-card" style={{ marginBottom: 20 }}>
        <div className="detail-card-header" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--brand-blue)", display: "inline-flex" }}><IconCalendar /></span>
          <h2 className="detail-card-title" style={{ margin: 0 }}>Google Calendar</h2>
        </div>
        <div className="detail-card-body">
          {gcStatusError ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 12px", marginBottom: 14,
              background: "var(--warning-bg)", border: "1px solid var(--warning-ring)",
              borderRadius: "var(--radius-md)", fontSize: "0.82rem", color: "var(--warning-text)"
            }}>
              <IconWarn /> Status check failed — {gcStatusError}
            </div>
          ) : null}
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className="detail-value">
                {gcStatusError ? (
                  <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Unknown</span>
                ) : gcConnected ? (
                  <span style={{ color: "var(--success-text)" }}>Connected</span>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>Not connected</span>
                )}
              </span>
            </div>
            {gcConnected && gcIntegration?.connected_at ? (
              <div className="detail-item">
                <span className="detail-label">Connected at</span>
                <span className="detail-value">{new Date(gcIntegration.connected_at).toLocaleString()}</span>
              </div>
            ) : null}
            {gcIntegration?.error_message ? (
              <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                <span className="detail-label">Last error</span>
                <span className="detail-value" style={{ color: "var(--error-text)" }}>{gcIntegration.error_message}</span>
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 12 }}>
            {!gcStatusError && gcConnected ? (
              <button
                type="button"
                className="dashboard-button-secondary"
                onClick={() => void handleDisconnectGoogleCalendar()}
                disabled={!canManage || googleDisconnecting}
              >
                {googleDisconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            ) : !gcStatusError ? (
              <button
                type="button"
                className="dashboard-button"
                onClick={() => void handleConnectGoogleCalendar()}
                disabled={!canManage || googleConnecting}
              >
                {googleConnecting ? "Redirecting…" : "Connect with Google"}
              </button>
            ) : null}
            {!canManage && !gcStatusError ? (
              <p className="page-subtitle" style={{ margin: 0, alignSelf: "center" }}>
                Ask an owner or admin to manage this connection.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── HubSpot ── */}
      <div className="info-banner" style={{ marginBottom: 20 }}>
        <span className="info-banner-icon"><IconInfo /></span>
        <div className="info-banner-content">
          <p className="info-banner-title">HubSpot</p>
          <p className="info-banner-desc">
            Paste a HubSpot private app access token (or OAuth access token). Your backend validates it with HubSpot before storing it encrypted per tenant.
            Only owners and admins can connect or disconnect.
          </p>
        </div>
      </div>

      <div className="detail-card">
        <div className="detail-card-header" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--brand-blue)", display: "inline-flex" }}><IconHubSpot /></span>
          <h2 className="detail-card-title" style={{ margin: 0 }}>HubSpot</h2>
        </div>
        <div className="detail-card-body">
          {hubspotMessage ? <div className="form-status"       style={{ marginBottom: 12 }}>{hubspotMessage}</div> : null}
          {hubspotError   ? <div className="form-status error" style={{ marginBottom: 12 }}>{hubspotError}</div>   : null}

          {hsStatusError ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 12px", marginBottom: 14,
              background: "var(--warning-bg)", border: "1px solid var(--warning-ring)",
              borderRadius: "var(--radius-md)", fontSize: "0.82rem", color: "var(--warning-text)"
            }}>
              <IconWarn /> Status check failed — {hsStatusError}
            </div>
          ) : null}

          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className="detail-value">
                {hsStatusError ? (
                  <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Unknown</span>
                ) : hsConnected ? (
                  <span style={{ color: "var(--success-text)" }}>Connected</span>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>Not connected</span>
                )}
              </span>
            </div>
            {hsConnected && hsIntegration?.connected_at ? (
              <div className="detail-item">
                <span className="detail-label">Connected at</span>
                <span className="detail-value">{new Date(hsIntegration.connected_at).toLocaleString()}</span>
              </div>
            ) : null}
            {hsIntegration?.error_message ? (
              <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                <span className="detail-label">Last error</span>
                <span className="detail-value" style={{ color: "var(--error-text)" }}>{hsIntegration.error_message}</span>
              </div>
            ) : null}
          </div>

          {!hsStatusError && !hsConnected && canManage ? (
            <form onSubmit={handleConnectHubspot} className="dashboard-form" style={{ marginTop: 20, maxWidth: 480 }}>
              <div className="form-field">
                <label htmlFor="hubspot-access-token">Access token</label>
                <input
                  id="hubspot-access-token"
                  name="hubspot-access-token"
                  type="password"
                  autoComplete="off"
                  placeholder="pat-na1-… or OAuth access token"
                  value={hubspotToken}
                  onChange={(e) => setHubspotToken(e.target.value)}
                  disabled={hubspotSubmitting}
                />
              </div>
              <button type="submit" className="dashboard-button" disabled={hubspotSubmitting}>
                {hubspotSubmitting ? "Connecting…" : "Connect HubSpot"}
              </button>
            </form>
          ) : null}

          {!hsStatusError && !hsConnected && !canManage ? (
            <p className="page-subtitle" style={{ marginTop: 16 }}>
              Ask an owner or admin to connect HubSpot.
            </p>
          ) : null}

          {!hsStatusError && hsConnected ? (
            <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 12 }}>
              <button
                type="button"
                className="dashboard-button-secondary"
                onClick={() => void handleDisconnectHubspot()}
                disabled={!canManage || hubspotDisconnecting}
              >
                {hubspotDisconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
              {!canManage ? (
                <p className="page-subtitle" style={{ margin: 0, alignSelf: "center" }}>
                  Ask an owner or admin to disconnect.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
