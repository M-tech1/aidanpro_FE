import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { FormField } from "@/features/auth/components/FormField";
import { AuthFormActions } from "@/features/auth/components/AuthFormActions";
import { LoginFormValues, loginSchema } from "@/features/auth/schemas/authSchemas";
import { authApi } from "@/features/auth/api/authApi";
import { authSession } from "@/shared/session/authSession";
import { ApiError } from "@/shared/api/httpClient";

export function LoginPage() {
  const navigate = useNavigate();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormMessage(null);
    setFormError(null);
    try {
      const response = await authApi.signIn(values);
      
      // Debug: Log the response structure
      console.log("Sign in response:", response);
      
      if (response.session?.access_token) {
        const accessToken = response.session.access_token.trim();
        
        // Validate JWT format (should have 3 parts separated by dots)
        const tokenParts = accessToken.split(".");
        if (tokenParts.length !== 3) {
          console.error("Invalid token format. Token parts:", tokenParts.length);
          setFormError(`Invalid token format received from server. Expected 3 parts, got ${tokenParts.length}.`);
          return;
        }
        
        // Store tokens and role
        authSession.setTokens({
          accessToken: accessToken,
          refreshToken: response.session.refresh_token?.trim(),
          isSuperAdmin: response.user?.is_super_admin === true,
          expiresAt: response.session.expires_at
        });

        // Verify token was stored correctly
        const storedToken = authSession.getAccessToken();
        if (!storedToken || storedToken !== accessToken) {
          console.error("Token storage verification failed");
          setFormError("Failed to store authentication token.");
          return;
        }

        navigate(response.user?.is_super_admin === true ? "/super-admin" : "/dashboard");
      } else {
        console.error("Response missing session or access_token:", response);
        setFormError("Invalid response from server. Missing access token.");
      }
    } catch (error) {
      console.error("Sign in error:", error);
      const message =
        error instanceof ApiError ? error.message : "Unable to sign in.";
      setFormError(message);
    }
  };

  return (
    <AuthCard
      title="Welcome Back"
      subtitle="Sign in to continue to your account."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        {formMessage ? <p className="form-status">{formMessage}</p> : null}
        {formError ? <p className="form-status error">{formError}</p> : null}
        <FormField
          id="email"
          label="Work Email"
          type="email"
          placeholder="admin@company.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <AuthFormActions
          submitLabel="Sign in"
          isSubmitting={isSubmitting}
          helperAction={<Link to="/auth/forgot-password">Forgot password?</Link>}
        />
      </form>
    </AuthCard>
  );
}

