import { Outlet } from "react-router-dom";
import sidebarImage from "@/assets/sidebar_image.png";

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconZap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconHeadphones = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);

export function AuthLayout() {
  return (
    <main className="auth-shell">
      <section
        className="auth-info-panel"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(4,13,31,0.92) 0%, rgba(11,23,51,0.88) 50%, rgba(15,23,42,0.94) 100%), url(${sidebarImage})`
        }}
      >
        {/* Animated background orbs */}
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />

        <div className="auth-panel-content">
          <p className="auth-kicker">Secure Access</p>
          <h1>Aidan Pro</h1>
          <p>
            AI-powered voice agents for modern businesses. Automate calls, capture leads, and delight customers 24/7.
          </p>

          <ul className="auth-feature-list">
            <li className="auth-feature-item">
              <span className="auth-feature-icon"><IconHeadphones /></span>
              Natural-sounding AI voice agents
            </li>
            <li className="auth-feature-item">
              <span className="auth-feature-icon"><IconZap /></span>
              Real-time call handling & routing
            </li>
            <li className="auth-feature-item">
              <span className="auth-feature-icon"><IconShield /></span>
              Enterprise-grade security & compliance
            </li>
          </ul>
        </div>
      </section>

      <section className="auth-form-panel">
        <Outlet />
      </section>
    </main>
  );
}
