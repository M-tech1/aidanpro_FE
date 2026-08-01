import { ReactNode } from "react";

type AuthFormActionsProps = {
  submitLabel: string;
  isSubmitting?: boolean;
  helperAction?: ReactNode;
};

export function AuthFormActions({
  submitLabel,
  isSubmitting,
  helperAction
}: AuthFormActionsProps) {
  return (
    <div className="form-actions">
      {helperAction}
      <button type="submit" disabled={Boolean(isSubmitting)}>
        {isSubmitting ? "Please wait..." : submitLabel}
      </button>
    </div>
  );
}



