import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error("Landing page caught error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: "2rem", fontFamily: "sans-serif", textAlign: "center" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#6b21a8" }}>HiMewo Apps</h1>
          <p style={{ marginTop: "1rem", color: "#475569" }}>Something went wrong. Click below to reload.</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: "1.5rem", padding: "0.75rem 1.5rem", backgroundColor: "#7e22ce", color: "#fff", border: "none", borderRadius: "0.75rem", cursor: "pointer", fontWeight: "bold" }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
