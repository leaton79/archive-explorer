import { useState, useEffect } from "react";
import {
  getCollections,
  createCollection,
  deleteCollection,
  getSmartFilters,
  deleteSmartFilter,
} from "../../lib/tauri-commands";
import type { UserCollection, SmartFilter } from "../../lib/types";

interface CollectionsSidebarProps {
  activeCollectionId: number | null;
  activeSmartFilterId: number | null;
  onSelectCollection: (id: number | null) => void;
  onSelectSmartFilter: (filter: SmartFilter | null) => void;
  onCreateSmartFilter: () => void;
  refreshKey: number;
}

const COLORS = ["#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed", "#ec4899", "#0891b2", "#65a30d"];

export function CollectionsSidebar({
  activeCollectionId,
  activeSmartFilterId,
  onSelectCollection,
  onSelectSmartFilter,
  onCreateSmartFilter,
  refreshKey,
}: CollectionsSidebarProps) {
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [smartFilters, setSmartFilters] = useState<SmartFilter[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);

  const refresh = async () => {
    const [cols, filters] = await Promise.all([getCollections(), getSmartFilters()]);
    setCollections(cols);
    setSmartFilters(filters);
  };

  useEffect(() => {
    refresh();
  }, [refreshKey]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createCollection(newName.trim(), undefined, newColor);
    setNewName("");
    setShowNewForm(false);
    refresh();
  };

  const handleDeleteCollection = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeCollectionId === id) onSelectCollection(null);
    await deleteCollection(id);
    refresh();
  };

  const handleDeleteSmartFilter = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeSmartFilterId === id) onSelectSmartFilter(null);
    await deleteSmartFilter(id);
    refresh();
  };

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: "1px solid var(--border)",
        paddingRight: 16,
        overflowY: "auto",
        maxHeight: "calc(100vh - 180px)",
      }}
    >
      {/* All Saved */}
      <button
        onClick={() => {
          onSelectCollection(null);
          onSelectSmartFilter(null);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "8px 10px",
          border: "none",
          borderRadius: "var(--radius-sm)",
          background:
            activeCollectionId === null && activeSmartFilterId === null
              ? "var(--accent-light)"
              : "transparent",
          color: "var(--text-primary)",
          cursor: "pointer",
          fontSize: "0.85rem",
          fontWeight: 500,
          fontFamily: "var(--font-body)",
          textAlign: "left",
          marginBottom: 4,
        }}
      >
        📚 All Saved
      </button>

      {/* Collections header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 16,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Collections
        </span>
        <button
          className="btn-icon"
          onClick={() => setShowNewForm(!showNewForm)}
          style={{ fontSize: "0.85rem" }}
          title="New collection"
        >
          +
        </button>
      </div>

      {/* New collection form */}
      {showNewForm && (
        <div
          style={{
            padding: 8,
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-sm)",
            marginBottom: 6,
          }}
        >
          <input
            className="input"
            placeholder="Collection name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            style={{ fontSize: "0.8rem", padding: "5px 8px", marginBottom: 6 }}
            autoFocus
          />
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            {COLORS.map((c) => (
              <div
                key={c}
                onClick={() => setNewColor(c)}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: c,
                  cursor: "pointer",
                  border: newColor === c ? "2px solid var(--text-primary)" : "2px solid transparent",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} style={{ fontSize: "0.72rem" }}>
              Create
            </button>
            <button className="btn btn-sm" onClick={() => setShowNewForm(false)} style={{ fontSize: "0.72rem" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Collection list */}
      {collections.map((col) => (
        <button
          key={col.id}
          onClick={() => {
            onSelectSmartFilter(null);
            onSelectCollection(col.id === activeCollectionId ? null : col.id);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "6px 10px",
            border: "none",
            borderRadius: "var(--radius-sm)",
            background: activeCollectionId === col.id ? "var(--accent-light)" : "transparent",
            color: "var(--text-primary)",
            cursor: "pointer",
            fontSize: "0.82rem",
            fontFamily: "var(--font-body)",
            textAlign: "left",
            marginBottom: 2,
            position: "relative",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: col.color || "var(--accent)",
              flexShrink: 0,
            }}
          />
          <span className="truncate" style={{ flex: 1 }}>
            {col.name}
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{col.item_count}</span>
          <span
            className="btn-icon"
            onClick={(e) => handleDeleteCollection(col.id, e)}
            style={{ fontSize: "0.68rem", padding: 2, opacity: 0.4 }}
            title="Delete"
          >
            ✕
          </span>
        </button>
      ))}

      {collections.length === 0 && !showNewForm && (
        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "4px 10px" }}>
          No collections yet
        </div>
      )}

      {/* Smart Filters header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 20,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Smart Filters
        </span>
        <button
          className="btn-icon"
          onClick={onCreateSmartFilter}
          style={{ fontSize: "0.85rem" }}
          title="New smart filter"
        >
          +
        </button>
      </div>

      {smartFilters.map((sf) => (
        <button
          key={sf.id}
          onClick={() => {
            onSelectCollection(null);
            onSelectSmartFilter(sf.id === activeSmartFilterId ? null : sf);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "6px 10px",
            border: "none",
            borderRadius: "var(--radius-sm)",
            background: activeSmartFilterId === sf.id ? "var(--accent-light)" : "transparent",
            color: "var(--text-primary)",
            cursor: "pointer",
            fontSize: "0.82rem",
            fontFamily: "var(--font-body)",
            textAlign: "left",
            marginBottom: 2,
          }}
        >
          <span style={{ flexShrink: 0 }}>⚡</span>
          <span className="truncate" style={{ flex: 1 }}>
            {sf.name}
          </span>
          <span
            className="btn-icon"
            onClick={(e) => handleDeleteSmartFilter(sf.id, e)}
            style={{ fontSize: "0.68rem", padding: 2, opacity: 0.4 }}
            title="Delete"
          >
            ✕
          </span>
        </button>
      ))}

      {smartFilters.length === 0 && (
        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "4px 10px" }}>
          No smart filters yet
        </div>
      )}
    </div>
  );
}
