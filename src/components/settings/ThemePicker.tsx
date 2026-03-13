import { THEME_LABELS } from "../../lib/types";
import type { ThemeId } from "../../lib/types";

interface ThemePickerProps {
  current: ThemeId;
  onChange: (theme: ThemeId) => void;
}

const THEME_SWATCHES: Record<ThemeId, { bg: string; accent: string; text: string }> = {
  light: { bg: "#ffffff", accent: "#2563eb", text: "#1a1a1a" },
  dark: { bg: "#0f0f0f", accent: "#60a5fa", text: "#e5e5e5" },
  retro: { bg: "#f4efe4", accent: "#8b4513", text: "#2c2416" },
  solarized: { bg: "#fdf6e3", accent: "#268bd2", text: "#657b83" },
  nord: { bg: "#2e3440", accent: "#88c0d0", text: "#eceff4" },
  highcontrast: { bg: "#000000", accent: "#ffd700", text: "#ffffff" },
  warmpaper: { bg: "#faf3e8", accent: "#b87333", text: "#3d3429" },
};

export function ThemePicker({ current, onChange }: ThemePickerProps) {
  return (
    <div>
      <div
        style={{
          fontSize: "0.82rem",
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        Theme
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
        {(Object.keys(THEME_LABELS) as ThemeId[]).map((id) => {
          const swatch = THEME_SWATCHES[id];
          const isActive = current === id;

          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: isActive ? "var(--accent-light)" : "var(--bg-secondary)",
                border: `2px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "var(--radius)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 150ms",
              }}
            >
              {/* Color swatch */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: swatch.bg,
                  border: `2px solid ${swatch.accent}`,
                  flexShrink: 0,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: "50%",
                    height: "50%",
                    background: swatch.accent,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: isActive ? 600 : 400,
                  color: "var(--text-primary)",
                }}
              >
                {THEME_LABELS[id]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
