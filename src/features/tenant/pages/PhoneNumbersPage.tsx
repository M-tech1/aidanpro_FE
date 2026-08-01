import { useEffect, useState } from "react";
import { tenantApi } from "@/features/tenant/api/tenantApi";
import { twilioApi, type AvailableNumber } from "@/features/tenant/api/twilioApi";
import { ApiError, isAbortError } from "@/shared/api/httpClient";
import { withRetry } from "@/shared/utils/withRetry";
import { apiCache, CACHE_KEYS } from "@/shared/cache/apiCache";
import { DEFAULT_COUNTRY, countryName } from "@/shared/config/countries";
import type { PhoneNumber } from "@/features/tenant/api/tenantApi";

const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const IconCopy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: "2px 4px",
        borderRadius: 4,
        color: copied ? "var(--success-text)" : "var(--text-muted)",
        display: "inline-flex",
        alignItems: "center",
        transition: "color 0.15s"
      }}
    >
      {copied ? <IconCheck /> : <IconCopy />}
    </button>
  );
}

export function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [availableError, setAvailableError] = useState<string | null>(null);
  // Country is locked to the tenant's profile — not user-editable here.
  const [tenantCountry, setTenantCountry] = useState<string>(DEFAULT_COUNTRY);
  const [areaCode, setAreaCode] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [buyingNumber, setBuyingNumber] = useState<string | null>(null);
  const [buyMessage, setBuyMessage] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);

  const loadPhoneNumbers = async (isRefresh = false, signal?: AbortSignal) => {
    // On first load (not a manual refresh) return cache instantly
    if (!isRefresh) {
      const cached = apiCache.get(CACHE_KEYS.phoneNumbers);
      if (cached) {
        setPhoneNumbers(cached.phone_numbers ?? []);
        setLoading(false);
        return;
      }
    }

    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const response = await withRetry(() => tenantApi.getPhoneNumbers(signal), signal);
      apiCache.set(CACHE_KEYS.phoneNumbers, response);
      setPhoneNumbers(response.phone_numbers ?? []);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof ApiError ? err.message : "Failed to load phone numbers");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadPhoneNumbers(false, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve the tenant's locked country from their profile (cache-first).
  useEffect(() => {
    const controller = new AbortController();
    const resolveCountry = async () => {
      const cached = apiCache.get(CACHE_KEYS.tenantProfile);
      if (cached?.tenant?.country) {
        setTenantCountry(cached.tenant.country);
        return;
      }
      try {
        const profile = await tenantApi.getProfile(controller.signal);
        apiCache.set(CACHE_KEYS.tenantProfile, profile);
        if (profile.tenant?.country) setTenantCountry(profile.tenant.country);
      } catch (err) {
        if (isAbortError(err)) return;
        // Non-fatal: fall back to the default country.
      }
    };
    void resolveCountry();
    return () => controller.abort();
  }, []);

  const handleSearchNumbers = async (event: React.FormEvent) => {
    event.preventDefault();
    setAvailableError(null);
    setBuyMessage(null);
    setBuyError(null);
    try {
      setAvailableLoading(true);
      const res = await twilioApi.getAvailableNumbers({
        country: tenantCountry,
        area_code: areaCode || undefined,
        page_size: pageSize
      });
      setAvailableNumbers(res.available_numbers || []);
    } catch (err) {
      setAvailableError(
        err instanceof ApiError
          ? err.message
          : "Failed to load available phone numbers from Twilio"
      );
      setAvailableNumbers([]);
    } finally {
      setAvailableLoading(false);
    }
  };

  const handleBuyNumber = async (phone_number: string) => {
    setBuyingNumber(phone_number);
    setBuyMessage(null);
    setBuyError(null);
    try {
      await twilioApi.buyPhoneNumber({ phone_number, country: tenantCountry });
      setBuyMessage(`Successfully purchased ${phone_number}. It will now appear in your assigned numbers.`);
      // Invalidate so dashboard and this page re-fetch fresh data
      apiCache.delete(CACHE_KEYS.phoneNumbers);
      await loadPhoneNumbers(true);
    } catch (err) {
      setBuyError(
        err instanceof ApiError
          ? err.message
          : "Failed to purchase this phone number"
      );
    } finally {
      setBuyingNumber(null);
    }
  };

  const activeCount   = phoneNumbers.filter((n) => n.status === "active").length;
  const inactiveCount = phoneNumbers.filter((n) => n.status !== "active").length;
  // Only one number is allowed per account — hide the buy flow once they have one.
  const hasNumber = phoneNumbers.length >= 1;

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="page-hero">
          <div>
            <div className="skeleton-block" style={{ width: 180, height: 26, marginBottom: 8 }} />
            <div className="skeleton-block" style={{ width: 130, height: 18 }} />
          </div>
        </div>
        <div className="skeleton-block" style={{ height: 100, borderRadius: 10, marginBottom: 16 }} />
        <div className="skeleton-block" style={{ height: 240, borderRadius: 14 }} />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="page-hero">
        <div>
          <h1>Phone Numbers</h1>
          <p className="page-subtitle">
            Twilio numbers assigned to your AI agent
            {phoneNumbers.length > 0 && (
              <>
                {" · "}<span style={{ color: "var(--success-text)" }}>{activeCount} active</span>
                {inactiveCount > 0 && <>, {inactiveCount} inactive</>}
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => loadPhoneNumbers(true)}
          className="dashboard-button-secondary"
          disabled={refreshing}
          title="Refresh"
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, animation: refreshing ? "spin 0.8s linear infinite" : undefined }}>
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-4" />
            </svg>
            {refreshing ? "Refreshing…" : "Refresh"}
          </span>
        </button>
      </div>

      {error && <div className="form-status error" style={{ marginBottom: 16 }}>{error}</div>}
      {buyMessage && <div className="form-status" style={{ marginBottom: 16 }}>{buyMessage}</div>}
      {buyError && <div className="form-status error" style={{ marginBottom: 16 }}>{buyError}</div>}

      {/* Webhook info banner */}
      <div className="info-banner">
        <span className="info-banner-icon"><IconInfo /></span>
        <div className="info-banner-content">
          <p className="info-banner-title">How phone numbers are configured</p>
          <p className="info-banner-desc">
            Each number is wired to your AI agent via Twilio webhooks.
            Inbound calls trigger <code>POST /twilio/voice/inbound</code> which routes
            the call to your tenant's agent. Call recordings are captured via the
            recording status callback at <code>POST /twilio/voice/recording</code>.
            Numbers are managed by your platform administrator.
          </p>
        </div>
      </div>

      {/* One number per account: buy flow shows only when they have none yet */}
      {hasNumber ? (
        <div className="info-banner" style={{ marginTop: 20 }}>
          <span className="info-banner-icon"><IconInfo /></span>
          <div className="info-banner-content">
            <p className="info-banner-title">Your number is set up</p>
            <p className="info-banner-desc">
              Each account can have a single phone number, and yours is already assigned below.
              To change it, contact your platform administrator.
            </p>
          </div>
        </div>
      ) : (
      <div className="form-section" style={{ marginTop: 20 }}>
        <div className="form-section-header">
          <h2 className="form-section-title">Search & Buy New Number</h2>
          <p className="form-section-desc">
            Find an available Twilio number in your country (optionally by area code) and attach it to your AI agent.
            You can have one number per account.
          </p>
        </div>
        <div className="form-section-body">
          <form onSubmit={handleSearchNumbers} className="dashboard-form" style={{ marginTop: 0 }}>
            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="country">Country</label>
                <input
                  id="country"
                  type="text"
                  value={`${countryName(tenantCountry)} (${tenantCountry})`}
                  readOnly
                  disabled
                  title="Country is set in your Tenant Profile"
                />
                <small style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Locked to your profile country. Change it in Tenant Profile.
                </small>
              </div>
              <div className="form-field">
                <label htmlFor="areaCode">Area code (optional)</label>
                <input
                  id="areaCode"
                  type="text"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  placeholder="e.g. 416"
                />
              </div>
              <div className="form-field">
                <label htmlFor="pageSize">How many numbers</label>
                <input
                  id="pageSize"
                  type="number"
                  min={1}
                  max={50}
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value) || 1)}
                />
              </div>
            </div>
            <div className="dashboard-form-actions">
              <button type="submit" className="dashboard-button" disabled={availableLoading}>
                {availableLoading ? "Searching…" : "Search Numbers"}
              </button>
            </div>
          </form>

          {availableError && (
            <div className="form-status error" style={{ marginTop: 12 }}>
              {availableError}
            </div>
          )}

          {availableNumbers.length > 0 && (
            <div className="dashboard-table-container" style={{ marginTop: 16 }}>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Available Number</th>
                    <th>Friendly Name</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {availableNumbers.map((num) => (
                    <tr key={num.phone_number}>
                      <td>
                        <div className="phone-number-cell">
                          <IconPhone />
                          <span
                            style={{
                              fontFamily: "'Monaco','Courier New',monospace",
                              fontWeight: 600,
                              fontSize: "0.9rem",
                              color: "var(--text-primary)"
                            }}
                          >
                            {num.phone_number}
                          </span>
                          <CopyButton text={num.phone_number} />
                        </div>
                      </td>
                      <td>{num.friendly_name || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="dashboard-button"
                          onClick={() => void handleBuyNumber(num.phone_number)}
                          disabled={buyingNumber === num.phone_number}
                        >
                          {buyingNumber === num.phone_number ? "Buying…" : "Buy Number"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Table or empty state */}
      {phoneNumbers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><IconPhone /></div>
          <h3>No phone numbers assigned</h3>
          <p>
            Your AI agent doesn't have a Twilio number yet. Use “Search &amp; Buy New Number”
            above to get one — one number per account.
          </p>
        </div>
      ) : (
        <div className="dashboard-table-container">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Phone Number</th>
                <th>Status</th>
                <th>Twilio SID</th>
                <th>Assigned</th>
              </tr>
            </thead>
            <tbody>
              {phoneNumbers.map((phone) => (
                <tr key={phone.id}>
                  <td>
                    <div className="phone-number-cell">
                      <IconPhone />
                      <span style={{ fontFamily: "'Monaco','Courier New',monospace", fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                        {phone.phone_number}
                      </span>
                      <CopyButton text={phone.phone_number} />
                    </div>
                  </td>
                  <td>
                    <span className={`dashboard-status dashboard-status-${phone.status}`}>
                      {phone.status}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {phone.twilio_sid ? (
                        <>
                          <code className="dashboard-code">
                            {phone.twilio_sid.length > 20
                              ? `${phone.twilio_sid.slice(0, 10)}…${phone.twilio_sid.slice(-6)}`
                              : phone.twilio_sid}
                          </code>
                          <CopyButton text={phone.twilio_sid} />
                        </>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </span>
                  </td>
                  <td>
                    {new Date(phone.created_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric"
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Webhook reference */}
      {phoneNumbers.length > 0 && (
        <div className="detail-card" style={{ marginTop: 20 }}>
          <div className="detail-card-header">
            <h2 className="detail-card-title">Webhook Reference</h2>
          </div>
          <div className="detail-card-body">
            <ul className="webhook-list">
              <li className="webhook-item">
                <span className="webhook-label">Voice webhook</span>
                <span className="webhook-value">
                  <code>POST /twilio/voice/inbound</code>
                  {" — "}Handles all inbound calls; routes to your tenant's AI agent
                </span>
              </li>
              <li className="webhook-item">
                <span className="webhook-label">Recording callback</span>
                <span className="webhook-value">
                  <code>POST /twilio/voice/recording</code>
                  {" — "}Triggered when a recording is ready; stores and emails the link
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
