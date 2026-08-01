import { request } from "@/shared/api/httpClient";

// ─── Tenant Management ────────────────────────────────────────────────────────

export type TenantSummary = {
  id: string;
  name: string;
  status: string;
  industry?: string;
  timezone?: string;
  country?: string;
  created_at: string;
};

export type TenantDetail = {
  id: string;
  name: string;
  status: string;
  timezone: string;
  industry: string;
  country?: string;
  default_email_recipients?: string[];
  created_at: string;
};

export type AgentConfig = {
  id?: string;
  tenant_id?: string;
  greeting: string;
  tone: string;
  store_transcripts: boolean;
  store_recordings: boolean;
  retention_days: number;
};

export type Pagination = {
  page: number;
  per_page: number;
  total: number;
  pages: number;
};

export type CreateTenantPayload = {
  company_name: string;
  owner_email: string;
  owner_password: string;
  timezone: string;
  industry: string;
  country: string;
};

export type CreateTenantResponse = {
  message: string;
  tenant: TenantSummary & { default_email_recipients: string[] };
  owner: { user_id: string; email: string };
};

export type ListTenantsResponse = {
  tenants: TenantSummary[];
  pagination?: Pagination;
};

export type GetTenantResponse = {
  tenant: TenantDetail;
  agent_config: AgentConfig;
};

export type DeleteTenantDryRun = {
  message: string;
  impact: { tenant_name: string; users_to_unlink: number; phone_numbers_to_remove: number };
};

export type DeleteTenantConfirmed = {
  message: string;
  deleted: { tenant_name: string; users_to_unlink: number; phone_numbers_to_remove: number };
};

export type UpdateStatusResponse = {
  message: string;
  tenant: { id: string; name?: string; status: string };
};

export type UsageResponse = {
  tenant: { id: string; name: string; status: string; plan: string; created_at: string };
  usage: {
    total_users: number;
    users_by_role: Record<string, number>;
    total_phone_numbers: number;
    active_phone_numbers: number;
    total_calls: number;
  };
};

export type TenantUser = {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export type ListTenantUsersResponse = {
  tenant_id: string;
  users: TenantUser[];
};

// ─── Twilio Numbers ───────────────────────────────────────────────────────────

export type PhoneNumberRecord = {
  id: string;
  tenant_id: string;
  phone_number: string;
  twilio_number_sid: string;
  country_code: string;
  status: string;
  created_at: string;
  tenants?: { id: string; name: string; status: string };
  twilio?: { voice_url: string; status: string; friendly_name: string };
};

export type ListNumbersResponse = {
  numbers: PhoneNumberRecord[];
  pagination: Pagination;
};

export type UnassignedNumber = {
  sid: string;
  phone_number: string;
  friendly_name: string;
  voice_url: string;
  in_db: boolean;
};

export type UnassignedNumbersResponse = {
  unassigned_count: number;
  unassigned_numbers: UnassignedNumber[];
};

export type ReleaseNumberResponse = {
  message: string;
  number: { sid: string; phone_number: string; tenant_name?: string; in_twilio: boolean; in_db: boolean };
};

export type AssignNumberResponse = {
  message: string;
  number: { id: string; phone_number: string; tenant_id: string; status: string };
  previous_tenant?: { id: string; name: string };
};

// ─── Monitoring ───────────────────────────────────────────────────────────────

export type CallRecord = {
  id: string;
  tenant_id: string | null;
  call_sid: string;
  from_number: string;
  to_number: string;
  direction: string;
  status: string;
  outcome?: string;
  duration_seconds?: number;
  start_time: string | null;
  end_time?: string;
  created_at: string;
  tenants?: { id: string; name: string };
  spam_score?: number;
  spam_flags?: string[];
  interrupted_count?: number;
};

export type ListCallsResponse = {
  calls: CallRecord[];
  pagination: Pagination;
};

export type HealthResponse = {
  overall: string;
  timestamp: string;
  components: Record<string, { status: string; [key: string]: unknown }>;
};

export type AnalyticsResponse = {
  generated_at: string;
  tenants: {
    total: number;
    by_status: Record<string, number>;
    by_plan?: Record<string, number>;
  };
  users: { total: number };
  phone_numbers: { total: number; active: number };
  calls: { total_calls: number; calls_last_7_days: number; calls_last_30_days: number };
  top_tenants_by_calls: Array<{ tenant_id: string; tenant_name: string; call_count: number }>;
};

export type EmailLog = {
  id: string;
  tenant_id: string;
  call_id?: string;
  email_type: string;
  recipients: string[];
  subject: string;
  status: string;
  error_message?: string | null;
  sent_at?: string | null;
  created_at: string;
  tenants?: { id: string; name: string };
};

export type ListEmailLogsResponse = {
  email_logs: EmailLog[];
  pagination: Pagination;
};

export type RecordingRecord = {
  id: string;
  tenant_id: string | null;
  call_id?: string | null;
  recording_sid: string;
  status: string;
  duration_seconds?: number;
  recording_url?: string | null;
  created_at: string;
  tenants?: { id: string; name: string };
};

export type ListRecordingsResponse = {
  recordings: RecordingRecord[];
  pagination: Pagination;
};

// ─── Spam Management ────────────────────────────────────────────────────────

export type SpamNumber = {
  id: string;
  phone_number: string;
  reason?: string;
  added_by?: string;
  created_at: string;
};

export type ListSpamNumbersResponse = {
  spam_numbers: SpamNumber[];
  pagination: Pagination;
};

export type AddSpamNumberResponse = {
  message: string;
  spam_number: SpamNumber;
};

export type RemoveSpamNumberResponse = {
  message: string;
};

export type SpamMonitoringResponse = {
  window_days: number;
  spam_threshold: number;
  summary: {
    total_calls: number;
    flagged_calls: number;
    flagged_rate: number;
  };
  top_offenders: Array<{ from_number: string; flagged_calls: number; max_spam_score: number }>;
  flagged_calls: Array<{
    id: string;
    tenant_id: string | null;
    call_sid: string;
    from_number: string;
    to_number: string;
    status: string;
    spam_score: number;
    spam_flags: string[];
    created_at: string;
  }>;
  pagination: Pagination;
};

// ─── Instant Provisioning ────────────────────────────────────────────────────

export type QuickCreateTenantPayload = {
  company_name: string;
  owner_email: string;
  owner_password: string;
  industry: string;
  timezone: string;
  agent_pack_id?: string;
  voice_id?: string;
};

export type QuickCreateTenantResponse = {
  message: string;
  tenant: TenantSummary;
  owner: { user_id: string; email: string };
  agent_config: {
    tenant_id: string;
    greeting?: string;
    tone?: string;
    escalation_rules?: Record<string, unknown>;
    allowed_actions?: string[];
    agent_pack_id?: string;
    system_prompt?: string;
    voice_id?: string;
    store_transcripts?: boolean;
    store_recordings?: boolean;
    retention_days?: number;
  };
  applied_pack?: { id: string; name: string };
  voice?: { id: string; name: string; gender: string; language_code: string; provider: string; description: string };
};

// ─── Super Admins ─────────────────────────────────────────────────────────────

export type SuperAdmin = {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
};

export type ListSuperAdminsResponse = { super_admins: SuperAdmin[] };
export type AddSuperAdminResponse = { message: string; super_admin: SuperAdmin };
export type RemoveSuperAdminResponse = { message: string };

// ─── API client ───────────────────────────────────────────────────────────────

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const superAdminApi = {
  // Tenants
  createTenant: (payload: CreateTenantPayload) =>
    request<CreateTenantResponse>("/admin/tenants", { method: "POST", body: payload, auth: true }),

  listTenants: (params?: { status?: string; plan?: string; search?: string; page?: number; per_page?: number }, signal?: AbortSignal) =>
    request<ListTenantsResponse>(`/admin/tenants${qs(params ?? {})}`, { auth: true, signal }),

  getTenant: (id: string, signal?: AbortSignal) =>
    request<GetTenantResponse>(`/admin/tenants/${id}`, { auth: true, signal }),

  deleteTenant: (id: string, confirm?: boolean) =>
    request<DeleteTenantDryRun | DeleteTenantConfirmed>(
      `/admin/tenants/${id}${confirm ? "?confirm=true" : ""}`,
      { method: "DELETE", auth: true }
    ),

  updateStatus: (id: string, payload: { status: string; reason?: string }) =>
    request<UpdateStatusResponse>(`/admin/tenants/${id}/status`, { method: "PATCH", body: payload, auth: true }),

  getTenantUsage: (id: string, signal?: AbortSignal) =>
    request<UsageResponse>(`/admin/tenants/${id}/usage`, { auth: true, signal }),

  listTenantUsers: (id: string, signal?: AbortSignal) =>
    request<ListTenantUsersResponse>(`/admin/tenants/${id}/users`, { auth: true, signal }),

  // Twilio Numbers
  listNumbers: (params?: { tenant_id?: string; status?: string; enrich?: boolean; page?: number; per_page?: number }, signal?: AbortSignal) =>
    request<ListNumbersResponse>(`/admin/twilio/numbers${qs(params ?? {})}`, { auth: true, signal }),

  listUnassignedNumbers: (signal?: AbortSignal) =>
    request<UnassignedNumbersResponse>("/admin/twilio/numbers/unassigned", { auth: true, signal }),

  releaseNumber: (sid: string, confirm?: boolean) =>
    request<ReleaseNumberResponse>(
      `/admin/twilio/numbers/${sid}${confirm ? "?confirm=true" : ""}`,
      { method: "DELETE", auth: true }
    ),

  assignNumber: (sid: string, tenantId: string) =>
    request<AssignNumberResponse>(`/admin/twilio/numbers/${sid}/assign`, { method: "POST", body: { tenant_id: tenantId }, auth: true }),

  // Monitoring
  listCalls: (params?: { tenant_id?: string; status?: string; from_date?: string; to_date?: string; page?: number; per_page?: number }, signal?: AbortSignal) =>
    request<ListCallsResponse>(`/admin/monitoring/calls${qs(params ?? {})}`, { auth: true, signal }),

  getHealth: (signal?: AbortSignal) =>
    request<HealthResponse>("/admin/monitoring/health", { auth: true, signal }),

  getAnalytics: (signal?: AbortSignal) =>
    request<AnalyticsResponse>("/admin/monitoring/analytics", { auth: true, signal }),

  listEmailLogs: (params?: { tenant_id?: string; status?: string; from_date?: string; to_date?: string; page?: number; per_page?: number }, signal?: AbortSignal) =>
    request<ListEmailLogsResponse>(`/admin/monitoring/email-logs${qs(params ?? {})}`, { auth: true, signal }),

  listRecordings: (params?: { tenant_id?: string; status?: string; page?: number; per_page?: number }, signal?: AbortSignal) =>
    request<ListRecordingsResponse>(`/admin/monitoring/recordings${qs(params ?? {})}`, { auth: true, signal }),

  // Super Admins
  listSuperAdmins: (signal?: AbortSignal) =>
    request<ListSuperAdminsResponse>("/admin/super-admins", { auth: true, signal }),

  addSuperAdmin: (email: string) =>
    request<AddSuperAdminResponse>("/admin/super-admins", { method: "POST", body: { email }, auth: true }),

  removeSuperAdmin: (userId: string) =>
    request<RemoveSuperAdminResponse>(`/admin/super-admins/${userId}`, { method: "DELETE", auth: true }),

  // Spam Management
  listSpamNumbers: (params?: { page?: number; per_page?: number }, signal?: AbortSignal) =>
    request<ListSpamNumbersResponse>(`/admin/spam-numbers${qs(params ?? {})}`, { auth: true, signal }),

  addSpamNumber: (payload: { phone_number: string; reason?: string }) =>
    request<AddSpamNumberResponse>("/admin/spam-numbers", { method: "POST", body: payload, auth: true }),

  removeSpamNumber: (id: string) =>
    request<RemoveSpamNumberResponse>(`/admin/spam-numbers/${id}`, { method: "DELETE", auth: true }),

  getSpamMonitoring: (params?: { days?: number; min_spam_score?: number; page?: number; per_page?: number }, signal?: AbortSignal) =>
    request<SpamMonitoringResponse>(`/admin/monitoring/spam${qs(params ?? {})}`, { auth: true, signal }),

  // Instant Provisioning
  quickCreateTenant: (payload: QuickCreateTenantPayload) =>
    request<QuickCreateTenantResponse>("/admin/tenants/quick-create", { method: "POST", body: payload, auth: true }),
};
