import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  handleReset = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #f8fafc)",
        padding: 24
      }}>
        <div style={{
          maxWidth: 480,
          width: "100%",
          background: "var(--surface, #fff)",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: 14,
          padding: "36px 32px",
          textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.07)"
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠</div>
          <h2 style={{ margin: "0 0 8px", fontSize: "1.25rem", color: "var(--text-primary, #1e293b)" }}>
            Something went wrong
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: "0.875rem", color: "var(--text-muted, #64748b)" }}>
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              background: "var(--brand-blue, #3b82f6)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 24px",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
