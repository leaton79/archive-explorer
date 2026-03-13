import { useState, useCallback, useEffect } from "react";
import { useLibrary } from "../../hooks/useLibrary";
import {
  getItem,
  getItemsInCollection,
  getItemCollections,
  addItemToCollection,
  removeItemFromCollection,
  getCollections,
  bulkAddToCollection,
  bulkAddTags,
  exportSavedItemsJson,
  exportSavedItemsMarkdown,
} from "../../lib/tauri-commands";
import { MediaPreview } from "../shared/MediaPreview";
import { MetadataPanel } from "../shared/MetadataPanel";
import { JournalPanel } from "../shared/JournalPanel";
import { TagInput } from "../shared/TagInput";
import { CollectionsSidebar } from "./CollectionsSidebar";
import { SmartFilterBuilder } from "./SmartFilterBuilder";
import { ConnectionMap } from "./ConnectionMap";
import { LinkManager } from "./LinkManager";
import { useToast } from "../shared/Toast";
import type { Item, SavedItemSummary, SmartFilter, SmartFilterCriteria, UserCollection } from "../../lib/types";

const MEDIA_FILTERS = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "audio", label: "Audio" },
  { value: "movies", label: "Video" },
  { value: "texts", label: "Texts" },
  { value: "software", label: "Software" },
];

export function LibraryView() {
  const {
    items,
    allTags,
    loading,
    searchQuery,
    setSearchQuery,
    mediaFilter,
    setMediaFilter,
    tagFilter,
    setTagFilter,
    refresh,
  } = useLibrary();

  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  // Collection/smart filter selection
  const [activeCollectionId, setActiveCollectionId] = useState<number | null>(null);
  const [activeSmartFilter, setActiveSmartFilter] = useState<SmartFilter | null>(null);
  const [collectionItemIds, setCollectionItemIds] = useState<Set<string> | null>(null);
  const [showSmartFilterBuilder, setShowSmartFilterBuilder] = useState(false);

  // Bulk selection
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCollections, setBulkCollections] = useState<UserCollection[]>([]);
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [bulkCollectionId, setBulkCollectionId] = useState<number | null>(null);

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Library view mode
  const [libraryViewMode, setLibraryViewMode] = useState<"list" | "map">("list");
  const [hasNotesOnly, setHasNotesOnly] = useState(false);

  // Load collection items when a collection is selected
  useEffect(() => {
    if (activeCollectionId) {
      getItemsInCollection(activeCollectionId).then((ids) => {
        setCollectionItemIds(new Set(ids));
      });
    } else {
      setCollectionItemIds(null);
    }
  }, [activeCollectionId, sidebarRefreshKey]);

  // Load collections for bulk panel
  useEffect(() => {
    if (bulkMode) {
      getCollections().then(setBulkCollections);
    }
  }, [bulkMode]);

  // Apply smart filter criteria client-side
  const applySmartFilter = useCallback(
    (item: SavedItemSummary): boolean => {
      if (!activeSmartFilter) return true;
      let criteria: SmartFilterCriteria;
      try {
        criteria = JSON.parse(activeSmartFilter.filter_json);
      } catch {
        return true;
      }

      if (criteria.media_types.length > 0 && !criteria.media_types.includes(item.media_type)) {
        return false;
      }

      if (criteria.tags.length > 0) {
        const itemTagSet = new Set(item.tag_names.map((t) => t.toLowerCase()));
        if (criteria.tag_mode === "all") {
          if (!criteria.tags.every((t) => itemTagSet.has(t.toLowerCase()))) return false;
        } else {
          if (!criteria.tags.some((t) => itemTagSet.has(t.toLowerCase()))) return false;
        }
      }

      if (criteria.year_start || criteria.year_end) {
        const year = item.date ? parseInt(item.date) : null;
        if (year) {
          if (criteria.year_start && year < criteria.year_start) return false;
          if (criteria.year_end && year > criteria.year_end) return false;
        } else {
          return false;
        }
      }

      if (criteria.has_notes && item.note_count === 0) return false;

      if (criteria.keyword && criteria.keyword.trim()) {
        const kw = criteria.keyword.toLowerCase();
        if (!item.title.toLowerCase().includes(kw)) return false;
      }

      return true;
    },
    [activeSmartFilter]
  );

  // Filter items
  const filteredItems = items.filter((item) => {
    // Collection filter
    if (collectionItemIds && !collectionItemIds.has(item.id)) return false;

    // Smart filter
    if (activeSmartFilter && !applySmartFilter(item)) return false;

    // Advanced filters
    if (hasNotesOnly && item.note_count === 0) return false;
    if (dateFrom || dateTo) {
      const yr = item.date ? parseInt(item.date) : null;
      if (yr) {
        if (dateFrom && yr < parseInt(dateFrom)) return false;
        if (dateTo && yr > parseInt(dateTo)) return false;
      } else if (dateFrom || dateTo) {
        return false;
      }
    }

    return true;
  });

  const openDetail = async (summary: SavedItemSummary) => {
    if (bulkMode) {
      toggleSelected(summary.id);
      return;
    }
    try {
      const full = await getItem(summary.id);
      if (full) setSelectedItem(full);
    } catch (err) {
      console.error("Failed to load item:", err);
    } finally {
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAddToCollection = async () => {
    if (!bulkCollectionId || selectedIds.size === 0) return;
    const count = await bulkAddToCollection(Array.from(selectedIds), bulkCollectionId);
    toast(`Added ${count} items to collection`);
    setSidebarRefreshKey((k) => k + 1);
    refresh();
  };

  const handleBulkAddTags = async () => {
    if (!bulkTagInput.trim() || selectedIds.size === 0) return;
    const tags = bulkTagInput.split(",").map((t) => t.trim()).filter(Boolean);
    await bulkAddTags(Array.from(selectedIds), tags);
    toast(`Added ${tags.length} tag(s) to ${selectedIds.size} items`);
    setBulkTagInput("");
    refresh();
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedIds(new Set());
  };

  const handleExport = async (format: "json" | "markdown") => {
    try {
      const content = format === "json" ? await exportSavedItemsJson() : await exportSavedItemsMarkdown();
      const ext = format === "json" ? "json" : "md";
      const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `archive-roulette-export-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast("Export failed");
    }
  };

  const hasActiveAdvancedFilters = dateFrom || dateTo || hasNotesOnly;

  return (
    <div style={{ display: "flex", gap: 0, height: "100%" }}>
      {/* Sidebar */}
      <CollectionsSidebar
        activeCollectionId={activeCollectionId}
        activeSmartFilterId={activeSmartFilter?.id ?? null}
        onSelectCollection={setActiveCollectionId}
        onSelectSmartFilter={setActiveSmartFilter}
        onCreateSmartFilter={() => setShowSmartFilterBuilder(true)}
        refreshKey={sidebarRefreshKey}
      />

      {/* Main content */}
      <div style={{ flex: 1, paddingLeft: 16, display: "flex", gap: 16, minWidth: 0 }}>
        {/* Item List */}
        <div style={{ flex: selectedItem && !bulkMode ? "0 0 380px" : 1, minWidth: 0 }}>
          {/* Search & Filters */}
          <div style={{ marginBottom: 12 }}>
            <input
              className="input"
              type="text"
              placeholder="Search items, notes, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 8 }}
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", marginBottom: 6 }}>
              {MEDIA_FILTERS.map((mf) => (
                <button
                  key={mf.value}
                  className={`filter-toggle ${mediaFilter === mf.value ? "active" : ""}`}
                  onClick={() => setMediaFilter(mf.value)}
                  style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                >
                  {mf.label}
                </button>
              ))}
              {allTags.length > 0 && (
                <select
                  className="input"
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  style={{ width: "auto", fontSize: "0.75rem", padding: "3px 6px" }}
                >
                  <option value="">All Tags</option>
                  {allTags.map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Action bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  style={{ fontSize: "0.72rem", color: hasActiveAdvancedFilters ? "var(--accent)" : "var(--text-muted)" }}
                >
                  {showAdvancedFilters ? "▾" : "▸"} Filters{hasActiveAdvancedFilters && " •"}
                </button>
                <button
                  className={`btn btn-sm ${bulkMode ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => (bulkMode ? exitBulkMode() : setBulkMode(true))}
                  style={{ fontSize: "0.72rem" }}
                >
                  {bulkMode ? `✓ ${selectedIds.size} selected` : "☐ Bulk"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  className={`btn btn-sm ${libraryViewMode === "list" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setLibraryViewMode("list")}
                  style={{ fontSize: "0.72rem" }}
                >
                  ☰ List
                </button>
                <button
                  className={`btn btn-sm ${libraryViewMode === "map" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setLibraryViewMode("map")}
                  style={{ fontSize: "0.72rem" }}
                >
                  🕸️ Map
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleExport("json")} style={{ fontSize: "0.72rem" }}>↓ JSON</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleExport("markdown")} style={{ fontSize: "0.72rem" }}>↓ MD</button>
              </div>
            </div>

            {/* Advanced filters */}
            {showAdvancedFilters && (
              <div style={{ marginTop: 6, padding: 10, background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
                <div>
                  <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 2 }}>Year From</label>
                  <input className="input" type="number" placeholder="1900" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: 80, fontSize: "0.78rem", padding: "4px 6px" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 2 }}>Year To</label>
                  <input className="input" type="number" placeholder="1970" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: 80, fontSize: "0.78rem", padding: "4px 6px" }} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", cursor: "pointer", padding: "5px 0" }}>
                  <input type="checkbox" checked={hasNotesOnly} onChange={(e) => setHasNotesOnly(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
                  Has notes
                </label>
                {hasActiveAdvancedFilters && (
                  <button className="btn btn-sm" onClick={() => { setDateFrom(""); setDateTo(""); setHasNotesOnly(false); }} style={{ fontSize: "0.72rem" }}>Clear</button>
                )}
              </div>
            )}

            {/* Bulk actions panel */}
            {bulkMode && selectedIds.size > 0 && (
              <div style={{ marginTop: 8, padding: 10, background: "var(--accent-light)", borderRadius: "var(--radius-sm)", border: "1px solid var(--accent)", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
                <div>
                  <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 2 }}>Add to collection</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <select className="input" value={bulkCollectionId ?? ""} onChange={(e) => setBulkCollectionId(e.target.value ? parseInt(e.target.value) : null)} style={{ fontSize: "0.78rem", padding: "4px 6px", width: "auto" }}>
                      <option value="">Choose...</option>
                      {bulkCollections.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={handleBulkAddToCollection} disabled={!bulkCollectionId} style={{ fontSize: "0.72rem" }}>Add</button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 2 }}>Add tags (comma-separated)</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input className="input" value={bulkTagInput} onChange={(e) => setBulkTagInput(e.target.value)} placeholder="tag1, tag2" style={{ width: 140, fontSize: "0.78rem", padding: "4px 6px" }} />
                    <button className="btn btn-primary btn-sm" onClick={handleBulkAddTags} disabled={!bulkTagInput.trim()} style={{ fontSize: "0.72rem" }}>Tag</button>
                  </div>
                </div>
                <button className="btn btn-sm" onClick={() => setSelectedIds(new Set(filteredItems.map((i) => i.id)))} style={{ fontSize: "0.72rem" }}>Select All</button>
                <button className="btn btn-sm" onClick={() => setSelectedIds(new Set())} style={{ fontSize: "0.72rem" }}>Deselect</button>
              </div>
            )}
          </div>

          {/* Connection Map view */}
          {libraryViewMode === "map" && (
            <ConnectionMap onSelectItem={async (id) => {
              const full = await getItem(id);
              if (full) setSelectedItem(full);
            }} />
          )}

          {/* List view */}
          {libraryViewMode === "list" && (
            <>
          {/* Item count */}
          {!loading && filteredItems.length > 0 && (
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6 }}>
              {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
              {filteredItems.length !== items.length && ` (of ${items.length})`}
              {activeCollectionId && " in collection"}
              {activeSmartFilter && ` matching "${activeSmartFilter.name}"`}
            </div>
          )}

          {loading && <div className="loading-state"><div className="spinner" /></div>}

          {!loading && filteredItems.length === 0 && (
            <div className="empty-state">
              <div className="icon">{items.length === 0 ? "📚" : "🔍"}</div>
              <div>{items.length === 0 ? "No saved items yet." : "No items match your filters."}</div>
            </div>
          )}

          {!loading && filteredItems.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="card"
                  onClick={() => openDetail(item)}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: 10,
                    cursor: "pointer",
                    borderColor: selectedItem?.id === item.id ? "var(--accent)" : selectedIds.has(item.id) ? "var(--accent)" : undefined,
                    background: selectedIds.has(item.id) ? "var(--accent-light)" : undefined,
                  }}
                >
                  {bulkMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelected(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ accentColor: "var(--accent)", flexShrink: 0, marginTop: 2 }}
                    />
                  )}
                  {item.thumbnail_url && (
                    <img
                      src={item.thumbnail_url}
                      alt=""
                      style={{ width: 48, height: 48, objectFit: "cover", borderRadius: "var(--radius-sm)", flexShrink: 0, background: "var(--bg-tertiary)" }}
                    />
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="truncate" style={{ fontWeight: 600, fontSize: "0.84rem", marginBottom: 2 }}>
                      {item.title}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      <span className={`media-badge ${item.media_type}`}>{item.media_type}</span>
                      {item.date && <span>{item.date}</span>}
                      {item.note_count > 0 && <span>· {item.note_count} note{item.note_count > 1 ? "s" : ""}</span>}
                    </div>
                    {item.tag_names.length > 0 && (
                      <div style={{ display: "flex", gap: 3, marginTop: 3, flexWrap: "wrap" }}>
                        {item.tag_names.slice(0, 3).map((t) => (
                          <span key={t} className="tag-pill" style={{ fontSize: "0.65rem" }}>{t}</span>
                        ))}
                        {item.tag_names.length > 3 && <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>+{item.tag_names.length - 3}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          </>
          )}
        </div>
        {selectedItem && !bulkMode && (
          <div style={{ flex: 1, minWidth: 0, borderLeft: "1px solid var(--border)", paddingLeft: 16, overflowY: "auto", maxHeight: "calc(100vh - 160px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700 }}>
                {selectedItem.title}
              </h3>
              <button className="btn-icon" onClick={() => setSelectedItem(null)} style={{ fontSize: "1rem" }}>×</button>
            </div>

            <MediaPreview item={selectedItem} />

            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                <span className={`media-badge ${selectedItem.media_type}`}>{selectedItem.media_type}</span>
                {selectedItem.date && <span>{selectedItem.date}</span>}
                {selectedItem.creator && <span>· {selectedItem.creator}</span>}
              </div>

              {selectedItem.description && (
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 10 }}>
                  {selectedItem.description}
                </p>
              )}

              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <a href={selectedItem.archive_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ textDecoration: "none" }}>↗ Archive.org</a>
              </div>

              {/* Collection assignment */}
              <CollectionAssigner itemId={selectedItem.id} onChanged={() => setSidebarRefreshKey((k) => k + 1)} />

              <TagInput itemId={selectedItem.id} onTagsChanged={refresh} />
              <LinkManager itemId={selectedItem.id} />
              <MetadataPanel item={selectedItem} />
              <JournalPanel itemId={selectedItem.id} />
            </div>
          </div>
        )}
      </div>

      {/* Smart Filter Builder Modal */}
      {showSmartFilterBuilder && (
        <SmartFilterBuilder
          onCreated={() => {
            setShowSmartFilterBuilder(false);
            setSidebarRefreshKey((k) => k + 1);
          }}
          onCancel={() => setShowSmartFilterBuilder(false)}
        />
      )}
    </div>
  );
}

// ── Collection Assigner (inline in detail panel) ────────────

function CollectionAssigner({ itemId, onChanged }: { itemId: string; onChanged: () => void }) {
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [itemColIds, setItemColIds] = useState<Set<number>>(new Set());

  const loadData = async () => {
    const [cols, ids] = await Promise.all([getCollections(), getItemCollections(itemId)]);
    setCollections(cols);
    setItemColIds(new Set(ids));
  };

  useEffect(() => {
    loadData();
  }, [itemId]);

  const toggle = async (colId: number) => {
    if (itemColIds.has(colId)) {
      await removeItemFromCollection(itemId, colId);
    } else {
      await addItemToCollection(itemId, colId);
    }
    loadData();
    onChanged();
  };

  if (collections.length === 0) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
        Collections
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {collections.map((col) => (
          <button
            key={col.id}
            onClick={() => toggle(col.id)}
            className={`filter-toggle ${itemColIds.has(col.id) ? "active" : ""}`}
            style={{ fontSize: "0.72rem", padding: "3px 8px" }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: col.color || "var(--accent)",
                marginRight: 4,
              }}
            />
            {col.name}
          </button>
        ))}
      </div>
    </div>
  );
}
