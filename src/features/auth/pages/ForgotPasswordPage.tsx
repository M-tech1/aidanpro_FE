import { Link } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { FormField } from "@/features/auth/components/FormField";
import { AuthFormActions } from "@/features/auth/components/AuthFormActions";
import {
  ForgotPasswordFormValues,
  forgotPasswordSchema
} from "@/features/auth/schemas/authSchemas";
import { authApi } from "@/features/auth/api/authApi";
import { ApiError } from "@/shared/api/httpClient";

export function ForgotPasswordPage() {
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ""
    }
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setFormMessage(null);
    setFormError(null);
    try {
      const response = await authApi.forgotPassword({
        email: values.email,
        redirect_to: `${window.location.origin}/auth/reset-password`
      });
      setFormMessage(
        response.message ||
          "If the email exists, a password reset link has been sent."
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to send reset link. Please try again.";
      setFormError(message);
    }
  };

  return (
    <AuthCard
      title="Forgot Password"
      subtitle="Enter your registered email and we will send a password reset link."
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
        <AuthFormActions
          submitLabel="Send reset link"
          isSubmitting={isSubmitting}
        />
      </form>
    </AuthCard>
  );
}



