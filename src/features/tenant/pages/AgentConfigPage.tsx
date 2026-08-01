import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tenantApi } from "@/features/tenant/api/tenantApi";
import { ApiError, isAbortError } from "@/shared/api/httpClient";
import { withRetry } from "@/shared/utils/withRetry";
import { apiCache, CACHE_KEYS } from "@/shared/cache/apiCache";
import type { AgentConfig, AgentConfigPayload, AgentConfigHistoryEntry, Voice } from "@/features/tenant/api/tenantApi";
import { agentConfigSchema, type AgentConfigFormValues } from "@/features/tenant/schemas/tenantSchemas";

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly",     label: "Friendly" },
  { value: "casual",       label: "Casual" },
  { value: "empathetic",   label: "Empathetic" },
  { value: "formal",       label: "Formal" }
];

const ALLOWED_ACTIONS_META: Record<string, { label: string; desc: string }> = {
  create_booking:    { label: "Create Booking",    desc: "Allow agent to schedule appointments" },
  reschedule_booking:{ label: "Reschedule Booking",desc: "Allow agent to move existing appointments" },
  cancel_booking:    { label: "Cancel Booking",    desc: "Allow agent to cancel appointments" },
  create_lead:       { label: "Create Lead",       desc: "Allow agent to capture and log new leads" },
  create_ticket:     { label: "Create Ticket",     desc: "Allow agent to open support tickets" },
  schedule_meeting:  { label: "Schedule Meeting",  desc: "Allow agent to set up video meetings" },
  handoff_to_human:  { label: "Handoff to Human",  desc: "Allow agent to transfer to a live agent" }
};

const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconSave = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ width: 12, height: 12, marginLeft: 2 }}>
    <path d="M8 5v14l11-7z" />
  </svg>
);
const IconStop = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ width: 10, height: 10 }}>
    <rect x="6" y="6" width="12" height="12" />
  </svg>
);
const IconHistory = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M3 3v5h5" />
    <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
    <path d="M12 7v5l4 2" />
  </svg>
);

export function AgentConfigPage() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tab, setTab] = useState<"settings" | "history">("settings");

  const [history, setHistory] = useState<AgentConfigHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [confirmRollbackId, setConfirmRollbackId] = useState<string | null>(null);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  const [voices, setVoices] = useState<Voice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<Voice | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<AgentConfigFormValues>({ resolver: zodResolver(agentConfigSchema) });

  const watchTranscripts = watch("store_transcripts");
  const watchRecordings  = watch("store_recordings");

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const loadAll = async () => {
      // Return cached data immediately — avoids re-fetch on back-navigation
      const cachedConfig  = apiCache.get(CACHE_KEYS.agentConfig);
      const cachedVoices  = apiCache.get(CACHE_KEYS.voices);
      const cachedVoiceSel = apiCache.get(CACHE_KEYS.voiceSelection);

      if (cachedConfig && cachedVoices && cachedVoiceSel) {
        reset({
          greeting:          typeof cachedConfig.greeting === "string" ? cachedConfig.greeting : "",
          system_prompt:     typeof cachedConfig.system_prompt === "string" ? cachedConfig.system_prompt : "",
          tone:              typeof cachedConfig.tone === "string" ? cachedConfig.tone : "",
          store_transcripts: cachedConfig.store_transcripts ?? true,
          store_recordings:  cachedConfig.store_recordings ?? true,
          retention_days:    typeof cachedConfig.retention_days === "number" && !Number.isNaN(cachedConfig.retention_days) ? cachedConfig.retention_days : 90,
          change_note:       ""
        });
        setConfig(cachedConfig);
        setVoices(cachedVoices.voices);
        setCurrentVoice(cachedVoiceSel.voice ?? null);
        setSelectedVoiceId(cachedVoiceSel.voice?.id ?? null);
        setLoading(false);
        setVoicesLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [data, voicesData, voiceSelection] = await withRetry(() => Promise.all([
          tenantApi.getAgentConfig(signal),
          tenantApi.getVoices(signal),
          tenantApi.getVoiceSelection(signal)
        ]), signal);

        apiCache.set(CACHE_KEYS.agentConfig,    data);
        apiCache.set(CACHE_KEYS.voices,         voicesData);
        apiCache.set(CACHE_KEYS.voiceSelection, voiceSelection);

        reset({
          greeting:          typeof data.greeting === "string" ? data.greeting : "",
          system_prompt:     typeof data.system_prompt === "string" ? data.system_prompt : "",
          tone:              typeof data.tone === "string" ? data.tone : "",
          store_transcripts: data.store_transcripts ?? true,
          store_recordings:  data.store_recordings ?? true,
          retention_days:    typeof data.retention_days === "number" && !Number.isNaN(data.retention_days) ? data.retention_days : 90,
          change_note:       ""
        });
        setConfig(data);
        setVoices(voicesData.voices);
        setCurrentVoice(voiceSelection.voice ?? null);
        setSelectedVoiceId(voiceSelection.voice?.id ?? null);
      } catch (err) {
        if (isAbortError(err)) return;
        setFormError(err instanceof ApiError ? err.message : "Failed to load agent config");
      } finally {
        // Guard: don't set loading=false when aborted — prevents the !config error
        // fallback from flashing while the component is mid-abort (React StrictMode).
        if (!signal.aborted) {
          setLoading(false);
          setVoicesLoading(false);
        }
      }
    };

    void loadAll();
    return () => controller.abort();
  }, [reset]);

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const stopPreview = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
    setPreviewingVoiceId(null);
  };

  const handlePreview = async (voiceId: string) => {
    stopPreview();
    if (previewingVoiceId === voiceId) return;
    setPreviewLoadingId(voiceId);
    try {
      const url = await tenantApi.previewVoice(voiceId);
      previewUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      setPreviewingVoiceId(voiceId);
      await audio.play();
      audio.onended = () => {
        setPreviewingVoiceId(null);
        if (previewUrlRef.current === url) {
          URL.revokeObjectURL(url);
          previewUrlRef.current = null;
        }
      };
    } catch {
      setPreviewingVoiceId(null);
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const onSubmit = async (values: AgentConfigFormValues) => {
    setFormMessage(null);
    setFormError(null);
    setSaving(true);
    try {
      if (selectedVoiceId && selectedVoiceId !== currentVoice?.id) {
        const voiceResult = await tenantApi.setVoiceSelection(selectedVoiceId);
        const newVoice = voiceResult.voice;
        setCurrentVoice(newVoice);
        // Update voice selection cache
        apiCache.set(CACHE_KEYS.voiceSelection, { voice: newVoice });
      }
      const payload: AgentConfigPayload = {
        greeting:          values.greeting,
        system_prompt:     values.system_prompt,
        tone:              values.tone,
        store_transcripts: values.store_transcripts,
        store_recordings:  values.store_recordings,
        retention_days:    values.retention_days,
        change_note:       values.change_note?.trim() || undefined
      };
      const response = await tenantApi.updateAgentConfig(payload);
      // Update cache with saved config so dashboard reflects changes
      apiCache.set(CACHE_KEYS.agentConfig, response.config);
      setConfig(response.config);
      setFormMessage("Agent configuration saved successfully");
      setIsEditing(false);
      setHistoryLoaded(false); // refetch history next time it's viewed — a new snapshot was just created
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to update agent config");
    } finally {
      setSaving(false);
    }
  };

  const loadHistory = async (p = 1) => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const res = await tenantApi.getAgentConfigHistory({ page: p, per_page: 20 });
      setHistory(res.history ?? []);
      setHistoryTotalPages(res.pagination?.pages ?? 1);
      setHistoryPage(res.pagination?.page ?? p);
      setHistoryLoaded(true);
    } catch (err) {
      setHistoryError(err instanceof ApiError ? err.message : "Failed to load version history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectTab = (next: "settings" | "history") => {
    setTab(next);
    if (next === "history" && !historyLoaded) {
      void loadHistory(1);
    }
  };

  const handleRollback = async (historyId: string) => {
    try {
      setRollingBackId(historyId);
      setHistoryError(null);
      const res = await tenantApi.rollbackAgentConfig(historyId);
      apiCache.set(CACHE_KEYS.agentConfig, res.config);
      setConfig(res.config);
      reset({
        greeting:          typeof res.config.greeting === "string" ? res.config.greeting : "",
        system_prompt:     typeof res.config.system_prompt === "string" ? res.config.system_prompt : "",
        tone:              typeof res.config.tone === "string" ? res.config.tone : "",
        store_transcripts: res.config.store_transcripts ?? true,
        store_recordings:  res.config.store_recordings ?? true,
        retention_days:    typeof res.config.retention_days === "number" && !Number.isNaN(res.config.retention_days) ? res.config.retention_days : 90,
        change_note:       ""
      });
      setConfirmRollbackId(null);
      setFormMessage(res.message || "Configuration rolled back successfully");
      setFormError(null);
      setTab("settings");
      void loadHistory(1);
    } catch (err) {
      setHistoryError(err instanceof ApiError ? err.message : "Failed to rollback configuration");
    } finally {
      setRollingBackId(null);
    }
  };

  const handleCancelEdit = () => {
    if (!config) return;
    setIsEditing(false);
    setFormMessage(null);
    setFormError(null);
    setSelectedVoiceId(currentVoice?.id ?? null);
    stopPreview();
    reset({
      greeting:          typeof config.greeting === "string" ? config.greeting : "",
      system_prompt:     typeof config.system_prompt === "string" ? config.system_prompt : "",
      tone:              typeof config.tone === "string" ? config.tone : "",
      store_transcripts: config.store_transcripts ?? true,
      store_recordings:  config.store_recordings ?? true,
      retention_days:    typeof config.retention_days === "number" && !Number.isNaN(config.retention_days) ? config.retention_days : 90,
      change_note:       ""
    });
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="page-hero">
          <div>
            <div className="skeleton-block" style={{ width: 200, height: 26, marginBottom: 8 }} />
            <div className="skeleton-block" style={{ width: 150, height: 18 }} />
          </div>
        </div>
        <div className="skeleton-block" style={{ height: 180, borderRadius: 14, marginBottom: 16 }} />
        <div className="skeleton-block" style={{ height: 160, borderRadius: 14 }} />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="dashboard-page">
        <div className="page-hero"><h1>Agent Configuration</h1></div>
        <div className="form-status error">Failed to load agent configuration. Please refresh.</div>
      </div>
    );
  }

  const toneValue = typeof config.tone === "string" ? config.tone : "";
  const toneMeta = TONES.find((t) => t.value === toneValue);
  const allowedActionsRaw = config.allowed_actions ?? [];
  const allowedActions = Array.isArray(allowedActionsRaw)
    ? allowedActionsRaw.map((a) => (typeof a === "string" ? a : (a && typeof a === "object" && "name" in a ? String((a as { name?: string }).name) : String(a)))).filter(Boolean)
    : [];

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="page-hero">
        <div>
          <h1>Agent Configuration</h1>
          <p className="page-subtitle">Tune your AI agent's voice, behaviour and data settings</p>
        </div>
        {!isEditing && tab === "settings" && (
          <button onClick={() => setIsEditing(true)} className="dashboard-button">
            <IconEdit /> Edit Configuration
          </button>
        )}
      </div>

      {!isEditing && (
        <div className="sa-tabs">
          <button className={`sa-tab${tab === "settings" ? " active" : ""}`} onClick={() => handleSelectTab("settings")}>
            Settings
          </button>
          <button
            className={`sa-tab${tab === "history" ? " active" : ""}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => handleSelectTab("history")}
          >
            <IconHistory /> Version History
          </button>
        </div>
      )}

      {formMessage && <div className="form-status" style={{ marginBottom: 16 }}>{formMessage}</div>}
      {formError   && <div className="form-status error" style={{ marginBottom: 16 }}>{formError}</div>}

      {tab === "history" && !isEditing && (
        <div>
          {historyError && (
            <div className="form-status error" style={{ marginBottom: 16 }}>{historyError}</div>
          )}

          {historyLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton-block" style={{ height: 88, borderRadius: 10 }} />)}
            </div>
          )}

          {!historyLoading && !historyError && history.length === 0 && (
            <div className="empty-state">
              <h3>No version history yet</h3>
              <p>Every time you save changes to your agent configuration, a snapshot is recorded here so you can roll back if needed.</p>
            </div>
          )}

          {!historyLoading && !historyError && history.length > 0 && (
            <>
              <div className="sa-card-list">
                {history.map((entry) => {
                  const snapshot = entry.config_snapshot ?? {};
                  const snapshotGreeting = typeof snapshot.greeting === "string" ? snapshot.greeting : "";
                  const snapshotTone = typeof snapshot.tone === "string" ? snapshot.tone : "";
                  const isConfirming = confirmRollbackId === entry.id;
                  const isRollingBack = rollingBackId === entry.id;
                  return (
                    <div key={entry.id} className="sa-card-item">
                      <div className="sa-card-item-header">
                        <div style={{ minWidth: 0 }}>
                          <div className="sa-card-item-name">
                            {new Date(entry.created_at).toLocaleString()}
                          </div>
                          <div className="sa-card-item-desc">
                            {entry.change_note?.trim()
                              ? entry.change_note
                              : <span style={{ fontStyle: "italic" }}>No change note provided</span>}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                            {snapshotTone && <span className="badge badge-info" style={{ fontSize: "0.72rem", textTransform: "capitalize" }}>{snapshotTone}</span>}
                            {snapshotGreeting && (
                              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 }}>
                                "{snapshotGreeting}"
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 6 }}>
                            Changed by <span className="dashboard-code" style={{ fontSize: "0.7rem" }}>{entry.changed_by?.slice(0, 8)}…</span>
                          </div>
                        </div>
                        <div className="sa-card-item-actions">
                          {isConfirming ? (
                            <>
                              <button className="dashboard-button-secondary" style={{ padding: "7px 14px", fontSize: "0.82rem" }} disabled={isRollingBack} onClick={() => setConfirmRollbackId(null)}>
                                Cancel
                              </button>
                              <button className="dashboard-button-danger" style={{ padding: "7px 14px", fontSize: "0.82rem" }} disabled={isRollingBack} onClick={() => void handleRollback(entry.id)}>
                                {isRollingBack ? "Restoring…" : "Confirm Rollback"}
                              </button>
                            </>
                          ) : (
                            <button className="dashboard-button" style={{ padding: "7px 14px", fontSize: "0.82rem" }} onClick={() => setConfirmRollbackId(entry.id)}>
                              Rollback to this version
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {historyTotalPages > 1 && (
                <div className="sa-pagination">
                  <button className="sa-pagination-btn" disabled={historyPage <= 1} onClick={() => void loadHistory(historyPage - 1)}>← Prev</button>
                  <span className="sa-pagination-info">Page {historyPage} of {historyTotalPages}</span>
                  <button className="sa-pagination-btn" disabled={historyPage >= historyTotalPages} onClick={() => void loadHistory(historyPage + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "settings" && (!isEditing ? (
        /* ── Read-only view ── */
        <>
          <div className="detail-card">
            <div className="detail-card-header">
              <h2 className="detail-card-title">Voice & Personality</h2>
            </div>
            <div className="detail-card-body">
              <div className="detail-grid">
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="detail-label">Available Voices</span>
                  {voicesLoading ? (
                    <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.875rem" }}>Loading voices…</span>
                  ) : voices.length === 0 ? (
                    <span className="detail-value-muted" style={{ fontStyle: "italic" }}>No voices available</span>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 8 }}>
                      {voices.map((voice) => {
                        const isSelected = currentVoice?.id === voice.id;
                        const isPreviewing = previewingVoiceId === voice.id;
                        const isLoadingPreview = previewLoadingId === voice.id;
                        return (
                          <div
                            key={voice.id}
                            style={{
                              border: `1.5px solid ${isSelected ? "var(--brand-blue)" : "var(--border)"}`,
                              borderRadius: "var(--radius-md)",
                              padding: "12px 14px",
                              background: isSelected ? "var(--brand-blue-light)" : "var(--surface)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: 6 }}>
                                  {voice.name}
                                  {isSelected && (
                                    <span className="badge badge-success" style={{ fontSize: "0.7rem", marginLeft: 6 }}>Active</span>
                                  )}
                                </div>
                                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                  <span className="badge badge-info" style={{ fontSize: "0.72rem" }}>{voice.provider}</span>
                                  <span className="badge badge-neutral" style={{ fontSize: "0.72rem", textTransform: "capitalize" }}>{voice.gender}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handlePreview(voice.id)}
                                disabled={isLoadingPreview}
                                title={isPreviewing ? "Stop preview" : "Preview voice"}
                                style={{
                                  width: 32,
                                  height: 32,
                                  border: "1px solid var(--border-mid)",
                                  borderRadius: "50%",
                                  background: isPreviewing ? "var(--brand-blue)" : "var(--surface)",
                                  color: isPreviewing ? "#fff" : "var(--text-secondary)",
                                  cursor: isLoadingPreview ? "wait" : "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  padding: 0,
                                  transition: "background 0.15s, color 0.15s",
                                }}
                              >
                                {isLoadingPreview ? (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>…</span>
                                ) : isPreviewing ? (
                                  <IconStop />
                                ) : (
                                  <IconPlay />
                                )}
                              </button>
                            </div>
                            {voice.description && (
                              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 8 }}>
                                {voice.description}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="detail-item">
                  <span className="detail-label">Tone</span>
                  <span className="detail-value">
                    {toneMeta ? toneMeta.label : (toneValue || "—")}
                  </span>
                </div>
              </div>
              {typeof config.greeting === "string" && config.greeting.trim() && (
                <div className="detail-item" style={{ marginTop: 16 }}>
                  <span className="detail-label">Greeting Message</span>
                  <span className="detail-value" style={{ whiteSpace: "pre-wrap" }}>
                    {config.greeting}
                  </span>
                </div>
              )}
              {(!config.greeting || typeof config.greeting !== "string" || !config.greeting.trim()) && (
                <div className="detail-item" style={{ marginTop: 16 }}>
                  <span className="detail-label">Greeting Message</span>
                  <span className="detail-value-muted" style={{ fontStyle: "italic" }}>Not configured</span>
                </div>
              )}
              {typeof config.system_prompt === "string" && config.system_prompt.trim() && (
                <div className="detail-item" style={{ marginTop: 16 }}>
                  <span className="detail-label">System Prompt</span>
                  <span className="detail-value" style={{ whiteSpace: "pre-wrap" }}>
                    {config.system_prompt}
                  </span>
                </div>
              )}
              {(!config.system_prompt || typeof config.system_prompt !== "string" || !config.system_prompt.trim()) && (
                <div className="detail-item" style={{ marginTop: 16 }}>
                  <span className="detail-label">System Prompt</span>
                  <span className="detail-value-muted" style={{ fontStyle: "italic" }}>Not configured</span>
                </div>
              )}
            </div>
          </div>

          <div className="detail-card">
            <div className="detail-card-header">
              <h2 className="detail-card-title">Privacy & Data Storage</h2>
            </div>
            <div className="detail-card-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Store Transcripts</span>
                  <span className="detail-value">
                    <span className={`badge badge-${config.store_transcripts !== false ? "success" : "neutral"}`}>
                      {config.store_transcripts !== false ? "Enabled" : "Disabled"}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Store Recordings</span>
                  <span className="detail-value">
                    <span className={`badge badge-${config.store_recordings !== false ? "success" : "neutral"}`}>
                      {config.store_recordings !== false ? "Enabled" : "Disabled"}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Data Retention</span>
                  <span className="detail-value">
                    {typeof config.retention_days === "number" && !Number.isNaN(config.retention_days)
                      ? config.retention_days
                      : 90}{" "}
                    days
                  </span>
                </div>
              </div>
            </div>
          </div>

          {allowedActions.length > 0 && (
            <div className="detail-card">
              <div className="detail-card-header">
                <h2 className="detail-card-title">Allowed Actions</h2>
              </div>
              <div className="detail-card-body">
                <p style={{ margin: "0 0 14px", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                  The AI agent can perform the following actions during calls:
                </p>
                <div className="action-chips">
                  {allowedActions.map((action) => {
                    const meta = ALLOWED_ACTIONS_META[action];
                    return (
                      <span key={action} className="action-chip" title={meta?.desc}>
                        <IconCheck />
                        {meta?.label ?? action}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {typeof config.custom_prompts === "string" && config.custom_prompts.trim() && (
            <div className="detail-card">
              <div className="detail-card-header">
                <h2 className="detail-card-title">Custom Instructions</h2>
              </div>
              <div className="detail-card-body">
                <pre style={{
                  margin: 0,
                  fontFamily: "inherit",
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word"
                }}>
                  {config.custom_prompts}
                </pre>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── Edit form ── */
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-sections">
            {/* Voice & Personality */}
            <div className="form-section">
              <div className="form-section-header">
                <h2 className="form-section-title">Voice & Personality</h2>
                <p className="form-section-desc">Define how your AI agent sounds and introduces itself</p>
              </div>
              <div className="form-section-body form-grid-2">
                {/* Voice Picker */}
                <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Agent Voice</label>
                  <small style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: 10 }}>
                    Select the voice your agent uses when speaking to callers. Click the play button to preview.
                  </small>
                  {voicesLoading ? (
                    <div style={{ padding: "16px 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading voices…</div>
                  ) : voices.length === 0 ? (
                    <div style={{ padding: "16px 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>No voices available</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                      {voices.map((voice) => {
                        const isSelected = selectedVoiceId === voice.id;
                        const isPreviewing = previewingVoiceId === voice.id;
                        const isLoadingPreview = previewLoadingId === voice.id;
                        return (
                          <div
                            key={voice.id}
                            onClick={() => setSelectedVoiceId(voice.id)}
                            style={{
                              border: `1.5px solid ${isSelected ? "var(--brand-blue)" : "var(--border)"}`,
                              borderRadius: "var(--radius-md)",
                              padding: "12px 14px",
                              cursor: "pointer",
                              background: isSelected ? "var(--brand-blue-light)" : "var(--surface)",
                              transition: "border-color 0.15s, background 0.15s",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: 6 }}>
                                  {voice.name}
                                </div>
                                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                  <span className="badge badge-info" style={{ fontSize: "0.72rem" }}>{voice.provider}</span>
                                  <span className="badge badge-neutral" style={{ fontSize: "0.72rem", textTransform: "capitalize" }}>{voice.gender}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handlePreview(voice.id); }}
                                disabled={isLoadingPreview}
                                title={isPreviewing ? "Stop preview" : "Preview voice"}
                                style={{
                                  width: 32,
                                  height: 32,
                                  border: "1px solid var(--border-mid)",
                                  borderRadius: "50%",
                                  background: isPreviewing ? "var(--brand-blue)" : "var(--surface)",
                                  color: isPreviewing ? "#fff" : "var(--text-secondary)",
                                  cursor: isLoadingPreview ? "wait" : "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  padding: 0,
                                  transition: "background 0.15s, color 0.15s",
                                }}
                              >
                                {isLoadingPreview ? (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>…</span>
                                ) : isPreviewing ? (
                                  <IconStop />
                                ) : (
                                  <IconPlay />
                                )}
                              </button>
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 8 }}>
                              {voice.description}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="tone">Agent Tone</label>
                  <select id="tone" className="form-field-select" {...register("tone")}>
                    <option value="">Select tone…</option>
                    {TONES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {errors.tone && <small className="field-error">{errors.tone.message}</small>}
                </div>

                <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="greeting">Greeting Message</label>
                  <textarea
                    id="greeting"
                    {...register("greeting")}
                    placeholder="Hello! Thank you for calling. How can I help you today?"
                    rows={3}
                  />
                  {errors.greeting && <small className="field-error">{errors.greeting.message}</small>}
                  <small style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    This is the first thing callers hear when your agent answers
                  </small>
                </div>

                <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="system_prompt">System Prompt</label>
                  <textarea
                    id="system_prompt"
                    {...register("system_prompt")}
                    placeholder="You are a professional AI voice assistant for…"
                    rows={6}
                  />
                  {errors.system_prompt && (
                    <small className="field-error">{errors.system_prompt.message}</small>
                  )}
                  <small style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Core instructions for the model (role, boundaries, business context)
                  </small>
                </div>
              </div>
            </div>

            {/* Privacy & Storage */}
            <div className="form-section">
              <div className="form-section-header">
                <h2 className="form-section-title">Privacy & Data Storage</h2>
                <p className="form-section-desc">Control what call data is stored and for how long</p>
              </div>
              <div className="form-section-body">
                <div className="toggle-row">
                  <div className="toggle-row-label">
                    <span>Store Transcripts</span>
                    <small>Save the full conversation text after each call</small>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" {...register("store_transcripts")} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="toggle-row" style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                  <div className="toggle-row-label">
                    <span>Store Recordings</span>
                    <small>Keep audio recordings accessible via signed URL</small>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" {...register("store_recordings")} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                {(watchTranscripts || watchRecordings) && (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                    <div className="form-field" style={{ maxWidth: 200 }}>
                      <label htmlFor="retention_days">Retention Period (days)</label>
                      <input
                        id="retention_days"
                        type="number"
                        min={1}
                        max={365}
                        {...register("retention_days", { valueAsNumber: true })}
                        placeholder="90"
                      />
                      {errors.retention_days && (
                        <small className="field-error">{errors.retention_days.message}</small>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Allowed Actions info */}
            {allowedActions.length > 0 && (
              <div className="info-banner" style={{ marginTop: 0, marginBottom: 0 }}>
                <span className="info-banner-icon"><IconInfo /></span>
                <div className="info-banner-content">
                  <p className="info-banner-title">Allowed Actions are managed by the backend</p>
                  <p className="info-banner-desc">
                    Your agent currently has {allowedActions.length} action{allowedActions.length !== 1 ? "s" : ""} enabled:{" "}
                    {allowedActions.map((a) => ALLOWED_ACTIONS_META[a]?.label ?? a).join(", ")}.
                    Contact your platform administrator to modify allowed actions.
                  </p>
                </div>
              </div>
            )}

            {/* Change Note */}
            <div className="form-section">
              <div className="form-section-header">
                <h2 className="form-section-title">Change Note</h2>
                <p className="form-section-desc">Optionally describe why you're making this change — it's saved with the version history</p>
              </div>
              <div className="form-section-body">
                <div className="form-field">
                  <label htmlFor="change_note">Note (optional)</label>
                  <input
                    id="change_note"
                    type="text"
                    {...register("change_note")}
                    placeholder="e.g. Switched to a friendlier greeting for the holiday promo"
                  />
                  {errors.change_note && <small className="field-error">{errors.change_note.message}</small>}
                </div>
              </div>
            </div>

            {/* Form actions */}
            <div className="dashboard-form-actions" style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "16px 20px",
              marginTop: 0
            }}>
              <button type="button" onClick={handleCancelEdit} className="dashboard-button-secondary">
                <IconX /> Cancel
              </button>
              <button type="submit" disabled={saving} className="dashboard-button">
                <IconSave /> {saving ? "Saving…" : "Save Configuration"}
              </button>
            </div>
          </div>
        </form>
      ))}
    </div>
  );
}
