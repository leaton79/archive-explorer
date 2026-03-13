import { useState, useEffect } from "react";
import {
  getItemLinks,
  createItemLink,
  deleteItemLink,
  getSavedItems,
} from "../../lib/tauri-commands";
import { useToast } from "../shared/Toast";
import type { ItemLink, SavedItemSummary } from "../../lib/types";

interface LinkManagerProps {
  itemId: string;
}

export function LinkManager({ itemId }: LinkManagerProps) {
  const [links, setLinks] = useState<ItemLink[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SavedItemSummary[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<SavedItemSummary | null>(null);
  const [linkLabel, setLinkLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Reset everything when the item changes
  useEffect(() => {
    setShowPicker(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedTarget(null);
    setLinkLabel("");
    setSaving(false);

    getItemLinks(itemId).then(setLinks).catch(() => setLinks([]));
  }, [itemId]);

  // Search saved items as user types
  useEffect(() => {
    if (!showPicker || searchQuery.length < 1) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      getSavedItems(searchQuery).then((items) => {
        const linkedIds = new Set(
          links.map((l) =>
            l.source_item_id === itemId ? l.target_item_id : l.source_item_id
          )
        );
        setSearchResults(
          items.filter((i) => i.id !== itemId && !linkedIds.has(i.id)).slice(0, 8)
        );
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, showPicker, links, itemId]);

  const handleSelectTarget = (item: SavedItemSummary) => {
    setSelectedTarget(item);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleAddLink = async () => {
    if (!selectedTarget || saving) return;
    setSaving(true);
    try {
      await createItemLink(itemId, selectedTarget.id, linkLabel || undefined);
      toast(`Linked to "${selectedTarget.title}"`);

      // Reset picker state
      setSelectedTarget(null);
      setLinkLabel("");
      setShowPicker(false);

      // Refresh links
      const updated = await getItemLinks(itemId);
      setLinks(updated);
    } catch (err) {
      console.error("Failed to create link:", err);
      toast("Failed to create link");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (linkId: number) => {
    try {
      await deleteItemLink(linkId);
      const updated = await getItemLinks(itemId);
      setLinks(updated);
      toast("Connection removed");
    } catch (err) {
      console.error("Failed to delete link:", err);
    }
  };

  const handleCancel = () => {
    setShowPicker(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedTarget(null);
    setLinkLabel("");
  };

  const getLinkedId = (link: ItemLink) =>
    link.source_item_id === itemId ? link.target_item_id : link.source_item_id;

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: "0.82rem",
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Connections {links.length > 0 && `(${links.length})`}
        </div>
        {!showPicker && (
          <button
            className="btn btn-sm"
            onClick={() => setShowPicker(true)}
            style={{ fontSize: "0.75rem" }}
          >
            + Link to...
          </button>
        )}
      </div>

      {/* Link picker */}
      {showPicker && (
        <div
          style={{
            padding: 12,
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            marginBottom: 10,
          }}
        >
          {/* Step 1: Select a target item */}
          {!selectedTarget && (
            <>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Step 1: Choose an item to link
              </div>
              <input
                className="input"
                placeholder="Search your saved items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: "0.82rem", marginBottom: 6 }}
                autoFocus
              />

              {searchResults.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectTarget(item)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border)",
                        transition: "border-color 100ms",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor = "var(--accent)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.borderColor = "var(--border)")
                      }
                    >
                      {item.thumbnail_url && (
                        <img
                          src={item.thumbnail_url}
                          alt=""
                          style={{
                            width: 28,
                            height: 28,
                            objectFit: "cover",
                            borderRadius: 3,
                            background: "var(--bg-tertiary)",
                          }}
                        />
                      )}
                      <span className="truncate" style={{ flex: 1 }}>
                        {item.title}
                      </span>
                      <span className={`media-badge ${item.media_type}`}>
                        {item.media_type}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length >= 1 && searchResults.length === 0 && (
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "8px 0" }}>
                  No matching saved items found.
                </div>
              )}
            </>
          )}

          {/* Step 2: Add label and confirm */}
          {selectedTarget && (
            <>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Step 2: Add link details
              </div>

              {/* Selected target display */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--accent-light)",
                  border: "1px solid var(--accent)",
                  fontSize: "0.82rem",
                  marginBottom: 8,
                }}
              >
                {selectedTarget.thumbnail_url && (
                  <img
                    src={selectedTarget.thumbnail_url}
                    alt=""
                    style={{
                      width: 28,
                      height: 28,
                      objectFit: "cover",
                      borderRadius: 3,
                    }}
                  />
                )}
                <span style={{ flex: 1, fontWeight: 500 }}>
                  {selectedTarget.title}
                </span>
                <span className={`media-badge ${selectedTarget.media_type}`}>
                  {selectedTarget.media_type}
                </span>
                <button
                  className="btn-icon"
                  onClick={() => setSelectedTarget(null)}
                  style={{ fontSize: "0.72rem" }}
                  title="Change selection"
                >
                  ✕
                </button>
              </div>

              <input
                className="input"
                placeholder="Relationship label (optional, e.g. 'same creator', 'sequel')"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                style={{ fontSize: "0.78rem", marginBottom: 10 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddLink();
                }}
              />

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAddLink}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Add Link"}
                </button>
                <button className="btn btn-sm" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* Cancel if in step 1 */}
          {!selectedTarget && (
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-sm" onClick={handleCancel} style={{ fontSize: "0.75rem" }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Existing links */}
      {links.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {links.map((link) => (
            <div
              key={link.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                background: "var(--bg-tertiary)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.82rem",
              }}
            >
              {link.target_thumbnail_url && (
                <img
                  src={link.target_thumbnail_url}
                  alt=""
                  style={{
                    width: 24,
                    height: 24,
                    objectFit: "cover",
                    borderRadius: 3,
                    background: "var(--bg-secondary)",
                  }}
                />
              )}
              <span className="truncate" style={{ flex: 1, fontWeight: 500 }}>
                {link.target_title || getLinkedId(link)}
              </span>
              {link.label && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--accent)",
                    background: "var(--accent-light)",
                    padding: "1px 6px",
                    borderRadius: 10,
                  }}
                >
                  {link.label}
                </span>
              )}
              {link.target_media_type && (
                <span className={`media-badge ${link.target_media_type}`}>
                  {link.target_media_type}
                </span>
              )}
              <button
                className="btn-icon"
                onClick={() => handleDelete(link.id)}
                style={{ fontSize: "0.68rem", opacity: 0.5 }}
                title="Remove link"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        !showPicker && (
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
            No connections yet.
          </div>
        )
      )}
    </div>
  );
}
