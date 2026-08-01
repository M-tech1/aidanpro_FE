import { request } from "@/shared/api/httpClient";

export type GoogleCalendarIntegrationRow = {
  id: string;
  type: string;
  status: string;
  connected_at?: string | null;
  last_test_at?: string | null;
  error_message?: string | null;
  config?: Record<string, unknown>;
};

export type GoogleCalendarConnectionResponse = {
  connected: boolean;
  integration: GoogleCalendarIntegrationRow | null;
};

export type GoogleCalendarOAuthStartResponse = {
  authorization_url: string;
  callback_url: string;
};

export type GoogleCalendarOAuthStartBody = {
  frontend_redirect_url?: string;
};

export const googleCalendarApi = {
  getConnection() {
    return request<GoogleCalendarConnectionResponse>("/integrations/google-calendar/connection", {
      auth: true
    });
  },
  startOAuth(body: GoogleCalendarOAuthStartBody = {}) {
    return request<GoogleCalendarOAuthStartResponse>("/integrations/google-calendar/oauth/start", {
      method: "POST",
      auth: true,
      body
    });
  },
  disconnect() {
    return request<{ message: string }>("/integrations/google-calendar/connection", {
      method: "DELETE",
      auth: true
    });
  }
};
