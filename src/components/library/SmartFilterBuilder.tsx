import { useState, useEffect } from "react";
import { createSmartFilter, getAllTags } from "../../lib/tauri-commands";
import type { Tag, SmartFilterCriteria } from "../../lib/types";

interface SmartFilterBuilderProps {
  onCreated: () => void;
  onCancel: () => void;
}

const MEDIA_OPTIONS = ["image", "audio", "movies", "texts", "software", "web"];

export function SmartFilterBuilder({ onCreated, onCancel }: SmartFilterBuilderProps) {
  const [name, setName] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [criteria, setCriteria] = useState<SmartFilterCriteria>({
    media_types: [],
    tags: [],
    tag_mode: "any",
    year_start: null,
    year_end: null,
    has_notes: false,
    keyword: null,
  });

  useEffect(() => {
    getAllTags().then(setAllTags);
  }, []);

  const toggleMediaType = (mt: string) => {
    setCriteria((prev) => ({
      ...prev,
      media_types: prev.media_types.includes(mt)
        ? prev.media_types.filter((m) => m !== mt)
        : [...prev.media_types, mt],
    }));
  };

  const toggleTag = (tagName: string) => {
    setCriteria((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagName)
        ? prev.tags.filter((t) => t !== tagName)
        : [...prev.tags, tagName],
    }));
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    const filterJson = JSON.stringify(criteria);
    await createSmartFilter(name.trim(), filterJson);
    onCreated();
  };

  const hasCriteria =
    criteria.media_types.length > 0 ||
    criteria.tags.length > 0 ||
    criteria.year_start !== null ||
    criteria.year_end !== null ||
    criteria.has_notes ||
    (criteria.keyword && criteria.keyword.trim());

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-primary)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          padding: 24,
          width: 480,
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.1rem",
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          New Smart Filter
        </h3>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
            Name
          </label>
          <input
            className="input"
            placeholder="e.g. Pre-1960 pedagogy"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        {/* Media Types */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
            Media Types (leave empty for all)
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {MEDIA_OPTIONS.map((mt) => (
              <button
                key={mt}
                className={`filter-toggle ${criteria.media_types.includes(mt) ? "active" : ""}`}
                onClick={() => toggleMediaType(mt)}
                style={{ fontSize: "0.75rem", padding: "4px 10px" }}
              >
                {mt}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              Tags
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
              {allTags.map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggleTag(t.name)}
                  className={`filter-toggle ${criteria.tags.includes(t.name) ? "active" : ""}`}
                  style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                >
                  {t.name}
                </button>
              ))}
            </div>
            {criteria.tags.length > 1 && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Match:</span>
                <label style={{ fontSize: "0.78rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="radio"
                    checked={criteria.tag_mode === "any"}
                    onChange={() => setCriteria((p) => ({ ...p, tag_mode: "any" }))}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  Any tag
                </label>
                <label style={{ fontSize: "0.78rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="radio"
                    checked={criteria.tag_mode === "all"}
                    onChange={() => setCriteria((p) => ({ ...p, tag_mode: "all" }))}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  All tags
                </label>
              </div>
            )}
          </div>
        )}

        {/* Year Range */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
            Year Range
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="input"
              type="number"
              placeholder="From"
              value={criteria.year_start ?? ""}
              onChange={(e) =>
                setCriteria((p) => ({ ...p, year_start: e.target.value ? parseInt(e.target.value) : null }))
              }
              style={{ width: 100 }}
            />
            <span style={{ color: "var(--text-muted)" }}>—</span>
            <input
              className="input"
              type="number"
              placeholder="To"
              value={criteria.year_end ?? ""}
              onChange={(e) =>
                setCriteria((p) => ({ ...p, year_end: e.target.value ? parseInt(e.target.value) : null }))
              }
              style={{ width: 100 }}
            />
          </div>
        </div>

        {/* Keyword */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
            Keyword (searches titles and descriptions)
          </label>
          <input
            className="input"
            placeholder="e.g. education"
            value={criteria.keyword ?? ""}
            onChange={(e) =>
              setCriteria((p) => ({ ...p, keyword: e.target.value || null }))
            }
          />
        </div>

        {/* Has Notes */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.85rem",
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          <input
            type="checkbox"
            checked={criteria.has_notes}
            onChange={(e) => setCriteria((p) => ({ ...p, has_notes: e.target.checked }))}
            style={{ accentColor: "var(--accent)" }}
          />
          Only items with journal notes
        </label>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={!name.trim() || !hasCriteria}
          >
            Create Smart Filter
          </button>
        </div>
      </div>
    </div>
  );
}
