import { useEffect, useState } from "react";
import { superAdminApi } from "@/features/super-admin/api/superAdminApi";
import { ApiError, isAbortError } from "@/shared/api/httpClient";
import { withRetry } from "@/shared/utils/withRetry";
import type { CallRecord, EmailLog, RecordingRecord, SpamMonitoringResponse } from "@/features/super-admin/api/superAdminApi";

type Tab = "calls" | "emails" | "recordings" | "spam";

const CALL_STATUSES       = ["", "completed", "in-progress", "ringing", "failed", "busy", "no-answer"];
const EMAIL_STATUSES      = ["", "sent", "failed", "pending"];
const RECORDING_STATUSES  = ["", "available", "processing", "deleted", "failed"];
const SPAM_DAY_OPTIONS    = [7, 30, 90];
const MIN_SPAM_OPTIONS    = ["", "30", "50", "70", "90"];

const SPAM_FLAG_LABELS: Record<string, string> = {
  invalid_caller_id_format: "Invalid Caller ID",
  blocklisted_number: "Blocklisted Number",
  high_frequency_caller: "High Frequency Caller",
  multi_tenant_probe: "Multi-Tenant Probe",
  carrier_line_type_voip: "VoIP Line",
  carrier_line_type_prepaid: "Prepaid Line"
};

function StatusBadge({ status }: { status: string }) {
  const v = status === "completed" || status === "sent" ? "success"
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

function fmtPct(v?: number) {
  if (v === undefined || v === null || Number.isNaN(v)) return "0%";
  return `${(v * 100).toFixed(1)}%`;
}

export function MonitoringPage() {
  const [tab, setTab] = useState<Tab>("calls");

  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [callsError, setCallsError] = useState<string | null>(null);
  const [callsPage, setCallsPage] = useState(1);
  const [callsTotalPages, setCallsTotalPages] = useState(1);
  const [callsTotal, setCallsTotal] = useState(0);
  const [callFilters, setCallFilters] = useState({ tenant_id: "", status: "", from_date: "", to_date: "" });
  const [callDraft,   setCallDraft]   = useState({ tenant_id: "", status: "", from_date: "", to_date: "" });

  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsError, setEmailsError] = useState<string | null>(null);
  const [emailsPage, setEmailsPage] = useState(1);
  const [emailsTotalPages, setEmailsTotalPages] = useState(1);
  const [emailsTotal, setEmailsTotal] = useState(0);
  const [emailFilters, setEmailFilters] = useState({ tenant_id: "", status: "", from_date: "", to_date: "" });
  const [emailDraft,   setEmailDraft]   = useState({ tenant_id: "", status: "", from_date: "", to_date: "" });

  const [recordings, setRecordings] = useState<RecordingRecord[]>([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [recordingsError, setRecordingsError] = useState<string | null>(null);
  const [recordingsPage, setRecordingsPage] = useState(1);
  const [recordingsTotalPages, setRecordingsTotalPages] = useState(1);
  const [recordingsTotal, setRecordingsTotal] = useState(0);
  const [recordingFilters, setRecordingFilters] = useState({ tenant_id: "", status: "" });
  const [recordingDraft,   setRecordingDraft]   = useState({ tenant_id: "", status: "" });

  const [spamData, setSpamData] = useState<SpamMonitoringResponse | null>(null);
  const [spamLoading, setSpamLoading] = useState(false);
  const [spamError, setSpamError] = useState<string | null>(null);
  const [spamPage, setSpamPage] = useState(1);
  const [spamTotalPages, setSpamTotalPages] = useState(1);
  const [spamFilters, setSpamFilters] = useState({ days: "30", min_spam_score: "" });
  const [spamDraft,   setSpamDraft]   = useState({ days: "30", min_spam_score: "" });

  const loadCalls = async (p = 1, f = callFilters, signal?: AbortSignal) => {
    try {
      setCallsLoading(true);
      setCallsError(null);
      const res = await withRetry(() => superAdminApi.listCalls({ page: p, per_page: 20, ...f }, signal), signal);
      setCalls(res.calls ?? []);
      setCallsTotalPages(res.pagination?.pages ?? 1);
      setCallsTotal(res.pagination?.total ?? 0);
    } catch (err) {
      if (isAbortError(err)) return;
      setCallsError(err instanceof ApiError ? err.message : "Failed to load calls");
    } finally {
      if (!signal?.aborted) setCallsLoading(false);
    }
  };

  const loadEmails = async (p = 1, f = emailFilters, signal?: AbortSignal) => {
    try {
      setEmailsLoading(true);
      setEmailsError(null);
      const res = await withRetry(() => superAdminApi.listEmailLogs({ page: p, per_page: 20, ...f }, signal), signal);
      setEmails(res.email_logs ?? []);
      setEmailsTotalPages(res.pagination?.pages ?? 1);
      setEmailsTotal(res.pagination?.total ?? 0);
    } catch (err) {
      if (isAbortError(err)) return;
      setEmailsError(err instanceof ApiError ? err.message : "Failed to load email logs");
    } finally {
      if (!signal?.aborted) setEmailsLoading(false);
    }
  };

  const loadRecordings = async (p = 1, f = recordingFilters, signal?: AbortSignal) => {
    try {
      setRecordingsLoading(true);
      setRecordingsError(null);
      const res = await withRetry(() => superAdminApi.listRecordings({ page: p, per_page: 20, ...f }, signal), signal);
      setRecordings(res.recordings ?? []);
      setRecordingsTotalPages(res.pagination?.pages ?? 1);
      setRecordingsTotal(res.pagination?.total ?? 0);
    } catch (err) {
      if (isAbortError(err)) return;
      setRecordingsError(err instanceof ApiError ? err.message : "Failed to load recordings");
    } finally {
      if (!signal?.aborted) setRecordingsLoading(false);
    }
  };

  const loadSpam = async (p = 1, f = spamFilters, signal?: AbortSignal) => {
    try {
      setSpamLoading(true);
      setSpamError(null);
      const res = await withRetry(() => superAdminApi.getSpamMonitoring({
        page: p,
        per_page: 20,
        days: f.days ? Number(f.days) : undefined,
        min_spam_score: f.min_spam_score ? Number(f.min_spam_score) : undefined
      }, signal), signal);
      setSpamData(res);
      setSpamTotalPages(res.pagination?.pages ?? 1);
    } catch (err) {
      if (isAbortError(err)) return;
      setSpamError(err instanceof ApiError ? err.message : "Failed to load spam monitoring data");
    } finally {
      if (!signal?.aborted) setSpamLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadCalls(1, callFilters, controller.signal);
    void loadEmails(1, emailFilters, controller.signal);
    void loadRecordings(1, recordingFilters, controller.signal);
    void loadSpam(1, spamFilters, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyCallFilters      = () => { setCallFilters(callDraft);           setCallsPage(1);      void loadCalls(1, callDraft); };
  const applyEmailFilters     = () => { setEmailFilters(emailDraft);         setEmailsPage(1);     void loadEmails(1, emailDraft); };
  const applyRecordingFilters = () => { setRecordingFilters(recordingDraft); setRecordingsPage(1); void loadRecordings(1, recordingDraft); };
  const applySpamFilters      = () => { setSpamFilters(spamDraft);           setSpamPage(1);       void loadSpam(1, spamDraft); };
  const goSpamPage = (p: number) => { setSpamPage(p); void loadSpam(p, spamFilters); };

  return (
    <div className="dashboard-page">
      <div className="page-hero">
        <div>
          <h1>Monitoring</h1>
          <p className="page-subtitle">Platform-wide call logs, email delivery status, and recordings</p>
        </div>
        <div className="page-hero-badges">
          {tab === "calls" && !callsLoading && (
            <span className="badge badge-neutral">{callsTotal.toLocaleString()} calls</span>
          )}
          {tab === "emails" && !emailsLoading && (
            <span className="badge badge-neutral">{emailsTotal.toLocaleString()} emails</span>
          )}
          {tab === "recordings" && !recordingsLoading && (
            <span className="badge badge-neutral">{recordingsTotal.toLocaleString()} recordings</span>
          )}
          {tab === "spam" && !spamLoading && spamData && (
            <span className="badge badge-warning"><span className="badge-dot" />{spamData.summary.flagged_calls.toLocaleString()} flagged</span>
          )}
        </div>
      </div>

      <div className="sa-tabs">
        <button className={`sa-tab${tab === "calls" ? " active" : ""}`} onClick={() => setTab("calls")}>All Calls</button>
        <button className={`sa-tab${tab === "emails" ? " active" : ""}`} onClick={() => setTab("emails")}>Email Logs</button>
        <button className={`sa-tab${tab === "recordings" ? " active" : ""}`} onClick={() => setTab("recordings")}>Recordings</button>
        <button className={`sa-tab${tab === "spam" ? " active" : ""}`} onClick={() => setTab("spam")}>Spam</button>
      </div>

      {/* ─── Calls Tab ─── */}
      {tab === "calls" && (
        <>
          <div className="sa-filter-bar">
            <label className="field-label" style={{ flex: 2 }}>Tenant ID
              <input className="field-input" placeholder="Filter by tenant UUID…" value={callDraft.tenant_id}
                onChange={e => setCallDraft(d => ({ ...d, tenant_id: e.target.value }))} />
            </label>
            <label className="field-label">Status
              <select className="field-input" value={callDraft.status} onChange={e => setCallDraft(d => ({ ...d, status: e.target.value }))}>
                {CALL_STATUSES.map(s => <option key={s} value={s}>{s || "All statuses"}</option>)}
              </select>
            </label>
            <label className="field-label">From
              <input className="field-input" type="date" value={callDraft.from_date} onChange={e => setCallDraft(d => ({ ...d, from_date: e.target.value }))} />
            </label>
            <label className="field-label">To
              <input className="field-input" type="date" value={callDraft.to_date} onChange={e => setCallDraft(d => ({ ...d, to_date: e.target.value }))} />
            </label>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="dashboard-button" onClick={applyCallFilters}>Apply</button>
            </div>
          </div>

          {callsLoading && (
            <div className="dashboard-table-container">
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton-block" style={{ height: 52, margin: "8px 16px", borderRadius: 8 }} />)}
            </div>
          )}
          {callsError && !callsLoading && (
            <>
              <div className="form-status error" style={{ marginBottom: 16 }}>{callsError}</div>
              <button className="dashboard-button" onClick={() => void loadCalls()}>Retry</button>
            </>
          )}
          {!callsLoading && !callsError && (
            <>
              {calls.length === 0 ? (
                <div className="empty-state"><h3>No calls found</h3><p>Try adjusting the filters.</p></div>
              ) : (
                <div className="dashboard-table-container" style={{ overflowX: "auto" }}>
                  <table className="dashboard-table" style={{ minWidth: 800 }}>
                    <thead>
                      <tr>
                        <th>Tenant</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Direction</th>
                        <th>Status</th>
                        <th>Outcome</th>
                        <th>Duration</th>
                        <th>Start Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calls.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {c.tenants?.name
                              ?? (c.tenant_id
                                ? <span className="dashboard-code" style={{ fontSize: "0.75rem" }}>{c.tenant_id.slice(0, 8)}…</span>
                                : <span style={{ color: "var(--text-muted)" }}>—</span>)}
                          </td>
                          <td><span className="dashboard-code">{c.from_number}</span></td>
                          <td><span className="dashboard-code">{c.to_number}</span></td>
                          <td style={{ textTransform: "capitalize" }}>{c.direction}</td>
                          <td><StatusBadge status={c.status} /></td>
                          <td>{c.outcome?.replace(/_/g, " ") ?? <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                          <td>{fmtDuration(c.duration_seconds)}</td>
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
              {callsTotalPages > 1 && (
                <div className="sa-pagination">
                  <button className="sa-pagination-btn" disabled={callsPage <= 1} onClick={() => { setCallsPage(p => p - 1); void loadCalls(callsPage - 1); }}>← Prev</button>
                  <span className="sa-pagination-info">Page {callsPage} of {callsTotalPages}</span>
                  <button className="sa-pagination-btn" disabled={callsPage >= callsTotalPages} onClick={() => { setCallsPage(p => p + 1); void loadCalls(callsPage + 1); }}>Next →</button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ─── Email Logs Tab ─── */}
      {tab === "emails" && (
        <>
          <div className="sa-filter-bar">
            <label className="field-label" style={{ flex: 2 }}>Tenant ID
              <input className="field-input" placeholder="Filter by tenant UUID…" value={emailDraft.tenant_id}
                onChange={e => setEmailDraft(d => ({ ...d, tenant_id: e.target.value }))} />
            </label>
            <label className="field-label">Status
              <select className="field-input" value={emailDraft.status} onChange={e => setEmailDraft(d => ({ ...d, status: e.target.value }))}>
                {EMAIL_STATUSES.map(s => <option key={s} value={s}>{s || "All statuses"}</option>)}
              </select>
            </label>
            <label className="field-label">From
              <input className="field-input" type="date" value={emailDraft.from_date} onChange={e => setEmailDraft(d => ({ ...d, from_date: e.target.value }))} />
            </label>
            <label className="field-label">To
              <input className="field-input" type="date" value={emailDraft.to_date} onChange={e => setEmailDraft(d => ({ ...d, to_date: e.target.value }))} />
            </label>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="dashboard-button" onClick={applyEmailFilters}>Apply</button>
            </div>
          </div>

          {emailsLoading && (
            <div className="dashboard-table-container">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton-block" style={{ height: 52, margin: "8px 16px", borderRadius: 8 }} />)}
            </div>
          )}
          {emailsError && !emailsLoading && (
            <>
              <div className="form-status error" style={{ marginBottom: 16 }}>{emailsError}</div>
              <button className="dashboard-button" onClick={() => void loadEmails()}>Retry</button>
            </>
          )}
          {!emailsLoading && !emailsError && (
            <>
              {emails.length === 0 ? (
                <div className="empty-state"><h3>No email logs found</h3><p>Try adjusting the filters.</p></div>
              ) : (
                <div className="dashboard-table-container" style={{ overflowX: "auto" }}>
                  <table className="dashboard-table" style={{ minWidth: 700 }}>
                    <thead>
                      <tr>
                        <th>Tenant</th>
                        <th>Type</th>
                        <th>Subject</th>
                        <th>Recipients</th>
                        <th>Status</th>
                        <th>Error</th>
                        <th>Sent At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emails.map(e => (
                        <tr key={e.id}>
                          <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {e.tenants?.name ?? <span style={{ color: "var(--text-muted)" }}>—</span>}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>{e.email_type.replace(/_/g, " ")}</td>
                          <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject}</td>
                          <td style={{ fontSize: "0.82rem" }}>{e.recipients.join(", ")}</td>
                          <td><StatusBadge status={e.status} /></td>
                          <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#b91c1c", fontSize: "0.82rem" }}>
                            {e.error_message ?? <span style={{ color: "var(--text-muted)" }}>—</span>}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>{e.sent_at ? new Date(e.sent_at).toLocaleString() : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {emailsTotalPages > 1 && (
                <div className="sa-pagination">
                  <button className="sa-pagination-btn" disabled={emailsPage <= 1} onClick={() => { setEmailsPage(p => p - 1); void loadEmails(emailsPage - 1); }}>← Prev</button>
                  <span className="sa-pagination-info">Page {emailsPage} of {emailsTotalPages}</span>
                  <button className="sa-pagination-btn" disabled={emailsPage >= emailsTotalPages} onClick={() => { setEmailsPage(p => p + 1); void loadEmails(emailsPage + 1); }}>Next →</button>
                </div>
              )}
            </>
          )}
        </>
      )}
      {/* ─── Recordings Tab ─── */}
      {tab === "recordings" && (
        <>
          <div className="sa-filter-bar">
            <label className="field-label" style={{ flex: 2 }}>Tenant ID
              <input className="field-input" placeholder="Filter by tenant UUID…" value={recordingDraft.tenant_id}
                onChange={e => setRecordingDraft(d => ({ ...d, tenant_id: e.target.value }))} />
            </label>
            <label className="field-label">Status
              <select className="field-input" value={recordingDraft.status} onChange={e => setRecordingDraft(d => ({ ...d, status: e.target.value }))}>
                {RECORDING_STATUSES.map(s => <option key={s} value={s}>{s || "All statuses"}</option>)}
              </select>
            </label>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="dashboard-button" onClick={applyRecordingFilters}>Apply</button>
            </div>
          </div>

          {recordingsLoading && (
            <div className="dashboard-table-container">
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton-block" style={{ height: 52, margin: "8px 16px", borderRadius: 8 }} />)}
            </div>
          )}
          {recordingsError && !recordingsLoading && (
            <>
              <div className="form-status error" style={{ marginBottom: 16 }}>{recordingsError}</div>
              <button className="dashboard-button" onClick={() => void loadRecordings()}>Retry</button>
            </>
          )}
          {!recordingsLoading && !recordingsError && (
            <>
              {recordings.length === 0 ? (
                <div className="empty-state"><h3>No recordings found</h3><p>Try adjusting the filters.</p></div>
              ) : (
                <div className="dashboard-table-container" style={{ overflowX: "auto" }}>
                  <table className="dashboard-table" style={{ minWidth: 780 }}>
                    <thead>
                      <tr>
                        <th>Tenant</th>
                        <th>Recording SID</th>
                        <th>Call ID</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>URL</th>
                        <th>Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recordings.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {r.tenants?.name
                              ?? (r.tenant_id
                                ? <span className="dashboard-code" style={{ fontSize: "0.75rem" }}>{r.tenant_id.slice(0, 8)}…</span>
                                : <span style={{ color: "var(--text-muted)" }}>—</span>)}
                          </td>
                          <td><span className="dashboard-code" style={{ fontSize: "0.75rem" }}>{r.recording_sid}</span></td>
                          <td>
                            {r.call_id
                              ? <span className="dashboard-code" style={{ fontSize: "0.75rem" }}>{r.call_id.slice(0, 8)}…</span>
                              : <span style={{ color: "var(--text-muted)" }}>—</span>}
                          </td>
                          <td><StatusBadge status={r.status} /></td>
                          <td>{fmtDuration(r.duration_seconds)}</td>
                          <td>
                            {r.recording_url
                              ? <a href={r.recording_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontSize: "0.82rem" }}>Listen</a>
                              : <span style={{ color: "var(--text-muted)" }}>—</span>}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>{new Date(r.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {recordingsTotalPages > 1 && (
                <div className="sa-pagination">
                  <button className="sa-pagination-btn" disabled={recordingsPage <= 1} onClick={() => { setRecordingsPage(p => p - 1); void loadRecordings(recordingsPage - 1); }}>← Prev</button>
                  <span className="sa-pagination-info">Page {recordingsPage} of {recordingsTotalPages}</span>
                  <button className="sa-pagination-btn" disabled={recordingsPage >= recordingsTotalPages} onClick={() => { setRecordingsPage(p => p + 1); void loadRecordings(recordingsPage + 1); }}>Next →</button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ─── Spam Tab ─── */}
      {tab === "spam" && (
        <>
          <div className="sa-filter-bar">
            <label className="field-label">Window
              <select className="field-input" value={spamDraft.days} onChange={e => setSpamDraft(d => ({ ...d, days: e.target.value }))}>
                {SPAM_DAY_OPTIONS.map(d => <option key={d} value={d}>Last {d} days</option>)}
              </select>
            </label>
            <label className="field-label">Min Spam Score
              <select className="field-input" value={spamDraft.min_spam_score} onChange={e => setSpamDraft(d => ({ ...d, min_spam_score: e.target.value }))}>
                {MIN_SPAM_OPTIONS.map(s => <option key={s} value={s}>{s || "Any score"}</option>)}
              </select>
            </label>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="dashboard-button" onClick={applySpamFilters}>Apply</button>
            </div>
          </div>

          {spamLoading && (
            <div className="dashboard-table-container">
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton-block" style={{ height: 52, margin: "8px 16px", borderRadius: 8 }} />)}
            </div>
          )}
          {spamError && !spamLoading && (
            <>
              <div className="form-status error" style={{ marginBottom: 16 }}>{spamError}</div>
              <button className="dashboard-button" onClick={() => void loadSpam()}>Retry</button>
            </>
          )}
          {!spamLoading && !spamError && spamData && (
            <>
              <div className="stats-grid-4">
                <div className="stat-card" style={{ cursor: "default" }}>
                  <div className="stat-card-value">{spamData.summary.total_calls.toLocaleString()}</div>
                  <div className="stat-card-label">Total Calls</div>
                  <div className="stat-card-meta">Last {spamData.window_days} days</div>
                </div>
                <div className="stat-card" style={{ cursor: "default" }}>
                  <div className="stat-card-value">{spamData.summary.flagged_calls.toLocaleString()}</div>
                  <div className="stat-card-label">Flagged Calls</div>
                  <div className="stat-card-meta">{fmtPct(spamData.summary.flagged_rate)} of total</div>
                </div>
                <div className="stat-card" style={{ cursor: "default" }}>
                  <div className="stat-card-value">{spamData.spam_threshold}</div>
                  <div className="stat-card-label">Spam Threshold</div>
                  <div className="stat-card-meta">Score at or above is flagged</div>
                </div>
                <div className="stat-card" style={{ cursor: "default" }}>
                  <div className="stat-card-value">{spamData.top_offenders.length}</div>
                  <div className="stat-card-label">Top Offenders</div>
                  <div className="stat-card-meta">Repeat flagged callers</div>
                </div>
              </div>

              {/* Top Offenders */}
              <div className="detail-card" style={{ marginBottom: 20 }}>
                <div className="detail-card-header">
                  <h2 className="detail-card-title">Top Offenders</h2>
                </div>
                <div className="detail-card-body">
                  {spamData.top_offenders.length === 0 ? (
                    <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" }}>No repeat offenders in this period.</p>
                  ) : (
                    <div className="dashboard-table-container" style={{ overflowX: "auto" }}>
                      <table className="dashboard-table">
                        <thead>
                          <tr>
                            <th>From Number</th>
                            <th>Flagged Calls</th>
                            <th>Max Spam Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {spamData.top_offenders.map(o => (
                            <tr key={o.from_number}>
                              <td><span className="dashboard-code">{o.from_number}</span></td>
                              <td>{o.flagged_calls.toLocaleString()}</td>
                              <td><SpamScoreBadge score={o.max_spam_score} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Flagged Calls */}
              {spamData.flagged_calls.length === 0 ? (
                <div className="empty-state"><h3>No flagged calls</h3><p>Try lowering the minimum spam score or widening the date range.</p></div>
              ) : (
                <div className="dashboard-table-container" style={{ overflowX: "auto" }}>
                  <table className="dashboard-table" style={{ minWidth: 800 }}>
                    <thead>
                      <tr>
                        <th>Tenant</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Status</th>
                        <th>Spam Score</th>
                        <th>Spam Flags</th>
                        <th>Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spamData.flagged_calls.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {c.tenant_id
                              ? <span className="dashboard-code" style={{ fontSize: "0.75rem" }}>{c.tenant_id.slice(0, 8)}…</span>
                              : <span style={{ color: "var(--text-muted)" }}>—</span>}
                          </td>
                          <td><span className="dashboard-code">{c.from_number}</span></td>
                          <td><span className="dashboard-code">{c.to_number}</span></td>
                          <td><StatusBadge status={c.status} /></td>
                          <td><SpamScoreBadge score={c.spam_score} /></td>
                          <td><SpamFlags flags={c.spam_flags} /></td>
                          <td style={{ whiteSpace: "nowrap" }}>{new Date(c.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {spamTotalPages > 1 && (
                <div className="sa-pagination">
                  <button className="sa-pagination-btn" disabled={spamPage <= 1} onClick={() => goSpamPage(spamPage - 1)}>← Prev</button>
                  <span className="sa-pagination-info">Page {spamPage} of {spamTotalPages}</span>
                  <button className="sa-pagination-btn" disabled={spamPage >= spamTotalPages} onClick={() => goSpamPage(spamPage + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
