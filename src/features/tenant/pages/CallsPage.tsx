import { useEffect, useState } from "react";
import { tenantApi } from "@/features/tenant/api/tenantApi";
import { ApiError, isAbortError } from "@/shared/api/httpClient";
import { withRetry } from "@/shared/utils/withRetry";
import type { CallRecord } from "@/features/tenant/api/tenantApi";

const CALL_STATUSES = ["", "completed", "in-progress", "ringing", "failed", "busy", "no-answer"];
const MIN_SPAM_OPTIONS = ["", "30", "50", "70", "90"];

const SPAM_FLAG_LABELS: Record<string, string> = {
  invalid_caller_id_format: "Invalid Caller ID",
  blocklisted_number: "Blocklisted Number",
  high_frequency_caller: "High Frequency Caller",
  multi_tenant_probe: "Multi-Tenant Probe",
  carrier_line_type_voip: "VoIP Line",
  carrier_line_type_prepaid: "Prepaid Line"
};

function StatusBadge({ status }: { status: string }) {
  const v = status === "completed" ? "success"
          : status === "failed" ? "error"
          : status === "in-progress" ? "info"
          : "neutral";
  return <span className={`badge badge-${v}`}><span className="badge-dot" />{status}</span>;
}

function SpamScoreBadge({ score }: { score?: number }) {
  if (score === undefined || score === null) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  const v = score >= 60 ? "error" : score >= 30 ? "warning" : "success";
  return <span className={`badge badge-${v}`}><span className="badge-dot" />{score}</span>;
}

function SpamFlags({ flags }: { flags?: string[] }) {
  if (!flags || flags.length === 0) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {flags.map(f => (
        <span key={f} className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
          {SPAM_FLAG_LABELS[f] ?? f.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}

function fmtDuration(s?: number) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export function CallsPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: "", min_spam_score: "" });
  const [draft, setDraft] = useState({ status: "", min_spam_score: "" });

  const load = async (p = page, f = filters, signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await withRetry(() => tenantApi.getCalls({
        page: p,
        per_page: 20,
        status: f.status || undefined,
        min_spam_score: f.min_spam_score ? Number(f.min_spam_score) : undefined
      }, signal), signal);
      setCalls(res.calls ?? []);
      setTotalPages(res.pagination?.pages ?? 1);
      setTotal(res.pagination?.total ?? 0);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof ApiError ? err.message : "Failed to load calls");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(1, filters, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => { setFilters(draft); setPage(1); void load(1, draft); };
  const goPage = (p: number) => { setPage(p); void load(p, filters); };

  return (
    <div className="dashboard-page">
      <div className="page-hero">
        <div>
          <h1>Call History</h1>
          <p className="page-subtitle">
            {loading ? "Loading…" : `${total.toLocaleString()} call${total !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      <div className="sa-filter-bar">
        <label className="field-label">Status
          <select className="field-input" value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}>
            {CALL_STATUSES.map(s => <option key={s} value={s}>{s || "All statuses"}</option>)}
          </select>
        </label>
        <label className="field-label">Min Spam Score
          <select className="field-input" value={draft.min_spam_score} onChange={e => setDraft(d => ({ ...d, min_spam_score: e.target.value }))}>
            {MIN_SPAM_OPTIONS.map(s => <option key={s} value={s}>{s || "Any score"}</option>)}
          </select>
        </label>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button className="dashboard-button" onClick={applyFilters}>Apply</button>
        </div>
      </div>

      {loading && (
        <div className="dashboard-table-container">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton-block" style={{ height: 52, margin: "8px 16px", borderRadius: 8 }} />)}
        </div>
      )}

      {error && !loading && (
        <>
          <div className="form-status error" style={{ marginBottom: 16 }}>{error}</div>
          <button className="dashboard-button" onClick={() => void load()}>Retry</button>
        </>
      )}

      {!loading && !error && (
        <>
          {calls.length === 0 ? (
            <div className="empty-state"><h3>No calls found</h3><p>Try adjusting the filters.</p></div>
          ) : (
            <div className="dashboard-table-container" style={{ overflowX: "auto" }}>
              <table className="dashboard-table" style={{ minWidth: 920 }}>
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Direction</th>
                    <th>Status</th>
                    <th>Outcome</th>
                    <th>Duration</th>
                    <th>Interruptions</th>
                    <th>Spam Score</th>
                    <th>Spam Flags</th>
                    <th>Start Time</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map(c => (
                    <tr key={c.id}>
                      <td><span className="dashboard-code">{c.from_number}</span></td>
                      <td><span className="dashboard-code">{c.to_number}</span></td>
                      <td style={{ textTransform: "capitalize" }}>{c.direction}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td>{c.outcome?.replace(/_/g, " ") ?? <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                      <td>{fmtDuration(c.duration_seconds)}</td>
                      <td>{c.interrupted_count ?? 0}</td>
                      <td><SpamScoreBadge score={c.spam_score} /></td>
                      <td><SpamFlags flags={c.spam_flags} /></td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {(c.start_time ?? c.created_at)
                          ? new Date(c.start_time ?? c.created_at).toLocaleString()
                          : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="sa-pagination">
              <button className="sa-pagination-btn" disabled={page <= 1} onClick={() => goPage(page - 1)}>← Prev</button>
              <span className="sa-pagination-info">Page {page} of {totalPages}</span>
              <button className="sa-pagination-btn" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
