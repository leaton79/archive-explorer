import { useState, useEffect } from "react";
import { GridView } from "./GridView";
import { FilterBar } from "./FilterBar";
import { useDiscovery } from "../../hooks/useDiscovery";
import { getSetting, setSetting } from "../../lib/tauri-commands";
import type { DiscoveryFilters, DiscoveryViewMode } from "../../lib/types";

interface DiscoveryTabProps {
  sessionId: number | null;
}

export function DiscoveryTab({ sessionId: _sessionId }: DiscoveryTabProps) {
  const [viewMode, setViewMode] = useState<DiscoveryViewMode>("spotlight");
  const [gridCount, setGridCount] = useState(9);
  const discovery = useDiscovery();

  // Load saved view mode preference
  useEffect(() => {
    getSetting("discovery_view_mode").then((val) => {
      if (val === "grid" || val === "spotlight") {
        setViewMode(val);
      }
    });
    getSetting("grid_items_count").then((val) => {
      if (val) {
        const n = parseInt(val);
        if (n >= 3 && n <= 12) setGridCount(n);
      }
    });
  }, []);

  const handleViewModeChange = (mode: DiscoveryViewMode) => {
    setViewMode(mode);
    setSetting("discovery_view_mode", mode);
    // If switching to grid and no items loaded, fetch a batch
    if (mode === "grid" && discovery.gridItems.length === 0) {
      discovery.fetchBatch(gridCount);
    }
    // If switching to spotlight and no item loaded, fetch one
    if (mode === "spotlight" && !discovery.item) {
      discovery.fetchNext();
    }
  };

  const handleMediaTypeChange = (mediaType: string) => {
    if (viewMode === "grid") {
      discovery.setMediaTypeGrid(mediaType, gridCount);
    } else {
      discovery.setMediaType(mediaType);
    }
  };

  const handleApplyFilters = (newFilters: DiscoveryFilters) => {
    if (viewMode === "grid") {
      discovery.fetchBatch(gridCount, newFilters);
    } else {
      discovery.fetchNext(newFilters);
    }
  };

  return (
    <div style={{ maxWidth: viewMode === "grid" ? 960 : 760, margin: "0 auto" }}>
      {/* View mode toggle + Filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        {/* View mode toggle */}
        <div
          style={{
            display: "inline-flex",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => handleViewModeChange("spotlight")}
            style={{
              padding: "6px 14px",
              fontSize: "0.8rem",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              background:
                viewMode === "spotlight"
                  ? "var(--accent)"
                  : "var(--bg-primary)",
              color: viewMode === "spotlight" ? "#fff" : "var(--text-secondary)",
              transition: "all 150ms",
            }}
          >
            ◉ Spotlight
          </button>
          <button
            onClick={() => handleViewModeChange("grid")}
            style={{
              padding: "6px 14px",
              fontSize: "0.8rem",
              fontWeight: 500,
              border: "none",
              borderLeft: "1px solid var(--border)",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              background:
                viewMode === "grid"
                  ? "var(--accent)"
                  : "var(--bg-primary)",
              color: viewMode === "grid" ? "#fff" : "var(--text-secondary)",
              transition: "all 150ms",
            }}
          >
            ⊞ Grid
          </button>
        </div>

        {/* Grid count selector (only in grid mode) */}
        {viewMode === "grid" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Items:
            </span>
            {[6, 9, 12].map((n) => (
              <button
                key={n}
                className={`btn btn-sm ${gridCount === n ? "btn-primary" : ""}`}
                onClick={() => {
                  setGridCount(n);
                  setSetting("grid_items_count", String(n));
                  discovery.fetchBatch(n);
                }}
                style={{ padding: "3px 8px", fontSize: "0.75rem", minWidth: 28 }}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={discovery.filters}
        onMediaTypeChange={handleMediaTypeChange}
        onApplyFilters={handleApplyFilters}
      />

      {/* Content */}
      {viewMode === "spotlight" ? (
        <SpotlightContent discovery={discovery} />
      ) : (
        <GridView
          items={discovery.gridItems}
          loading={discovery.loading}
          error={discovery.error}
          onLoadMore={() => discovery.fetchBatch(gridCount)}
        />
      )}
    </div>
  );
}

// Extracted spotlight content (without its own FilterBar, since DiscoveryTab provides it)
import { saveItem, unsaveItem, isItemSaved } from "../../lib/tauri-commands";
import { MediaPreview } from "../shared/MediaPreview";
import { MetadataPanel } from "../shared/MetadataPanel";
import { JournalPanel } from "../shared/JournalPanel";
import { TagInput } from "../shared/TagInput";
import { useToast } from "../shared/Toast";

function SpotlightContent({ discovery }: { discovery: ReturnType<typeof useDiscovery> }) {
  const { item, loading, error, fetchNext } = discovery;
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (item) {
      isItemSaved(item.id).then(setSaved);
    }
  }, [item?.id]);

  // Auto-fetch on first mount
  useEffect(() => {
    if (!item && !loading) {
      fetchNext();
    }
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

  const truncateDescription = (desc: string | null, maxLen = 300) => {
    if (!desc) return "";
    return desc.length > maxLen ? desc.slice(0, maxLen) + "..." : desc;
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <span>Discovering something interesting...</span>
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
        <button className="btn btn-sm" onClick={() => fetchNext()}>
          Try Again
        </button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="empty-state">
        <div className="icon">🎰</div>
        <div>Click a media type or hit Next to discover something.</div>
      </div>
    );
  }

  return (
    <div>
      <MediaPreview item={item} />

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
              <span>From: <strong>{item.collection}</strong></span>
            )}
            {item.collection && item.creator && <span> · </span>}
            {item.creator && (
              <span>By: <strong>{item.creator}</strong></span>
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

        {saved && (
          <div style={{ marginBottom: 12 }}>
            <TagInput itemId={item.id} />
          </div>
        )}

        <MetadataPanel item={item} />
        {saved && <JournalPanel itemId={item.id} />}
      </div>
    </div>
  );
}
