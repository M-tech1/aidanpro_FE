import { useEffect, useState } from "react";
import { superAdminApi } from "@/features/super-admin/api/superAdminApi";
import { ApiError, isAbortError } from "@/shared/api/httpClient";
import { withRetry } from "@/shared/utils/withRetry";
import type { SuperAdmin } from "@/features/super-admin/api/superAdminApi";

export function SuperAdminsPage() {
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const load = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await withRetry(() => superAdminApi.listSuperAdmins(signal), signal);
      setAdmins(res.super_admins);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof ApiError ? err.message : "Failed to load super admins");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    try {
      setAdding(true);
      setAddMsg(null);
      const res = await superAdminApi.addSuperAdmin(newEmail.trim());
      setAddMsg({ text: res.message, ok: true });
      setNewEmail("");
      void load();
    } catch (err) {
      setAddMsg({ text: err instanceof ApiError ? err.message : "Failed to add", ok: false });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (admin: SuperAdmin) => {
    if (!confirm(`Revoke super admin access from '${admin.email}'?`)) return;
    try {
      setRemovingId(admin.user_id);
      setRemoveError(null);
      await superAdminApi.removeSuperAdmin(admin.user_id);
      void load();
    } catch (err) {
      setRemoveError(err instanceof ApiError ? err.message : "Failed to remove");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-hero">
        <div>
          <h1>Super Admins</h1>
          <p className="page-subtitle">
            {loading ? "Loading…" : `${admins.length} administrator${admins.length !== 1 ? "s" : ""} with platform access`}
          </p>
        </div>
      </div>

      {/* Add Super Admin */}
      <div className="form-section" style={{ marginBottom: 24 }}>
        <div className="form-section-header">
          <h2 className="form-section-title">Grant Super Admin Access</h2>
          <p className="form-section-desc">The user must already have an account before being granted access.</p>
        </div>
        <div className="form-section-body">
          <form onSubmit={(e) => void handleAdd(e)} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label className="field-label" style={{ flex: 1, minWidth: 240 }}>Email Address
              <input
                className="field-input"
                type="email"
                placeholder="admin@company.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="dashboard-button" disabled={adding || !newEmail.trim()} style={{ flexShrink: 0 }}>
              {adding ? "Granting Access…" : "Grant Access"}
            </button>
          </form>
          {addMsg && (
            <div className={`form-status${addMsg.ok ? "" : " error"}`}>{addMsg.text}</div>
          )}
        </div>
      </div>

      {/* Admin List */}
      <div className="detail-card">
        <div className="detail-card-header">
          <h2 className="detail-card-title">Current Super Admins</h2>
          <span className="badge badge-neutral">{admins.length} total</span>
        </div>

        {removeError && (
          <div className="form-status error" style={{ margin: "12px 20px 0" }}>{removeError}</div>
        )}

        {loading && (
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton-block" style={{ height: 64, borderRadius: 10 }} />)}
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: 20 }}>
            <div className="form-status error" style={{ marginBottom: 12 }}>{error}</div>
            <button className="dashboard-button" onClick={() => void load()}>Retry</button>
          </div>
        )}

        {!loading && !error && admins.length === 0 && (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" }}>No super admins found.</p>
          </div>
        )}

        {!loading && !error && admins.length > 0 && (
          <div>
            {admins.map(admin => (
              <div key={admin.id} className="sa-admin-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sa-admin-email">{admin.email}</div>
                  <div className="sa-admin-id">{admin.user_id}</div>
                  <div className="sa-admin-date">Granted {new Date(admin.created_at).toLocaleDateString()}</div>
                </div>
                <button
                  className="dashboard-button-danger"
                  style={{ padding: "7px 16px", fontSize: "0.82rem", flexShrink: 0 }}
                  disabled={removingId === admin.user_id}
                  onClick={() => void handleRemove(admin)}
                >
                  {removingId === admin.user_id ? "Revoking…" : "Revoke Access"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
