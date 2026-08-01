import { request } from "@/shared/api/httpClient";

export type SignInRequest = {
  email: string;
  password: string;
};

export type SignUpRequest = {
  email: string;
  password: string;
  company_name: string;
  timezone: string;
  industry: string;
  country: string;
};

export type AuthResponse = {
  message?: string;
  user?: {
    id: string;
    email: string;
    is_super_admin?: boolean;
  };
  tenant?: {
    id: string;
    name: string;
    role: string;
    timezone?: string;
    industry?: string;
    status?: string;
  };
  session: {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
  };
};

export type RefreshRequest = {
  refresh_token: string;
};

export type ForgotPasswordRequest = {
  email: string;
  redirect_to?: string;
};

export type ResetPasswordRequest = {
  token?: string;
  email?: string;
  new_password: string;
  access_token?: string;
};

export type TenantProfileResponse = {
  tenant: {
    id: string;
    name: string;
    timezone: string;
    industry: string;
    status: string;
    default_email_recipients: string[];
    created_at: string;
    updated_at: string;
  };
  user_role: string;
};

export const authApi = {
  signIn(payload: SignInRequest) {
    return request<AuthResponse>("/auth/signin", {
      method: "POST",
      body: payload
    });
  },
  signUp(payload: SignUpRequest) {
    return request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: payload
    });
  },
  me() {
    return request<TenantProfileResponse>("/auth/me", { auth: true });
  },
  refresh(payload: RefreshRequest) {
    return request<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: payload
    });
  },
  forgotPassword(payload: ForgotPasswordRequest) {
    return request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: payload
    });
  },
  resetPassword(payload: ResetPasswordRequest) {
    return request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: payload
    });
  },
  signOut() {
    return request<{ message?: string }>("/auth/signout", {
      method: "POST",
      auth: true
    });
  },
  health() {
    return request<{ status?: string; message?: string }>("/auth/health");
  }
};


