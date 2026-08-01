import { useEffect, useState } from "react";
import { superAdminApi } from "@/features/super-admin/api/superAdminApi";
import { ApiError, isAbortError } from "@/shared/api/httpClient";
import { withRetry } from "@/shared/utils/withRetry";
import type { SpamNumber } from "@/features/super-admin/api/superAdminApi";

export function SpamNumbersPage() {
  const [numbers, setNumbers] = useState<SpamNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = async (p = page, signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await withRetry(() => superAdminApi.listSpamNumbers({ page: p, per_page: 20 }, signal), signal);
      setNumbers(res.spam_numbers ?? []);
      setTotalPages(res.pagination?.pages ?? 1);
      setTotal(res.pagination?.total ?? 0);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof ApiError ? err.message : "Failed to load spam numbers");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(1, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goPage = (p: number) => { setPage(p); void load(p); };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    try {
      setAdding(true);
      setAddMsg(null);
      const res = await superAdminApi.addSpamNumber({ phone_number: phoneNumber.trim(), reason: reason.trim() || undefined });
      setAddMsg({ text: res.message, ok: true });
      setPhoneNumber("");
      setReason("");
      setPage(1);
      void load(1);
    } catch (err) {
      setAddMsg({ text: err instanceof ApiError ? err.message : "Failed to add number", ok: false });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (entry: SpamNumber) => {
    if (!confirm(`Remove '${entry.phone_number}' from the platform blocklist?`)) return;
    try {
      setRemovingId(entry.id);
      await superAdminApi.removeSpamNumber(entry.id);
      void load(page);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove number");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-hero">
        <div>
          <h1>Spam Numbers</h1>
          <p className="page-subtitle">
            {loading ? "Loading…" : `${total} number${total !== 1 ? "s" : ""} on the platform blocklist`}
          </p>
        </div>
      </div>

      {/* Add to blocklist */}
      <div className="form-section" style={{ marginBottom: 24 }}>
        <div className="form-section-header">
          <h2 className="form-section-title">Add to Blocklist</h2>
          <p className="form-section-desc">Calls from blocklisted numbers receive an automatic spam flag and the maximum spam score across all tenants.</p>
        </div>
        <div className="form-section-body">
          <form onSubmit={(e) => void handleAdd(e)} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label className="field-label" style={{ flex: 1, minWidth: 200 }}>Phone Number
              <input
                className="field-input"
                placeholder="+15555550100"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                required
                style={{ fontFamily: '"Monaco","Courier New",monospace' }}
              />
            </label>
            <label className="field-label" style={{ flex: 2, minWidth: 240 }}>Reason
              <input
                className="field-input"
                placeholder="e.g. Repeated robocall complaints"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </label>
            <button type="submit" className="dashboard-button" disabled={adding || !phoneNumber.trim()} style={{ flexShrink: 0 }}>
              {adding ? "Adding…" : "Add to Blocklist"}
            </button>
          </form>
          {addMsg && (
            <div className={`form-status${addMsg.ok ? "" : " error"}`}>{addMsg.text}</div>
          )}
        </div>
      </div>

      {/* List */}
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
          <button className="dashboard-button" onClick={() => void load()}>Retry</button>
        </>
      )}

      {!loading && !error && (
        <>
          {numbers.length === 0 ? (
            <div className="empty-state"><h3>No blocklisted numbers</h3><p>Add a phone number above to flag it as spam across the platform.</p></div>
          ) : (
            <div className="dashboard-table-container" style={{ overflowX: "auto" }}>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Phone Number</th>
                    <th>Reason</th>
                    <th>Added By</th>
                    <th>Added On</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {numbers.map(n => (
                    <tr key={n.id}>
                      <td><span className="dashboard-code" style={{ fontSize: "0.875rem", fontWeight: 700 }}>{n.phone_number}</span></td>
                      <td>{n.reason || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                      <td>
                        {n.added_by
                          ? <span className="dashboard-code" style={{ fontSize: "0.75rem" }}>{n.added_by.slice(0, 8)}…</span>
                          : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{new Date(n.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="dashboard-button-danger"
                          style={{ padding: "7px 16px", fontSize: "0.82rem" }}
                          disabled={removingId === n.id}
                          onClick={() => void handleRemove(n)}
                        >
                          {removingId === n.id ? "Removing…" : "Remove"}
                        </button>
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
