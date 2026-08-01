import { request } from "@/shared/api/httpClient";

export type HubspotIntegrationRow = {
  id: string;
  type: string;
  status: string;
  connected_at?: string | null;
  last_test_at?: string | null;
  error_message?: string | null;
  config?: Record<string, unknown>;
};

export type HubspotConnectionResponse = {
  connected: boolean;
  integration: HubspotIntegrationRow | null;
};

export type HubspotConnectBody = {
  access_token?: string;
  private_app_access_token?: string;
};

export type HubspotConnectResponse = {
  message: string;
  integration: HubspotIntegrationRow;
};

export const hubspotApi = {
  getConnection() {
    return request<HubspotConnectionResponse>("/integrations/hubspot/connection", { auth: true });
  },
  connect(body: HubspotConnectBody) {
    return request<HubspotConnectResponse>("/integrations/hubspot/connection", {
      method: "POST",
      auth: true,
      body
    });
  },
  disconnect() {
    return request<{ message: string }>("/integrations/hubspot/connection", {
      method: "DELETE",
      auth: true
    });
  }
};
