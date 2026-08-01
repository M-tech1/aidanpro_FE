import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { superAdminApi } from "@/features/super-admin/api/superAdminApi";
import { ApiError, isAbortError } from "@/shared/api/httpClient";
import { withRetry } from "@/shared/utils/withRetry";
import { countryName } from "@/shared/config/countries";
import type { GetTenantResponse, UsageResponse, ListTenantUsersResponse } from "@/features/super-admin/api/superAdminApi";

type PageData = { detail: GetTenantResponse | null; usage: UsageResponse | null; users: ListTenantUsersResponse | null };

function StatusBadge({ status }: { status: string }) {
  const v = status === "active" ? "success" : status === "suspended" ? "warning" : "neutral";
  return <span className={`badge badge-${v}`}><span className="badge-dot" />{status}</span>;
}

export function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PageData>({ detail: null, usage: null, users: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusAction, setStatusAction] = useState<"suspended" | "active" | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [deleteStep, setDeleteStep] = useState<"idle" | "preview" | "confirming">("idle");
  const [deleteImpact, setDeleteImpact] = useState<{ users_to_unlink: number; phone_numbers_to_remove: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async (signal?: AbortSignal) => {
    if (!tenantId) return;
    try {
      setLoading(true);
      setError(null);
      const [detail, usage, users] = await withRetry(() => Promise.all([
        superAdminApi.getTenant(tenantId, signal),
        superAdminApi.getTenantUsage(tenantId, signal),
        superAdminApi.listTenantUsers(tenantId, signal)
      ]), signal);
      setData({ detail, usage, users });
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof ApiError ? err.message : "Failed to load tenant");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const updateStatus = async () => {
    if (!tenantId || !statusAction) return;
    try {
      setSavingStatus(true);
      setStatusMsg(null);
      await superAdminApi.updateStatus(tenantId, { status: statusAction, reason: suspendReason || undefined });
      setStatusMsg({ text: `Status updated to '${statusAction}'.`, ok: true });
      setStatusAction(null);
      setSuspendReason("");
      void load();
    } catch (err) {
      setStatusMsg({ text: err instanceof ApiError ? err.message : "Failed.", ok: false });
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDeletePreview = async () => {
    if (!tenantId) return;
    try {
      setDeleting(true);
      const res = await superAdminApi.deleteTenant(tenantId);
      if ("impact" in res) { setDeleteImpact(res.impact); setDeleteStep("preview"); }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!tenantId) return;
    try {
      setDeleting(true);
      setDeleteStep("confirming");
      await superAdminApi.deleteTenant(tenantId, true);
      navigate("/super-admin/tenants");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete tenant");
      setDeleting(false);
      setDeleteStep("preview");
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="skeleton-block" style={{ width: 200, height: 28, marginBottom: 16 }} />
        <div className="skeleton-block" style={{ height: 140, borderRadius: 14, marginBottom: 20 }} />
        <div className="stats-grid"><div className="skeleton-block skeleton-stat" /><div className="skeleton-block skeleton-stat" /><div className="skeleton-block skeleton-stat" /></div>
        <div className="skeleton-block" style={{ height: 220, borderRadius: 14 }} />
      </div>
    );
  }

  if (error || !data.detail) {
    return (
      <div className="dashboard-page">
        <div className="form-status error" style={{ marginBottom: 16 }}>{error ?? "Tenant not found"}</div>
        <Link to="/super-admin/tenants" className="dashboard-button">← Back to Tenants</Link>
      </div>
    );
  }

  const { tenant, agent_config } = data.detail;
  const usage = data.usage?.usage;
  const users = data.users?.users ?? [];

  return (
    <div className="dashboard-page">
      {/* Hero */}
      <div className="page-hero">
        <div>
          <div style={{ marginBottom: 6 }}>
            <Link to="/super-admin/tenants" style={{ fontSize: "0.82rem", color: "var(--text-muted)", textDecoration: "none" }}>
              ← All Tenants
            </Link>
          </div>
          <h1>{tenant.name}</h1>
          <p className="page-subtitle">{tenant.industry} · {tenant.timezone}</p>
        </div>
        <div className="page-hero-badges">
          <StatusBadge status={tenant.status} />
        </div>
      </div>

      {/* Tenant Details */}
      <div className="detail-card" style={{ marginBottom: 20 }}>
        <div className="detail-card-header">
          <h2 className="detail-card-title">Tenant Details</h2>
          <span className="dashboard-code" style={{ fontSize: "0.75rem" }}>{tenant.id}</span>
        </div>
        <div className="detail-card-body">
          <div className="sa-info-rows">
            <div className="sa-info-row"><span className="sa-info-label">Status</span><span className="sa-info-value"><StatusBadge status={tenant.status} /></span></div>
            <div className="sa-info-row"><span className="sa-info-label">Industry</span><span className="sa-info-value">{tenant.industry || "—"}</span></div>
            <div className="sa-info-row"><span className="sa-info-label">Timezone</span><span className="sa-info-value">{tenant.timezone}</span></div>
            <div className="sa-info-row"><span className="sa-info-label">Country</span><span className="sa-info-value">{countryName(tenant.country)}</span></div>
            {tenant.default_email_recipients && tenant.default_email_recipients.length > 0 && (
              <div className="sa-info-row">
                <span className="sa-info-label">Email Recipients</span>
                <span className="sa-info-value">{tenant.default_email_recipients.join(", ")}</span>
              </div>
            )}
            <div className="sa-info-row"><span className="sa-info-label">Created At</span><span className="sa-info-value">{new Date(tenant.created_at).toLocaleString()}</span></div>
          </div>
          {agent_config && (
            <div style={{ marginTop: 16, padding: "14px 16px", background: "var(--bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Agent Config</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px", fontSize: "0.875rem" }}>
                <span>Tone: <strong>{agent_config.tone}</strong></span>
                <span>Retention: <strong>{agent_config.retention_days}d</strong></span>
                <span>Transcripts: <strong>{agent_config.store_transcripts ? "On" : "Off"}</strong></span>
                <span>Recordings: <strong>{agent_config.store_recordings ? "On" : "Off"}</strong></span>
              </div>
              {agent_config.greeting && (
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 8, fontStyle: "italic" }}>
                  "{agent_config.greeting}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Usage */}
      {usage && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card" style={{ cursor: "default" }}>
            <div className="stat-card-value">{usage.total_users}</div>
            <div className="stat-card-label">Total Users</div>
            <div className="stat-card-meta">{Object.entries(usage.users_by_role).map(([r, c]) => `${c} ${r}`).join(" · ")}</div>
          </div>
          <div className="stat-card" style={{ cursor: "default" }}>
            <div className="stat-card-value">{usage.total_phone_numbers}</div>
            <div className="stat-card-label">Phone Numbers</div>
            <div className="stat-card-meta">{usage.active_phone_numbers} active</div>
          </div>
          <div className="stat-card" style={{ cursor: "default" }}>
            <div className="stat-card-value">{usage.total_calls.toLocaleString()}</div>
            <div className="stat-card-label">Total Calls</div>
          </div>
        </div>
      )}

      {/* Users */}
      <div className="detail-card" style={{ marginBottom: 20 }}>
        <div className="detail-card-header"><h2 className="detail-card-title">Users ({users.length})</h2></div>
        {users.length === 0 ? (
          <div className="detail-card-body"><p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" }}>No users on this tenant.</p></div>
        ) : (
          <div className="dashboard-table-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="dashboard-table">
              <thead><tr><th>User ID</th><th>Role</th><th>Added</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><span className="dashboard-code">{u.user_id}</span></td>
                    <td><span className="badge badge-info">{u.role}</span></td>
                    <td style={{ whiteSpace: "nowrap" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Management */}
      <div className="form-section" style={{ marginBottom: 20 }}>
        <div className="form-section-header">
          <h2 className="form-section-title">Status Management</h2>
          <p className="form-section-desc">Suspend or reactivate this tenant.</p>
        </div>
        <div className="form-section-body">
          {statusMsg && (
            <div className={`form-status${statusMsg.ok ? "" : " error"}`} style={{ marginBottom: 0 }}>{statusMsg.text}</div>
          )}
          {!statusAction ? (
            <div className="button-group">
              {tenant.status !== "suspended" ? (
                <button className="dashboard-button-warning" onClick={() => { setStatusAction("suspended"); setStatusMsg(null); }}>Suspend Tenant</button>
              ) : (
                <button className="dashboard-button-success" onClick={() => { setStatusAction("active"); setStatusMsg(null); }}>Reactivate Tenant</button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                {statusAction === "suspended"
                  ? `You are about to suspend "${tenant.name}". Please provide a reason.`
                  : `You are about to reactivate "${tenant.name}".`}
              </p>
              {statusAction === "suspended" && (
                <label className="field-label">Reason *
                  <input className="field-input" placeholder="Non-payment — invoice overdue 30 days" value={suspendReason} onChange={e => setSuspendReason(e.target.value)} />
                </label>
              )}
              <div className="button-group">
                {statusAction === "suspended" ? (
                  <button className="dashboard-button-warning" onClick={() => void updateStatus()} disabled={savingStatus || !suspendReason.trim()}>
                    {savingStatus ? "Suspending…" : "Confirm Suspend"}
                  </button>
                ) : (
                  <button className="dashboard-button-success" onClick={() => void updateStatus()} disabled={savingStatus}>
                    {savingStatus ? "Reactivating…" : "Confirm Reactivate"}
                  </button>
                )}
                <button className="dashboard-button-secondary" onClick={() => { setStatusAction(null); setStatusMsg(null); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="form-section" style={{ marginBottom: 20 }}>
        <div className="form-section-header" style={{ background: "#fff5f5" }}>
          <h2 className="form-section-title" style={{ color: "#b91c1c" }}>Danger Zone</h2>
          <p className="form-section-desc">Irreversible and destructive actions.</p>
        </div>
        <div className="form-section-body">
          <div className="sa-danger-zone">
            <p className="sa-danger-desc">
              Permanently delete <strong>{tenant.name}</strong> and all associated data. This action cannot be undone.
            </p>
            {deleteStep === "idle" && (
              <button className="dashboard-button-danger" onClick={() => void handleDeletePreview()} disabled={deleting}>
                {deleting ? "Checking impact…" : "Delete Tenant"}
              </button>
            )}
            {deleteStep === "preview" && deleteImpact && (
              <div>
                <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: 14, fontSize: "0.875rem", lineHeight: 1.8 }}>
                  <strong>Impact preview</strong><br />
                  Users to unlink: <strong>{deleteImpact.users_to_unlink}</strong><br />
                  Phone numbers to release: <strong>{deleteImpact.phone_numbers_to_remove}</strong>
                </div>
                <div className="button-group">
                  <button className="dashboard-button-danger" onClick={() => void handleDeleteConfirm()} disabled={deleting}>
                    {deleting ? "Deleting…" : "Confirm — Permanently Delete"}
                  </button>
                  <button className="dashboard-button-secondary" onClick={() => setDeleteStep("idle")}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
