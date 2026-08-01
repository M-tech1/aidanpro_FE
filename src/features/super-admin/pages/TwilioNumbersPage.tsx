import { useEffect, useState } from "react";
import { superAdminApi } from "@/features/super-admin/api/superAdminApi";
import { ApiError, isAbortError } from "@/shared/api/httpClient";
import { withRetry } from "@/shared/utils/withRetry";
import type { PhoneNumberRecord, UnassignedNumber } from "@/features/super-admin/api/superAdminApi";

type Tab = "all" | "unassigned";

function StatusBadge({ status }: { status: string }) {
  const v = status === "active" || status === "in-use" ? "success" : status === "inactive" ? "warning" : "neutral";
  return <span className={`badge badge-${v}`}><span className="badge-dot" />{status}</span>;
}

const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconBuilding = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

function AssignModal({ sid, phoneNumber, onClose, onDone }: { sid: string; phoneNumber: string; onClose: () => void; onDone: () => void }) {
  const [tenantId, setTenantId] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleAssign = async () => {
    const id = tenantId.trim();
    if (!id) return;
    try {
      setSaving(true);
      setMsg(null);
      const res = await superAdminApi.assignNumber(sid, id);
      setMsg({ text: res.message, ok: true });
    } catch (err) {
      setMsg({ text: err instanceof ApiError ? err.message : "Failed to assign", ok: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sa-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sa-modal sa-modal-md" style={{ animation: "fade-up 0.22s cubic-bezier(0.22,1,0.36,1) both" }}>

        {/* Header */}
        <div className="sa-modal-header" style={{ padding: "20px 24px", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
              border: "1px solid #bfdbfe",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--brand-blue)", flexShrink: 0
            }}>
              <IconPhone />
            </div>
            <div>
              <h2 className="sa-modal-title" style={{ fontSize: "1rem" }}>Assign Number to Tenant</h2>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>Update the Twilio webhook automatically</p>
            </div>
          </div>
          <button className="sa-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="sa-modal-body" style={{ gap: 18 }}>

          {/* Number being assigned */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px",
            background: "linear-gradient(135deg, #f8faff, #eff6ff)",
            border: "1px solid #bfdbfe",
            borderRadius: "var(--radius-md)"
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "var(--brand-blue)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0
            }}>
              <IconPhone />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)" }}>Assigning number</p>
              <p style={{ margin: 0, fontFamily: '"Monaco","Courier New",monospace', fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>
                {phoneNumber}
              </p>
            </div>
          </div>

          {msg?.ok ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              padding: "24px 16px", textAlign: "center"
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
                border: "2px solid #86efac",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#16a34a"
              }}>
                <IconCheck />
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>Number Assigned</p>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>{msg.text}</p>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                  <IconBuilding /> Tenant ID
                </label>
                <input
                  className="field-input"
                  placeholder="Paste tenant UUID…"
                  value={tenantId}
                  onChange={e => setTenantId(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && tenantId.trim() && !saving) void handleAssign(); }}
                  autoFocus
                  style={{ fontFamily: '"Monaco","Courier New",monospace', fontSize: "0.875rem" }}
                />
                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Find the tenant UUID on the Tenants page. The webhook URL will be reconfigured on Twilio automatically.
                </p>
              </div>
              {msg && <div className="form-status error" style={{ margin: 0 }}>{msg.text}</div>}
            </>
          )}
        </div>

        <div className="sa-modal-footer">
          {msg?.ok ? (
            <button className="dashboard-button" style={{ minWidth: 100 }} onClick={onDone}>Done</button>
          ) : (
            <>
              <button className="dashboard-button-secondary" onClick={onClose}>Cancel</button>
              <button
                className="dashboard-button"
                style={{ minWidth: 140 }}
                disabled={saving || !tenantId.trim()}
                onClick={() => void handleAssign()}
              >
                {saving ? "Assigning…" : "Assign Number"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReleaseModal({ sid, phoneNumber, onClose, onDone }: { sid: string; phoneNumber: string; onClose: () => void; onDone: () => void }) {
  const [impact, setImpact] = useState<{ tenant_name?: string } | null>(null);
  const [step, setStep] = useState<"loading" | "confirm" | "error">("loading");
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    superAdminApi.releaseNumber(sid)
      .then(res => { setImpact(res.number); setStep("confirm"); })
      .catch(err => { setError(err instanceof ApiError ? err.message : "Failed"); setStep("error"); });
  }, [sid]);

  const confirm = async () => {
    try {
      setReleasing(true);
      await superAdminApi.releaseNumber(sid, true);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to release");
      setReleasing(false);
    }
  };

  return (
    <div className="sa-modal-overlay">
      <div className="sa-modal sa-modal-sm">
        <div className="sa-modal-header">
          <h2 className="sa-modal-title" style={{ color: "#b91c1c" }}>Release Number</h2>
          <button className="sa-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="sa-modal-body">
          {step === "loading" && <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>Checking impact…</p>}
          {step === "error" && <div className="form-status error">{error}</div>}
          {step === "confirm" && (
            <>
              <div className="sa-danger-zone">
                <p className="sa-danger-desc">
                  You are about to release <strong>{phoneNumber}</strong> back to Twilio.{" "}
                  {impact?.tenant_name ? <>It is currently assigned to <strong>{impact.tenant_name}</strong>. </> : ""}
                  <strong>This is irreversible.</strong>
                </p>
              </div>
              {error && <div className="form-status error">{error}</div>}
            </>
          )}
        </div>
        <div className="sa-modal-footer">
          <button className="dashboard-button-secondary" onClick={onClose}>Cancel</button>
          {step === "confirm" && (
            <button className="dashboard-button-danger" disabled={releasing} onClick={() => void confirm()}>
              {releasing ? "Releasing…" : "Confirm Release"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function TwilioNumbersPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [numbers, setNumbers] = useState<PhoneNumberRecord[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [assignTarget, setAssignTarget] = useState<{ sid: string; phone: string } | null>(null);
  const [releaseSid, setReleaseSid] = useState<{ sid: string; phone: string } | null>(null);

  const loadAll = async (p = 1, signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await withRetry(() => superAdminApi.listNumbers({ page: p, per_page: 20, enrich: true }, signal), signal);
      setNumbers(res.numbers);
      setTotalPages(res.pagination.pages);
      setTotal(res.pagination.total);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof ApiError ? err.message : "Failed to load numbers");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const loadUnassigned = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await withRetry(() => superAdminApi.listUnassignedNumbers(signal), signal);
      setUnassigned(res.unassigned_numbers);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof ApiError ? err.message : "Failed to load unassigned numbers");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    tab === "all" ? void loadAll(1, controller.signal) : void loadUnassigned(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const refresh = () => {
    setAssignTarget(null);
    setReleaseSid(null);
    tab === "all" ? void loadAll(page) : void loadUnassigned();
  };

  return (
    <div className="dashboard-page">
      <div className="page-hero">
        <div>
          <h1>Twilio Numbers</h1>
          <p className="page-subtitle">
            {tab === "all" && !loading ? `${total} number${total !== 1 ? "s" : ""} across all tenants` : "Unassigned phone numbers"}
          </p>
        </div>
      </div>

      <div className="sa-tabs">
        {(["all", "unassigned"] as Tab[]).map(t => (
          <button key={t} className={`sa-tab${tab === t ? " active" : ""}`} onClick={() => { setTab(t); setError(null); }}>
            {t === "all" ? "All Numbers" : "Unassigned"}
          </button>
        ))}
      </div>

      {loading && (
        <div className="dashboard-table-container">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-block" style={{ height: 52, margin: "8px 16px", borderRadius: 8 }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <>
          <div className="form-status error" style={{ marginBottom: 16 }}>{error}</div>
          <button className="dashboard-button" onClick={refresh}>Retry</button>
        </>
      )}

      {!loading && !error && tab === "all" && (
        <>
          {numbers.length === 0 ? (
            <div className="empty-state"><h3>No numbers found</h3><p>No phone numbers have been purchased yet.</p></div>
          ) : (
            <div className="dashboard-table-container" style={{ overflowX: "auto" }}>
              <table className="dashboard-table" style={{ minWidth: 720 }}>
                <thead>
                  <tr>
                    <th>Phone Number</th>
                    <th>Status</th>
                    <th>Tenant</th>
                    <th>Country</th>
                    <th>Twilio</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {numbers.map(n => (
                    <tr key={n.id}>
                      <td><span className="dashboard-code" style={{ fontSize: "0.875rem", fontWeight: 700 }}>{n.phone_number}</span></td>
                      <td><StatusBadge status={n.status} /></td>
                      <td>
                        {n.tenants
                          ? <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{n.tenants.name}</span>
                          : <span style={{ color: "var(--text-muted)" }}>Unassigned</span>}
                      </td>
                      <td>{n.country_code}</td>
                      <td>{n.twilio ? <StatusBadge status={n.twilio.status} /> : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{new Date(n.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="button-group">
                          <button className="setup-step-action" style={{ fontSize: "0.82rem" }} onClick={() => setAssignTarget({ sid: n.twilio_number_sid, phone: n.phone_number })}>Assign</button>
                          <button className="setup-step-action" style={{ fontSize: "0.82rem", color: "#b91c1c", borderColor: "#fecaca" }} onClick={() => setReleaseSid({ sid: n.twilio_number_sid, phone: n.phone_number })}>Release</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="sa-pagination">
              <button className="sa-pagination-btn" disabled={page <= 1} onClick={() => { setPage(p => p - 1); void loadAll(page - 1); }}>← Prev</button>
              <span className="sa-pagination-info">Page {page} of {totalPages}</span>
              <button className="sa-pagination-btn" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); void loadAll(page + 1); }}>Next →</button>
            </div>
          )}
        </>
      )}

      {!loading && !error && tab === "unassigned" && (
        <>
          {unassigned.length === 0 ? (
            <div className="empty-state"><h3>No unassigned numbers</h3><p>All purchased numbers are assigned to tenants.</p></div>
          ) : (
            <div className="sa-card-list">
              {unassigned.map(n => (
                <div key={n.sid} className="sa-card-item">
                  <div className="sa-card-item-header">
                    <div>
                      <div style={{ fontFamily: "\"Monaco\", monospace", fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>{n.phone_number}</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 4 }}>
                        {n.friendly_name}
                        <span style={{ margin: "0 8px", opacity: 0.3 }}>·</span>
                        <span className={`badge badge-${n.in_db ? "info" : "neutral"}`}>{n.in_db ? "In database" : "Not in DB"}</span>
                        {n.voice_url && <span style={{ margin: "0 8px", opacity: 0.3 }}>·</span>}
                        {n.voice_url && <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", wordBreak: "break-all" }}>Webhook: {n.voice_url}</span>}
                      </div>
                    </div>
                    <div className="sa-card-item-actions">
                      <button className="dashboard-button" style={{ padding: "7px 16px", fontSize: "0.82rem" }} onClick={() => setAssignTarget({ sid: n.sid, phone: n.phone_number })}>Assign</button>
                      <button className="dashboard-button-danger" style={{ padding: "7px 16px", fontSize: "0.82rem" }} onClick={() => setReleaseSid({ sid: n.sid, phone: n.phone_number })}>Release</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {assignTarget && <AssignModal sid={assignTarget.sid} phoneNumber={assignTarget.phone} onClose={() => setAssignTarget(null)} onDone={refresh} />}
      {releaseSid && <ReleaseModal sid={releaseSid.sid} phoneNumber={releaseSid.phone} onClose={() => setReleaseSid(null)} onDone={refresh} />}
    </div>
  );
}
