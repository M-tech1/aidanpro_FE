import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { FormField } from "@/features/auth/components/FormField";
import { AuthFormActions } from "@/features/auth/components/AuthFormActions";
import {
  SignUpFormValues,
  signUpSchema
} from "@/features/auth/schemas/authSchemas";
import { authApi } from "@/features/auth/api/authApi";
import { authSession } from "@/shared/session/authSession";
import { ApiError } from "@/shared/api/httpClient";
import { DEFAULT_COUNTRY } from "@/shared/config/countries";
import { useAvailableCountries } from "@/shared/config/useAvailableCountries";

export function SignUpPage() {
  const navigate = useNavigate();
  const countries = useAvailableCountries();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      companyName: "",
      timezone: "America/Toronto",
      industry: "",
      country: DEFAULT_COUNTRY,
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = async (values: SignUpFormValues) => {
    setFormError(null);
    try {
      const response = await authApi.signUp({
        email: values.email,
        password: values.password,
        company_name: values.companyName,
        timezone: values.timezone,
        industry: values.industry,
        country: values.country
      });

      if (response.session?.access_token) {
        authSession.setTokens({
          accessToken: response.session.access_token,
          refreshToken: response.session.refresh_token,
          expiresAt: response.session.expires_at
        });
        reset();
        navigate("/auth/login");
      } else {
        setFormError("Invalid response from server. Missing access token.");
      }
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to create account.";
      setFormError(message);
    }
  };

  return (
    <AuthCard
      title="Create Account"
      subtitle="Create your account to get started."
      footer={
        <p>
          Already have an account? <Link to="/auth/login">Sign in</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        {formError ? <p className="form-status error">{formError}</p> : null}
        <FormField
          id="companyName"
          label="Company Name"
          placeholder="Acme Corp"
          autoComplete="organization"
          error={errors.companyName?.message}
          {...register("companyName")}
        />
        <FormField
          id="timezone"
          label="Timezone"
          placeholder="America/Toronto"
          error={errors.timezone?.message}
          {...register("timezone")}
        />
        <FormField
          id="industry"
          label="Industry"
          placeholder="Healthcare"
          error={errors.industry?.message}
          {...register("industry")}
        />
        <div className="form-field">
          <label htmlFor="country">Country</label>
          <select id="country" className="form-field-select" {...register("country")}>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
          {errors.country ? <small className="field-error">{errors.country.message}</small> : null}
        </div>
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
          placeholder="Create a strong password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <FormField
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="Confirm your password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <AuthFormActions submitLabel="Create account" isSubmitting={isSubmitting} />
      </form>
    </AuthCard>
  );
}

