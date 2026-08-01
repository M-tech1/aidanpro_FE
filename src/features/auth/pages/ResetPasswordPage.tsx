import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { FormField } from "@/features/auth/components/FormField";
import { AuthFormActions } from "@/features/auth/components/AuthFormActions";
import {
  ResetPasswordFormValues,
  resetPasswordSchema
} from "@/features/auth/schemas/authSchemas";
import { authApi } from "@/features/auth/api/authApi";
import { ApiError } from "@/shared/api/httpClient";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token")?.trim() ?? "";
  const emailFromUrl = searchParams.get("email")?.trim() ?? "";
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: emailFromUrl,
      newPassword: "",
      confirmPassword: ""
    }
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setFormMessage(null);
    setFormError(null);
    if (!tokenFromUrl) {
      setFormError("Reset token is missing or invalid. Please use the reset link from your email.");
      return;
    }
    try {
      const response = await authApi.resetPassword({
        token: tokenFromUrl,
        email: values.email,
        new_password: values.newPassword
      });
      setFormMessage(response.message || "Password reset successful.");
      reset({
        email: values.email,
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to reset password. Please try again.";
      setFormError(message);
    }
  };

  return (
    <AuthCard
      title="Reset Password"
      subtitle="Enter your email and a new password."
      footer={
        <p>
          Back to <Link to="/auth/login">Sign in</Link>
        </p>
      }
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
          id="newPassword"
          label="New Password"
          type="password"
          placeholder="Enter your new password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <FormField
          id="confirmPassword"
          label="Confirm New Password"
          type="password"
          placeholder="Confirm your new password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <AuthFormActions submitLabel="Reset password" isSubmitting={isSubmitting} />
      </form>
    </AuthCard>
  );
}

