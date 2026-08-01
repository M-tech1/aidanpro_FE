import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { authSession } from "@/shared/session/authSession";
import { useState } from "react";

const IconGrid = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
  </svg>
);
const IconBuilding = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconActivity = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconBan = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);
const IconLogOut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);
const IconBotLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10h-1.2a7 7 0 0 1-11.6 0H5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1z" />
    <path d="M12 18v4M8 22h8" />
  </svg>
);
const IconMenu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12h18M3 6h18M3 18h18" />
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const NAV_GROUPS = [
  {
    label: "Overview",
    links: [
      { to: "/super-admin", end: true as const, label: "Dashboard", icon: <IconGrid /> }
    ]
  },
  {
    label: "Tenant Management",
    links: [
      { to: "/super-admin/tenants", end: false as const, label: "Tenants", icon: <IconBuilding /> },
      { to: "/super-admin/twilio", end: false as const, label: "Twilio Numbers", icon: <IconPhone /> }
    ]
  },
  {
    label: "Monitoring",
    links: [
      { to: "/super-admin/monitoring", end: false as const, label: "Monitoring", icon: <IconActivity /> }
    ]
  },
  {
    label: "Platform",
    links: [
      { to: "/super-admin/admins", end: false as const, label: "Super Admins", icon: <IconShield /> },
      { to: "/super-admin/spam-numbers", end: false as const, label: "Spam Numbers", icon: <IconBan /> }
    ]
  }
];

function SidebarNav({ onLinkClick }: { onLinkClick?: () => void }) {
  return (
    <nav className="dashboard-nav">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="nav-section">
          <span className="nav-section-label">{group.label}</span>
          {group.links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `dashboard-nav-link${isActive ? " active" : ""}`}
              onClick={onLinkClick}
            >
              <span className="nav-link-icon">{link.icon}</span>
              <span className="nav-link-text">{link.label}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function SuperAdminLayout() {
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleSignOut = () => {
    authSession.clear();
    navigate("/auth/login");
  };

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-header">
          <div className="dashboard-logo-wrapper">
            <div className="dashboard-logo-icon">
              <IconBotLogo />
            </div>
            <div>
              <h1 className="dashboard-logo">Aidan Pro</h1>
              <div style={{ fontSize: 10, color: "var(--color-brand)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 1 }}>
                Super Admin
              </div>
            </div>
          </div>
        </div>

        <SidebarNav />

        <div className="dashboard-sidebar-footer">
          <Link
            to="/dashboard"
            className="dashboard-signout-button"
            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 6, opacity: 0.75 }}
          >
            <span className="nav-link-icon"><IconArrowLeft /></span>
            Org Dashboard
          </Link>
          <button onClick={handleSignOut} className="dashboard-signout-button">
            <IconLogOut />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <button
            className="dashboard-menu-toggle"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open menu"
          >
            <IconMenu />
          </button>
          <span className="dashboard-header-logo">Aidan Pro · Super Admin</span>
        </header>

        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>

      {isMobileOpen && (
        <div className="dashboard-mobile-menu" role="dialog" aria-modal="true">
          <div className="dashboard-mobile-menu-header">
            <div className="dashboard-logo-wrapper">
              <div className="dashboard-logo-icon"><IconBotLogo /></div>
              <span className="dashboard-logo">Aidan Pro · Super Admin</span>
            </div>
            <button
              className="dashboard-menu-close"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Close menu"
            >
              <IconX />
            </button>
          </div>
          <div className="dashboard-mobile-nav">
            <SidebarNav onLinkClick={() => setIsMobileOpen(false)} />
          </div>
          <div style={{ padding: "12px 0 0" }}>
            <Link
              to="/dashboard"
              className="dashboard-signout-button"
              style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 6, opacity: 0.75 }}
              onClick={() => setIsMobileOpen(false)}
            >
              <span className="nav-link-icon"><IconArrowLeft /></span>
              Org Dashboard
            </Link>
            <button onClick={handleSignOut} className="dashboard-signout-button">
              <IconLogOut />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
