import { useState, useEffect } from "react";
import {
  getJournalEntries,
  addJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
} from "../../lib/tauri-commands";
import type { JournalEntry } from "../../lib/types";

interface JournalPanelProps {
  itemId: string;
}

export function JournalPanel({ itemId }: JournalPanelProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getJournalEntries(itemId).then(setEntries);
  }, [itemId]);

  const handleAdd = async () => {
    const trimmed = newContent.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const entry = await addJournalEntry(itemId, trimmed);
      setEntries((prev) => [entry, ...prev]);
      setNewContent("");
    } catch (err) {
      console.error("Failed to add journal entry:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (entryId: number) => {
    const trimmed = editContent.trim();
    if (!trimmed) return;

    try {
      await updateJournalEntry(entryId, trimmed);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId ? { ...e, content: trimmed, updated_at: new Date().toISOString() } : e
        )
      );
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update entry:", err);
    }
  };

  const handleDelete = async (entryId: number) => {
    try {
      await deleteJournalEntry(entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
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
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          fontSize: "0.82rem",
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        Journal
      </div>

      {/* New entry input */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <textarea
          className="input"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Write a note about this item..."
          style={{ flex: 1, minHeight: 50, fontSize: "0.85rem" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              handleAdd();
            }
          }}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={handleAdd}
          disabled={!newContent.trim() || submitting}
          style={{ alignSelf: "flex-end" }}
        >
          Add
        </button>
      </div>

      {/* Existing entries */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              padding: 12,
              background: "var(--bg-tertiary)",
              borderRadius: "var(--radius-sm)",
              borderLeft: "3px solid var(--accent)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {formatDate(entry.created_at)}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {editingId !== entry.id && (
                  <>
                    <button
                      className="btn-icon"
                      style={{ fontSize: "0.75rem" }}
                      onClick={() => {
                        setEditingId(entry.id);
                        setEditContent(entry.content);
                      }}
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      className="btn-icon"
                      style={{ fontSize: "0.75rem", color: "var(--danger)" }}
                      onClick={() => handleDelete(entry.id)}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>

            {editingId === entry.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <textarea
                  className="input"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  style={{ minHeight: 60, fontSize: "0.85rem" }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleUpdate(entry.id)}
                  >
                    Save
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: "0.87rem",
                  color: "var(--text-primary)",
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                }}
              >
                {entry.content}
              </div>
            )}
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
          No journal entries yet.
        </div>
      )}
    </div>
  );
}
