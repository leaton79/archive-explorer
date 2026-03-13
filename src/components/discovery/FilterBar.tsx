import { useState } from "react";
import { MEDIA_TYPES, LANGUAGES } from "../../lib/types";
import type { DiscoveryFilters } from "../../lib/types";

interface FilterBarProps {
  filters: DiscoveryFilters;
  onMediaTypeChange: (mediaType: string) => void;
  onApplyFilters: (filters: DiscoveryFilters) => void;
}

export function FilterBar({ filters, onMediaTypeChange, onApplyFilters }: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [yearStart, setYearStart] = useState(filters.year_start?.toString() || "");
  const [yearEnd, setYearEnd] = useState(filters.year_end?.toString() || "");
  const [language, setLanguage] = useState(filters.language || "");
  const [keywords, setKeywords] = useState(filters.query || "");
  const [collection, setCollection] = useState(filters.collection || "");

  const handleApply = () => {
    onApplyFilters({
      ...filters,
      year_start: yearStart ? parseInt(yearStart) : null,
      year_end: yearEnd ? parseInt(yearEnd) : null,
      language: language || null,
      query: keywords || null,
      collection: collection || null,
    });
  };

  const handleClear = () => {
    setYearStart("");
    setYearEnd("");
    setLanguage("");
    setKeywords("");
    setCollection("");
    onApplyFilters({
      media_type: filters.media_type,
      year_start: null,
      year_end: null,
      language: null,
      query: null,
      collection: null,
    });
  };

  const hasAdvancedFilters = yearStart || yearEnd || language || keywords || collection;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Media type toggles */}
      <div className="filter-toggles">
        {MEDIA_TYPES.map((mt) => (
          <button
            key={mt.value}
            className={`filter-toggle ${filters.media_type === mt.value ? "active" : ""}`}
            onClick={() => onMediaTypeChange(mt.value)}
          >
            {mt.label}
          </button>
        ))}
      </div>

      {/* Advanced filters toggle */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setShowAdvanced(!showAdvanced)}
        style={{
          fontSize: "0.78rem",
          color: hasAdvancedFilters ? "var(--accent)" : "var(--text-muted)",
        }}
      >
        {showAdvanced ? "▾" : "▸"} Advanced Filters
        {hasAdvancedFilters && " •"}
      </button>

      {showAdvanced && (
        <div
          style={{
            marginTop: 10,
            padding: 16,
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <div>
            <label
              style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}
            >
              Year Range
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="input"
                type="number"
                placeholder="From"
                value={yearStart}
                onChange={(e) => setYearStart(e.target.value)}
                style={{ width: 90 }}
              />
              <span style={{ color: "var(--text-muted)" }}>—</span>
              <input
                className="input"
                type="number"
                placeholder="To"
                value={yearEnd}
                onChange={(e) => setYearEnd(e.target.value)}
                style={{ width: 90 }}
              />
            </div>
          </div>

          <div>
            <label
              style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}
            >
              Language
            </label>
            <select
              className="input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}
            >
              Keywords
            </label>
            <input
              className="input"
              type="text"
              placeholder="Search terms..."
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>

          <div>
            <label
              style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}
            >
              Collection ID
            </label>
            <input
              className="input"
              type="text"
              placeholder="e.g. prelinger"
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleApply}>
              Apply Filters
            </button>
            {hasAdvancedFilters && (
              <button className="btn btn-sm" onClick={handleClear}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
