import { useState, useEffect } from "react";
import { saveItem, unsaveItem, isItemSaved } from "../../lib/tauri-commands";
import { MediaPreview } from "../shared/MediaPreview";
import { MetadataPanel } from "../shared/MetadataPanel";
import { JournalPanel } from "../shared/JournalPanel";
import { TagInput } from "../shared/TagInput";
import { useToast } from "../shared/Toast";
import type { Item } from "../../lib/types";

interface GridViewProps {
  items: Item[];
  loading: boolean;
  error: string | null;
  onLoadMore: () => void;
}

export function GridView({ items, loading, error, onLoadMore }: GridViewProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedItem) {
      isItemSaved(selectedItem.id).then(setSaved);
    }
  }, [selectedItem?.id]);

  const handleSave = async () => {
    if (!selectedItem) return;
    try {
      await saveItem(selectedItem.id, []);
      setSaved(true);
      toast("Item saved");
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const handleUnsave = async () => {
    if (!selectedItem) return;
    try {
      await unsaveItem(selectedItem.id);
      setSaved(false);
      toast("Item removed from saved");
    } catch (err) {
      console.error("Failed to unsave:", err);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <span>Loading a batch of discoveries...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: "center",
          color: "var(--danger)",
          background: "var(--danger-light)",
          borderRadius: "var(--radius)",
        }}
      >
        <div style={{ marginBottom: 8 }}>{error}</div>
        <button className="btn btn-sm" onClick={onLoadMore}>
          Try Again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">🎰</div>
        <div>Click "Load Fresh Batch" to discover items.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Grid of thumbnails */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="card"
            onClick={() => setSelectedItem(item)}
            style={{
              cursor: "pointer",
              borderColor:
                selectedItem?.id === item.id
                  ? "var(--accent)"
                  : undefined,
              borderWidth: selectedItem?.id === item.id ? 2 : 1,
              transition: "border-color 150ms, transform 100ms",
            }}
          >
            {/* Thumbnail */}
            <div
              style={{
                height: 140,
                background: "var(--bg-tertiary)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  No Preview
                </span>
              )}
            </div>

            {/* Card info */}
            <div style={{ padding: "10px 12px" }}>
              <div
                className="truncate"
                style={{
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  lineHeight: 1.3,
                  marginBottom: 6,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                }}
              >
                <span className={`media-badge ${item.media_type}`}>
                  {item.media_type}
                </span>
                {item.date && (
                  <span className="truncate" style={{ maxWidth: 80 }}>
                    {item.date}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <button className="btn btn-primary" onClick={onLoadMore}>
          Load Fresh Batch
        </button>
      </div>

      {/* Detail panel (slide-up) */}
      {selectedItem && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            top: "20vh",
            background: "var(--bg-primary)",
            borderTop: "2px solid var(--accent)",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
            overflowY: "auto",
            padding: "20px 24px 40px",
            zIndex: 100,
            animation: "slide-up 200ms ease-out",
          }}
        >
          {/* Close button */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.15rem",
                fontWeight: 700,
                flex: 1,
                marginRight: 12,
              }}
            >
              {selectedItem.title}
            </h3>
            <button
              className="btn btn-sm"
              onClick={() => setSelectedItem(null)}
            >
              ✕ Close
            </button>
          </div>

          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <MediaPreview item={selectedItem} />

            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                }}
              >
                <span className={`media-badge ${selectedItem.media_type}`}>
                  {selectedItem.media_type}
                </span>
                {selectedItem.date && <span>{selectedItem.date}</span>}
                {selectedItem.language && <span>· {selectedItem.language}</span>}
              </div>

              {(selectedItem.collection || selectedItem.creator) && (
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                    marginBottom: 10,
                  }}
                >
                  {selectedItem.collection && (
                    <span>From: <strong>{selectedItem.collection}</strong></span>
                  )}
                  {selectedItem.collection && selectedItem.creator && <span> · </span>}
                  {selectedItem.creator && (
                    <span>By: <strong>{selectedItem.creator}</strong></span>
                  )}
                </div>
              )}

              {selectedItem.description && (
                <p
                  style={{
                    fontSize: "0.87rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.55,
                    marginBottom: 14,
                  }}
                >
                  {selectedItem.description.length > 400
                    ? selectedItem.description.slice(0, 400) + "..."
                    : selectedItem.description}
                </p>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                <button
                  className={`btn btn-sm ${saved ? "" : "btn-primary"}`}
                  onClick={saved ? handleUnsave : handleSave}
                >
                  {saved ? "♥ Saved" : "💾 Save"}
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedItem.archive_url);
                    toast("Link copied");
                  }}
                >
                  🔗 Copy Link
                </button>
                <a
                  href={selectedItem.archive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  style={{ textDecoration: "none" }}
                >
                  ↗ View on Archive.org
                </a>
              </div>

              {saved && (
                <div style={{ marginBottom: 12 }}>
                  <TagInput itemId={selectedItem.id} />
                </div>
              )}

              <MetadataPanel item={selectedItem} />

              {saved && <JournalPanel itemId={selectedItem.id} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
