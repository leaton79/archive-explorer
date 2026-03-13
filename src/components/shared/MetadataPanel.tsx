import { useState } from "react";
import type { Item, ArchiveMetadataInner, ArchiveFile } from "../../lib/types";

interface MetadataPanelProps {
  item: Item;
}

export function MetadataPanel({ item }: MetadataPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const metadata = item.metadata_json ? JSON.parse(item.metadata_json) : null;
  const meta: ArchiveMetadataInner | undefined = metadata?.metadata;
  const files: ArchiveFile[] = metadata?.files || [];

  if (!meta) return null;

  const renderValue = (val: unknown): string => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "number") return String(val);
    if (Array.isArray(val)) return val.join(", ");
    return String(val);
  };

  const sections: { label: string; fields: [string, unknown][] }[] = [
    {
      label: "Basic Information",
      fields: [
        ["Identifier", meta.identifier],
        ["Media Type", meta.mediatype],
        ["Language", meta.language],
      ],
    },
    {
      label: "Dates",
      fields: [
        ["Date", meta.date],
        ["Year", meta.year],
        ["Published", meta.publicdate],
        ["Added to Archive", meta.addeddate],
      ],
    },
    {
      label: "Attribution",
      fields: [
        ["Creator", meta.creator],
        ["Contributor", meta.contributor],
        ["Publisher", meta.publisher],
        ["Sponsor", meta.sponsor],
      ],
    },
    {
      label: "Classification",
      fields: [
        ["Collection", meta.collection],
        ["Subject", meta.subject],
      ],
    },
    {
      label: "Statistics",
      fields: [
        ["Downloads", meta.downloads],
        ["Reviews", meta.num_reviews],
        ["Average Rating", meta.avg_rating],
      ],
    },
    {
      label: "Rights & Source",
      fields: [
        ["Rights", meta.rights],
        ["License", meta.licenseurl],
        ["Source", meta.source],
      ],
    },
  ];

  return (
    <div style={{ marginTop: 12 }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setExpanded(!expanded)}
        style={{ fontWeight: 500 }}
      >
        {expanded ? "▾" : "▸"} Full Metadata
      </button>

      {expanded && (
        <div
          style={{
            marginTop: 8,
            padding: 16,
            background: "var(--bg-tertiary)",
            borderRadius: "var(--radius)",
            fontSize: "0.82rem",
          }}
        >
          {sections.map((section) => {
            const validFields = section.fields.filter(
              ([, v]) => v !== null && v !== undefined && renderValue(v) !== ""
            );
            if (validFields.length === 0) return null;

            return (
              <div key={section.label} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                    fontSize: "0.78rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {section.label}
                </div>
                {validFields.map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 3,
                      lineHeight: 1.5,
                    }}
                  >
                    <span
                      style={{
                        color: "var(--text-muted)",
                        minWidth: 120,
                        flexShrink: 0,
                      }}
                    >
                      {label}:
                    </span>
                    <span style={{ color: "var(--text-primary)", wordBreak: "break-word" }}>
                      {renderValue(value)}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Description */}
          {meta.description && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 6,
                  fontSize: "0.78rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Full Description
              </div>
              <div
                style={{
                  color: "var(--text-primary)",
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                }}
              >
                {renderValue(meta.description)}
              </div>
            </div>
          )}

          {/* Files list */}
          {files.length > 0 && (
            <div>
              <div
                style={{
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 6,
                  fontSize: "0.78rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Files ({files.length})
              </div>
              {files.slice(0, 15).map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "3px 0",
                    borderBottom: "1px solid var(--border)",
                    fontSize: "0.78rem",
                  }}
                >
                  <span style={{ color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {f.name}
                  </span>
                  <span style={{ color: "var(--text-muted)", flexShrink: 0, marginLeft: 8 }}>
                    {f.format} {f.size ? `(${formatBytes(parseInt(f.size))})` : ""}
                  </span>
                </div>
              ))}
              {files.length > 15 && (
                <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                  +{files.length - 15} more files
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (isNaN(bytes) || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}
