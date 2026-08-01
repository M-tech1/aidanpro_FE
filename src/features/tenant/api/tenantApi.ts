import { request, ApiError } from "@/shared/api/httpClient";
import { appConfig } from "@/shared/config/appConfig";
import { authSession } from "@/shared/session/authSession";

// Tenant Profile Types
export type Tenant = {
  id: string;
  name: string;
  timezone: string;
  industry: string;
  country?: string;
  default_email_recipients: string[];
  status: string;
  created_at: string;
};

export type TenantProfileResponse = {
  tenant: Tenant;
  user_role: string;
};

export type TenantProfilePayload = {
  name?: string;
  timezone?: string;
  industry?: string;
  country?: string;
  default_email_recipients?: string[];
};

export type TenantProfileUpdateResponse = {
  message: string;
  tenant: Tenant;
};

// Agent Config Types
export type BusinessHours = {
  [key: string]: {
    start: string;
    end: string;
  };
};

export type AgentConfig = {
  id: string;
  tenant_id: string;
  greeting?: string;
  system_prompt?: string;
  tone?: string;
  business_hours?: BusinessHours;
  escalation_rules?: Record<string, unknown>;
  allowed_actions?: string[];
  custom_prompts?: string;
  store_transcripts?: boolean;
  store_recordings?: boolean;
  retention_days?: number;
  created_at?: string;
  updated_at?: string;
};

export type AgentConfigPayload = {
  greeting?: string;
  system_prompt?: string;
  tone?: string;
  business_hours?: BusinessHours;
  escalation_rules?: Record<string, unknown>;
  allowed_actions?: string[];
  custom_prompts?: string;
  store_transcripts?: boolean;
  store_recordings?: boolean;
  retention_days?: number;
  change_note?: string;
};

export type AgentConfigUpdateResponse = {
  message: string;
  config: AgentConfig;
};

// Agent Config Version History Types
export type Pagination = {
  page: number;
  per_page: number;
  total: number;
  pages: number;
};

export type AgentConfigHistoryEntry = {
  id: string;
  config_snapshot: Record<string, unknown>;
  changed_by: string;
  change_note?: string | null;
  created_at: string;
};

export type AgentConfigHistoryResponse = {
  history: AgentConfigHistoryEntry[];
  pagination: Pagination;
};

export type AgentConfigRollbackResponse = {
  message: string;
  config: AgentConfig;
  restored_from: string;
};

// Phone Numbers Types (API may return twilio_number_sid from DB; we normalize to twilio_sid)
export type PhoneNumber = {
  id: string;
  tenant_id: string;
  phone_number: string;
  twilio_sid: string;
  status: string;
  created_at: string;
};

type PhoneNumberApiRow = Omit<PhoneNumber, "twilio_sid"> & {
  twilio_sid?: string;
  twilio_number_sid?: string;
};

function normalizePhoneNumber(row: PhoneNumberApiRow): PhoneNumber {
  const twilio_sid = row.twilio_sid ?? row.twilio_number_sid ?? "";
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    phone_number: row.phone_number,
    twilio_sid,
    status: row.status,
    created_at: row.created_at
  };
}

export type PhoneNumbersResponse = {
  phone_numbers: PhoneNumber[];
};

// Voice Types
export type Voice = {
  id: string;
  name: string;
  gender: "male" | "female";
  language_code: string;
  provider: string;
  description: string;
};

export type VoicesResponse = {
  voices: Voice[];
};

export type VoiceSelectionResponse = {
  voice: Voice;
};

export type VoiceSelectionUpdateResponse = {
  message: string;
  voice: Voice;
};

// Health Check
export type HealthResponse = {
  status: string;
  service: string;
};

// Call History & Spam Scoring Types
export type CallRecord = {
  id: string;
  call_sid: string;
  from_number: string;
  to_number: string;
  direction: string;
  status: string;
  outcome?: string;
  start_time: string | null;
  end_time?: string | null;
  duration_seconds?: number;
  spam_score?: number;
  spam_flags?: string[];
  interrupted_count?: number;
  created_at: string;
};

export type ListCallsResponse = {
  calls: CallRecord[];
  pagination: Pagination;
};

// Tenant Analytics Types
export type TenantAnalyticsResponse = {
  window_days: number;
  calls: {
    total: number;
    completed: number;
    failed: number;
  };
  avg_duration_seconds: number;
  call_volume_by_day: Array<{ date: string; count: number }>;
  interruptions: {
    total: number;
    rate_per_call: number;
  };
  spam: {
    flagged: number;
    rate: number;
    threshold: number;
  };
};

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const tenantApi = {
  getProfile(signal?: AbortSignal) {
    return request<TenantProfileResponse>("/tenant/profile", { auth: true, signal });
  },
  updateProfile(payload: TenantProfilePayload) {
    return request<TenantProfileUpdateResponse>("/tenant/profile", {
      method: "PUT",
      auth: true,
      body: payload
    });
  },
  getAgentConfig(signal?: AbortSignal) {
    return request<AgentConfig>("/tenant/agent-config", { auth: true, signal });
  },
  updateAgentConfig(payload: AgentConfigPayload) {
    return request<AgentConfigUpdateResponse>("/tenant/agent-config", {
      method: "PUT",
      auth: true,
      body: payload
    });
  },
  async getPhoneNumbers(signal?: AbortSignal): Promise<PhoneNumbersResponse> {
    const data = await request<{ phone_numbers?: PhoneNumberApiRow[] }>(
      "/tenant/phone-numbers",
      { auth: true, signal }
    );
    return {
      phone_numbers: (data.phone_numbers ?? []).map(normalizePhoneNumber)
    };
  },
  getVoices(signal?: AbortSignal) {
    return request<VoicesResponse>("/tenant/voices", { auth: true, signal });
  },
  async previewVoice(voiceId: string): Promise<string> {
    const token = authSession.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      const trimmed = token.trim();
      if (trimmed.split(".").length === 3) headers.Authorization = `Bearer ${trimmed}`;
    }
    const base = appConfig.apiBaseUrl.replace(/\/+$/, "");
    const res = await fetch(`${base}/tenant/voices/${encodeURIComponent(voiceId)}/preview`, { headers });
    if (!res.ok) throw new ApiError("Voice preview not available", res.status, null);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
  getVoiceSelection(signal?: AbortSignal) {
    return request<VoiceSelectionResponse>("/tenant/voice-selection", { auth: true, signal });
  },
  setVoiceSelection(voiceId: string) {
    return request<VoiceSelectionUpdateResponse>("/tenant/voice-selection", {
      method: "PUT",
      auth: true,
      body: { voice_id: voiceId }
    });
  },
  health() {
    return request<HealthResponse>("/tenant/health");
  },
  getAgentConfigHistory(params?: { page?: number; per_page?: number }, signal?: AbortSignal) {
    return request<AgentConfigHistoryResponse>(`/tenant/agent-config/history${qs(params ?? {})}`, { auth: true, signal });
  },
  rollbackAgentConfig(historyId: string) {
    return request<AgentConfigRollbackResponse>(`/tenant/agent-config/rollback/${historyId}`, {
      method: "POST",
      auth: true
    });
  },
  getCalls(params?: { min_spam_score?: number; status?: string; page?: number; per_page?: number }, signal?: AbortSignal) {
    return request<ListCallsResponse>(`/tenant/calls${qs(params ?? {})}`, { auth: true, signal });
  },
  getAnalytics(params?: { days?: number }, signal?: AbortSignal) {
    return request<TenantAnalyticsResponse>(`/tenant/analytics${qs(params ?? {})}`, { auth: true, signal });
  }
};
