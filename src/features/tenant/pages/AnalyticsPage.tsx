import { useEffect, useState } from "react";
import { tenantApi } from "@/features/tenant/api/tenantApi";
import { ApiError, isAbortError } from "@/shared/api/httpClient";
import { withRetry } from "@/shared/utils/withRetry";
import type { TenantAnalyticsResponse } from "@/features/tenant/api/tenantApi";

const DAY_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" }
];

function fmtDuration(s?: number) {
  if (!s) return "0s";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function fmtPct(v?: number) {
  if (v === undefined || v === null || Number.isNaN(v)) return "0%";
  return `${(v * 100).toFixed(1)}%`;
}

export function AnalyticsPage() {
  const [data, setData] = useState<TenantAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = async (d = days, signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await withRetry(() => tenantApi.getAnalytics({ days: d }, signal), signal);
      setData(res);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof ApiError ? err.message : "Failed to load analytics");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(days, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="page-hero">
          <div>
            <div className="skeleton-block" style={{ width: 200, height: 28, marginBottom: 8 }} />
            <div className="skeleton-block" style={{ width: 140, height: 18 }} />
          </div>
        </div>
        <div className="stats-grid-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton-block skeleton-stat" />)}
        </div>
        <div className="skeleton-block" style={{ height: 240, borderRadius: 14 }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dashboard-page">
        <div className="page-hero"><h1>Analytics</h1></div>
        <div className="form-status error" style={{ marginBottom: 16 }}>{error ?? "Failed to load analytics"}</div>
        <button className="dashboard-button" onClick={() => void load()}>Retry</button>
      </div>
    );
  }

  const maxCount = Math.max(1, ...data.call_volume_by_day.map(d => d.count));

  return (
    <div className="dashboard-page">
      <div className="page-hero">
        <div>
          <h1>Analytics</h1>
          <p className="page-subtitle">Call volume, interruptions and spam activity over time</p>
        </div>
        <div className="page-hero-badges">
          <select className="field-input" value={days} onChange={e => setDays(Number(e.target.value))} style={{ minWidth: 160 }}>
            {DAY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid-4">
        <div className="stat-card" style={{ cursor: "default" }}>
          <div className="stat-card-value">{data.calls.total.toLocaleString()}</div>
          <div className="stat-card-label">Total Calls</div>
          <div className="stat-card-meta">Last {data.window_days} days</div>
        </div>
        <div className="stat-card" style={{ cursor: "default" }}>
          <div className="stat-card-value">{data.calls.completed.toLocaleString()}</div>
          <div className="stat-card-label">Completed</div>
          <div className="stat-card-meta">{data.calls.failed.toLocaleString()} failed</div>
        </div>
        <div className="stat-card" style={{ cursor: "default" }}>
          <div className="stat-card-value">{fmtDuration(data.avg_duration_seconds)}</div>
          <div className="stat-card-label">Avg. Duration</div>
          <div className="stat-card-meta">Per completed call</div>
        </div>
        <div className="stat-card" style={{ cursor: "default" }}>
          <div className="stat-card-value">{data.interruptions.total.toLocaleString()}</div>
          <div className="stat-card-label">Interruptions</div>
          <div className="stat-card-meta">{fmtPct(data.interruptions.rate_per_call)} per call</div>
        </div>
      </div>

      {/* Call Volume Chart */}
      <div className="detail-card">
        <div className="detail-card-header">
          <h2 className="detail-card-title">Call Volume by Day</h2>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{data.call_volume_by_day.length} days</span>
        </div>
        <div className="detail-card-body">
          {data.call_volume_by_day.length === 0 ? (
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" }}>No call data for this period.</p>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 180, overflowX: "auto", paddingBottom: 4 }}>
              {data.call_volume_by_day.map(d => {
                const heightPct = Math.max(2, Math.round((d.count / maxCount) * 100));
                return (
                  <div
                    key={d.date}
                    title={`${new Date(d.date).toLocaleDateString()}: ${d.count} call${d.count !== 1 ? "s" : ""}`}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", flex: "1 0 auto", minWidth: 14, height: "100%" }}
                  >
                    <div style={{
                      width: "100%",
                      maxWidth: 22,
                      height: `${heightPct}%`,
                      background: "var(--brand-blue)",
                      borderRadius: "4px 4px 0 0",
                      minHeight: 3
                    }} />
                  </div>
                );
              })}
            </div>
          )}
          {data.call_volume_by_day.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: "0.72rem", color: "var(--text-muted)" }}>
              <span>{new Date(data.call_volume_by_day[0].date).toLocaleDateString()}</span>
              <span>{new Date(data.call_volume_by_day[data.call_volume_by_day.length - 1].date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Interruptions + Spam side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="detail-card">
          <div className="detail-card-header">
            <h2 className="detail-card-title">Interruption Handling</h2>
          </div>
          <div className="detail-card-body">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Total Interruptions</span>
                <span className="detail-value">{data.interruptions.total.toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Rate per Call</span>
                <span className="detail-value">{fmtPct(data.interruptions.rate_per_call)}</span>
              </div>
            </div>
            <p style={{ margin: "16px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Interruptions occur when a caller speaks while the agent is talking. Lower rates generally indicate smoother conversations.
            </p>
          </div>
        </div>

        <div className="detail-card">
          <div className="detail-card-header">
            <h2 className="detail-card-title">Spam Activity</h2>
          </div>
          <div className="detail-card-body">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Flagged Calls</span>
                <span className="detail-value">{data.spam.flagged.toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Flagged Rate</span>
                <span className="detail-value">{fmtPct(data.spam.rate)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Spam Threshold</span>
                <span className="detail-value">{data.spam.threshold}</span>
              </div>
            </div>
            <p style={{ margin: "16px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Calls scoring at or above the threshold are flagged as likely spam. View details on the Call History page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
