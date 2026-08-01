import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { superAdminApi } from "@/features/super-admin/api/superAdminApi";
import { ApiError, isAbortError } from "@/shared/api/httpClient";
import { withRetry } from "@/shared/utils/withRetry";
import { DEFAULT_COUNTRY, countryName } from "@/shared/config/countries";
import { useAvailableCountries } from "@/shared/config/useAvailableCountries";
import type { TenantSummary, CreateTenantPayload, QuickCreateTenantPayload, QuickCreateTenantResponse } from "@/features/super-admin/api/superAdminApi";

const STATUSES = ["", "active", "suspended", "inactive"];

function StatusBadge({ status }: { status: string }) {
  const v = status === "active" ? "success" : status === "suspended" ? "warning" : "neutral";
  return <span className={`badge badge-${v}`}><span className="badge-dot" />{status}</span>;
}

function CreateTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const countries = useAvailableCountries();
  const [form, setForm] = useState<CreateTenantPayload>({
    company_name: "", owner_email: "", owner_password: "",
    timezone: "America/Toronto", industry: "", country: DEFAULT_COUNTRY
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof CreateTenantPayload, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await superAdminApi.createTenant(form);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create tenant");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sa-modal-overlay">
      <div className="sa-modal sa-modal-md">
        <div className="sa-modal-header">
          <h2 className="sa-modal-title">Create New Tenant</h2>
          <button className="sa-modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="sa-modal-body">
            {error && <div className="form-status error">{error}</div>}

            <label className="field-label">Company Name *
              <input className="field-input" value={form.company_name} onChange={e => set("company_name", e.target.value)} required placeholder="Acme Corp" />
            </label>
            <label className="field-label">Owner Email *
              <input className="field-input" type="email" value={form.owner_email} onChange={e => set("owner_email", e.target.value)} required placeholder="owner@acme.com" />
            </label>
            <label className="field-label">Owner Password *
              <input className="field-input" type="password" value={form.owner_password} onChange={e => set("owner_password", e.target.value)} required placeholder="Minimum 8 characters" />
            </label>
            <div className="sa-form-grid-2">
              <label className="field-label">Industry *
                <input className="field-input" value={form.industry} onChange={e => set("industry", e.target.value)} required placeholder="Healthcare" />
              </label>
              <label className="field-label">Timezone
                <input className="field-input" value={form.timezone} onChange={e => set("timezone", e.target.value)} placeholder="America/Toronto" />
              </label>
            </div>
            <label className="field-label">Country
              <select className="field-input" value={form.country} onChange={e => set("country", e.target.value)}>
                {countries.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
              </select>
            </label>
          </div>
          <div className="sa-modal-footer">
            <button type="button" className="dashboard-button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="dashboard-button" disabled={saving}>{saving ? "Creating…" : "Create Tenant"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuickCreateTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<QuickCreateTenantPayload>({
    company_name: "", owner_email: "", owner_password: "",
    industry: "", timezone: "America/Toronto", agent_pack_id: "", voice_id: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuickCreateTenantResponse | null>(null);

  const set = (k: keyof QuickCreateTenantPayload, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await superAdminApi.quickCreateTenant({
        ...form,
        agent_pack_id: form.agent_pack_id?.trim() || undefined,
        voice_id: form.voice_id?.trim() || undefined
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to provision tenant");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sa-modal-overlay">
      <div className="sa-modal sa-modal-md">
        <div className="sa-modal-header">
          <h2 className="sa-modal-title">Quick Create Tenant</h2>
          <button className="sa-modal-close" onClick={onClose}>×</button>
        </div>

        {result ? (
          <>
            <div className="sa-modal-body">
              <div className="form-status" style={{ marginBottom: 12 }}>{result.message}</div>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Tenant</span>
                  <span className="detail-value">{result.tenant.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Owner</span>
                  <span className="detail-value">{result.owner.email}</span>
                </div>
                {result.applied_pack && (
                  <div className="detail-item">
                    <span className="detail-label">Agent Pack</span>
                    <span className="detail-value">{result.applied_pack.name}</span>
                  </div>
                )}
                {result.voice && (
                  <div className="detail-item">
                    <span className="detail-label">Voice</span>
                    <span className="detail-value">{result.voice.name} ({result.voice.gender}, {result.voice.language_code})</span>
                  </div>
                )}
                {result.agent_config.tone && (
                  <div className="detail-item">
                    <span className="detail-label">Tone</span>
                    <span className="detail-value">{result.agent_config.tone}</span>
                  </div>
                )}
                {result.agent_config.greeting && (
                  <div className="detail-item detail-grid-full">
                    <span className="detail-label">Greeting</span>
                    <span className="detail-value">{result.agent_config.greeting}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="dashboard-button" onClick={onCreated}>Done</button>
            </div>
          </>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className="sa-modal-body">
              {error && <div className="form-status error">{error}</div>}
              <p style={{ margin: "0 0 4px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Provisions a tenant, owner account, and a fully configured AI agent in one step — ideal for live demos.
              </p>
              <label className="field-label">Company Name *
                <input className="field-input" value={form.company_name} onChange={e => set("company_name", e.target.value)} required placeholder="Acme Corp" />
              </label>
              <label className="field-label">Owner Email *
                <input className="field-input" type="email" value={form.owner_email} onChange={e => set("owner_email", e.target.value)} required placeholder="owner@acme.com" />
              </label>
              <label className="field-label">Owner Password *
                <input className="field-input" type="password" value={form.owner_password} onChange={e => set("owner_password", e.target.value)} required placeholder="Minimum 8 characters" />
              </label>
              <div className="sa-form-grid-2">
                <label className="field-label">Industry *
                  <input className="field-input" value={form.industry} onChange={e => set("industry", e.target.value)} required placeholder="Healthcare" />
                </label>
                <label className="field-label">Timezone
                  <input className="field-input" value={form.timezone} onChange={e => set("timezone", e.target.value)} placeholder="America/Toronto" />
                </label>
              </div>
              <div className="sa-form-grid-2">
                <label className="field-label">Agent Pack ID
                  <input className="field-input" value={form.agent_pack_id} onChange={e => set("agent_pack_id", e.target.value)} placeholder="Optional — preset agent template" />
                </label>
                <label className="field-label">Voice ID
                  <input className="field-input" value={form.voice_id} onChange={e => set("voice_id", e.target.value)} placeholder="Optional — preset voice" />
                </label>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="dashboard-button-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="dashboard-button" disabled={saving}>{saving ? "Provisioning…" : "Quick Create"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function TenantsPage() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: "", search: "" });
  const [draft, setDraft] = useState({ status: "", search: "" });

  const load = async (p = page, f = filters, signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await withRetry(() => superAdminApi.listTenants({ page: p, per_page: 100, ...f }, signal), signal);
      const rows = Array.isArray(res.tenants) ? res.tenants : [];
      setTenants(rows);
      const pg = res.pagination;
      setTotalPages(pg?.pages ?? 1);
      setTotal(pg?.total ?? rows.length);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof ApiError ? err.message : "Failed to load tenants");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(page, filters, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => { setFilters(draft); setPage(1); void load(1, draft); };

  const goPage = (p: number) => { setPage(p); void load(p, filters); };

  return (
    <div className="dashboard-page">
      <div className="page-hero">
        <div>
          <h1>Tenants</h1>
          <p className="page-subtitle">
            {loading ? "Loading…" : `${total} organization${total !== 1 ? "s" : ""} registered`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="dashboard-button-secondary" onClick={() => setShowQuickCreate(true)}>⚡ Quick Create</button>
          <button className="dashboard-button" onClick={() => setShowCreate(true)}>+ Create Tenant</button>
        </div>
      </div>

      {/* Filters */}
      <div className="sa-filter-bar">
        <label className="field-label" style={{ flex: 2, minWidth: 180 }}>Search
          <input className="field-input" placeholder="Name or email…" value={draft.search}
            onChange={e => setDraft(d => ({ ...d, search: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && applyFilters()}
          />
        </label>
        <label className="field-label">Status
          <select className="field-input" value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}>
            {STATUSES.map(s => <option key={s} value={s}>{s || "All statuses"}</option>)}
          </select>
        </label>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button className="dashboard-button" onClick={applyFilters}>Apply</button>
        </div>
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
          <button className="dashboard-button" onClick={() => void load()}>Retry</button>
        </>
      )}

      {!loading && !error && (
        <>
          {tenants.length === 0 ? (
            <div className="empty-state">
              <h3>No tenants found</h3>
              <p>Try adjusting the filters or create a new tenant.</p>
            </div>
          ) : (
            <div className="dashboard-table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Industry</th>
                    <th>Country</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{t.name}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td>{t.industry || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{t.country ? countryName(t.country) : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td>
                        <Link to={`/super-admin/tenants/${t.id}`} className="setup-step-action">
                          View →
                        </Link>
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

      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); void load(); }}
        />
      )}

      {showQuickCreate && (
        <QuickCreateTenantModal
          onClose={() => setShowQuickCreate(false)}
          onCreated={() => { setShowQuickCreate(false); setPage(1); void load(1, filters); }}
        />
      )}
    </div>
  );
}
