import { useState, useEffect, useRef } from "react";
import { DiscoveryTab } from "./components/discovery/DiscoveryTab";
import { LibraryView } from "./components/library/LibraryView";
import { SearchTab } from "./components/search/SearchTab";
import { ThemePicker } from "./components/settings/ThemePicker";
import { CollectionManager } from "./components/settings/CollectionManager";
import { ToastProvider } from "./components/shared/Toast";
import { useTheme } from "./hooks/useTheme";
import { startSession, endSession, getSessions } from "./lib/tauri-commands";
import type { Session } from "./lib/types";

type Tab = "discover" | "library" | "search" | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const { theme, setTheme } = useTheme();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const sessionIdRef = useRef<number | null>(null);

  // Start a passive session on app launch
  useEffect(() => {
    startSession().then((id) => {
      setSessionId(id);
      sessionIdRef.current = id;
    });

    // End session on app close
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        endSession(sessionIdRef.current);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (sessionIdRef.current) {
        endSession(sessionIdRef.current);
      }
    };
  }, []);

  // Load sessions when settings tab opens
  useEffect(() => {
    if (activeTab === "settings" && showSessions) {
      getSessions(15).then(setSessions);
    }
  }, [activeTab, showSessions]);

  const formatSessionDate = (iso: string) => {
    try {
      const d = new Date(iso + "Z");
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <ToastProvider>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(40px); opacity: 0.8; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div className="app-shell">
        {/* Header */}
        <header className="app-header">
          <div className="app-logo">
            Archive <span>Roulette</span>
          </div>
          <div className="header-actions">
            {sessionId && (
              <span
                style={{
                  fontSize: "0.68rem",
                  color: "var(--success)",
                  marginRight: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
                Session active
              </span>
            )}
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              v1.0.0
            </span>
          </div>
        </header>

        {/* Tab Bar */}
        <nav className="tab-bar">
          <button
            className={`tab-btn ${activeTab === "discover" ? "active" : ""}`}
            onClick={() => setActiveTab("discover")}
          >
            Discovery
          </button>
          <button
            className={`tab-btn ${activeTab === "library" ? "active" : ""}`}
            onClick={() => setActiveTab("library")}
          >
            Library
          </button>
          <button
            className={`tab-btn ${activeTab === "search" ? "active" : ""}`}
            onClick={() => setActiveTab("search")}
          >
            Search
          </button>
          <button
            className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </button>
        </nav>

        {/* Tab Content */}
        <main className="tab-content">
          {activeTab === "discover" && <DiscoveryTab sessionId={sessionId} />}
          {activeTab === "library" && <LibraryView />}
          {activeTab === "search" && <SearchTab />}
          {activeTab === "settings" && (
            <div style={{ maxWidth: 700, margin: "0 auto" }}>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  marginBottom: 24,
                }}
              >
                Settings
              </h2>

              <ThemePicker current={theme} onChange={setTheme} />

              {/* Curated Collections Manager */}
              <div style={{ marginTop: 32 }}>
                <div
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Archive.org Source Collections
                </div>
                <div
                  style={{
                    padding: 16,
                    background: "var(--bg-secondary)",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <CollectionManager />
                </div>
              </div>

              {/* Session History */}
              <div style={{ marginTop: 32 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowSessions(!showSessions)}
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    padding: 0,
                    marginBottom: 10,
                  }}
                >
                  {showSessions ? "▾" : "▸"} Session History
                </button>

                {showSessions && (
                  <div
                    style={{
                      padding: 16,
                      background: "var(--bg-secondary)",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {sessions.length === 0 ? (
                      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        No sessions recorded yet.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {sessions.map((s) => (
                          <div
                            key={s.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "8px 12px",
                              background: "var(--bg-tertiary)",
                              borderRadius: "var(--radius-sm)",
                              fontSize: "0.82rem",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 500 }}>
                                {formatSessionDate(s.started_at)}
                              </div>
                              {!s.ended_at && (
                                <span
                                  style={{
                                    fontSize: "0.72rem",
                                    color: "var(--success)",
                                    fontWeight: 500,
                                  }}
                                >
                                  Active now
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 12,
                                color: "var(--text-muted)",
                                fontSize: "0.78rem",
                              }}
                            >
                              <span>{s.items_seen} seen</span>
                              <span>{s.items_saved} saved</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* About */}
              <div style={{ marginTop: 32 }}>
                <div
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  About
                </div>
                <div
                  style={{
                    padding: 16,
                    background: "var(--bg-secondary)",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    fontSize: "0.87rem",
                    lineHeight: 1.6,
                    color: "var(--text-secondary)",
                  }}
                >
                  <p style={{ marginBottom: 8 }}>
                    <strong>Archive Roulette v1.0.0</strong>
                  </p>
                  <p style={{ marginBottom: 8 }}>
                    A desktop app for discovering, saving, and annotating
                    items from the Internet Archive.
                  </p>
                  <p style={{ marginBottom: 8 }}>
                    Created by{" "}
                    <a
                      href="http://www.LanceEaton.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--accent)" }}
                    >
                      Lance Eaton
                    </a>
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Powered by the{" "}
                    <a
                      href="https://archive.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--accent)" }}
                    >
                      Internet Archive
                    </a>
                    . License: GPL-3.0
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
