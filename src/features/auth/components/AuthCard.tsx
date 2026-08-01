import { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  subtitle: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function AuthCard({ title, subtitle, footer, children }: AuthCardProps) {
  return (
    <div className="auth-card">
      <header className="auth-card-header">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </header>
      {children}
      {footer ? <footer className="auth-card-footer">{footer}</footer> : null}
    </div>
  );
}



