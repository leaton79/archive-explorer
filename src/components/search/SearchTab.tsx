import { useState } from "react";
import { searchArchive, saveItem } from "../../lib/tauri-commands";
import { useToast } from "../shared/Toast";
import type { SearchResult, SearchResponse } from "../../lib/types";

const SORT_OPTIONS = [
  { value: "downloads desc", label: "Most Downloaded" },
  { value: "date desc", label: "Newest First" },
  { value: "date asc", label: "Oldest First" },
  { value: "titleSorter asc", label: "Title A→Z" },
  { value: "avg_rating desc", label: "Highest Rated" },
  { value: "addeddate desc", label: "Recently Added" },
];

const MEDIA_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "image", label: "Images" },
  { value: "audio", label: "Audio" },
  { value: "movies", label: "Video" },
  { value: "texts", label: "Texts" },
  { value: "software", label: "Software" },
  { value: "web", label: "Web" },
];

const LANGUAGE_OPTIONS = [
  { value: "", label: "Any Language" },
  { value: "eng", label: "English" },
  { value: "spa", label: "Spanish" },
  { value: "fra", label: "French" },
  { value: "deu", label: "German" },
  { value: "jpn", label: "Japanese" },
  { value: "zho", label: "Chinese" },
  { value: "rus", label: "Russian" },
  { value: "lat", label: "Latin" },
];

export function SearchTab() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [language, setLanguage] = useState("");
  const [sort, setSort] = useState("downloads desc");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const doSearch = async (page = 0) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    // Add to recent queries
    if (page === 0) {
      setRecentQueries((prev) => {
        const filtered = prev.filter((q) => q !== query.trim());
        return [query.trim(), ...filtered].slice(0, 20);
      });
    }

    try {
      const result = await searchArchive(
        query.trim(),
        mediaType || undefined,
        yearStart ? parseInt(yearStart) : undefined,
        yearEnd ? parseInt(yearEnd) : undefined,
        language || undefined,
        sort,
        page
      );

      if (page === 0) {
        setResponse(result);
      } else {
        // Append to existing results
        setResponse((prev) => {
          if (!prev) return result;
          return {
            ...result,
            results: [...prev.results, ...result.results],
          };
        });
      }

      // Track which results are already saved
      const newSaved = new Set(savedIds);
      for (const r of result.results) {
        if (r.is_saved) newSaved.add(r.id);
      }
      setSavedIds(newSaved);
    } catch (err) {
      setError(typeof err === "string" ? err : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (result: SearchResult) => {
    try {
      await saveItem(result.id, []);
      setSavedIds((prev) => new Set([...prev, result.id]));
      toast("Item saved to library");
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      doSearch(0);
    }
  };

  const canLoadMore = response && response.results.length < response.total_found;
  const nextPage = response ? response.page + 1 : 0;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* Search input */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              className="input"
              type="text"
              placeholder="Search the Internet Archive..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ fontSize: "1rem", padding: "10px 14px" }}
            />
            {/* Recent queries dropdown */}
            {recentQueries.length > 0 && query === "" && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: 2,
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "var(--shadow-lg)",
                  zIndex: 10,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    padding: "6px 10px",
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Recent
                </div>
                {recentQueries.map((rq, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setQuery(rq);
                      setTimeout(() => doSearch(0), 0);
                    }}
                    style={{
                      padding: "6px 10px",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      color: "var(--text-secondary)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {rq}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            className="btn btn-primary"
            onClick={() => doSearch(0)}
            disabled={!query.trim() || loading}
            style={{ padding: "10px 24px" }}
          >
            Search
          </button>
        </div>

        {/* Filters row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <select
            className="input"
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value)}
            style={{ width: "auto", fontSize: "0.82rem", padding: "6px 8px" }}
          >
            {MEDIA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              className="input"
              type="number"
              placeholder="From year"
              value={yearStart}
              onChange={(e) => setYearStart(e.target.value)}
              style={{ width: 90, fontSize: "0.82rem", padding: "6px 8px" }}
            />
            <span style={{ color: "var(--text-muted)" }}>—</span>
            <input
              className="input"
              type="number"
              placeholder="To year"
              value={yearEnd}
              onChange={(e) => setYearEnd(e.target.value)}
              style={{ width: 90, fontSize: "0.82rem", padding: "6px 8px" }}
            />
          </div>

          <select
            className="input"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ width: "auto", fontSize: "0.82rem", padding: "6px 8px" }}
          >
            {LANGUAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ width: "auto", fontSize: "0.82rem", padding: "6px 8px" }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && !response && (
        <div className="loading-state">
          <div className="spinner" />
          <span>Searching the Archive...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: 16,
            textAlign: "center",
            color: "var(--danger)",
            background: "var(--danger-light)",
            borderRadius: "var(--radius)",
          }}
        >
          {error}
        </div>
      )}

      {/* Results */}
      {response && (
        <div>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              marginBottom: 10,
            }}
          >
            {response.total_found.toLocaleString()} results found
            {response.results.length < response.total_found &&
              ` · showing ${response.results.length}`}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {response.results.map((result) => (
              <div
                key={result.id}
                className="card"
                style={{
                  display: "flex",
                  gap: 14,
                  padding: 14,
                }}
              >
                {/* Thumbnail */}
                <img
                  src={result.thumbnail_url}
                  alt=""
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: "cover",
                    borderRadius: "var(--radius-sm)",
                    flexShrink: 0,
                    background: "var(--bg-tertiary)",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.95rem",
                      marginBottom: 4,
                      lineHeight: 1.3,
                    }}
                  >
                    {result.title}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.78rem",
                      color: "var(--text-muted)",
                      marginBottom: 6,
                    }}
                  >
                    <span className={`media-badge ${result.media_type}`}>
                      {result.media_type}
                    </span>
                    {result.date && <span>{result.date}</span>}
                    {result.creator && <span>· {result.creator}</span>}
                    {result.collection && (
                      <span>· From: {result.collection}</span>
                    )}
                  </div>

                  {result.description && (
                    <p
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.45,
                        margin: 0,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {result.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    flexShrink: 0,
                    alignItems: "flex-end",
                  }}
                >
                  <button
                    className={`btn btn-sm ${savedIds.has(result.id) ? "" : "btn-primary"}`}
                    onClick={() => handleSave(result)}
                    disabled={savedIds.has(result.id)}
                    style={{ fontSize: "0.75rem", minWidth: 70 }}
                  >
                    {savedIds.has(result.id) ? "♥ Saved" : "💾 Save"}
                  </button>
                  <a
                    href={result.archive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm"
                    style={{
                      textDecoration: "none",
                      fontSize: "0.75rem",
                      minWidth: 70,
                      textAlign: "center",
                    }}
                  >
                    ↗ View
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Load more */}
          {canLoadMore && (
            <div style={{ textAlign: "center", marginTop: 16, marginBottom: 8 }}>
              <button
                className="btn"
                onClick={() => doSearch(nextPage)}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More Results"}
              </button>
            </div>
          )}

          {/* End of results */}
          {!canLoadMore && response.results.length > 0 && (
            <div
              style={{
                textAlign: "center",
                marginTop: 16,
                fontSize: "0.78rem",
                color: "var(--text-muted)",
              }}
            >
              End of results
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!response && !loading && !error && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="icon">🔎</div>
          <div>Search the Internet Archive</div>
          <div style={{ fontSize: "0.82rem", maxWidth: 400 }}>
            Unlike Discovery (which shows random items), Search lets you find
            specific content. Try searching for topics, people, collections, or
            time periods.
          </div>
        </div>
      )}
    </div>
  );
}
