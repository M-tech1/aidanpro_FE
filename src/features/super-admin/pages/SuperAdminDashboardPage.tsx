import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { superAdminApi } from "@/features/super-admin/api/superAdminApi";
import { ApiError, isAbortError } from "@/shared/api/httpClient";
import { withRetry } from "@/shared/utils/withRetry";
import type { AnalyticsResponse, HealthResponse } from "@/features/super-admin/api/superAdminApi";

type PageData = { analytics: AnalyticsResponse | null; health: HealthResponse | null };

const IconBuilding = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconActivity = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const IconExtLink = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, opacity: 0.5 }}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

export function SuperAdminDashboardPage() {
  const [data, setData] = useState<PageData>({ analytics: null, health: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSlow, setIsSlow] = useState(false);

  const load = async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    setIsSlow(false);

    try {
      const [analytics, health] = await withRetry(() => Promise.all([
        superAdminApi.getAnalytics(signal),
        superAdminApi.getHealth(signal)
      ]), signal, () => setIsSlow(true));
      setData({ analytics, health });
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof ApiError ? err.message : "Failed to load dashboard");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="page-hero">
          <div>
            <div className="skeleton-block" style={{ width: 240, height: 30, marginBottom: 8 }} />
            <div className="skeleton-block" style={{ width: 180, height: 18 }} />
          </div>
        </div>
        {isSlow && (
          <div className="form-status" style={{ marginBottom: 16 }}>
            Backend is starting up — retrying automatically. This usually takes a few seconds.
          </div>
        )}
        <div className="stats-grid-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton-block skeleton-stat" />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="skeleton-block" style={{ height: 220, borderRadius: 14 }} />
          <div className="skeleton-block" style={{ height: 220, borderRadius: 14 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="page-hero"><h1>Super Admin Dashboard</h1></div>
        <div className="form-status error" style={{ marginBottom: 16 }}>{error}</div>
        <button className="dashboard-button" onClick={() => { const ctrl = new AbortController(); void load(ctrl.signal); }}>Retry</button>
      </div>
    );
  }

  const a = data.analytics;
  const h = data.health;

  return (
    <div className="dashboard-page">
      {/* Hero */}
      <div className="page-hero">
        <div>
          <h1>Platform Overview</h1>
          <p className="page-subtitle">
            Super Admin · {a?.generated_at ? new Date(a.generated_at).toLocaleString() : ""}
          </p>
        </div>
        <div className="page-hero-badges">
          <span className={`badge badge-${h?.overall === "ok" ? "success" : "warning"}`}>
            <span className="badge-dot" />
            {h?.overall === "ok" ? "All Systems OK" : "Degraded"}
          </span>
        </div>
      </div>

      {/* 4-up stat cards */}
      <div className="stats-grid-4">
        <Link to="/super-admin/tenants" className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-blue"><IconBuilding /></div>
            <IconExtLink />
          </div>
          <div>
            <div className="stat-card-value">{a?.tenants.total ?? "—"}</div>
            <div className="stat-card-label">Tenants</div>
            <div className="stat-card-meta">
              {a?.tenants.by_status.active ?? 0} active · {a?.tenants.by_status.suspended ?? 0} suspended
            </div>
          </div>
        </Link>

        <div className="stat-card" style={{ cursor: "default" }}>
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-green"><IconUsers /></div>
          </div>
          <div>
            <div className="stat-card-value">{a?.users.total ?? "—"}</div>
            <div className="stat-card-label">Total Users</div>
            <div className="stat-card-meta">Across all tenants</div>
          </div>
        </div>

        <Link to="/super-admin/twilio" className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-purple"><IconPhone /></div>
            <IconExtLink />
          </div>
          <div>
            <div className="stat-card-value">{a?.phone_numbers.total ?? "—"}</div>
            <div className="stat-card-label">Phone Numbers</div>
            <div className="stat-card-meta">{a?.phone_numbers.active ?? 0} active</div>
          </div>
        </Link>

        <Link to="/super-admin/monitoring" className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-amber"><IconActivity /></div>
            <IconExtLink />
          </div>
          <div>
            <div className="stat-card-value">{a?.calls.total_calls.toLocaleString() ?? "—"}</div>
            <div className="stat-card-label">Total Calls</div>
            <div className="stat-card-meta">{a?.calls.calls_last_7_days ?? 0} last 7 days</div>
          </div>
        </Link>
      </div>

      {/* Health + Top Tenants side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* System Health */}
        <div className="detail-card">
          <div className="detail-card-header">
            <h2 className="detail-card-title">System Health</h2>
            <span className={`badge badge-${h?.overall === "ok" ? "success" : "warning"}`}>
              <span className="badge-dot" />{h?.overall}
            </span>
          </div>
          <div className="detail-card-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {h && Object.entries(h.components).map(([name, comp]) => {
                const dot = comp.status === "ok" ? "sa-health-dot-ok" : comp.status === "error" ? "sa-health-dot-error" : "sa-health-dot-warning";
                return (
                  <div key={name} className="sa-health-row">
                    <span className="sa-health-name">{name}</span>
                    <span className="sa-health-status">
                      <span className={`sa-health-dot ${dot}`} />
                      {comp.status}
                      {typeof comp.account_status === "string" ? ` · ${comp.account_status}` : ""}
                      {typeof comp.detail === "string" ? ` · ${comp.detail}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Tenants */}
        <div className="detail-card">
          <div className="detail-card-header">
            <h2 className="detail-card-title">Top Tenants by Calls</h2>
          </div>
          <div className="detail-card-body">
            {a?.top_tenants_by_calls.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {a.top_tenants_by_calls.map((t, i) => (
                  <div key={t.tenant_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--brand-blue)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      <Link to={`/super-admin/tenants/${t.tenant_id}`} style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)", textDecoration: "none" }}
                        onMouseOver={e => (e.currentTarget.style.textDecoration = "underline")}
                        onMouseOut={e => (e.currentTarget.style.textDecoration = "none")}
                      >
                        {t.tenant_name}
                      </Link>
                    </div>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>{t.call_count.toLocaleString()} calls</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>No call data yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Tenants by Status */}
      {a && Object.keys(a.tenants.by_status).length > 0 && (
        <div className="detail-card">
          <div className="detail-card-header">
            <h2 className="detail-card-title">Tenants by Status</h2>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{a.tenants.total} total</span>
          </div>
          <div className="detail-card-body">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {Object.entries(a.tenants.by_status).map(([status, count]) => {
                const color = status === "active" ? "#22c55e" : status === "suspended" ? "#f59e0b" : "#94a3b8";
                return (
                  <div key={status} style={{ flex: "1 1 120px", padding: "16px 20px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", minWidth: 100 }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{count}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "capitalize", marginTop: 4, fontWeight: 600 }}>{status}</div>
                    <div style={{ height: 3, background: color, borderRadius: 99, marginTop: 8, width: `${Math.min(100, (count / a.tenants.total) * 100)}%` }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
