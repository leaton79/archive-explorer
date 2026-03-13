import { useState, useEffect } from "react";
import { saveItem, unsaveItem, isItemSaved } from "../../lib/tauri-commands";
import { MediaPreview } from "../shared/MediaPreview";
import { MetadataPanel } from "../shared/MetadataPanel";
import { JournalPanel } from "../shared/JournalPanel";
import { TagInput } from "../shared/TagInput";
import { FilterBar } from "./FilterBar";
import { useDiscovery } from "../../hooks/useDiscovery";
import { useToast } from "../shared/Toast";
import type { DiscoveryFilters } from "../../lib/types";

export function SpotlightView() {
  const { item, loading, error, filters, fetchNext, setMediaType } = useDiscovery();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);

  // Check saved status when item changes
  useEffect(() => {
    if (item) {
      isItemSaved(item.id).then(setSaved);
    }
  }, [item?.id]);

  // Auto-fetch on first mount
  useEffect(() => {
    fetchNext();
  }, []);

  const handleSave = async () => {
    if (!item) return;
    try {
      await saveItem(item.id, []);
      setSaved(true);
      toast("Item saved");
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const handleUnsave = async () => {
    if (!item) return;
    try {
      await unsaveItem(item.id);
      setSaved(false);
      toast("Item removed from saved");
    } catch (err) {
      console.error("Failed to unsave:", err);
    }
  };

  const handleCopyLink = () => {
    if (!item) return;
    navigator.clipboard.writeText(item.archive_url);
    toast("Link copied");
  };

  const handleApplyFilters = (newFilters: DiscoveryFilters) => {
    fetchNext(newFilters);
  };

  const truncateDescription = (desc: string | null, maxLen = 300) => {
    if (!desc) return "";
    return desc.length > maxLen ? desc.slice(0, maxLen) + "..." : desc;
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <FilterBar
        filters={filters}
        onMediaTypeChange={setMediaType}
        onApplyFilters={handleApplyFilters}
      />

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <span>Discovering something interesting...</span>
        </div>
      )}

      {error && (
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
          <button className="btn btn-sm" onClick={() => fetchNext()}>
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && item && (
        <div>
          {/* Media Preview */}
          <MediaPreview item={item} />

          {/* Item Info */}
          <div style={{ marginTop: 16 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.35rem",
                fontWeight: 700,
                lineHeight: 1.3,
                marginBottom: 6,
                color: "var(--text-primary)",
              }}
            >
              {item.title}
            </h2>

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
              <span className={`media-badge ${item.media_type}`}>
                {item.media_type}
              </span>
              {item.date && <span>{item.date}</span>}
              {item.language && <span>· {item.language}</span>}
            </div>

            {(item.collection || item.creator) && (
              <div
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-secondary)",
                  marginBottom: 10,
                }}
              >
                {item.collection && (
                  <span>
                    From: <strong>{item.collection}</strong>
                  </span>
                )}
                {item.collection && item.creator && <span> · </span>}
                {item.creator && (
                  <span>
                    By: <strong>{item.creator}</strong>
                  </span>
                )}
              </div>
            )}

            {item.description && (
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}
              >
                {truncateDescription(item.description)}
              </p>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <button
                className={`btn btn-sm ${saved ? "" : "btn-primary"}`}
                onClick={saved ? handleUnsave : handleSave}
              >
                {saved ? "♥ Saved" : "💾 Save"}
              </button>
              <button className="btn btn-sm" onClick={handleCopyLink}>
                🔗 Copy Link
              </button>
              <a
                href={item.archive_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm"
                style={{ textDecoration: "none" }}
              >
                ↗ View on Archive.org
              </a>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => fetchNext()}
                style={{ marginLeft: "auto" }}
              >
                → Next
              </button>
            </div>

            {/* Tags (only show if saved) */}
            {saved && (
              <div style={{ marginBottom: 12 }}>
                <TagInput itemId={item.id} />
              </div>
            )}

            {/* Metadata Panel */}
            <MetadataPanel item={item} />

            {/* Journal (only show if saved) */}
            {saved && <JournalPanel itemId={item.id} />}
          </div>
        </div>
      )}

      {!loading && !error && !item && (
        <div className="empty-state">
          <div className="icon">🎰</div>
          <div>Click a media type or hit Next to discover something.</div>
        </div>
      )}
    </div>
  );
}
