import { z } from "zod";

const passwordRule =
  "Password must be at least 8 characters and include one uppercase letter, one lowercase letter, and one number.";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

export const signUpSchema = z
  .object({
    companyName: z.string().min(2, "Company name is required."),
    timezone: z.string().min(2, "Timezone is required."),
    industry: z.string().min(2, "Industry is required."),
    country: z.string().length(2, "Select a country."),
    email: z.string().email("Enter a valid email address."),
    password: z
      .string()
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, passwordRule),
    confirmPassword: z.string().min(1, "Please confirm your password.")
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address.")
});

export const verifyOtpSchema = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/, "Enter the 6-digit code sent to your email.")
});

export const resetPasswordSchema = z
  .object({
    email: z.string().email("Enter a valid email address."),
    newPassword: z.string().min(6, "Password must be at least 6 characters long."),
    confirmPassword: z.string().min(1, "Please confirm your new password.")
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;


