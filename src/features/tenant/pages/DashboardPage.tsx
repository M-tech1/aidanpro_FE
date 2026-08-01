import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { tenantApi } from "@/features/tenant/api/tenantApi";
import { ApiError, isAbortError } from "@/shared/api/httpClient";
import { withRetry } from "@/shared/utils/withRetry";
import { apiCache, CACHE_KEYS } from "@/shared/cache/apiCache";
import type {
  TenantProfileResponse,
  AgentConfig,
  PhoneNumber
} from "@/features/tenant/api/tenantApi";

type DashboardData = {
  profile: TenantProfileResponse | null;
  agentConfig: AgentConfig | null;
  phoneNumbers: PhoneNumber[];
};

const IconArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconBuilding = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconBot = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" y1="16" x2="8" y2="16" strokeWidth="3" />
    <line x1="12" y1="16" x2="12" y2="16" strokeWidth="3" />
    <line x1="16" y1="16" x2="16" y2="16" strokeWidth="3" />
  </svg>
);
const IconExtLink = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, opacity: 0.6 }}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

export function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    profile: null,
    agentConfig: null,
    phoneNumbers: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadTrigger, setLoadTrigger] = useState(0);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const load = async () => {
      // Return cached data immediately — no loading flash on back-navigation
      const cachedProfile  = apiCache.get(CACHE_KEYS.tenantProfile);
      const cachedConfig   = apiCache.get(CACHE_KEYS.agentConfig);
      const cachedNumbers  = apiCache.get(CACHE_KEYS.phoneNumbers);

      if (cachedProfile && cachedConfig && cachedNumbers) {
        setData({
          profile:      cachedProfile,
          agentConfig:  cachedConfig,
          phoneNumbers: cachedNumbers.phone_numbers
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setIsSlow(false);

      try {
        const [profileRes, configRes, numbersRes] = await withRetry(() => Promise.all([
          tenantApi.getProfile(signal),
          tenantApi.getAgentConfig(signal),
          tenantApi.getPhoneNumbers(signal)
        ]), signal, () => setIsSlow(true));

        apiCache.set(CACHE_KEYS.tenantProfile,  profileRes);
        apiCache.set(CACHE_KEYS.agentConfig,    configRes);
        apiCache.set(CACHE_KEYS.phoneNumbers,   numbersRes);

        setData({
          profile:      profileRes,
          agentConfig:  configRes,
          phoneNumbers: numbersRes.phone_numbers
        });
      } catch (err) {
        if (isAbortError(err)) return;
        setError(err instanceof ApiError ? err.message : "Dashboard request took too long. Please try again.");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    const slowTimer = window.setTimeout(() => {
      if (!signal.aborted) setIsSlow(true);
    }, 5000);

    void load();

    return () => {
      controller.abort();
      window.clearTimeout(slowTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTrigger]);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="page-hero">
          <div>
            <div className="skeleton-block" style={{ width: 200, height: 28, marginBottom: 8 }} />
            <div className="skeleton-block" style={{ width: 140, height: 18 }} />
          </div>
        </div>
        {isSlow && (
          <div className="form-status" style={{ marginBottom: 16 }}>
            Backend is starting up — retrying automatically. This usually takes a few seconds.
          </div>
        )}
        <div className="stats-grid">
          <div className="skeleton-block skeleton-stat" />
          <div className="skeleton-block skeleton-stat" />
          <div className="skeleton-block skeleton-stat" />
        </div>
        <div className="skeleton-block" style={{ height: 260, borderRadius: 14 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="page-hero"><h1>Dashboard</h1></div>
        <div className="form-status error" style={{ marginBottom: 12 }}>{error}</div>
        <button type="button" onClick={() => setLoadTrigger(t => t + 1)} className="dashboard-button">
          Retry
        </button>
      </div>
    );
  }

  const tenant = data.profile?.tenant;
  const config = data.agentConfig;
  const numbers = data.phoneNumbers;
  const activeNumbers = numbers.filter((n) => n.status === "active").length;

  const hasProfile =
    !!tenant?.name && !!tenant?.timezone && !!tenant?.industry &&
    (tenant?.default_email_recipients?.length ?? 0) > 0;
  const hasPhoneNumbers = numbers.length > 0;
  const hasAgentConfig =
    !!config?.greeting?.trim() ||
    !!config?.tone?.trim() ||
    !!config?.system_prompt?.trim();

  const completedSteps = [hasProfile, hasPhoneNumbers, hasAgentConfig].filter(Boolean).length;
  const progressPct = Math.round((completedSteps / 3) * 100);

  const isLive = hasProfile && hasPhoneNumbers && hasAgentConfig && tenant?.status === "active";

  return (
    <div className="dashboard-page">
      {/* Hero */}
      <div className="page-hero">
        <div>
          <h1>{tenant?.name || "My Workspace"}</h1>
          <p className="page-subtitle">
            Voice AI Platform
            {tenant?.industry ? ` · ${tenant.industry}` : ""}
            {tenant?.timezone ? ` · ${tenant.timezone}` : ""}
          </p>
        </div>
        <div className="page-hero-badges">
          <span className={`badge badge-${tenant?.status === "active" ? "success" : "warning"}`}>
            <span className="badge-dot" />
            {tenant?.status ?? "setup"}
          </span>
          {isLive && (
            <span className="badge badge-info">
              <span className="badge-dot" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <Link to="/dashboard/profile" className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-blue"><IconBuilding /></div>
            <span className="stat-card-link-icon"><IconExtLink /></span>
          </div>
          <div>
            <div className="stat-card-value">{tenant?.name || "—"}</div>
            <div className="stat-card-label">Company</div>
            {tenant?.industry && <div className="stat-card-meta">{tenant.industry}</div>}
          </div>
        </Link>

        <Link to="/dashboard/phone-numbers" className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-green"><IconPhone /></div>
            <span className="stat-card-link-icon"><IconExtLink /></span>
          </div>
          <div>
            <div className="stat-card-value">{numbers.length}</div>
            <div className="stat-card-label">Phone Number{numbers.length !== 1 ? "s" : ""}</div>
            <div className="stat-card-meta">
              {numbers.length > 0 ? `${activeNumbers} active` : "None assigned yet"}
            </div>
          </div>
        </Link>

        <Link to="/dashboard/agent-config" className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-purple"><IconBot /></div>
            <span className="stat-card-link-icon"><IconExtLink /></span>
          </div>
          <div>
            <div className="stat-card-value">
              {hasAgentConfig ? "Configured" : "Not set up"}
            </div>
            <div className="stat-card-label">AI Agent</div>
            {config && (
              <div className="stat-card-meta">
                {config.tone ? `Tone: ${config.tone}` : ""}
                {config.tone && config.retention_days ? " · " : ""}
                {config.retention_days ? `${config.retention_days}d retention` : ""}
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Setup checklist */}
      <div className="setup-section">
        <div className="setup-section-header">
          <div>
            <h2 className="setup-section-title">Setup Checklist</h2>
            <p className="setup-section-desc">Complete these steps to go live</p>
          </div>
          <div className="setup-progress-bar-wrap">
            <div className="setup-progress-bar-bg">
              <div
                className="setup-progress-bar-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="setup-progress-pct">{progressPct}%</span>
          </div>
        </div>

        <ol className="setup-steps">
          <li className={`setup-step${hasProfile ? " done" : ""}`}>
            <span className="setup-step-marker">
              {hasProfile ? <IconCheck /> : "1"}
            </span>
            <div className="setup-step-body">
              <span className="setup-step-title">Company profile</span>
              <span className="setup-step-desc">
                Name, timezone, industry and email recipients for call reports
              </span>
            </div>
            <Link to="/dashboard/profile" className="setup-step-action">
              {hasProfile ? "Edit" : "Complete"} <IconArrow />
            </Link>
          </li>

          <li className={`setup-step${hasPhoneNumbers ? " done" : ""}`}>
            <span className="setup-step-marker">
              {hasPhoneNumbers ? <IconCheck /> : "2"}
            </span>
            <div className="setup-step-body">
              <span className="setup-step-title">Twilio phone number</span>
              <span className="setup-step-desc">
                Assign a phone number — inbound calls route to your AI agent
              </span>
            </div>
            <Link to="/dashboard/phone-numbers" className="setup-step-action">
              {hasPhoneNumbers ? "Manage" : "View numbers"} <IconArrow />
            </Link>
          </li>

          <li className={`setup-step${hasAgentConfig ? " done" : ""}`}>
            <span className="setup-step-marker">
              {hasAgentConfig ? <IconCheck /> : "3"}
            </span>
            <div className="setup-step-body">
              <span className="setup-step-title">Agent configuration</span>
              <span className="setup-step-desc">
                Greeting, tone, business hours, recording and data retention settings
              </span>
            </div>
            <Link to="/dashboard/agent-config" className="setup-step-action">
              {hasAgentConfig ? "Edit" : "Configure"} <IconArrow />
            </Link>
          </li>
        </ol>
      </div>

      {/* About the platform */}
      {isLive && (
        <div className="info-banner">
          <span className="info-banner-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </span>
          <div className="info-banner-content">
            <p className="info-banner-title">Your AI agent is live</p>
            <p className="info-banner-desc">
              Inbound calls to your Twilio number are now handled by the AI agent.
              Call summaries, transcripts and recordings are emailed to your recipients after each call.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
