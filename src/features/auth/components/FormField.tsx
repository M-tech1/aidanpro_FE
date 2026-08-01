import { InputHTMLAttributes, forwardRef, useState } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
};

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ id, label, error, type, ...props }, ref) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isPasswordField = type === "password";
    const inputType = isPasswordField && isPasswordVisible ? "text" : type;

    return (
      <div className="form-field">
        <label htmlFor={id}>{label}</label>
        {isPasswordField ? (
          <div className="form-field-input-wrapper">
            <input id={id} ref={ref} type={inputType} {...props} />
            <button
              type="button"
              className="password-toggle-button"
              onClick={() => setIsPasswordVisible((prev) => !prev)}
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            >
              {isPasswordVisible ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4.2 3.1L3.1 4.2l2.4 2.4C3.7 8 2.5 9.9 2 12c1.5 4.5 5.6 7.5 10 7.5 2.2 0 4.3-.8 6.1-2.1l1.7 1.7 1.1-1.1L4.2 3.1zm7.8 5.4c1.9 0 3.5 1.6 3.5 3.5 0 .7-.2 1.4-.6 1.9l-4.8-4.8c.6-.4 1.2-.6 1.9-.6zm0 9.4c-3.6 0-6.9-2.3-8.3-5.9.4-1.3 1.2-2.5 2.2-3.4l1.8 1.8c-.2.5-.3 1-.3 1.6 0 2.5 2 4.5 4.5 4.5.6 0 1.1-.1 1.6-.3l1.5 1.5c-.9.2-1.9.2-3 .2zm8.3-5.9c-.6 1.8-1.8 3.4-3.3 4.5l-1.1-1.1c1.1-.9 2-2.1 2.4-3.5-1.4-3.6-4.7-5.9-8.3-5.9-.8 0-1.6.1-2.4.3L6.3 5c1.2-.4 2.4-.7 3.7-.7 4.4 0 8.5 3 10 7.5z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 5c4.4 0 8.5 3 10 7-1.5 4-5.6 7-10 7S3.5 16 2 12c1.5-4 5.6-7 10-7zm0 1.6c-3.6 0-6.9 2.3-8.3 5.4 1.4 3.1 4.7 5.4 8.3 5.4s6.9-2.3 8.3-5.4c-1.4-3.1-4.7-5.4-8.3-5.4zm0 2.4a3 3 0 110 6 3 3 0 010-6zm0 1.6a1.4 1.4 0 100 2.8 1.4 1.4 0 000-2.8z" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          <input id={id} ref={ref} type={type} {...props} />
        )}
        {error ? <small className="field-error">{error}</small> : null}
      </div>
    );
  }
);

FormField.displayName = "FormField";



