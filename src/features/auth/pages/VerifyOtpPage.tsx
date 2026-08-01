import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { FormField } from "@/features/auth/components/FormField";
import { AuthFormActions } from "@/features/auth/components/AuthFormActions";
import {
  VerifyOtpFormValues,
  verifyOtpSchema
} from "@/features/auth/schemas/authSchemas";

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      code: ""
    }
  });

  const onSubmit = async (values: VerifyOtpFormValues) => {
    console.info("OTP verification submit (UI only)", values);
    navigate("/auth/reset-password");
  };

  return (
    <AuthCard
      title="Verify OTP"
      subtitle="Enter the 6-digit code sent to your email."
      footer={
        <p>
          Wrong email? <Link to="/auth/forgot-password">Send again</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        <FormField
          id="code"
          label="Verification Code"
          placeholder="123456"
          inputMode="numeric"
          maxLength={6}
          error={errors.code?.message}
          {...register("code")}
        />
        <AuthFormActions submitLabel="Verify code" isSubmitting={isSubmitting} />
      </form>
    </AuthCard>
  );
}



