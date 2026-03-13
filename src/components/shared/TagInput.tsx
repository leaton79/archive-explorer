import { useState, useEffect, useRef } from "react";
import { searchTags, addTagToItem, removeTagFromItem, getItemTags } from "../../lib/tauri-commands";
import type { Tag } from "../../lib/types";

interface TagInputProps {
  itemId: string;
  onTagsChanged?: () => void;
}

export function TagInput({ itemId, onTagsChanged }: TagInputProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getItemTags(itemId).then(setTags);
  }, [itemId]);

  useEffect(() => {
    if (input.length >= 2) {
      searchTags(input).then((results) => {
        // Filter out already-applied tags
        const existing = new Set(tags.map((t) => t.name.toLowerCase()));
        setSuggestions(results.filter((t) => !existing.has(t.name.toLowerCase())));
        setShowSuggestions(true);
      });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [input, tags]);

  const addTag = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) return;

    try {
      const tag = await addTagToItem(itemId, trimmed);
      setTags((prev) => [...prev, tag]);
      setInput("");
      setShowSuggestions(false);
      onTagsChanged?.();
    } catch (err) {
      console.error("Failed to add tag:", err);
    }
  };

  const removeTag = async (tag: Tag) => {
    try {
      await removeTagFromItem(itemId, tag.id);
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
      onTagsChanged?.();
    } catch (err) {
      console.error("Failed to remove tag:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
        {tags.map((tag) => (
          <span key={tag.id} className="tag-pill">
            {tag.name}
            <span className="remove-tag" onClick={() => removeTag(tag)}>
              ×
            </span>
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        className="input"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder="Add tags..."
        style={{ fontSize: "0.82rem" }}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-lg)",
            zIndex: 10,
            maxHeight: 160,
            overflowY: "auto",
          }}
        >
          {suggestions.map((s) => (
            <div
              key={s.id}
              onClick={() => addTag(s.name)}
              style={{
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
