import { useState, useEffect } from "react";
import {
  getCuratedCollections,
  toggleCollectionPinned,
  toggleCollectionEnabled,
  addCuratedCollection,
  removeCuratedCollection,
} from "../../lib/tauri-commands";
import { useToast } from "../shared/Toast";
import type { CuratedCollection } from "../../lib/types";

export function CollectionManager() {
  const [collections, setCollections] = useState<CuratedCollection[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMediaType, setNewMediaType] = useState("image");
  const [newCollectionId, setNewCollectionId] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [filterType, setFilterType] = useState("all");
  const { toast } = useToast();

  const refresh = async () => {
    const cols = await getCuratedCollections();
    setCollections(cols);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleToggleEnabled = async (col: CuratedCollection) => {
    await toggleCollectionEnabled(col.id, !col.enabled);
    refresh();
  };

  const handleTogglePinned = async (col: CuratedCollection) => {
    await toggleCollectionPinned(col.id, !col.pinned);
    refresh();
    toast(col.pinned ? "Unpinned" : "Pinned to filter bar");
  };

  const handleAdd = async () => {
    if (!newCollectionId.trim()) return;
    await addCuratedCollection(
      newMediaType,
      newCollectionId.trim(),
      newDisplayName.trim() || undefined
    );
    setNewCollectionId("");
    setNewDisplayName("");
    setShowAddForm(false);
    refresh();
    toast("Collection added");
  };

  const handleRemove = async (col: CuratedCollection) => {
    if (col.is_default) {
      toast("Default collections can be disabled but not removed");
      return;
    }
    await removeCuratedCollection(col.id);
    refresh();
    toast("Collection removed");
  };

  const mediaTypes = ["all", "image", "audio", "movies", "texts", "software"];

  const filtered = collections.filter(
    (c) => filterType === "all" || c.media_type === filterType
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {mediaTypes.map((mt) => (
            <button
              key={mt}
              className={`filter-toggle ${filterType === mt ? "active" : ""}`}
              onClick={() => setFilterType(mt)}
              style={{ fontSize: "0.72rem", padding: "3px 8px" }}
            >
              {mt === "all" ? "All" : mt}
            </button>
          ))}
        </div>
        <button
          className="btn btn-sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          + Add Custom
        </button>
      </div>

      {showAddForm && (
        <div
          style={{
            padding: 12,
            background: "var(--bg-tertiary)",
            borderRadius: "var(--radius-sm)",
            marginBottom: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "flex-end",
          }}
        >
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 3 }}>
              Media Type
            </label>
            <select
              className="input"
              value={newMediaType}
              onChange={(e) => setNewMediaType(e.target.value)}
              style={{ width: "auto", fontSize: "0.8rem", padding: "5px 8px" }}
            >
              {mediaTypes.filter((m) => m !== "all").map((mt) => (
                <option key={mt} value={mt}>{mt}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 3 }}>
              Collection ID
            </label>
            <input
              className="input"
              placeholder="e.g. prelinger"
              value={newCollectionId}
              onChange={(e) => setNewCollectionId(e.target.value)}
              style={{ width: 150, fontSize: "0.8rem", padding: "5px 8px" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 3 }}>
              Display Name
            </label>
            <input
              className="input"
              placeholder="Optional"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              style={{ width: 140, fontSize: "0.8rem", padding: "5px 8px" }}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleAdd}>Add</button>
          <button className="btn btn-sm" onClick={() => setShowAddForm(false)}>Cancel</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {filtered.map((col) => (
          <div
            key={col.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              background: col.enabled ? "var(--bg-secondary)" : "var(--bg-tertiary)",
              borderRadius: "var(--radius-sm)",
              opacity: col.enabled ? 1 : 0.5,
              fontSize: "0.82rem",
            }}
          >
            <span className={`media-badge ${col.media_type}`} style={{ fontSize: "0.65rem" }}>
              {col.media_type}
            </span>
            <span style={{ flex: 1, fontWeight: 500 }}>
              {col.display_name || col.collection_id}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              {col.collection_id}
            </span>

            {/* Pin toggle */}
            <button
              className="btn-icon"
              onClick={() => handleTogglePinned(col)}
              title={col.pinned ? "Unpin from filter bar" : "Pin to filter bar"}
              style={{
                fontSize: "0.78rem",
                color: col.pinned ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {col.pinned ? "📌" : "📍"}
            </button>

            {/* Enable/disable toggle */}
            <button
              className="btn-icon"
              onClick={() => handleToggleEnabled(col)}
              title={col.enabled ? "Disable" : "Enable"}
              style={{ fontSize: "0.78rem" }}
            >
              {col.enabled ? "✓" : "✗"}
            </button>

            {/* Remove (user-added only) */}
            {!col.is_default && (
              <button
                className="btn-icon"
                onClick={() => handleRemove(col)}
                title="Remove"
                style={{ fontSize: "0.68rem", color: "var(--danger)" }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 10 }}>
        {collections.filter((c) => c.enabled).length} of {collections.length} collections enabled
        · {collections.filter((c) => c.pinned).length} pinned
      </div>
    </div>
  );
}
