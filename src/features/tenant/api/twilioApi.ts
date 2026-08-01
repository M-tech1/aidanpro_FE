import { request } from "@/shared/api/httpClient";

export type AvailableNumber = {
  phone_number: string;
  friendly_name?: string | null;
};

export type AvailableNumbersResponse = {
  country_code: string;
  available_numbers: AvailableNumber[];
  next_page_url?: string | null;
};

export type GetAvailableNumbersParams = {
  country?: string;
  area_code?: string;
  page_size?: number;
  page_token?: string;
};

export type BuyPhoneNumberPayload = {
  phone_number?: string;
  area_code?: string;
  country?: string;
};

export type BuyPhoneNumberResponse = {
  sid: string;
  phone_number: string;
  friendly_name?: string | null;
  voice_url?: string | null;
};

export const twilioApi = {
  getAvailableNumbers(params: GetAvailableNumbersParams = {}) {
    const search = new URLSearchParams();
    if (params.country) search.set("country", params.country);
    if (params.area_code) search.set("area_code", params.area_code);
    if (params.page_size) search.set("page_size", String(params.page_size));
    if (params.page_token) search.set("page_token", params.page_token);

    const query = search.toString();
    const path = query ? `/twilio/phone-numbers?${query}` : "/twilio/phone-numbers";
    return request<AvailableNumbersResponse>(path, { auth: true });
  },

  buyPhoneNumber(payload: BuyPhoneNumberPayload) {
    return request<BuyPhoneNumberResponse>("/twilio/phone-numbers/buy", {
      method: "POST",
      auth: true,
      body: payload
    });
  }
};

