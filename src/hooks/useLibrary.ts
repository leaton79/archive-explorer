import { useState, useCallback, useEffect } from "react";
import { getSavedItems, getAllTags } from "../lib/tauri-commands";
import type { SavedItemSummary, Tag } from "../lib/types";

export function useLibrary() {
  const [items, setItems] = useState<SavedItemSummary[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaFilter, setMediaFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [savedItems, tags] = await Promise.all([
        getSavedItems(
          searchQuery || undefined,
          mediaFilter !== "all" ? mediaFilter : undefined,
          tagFilter || undefined
        ),
        getAllTags(),
      ]);
      setItems(savedItems);
      setAllTags(tags);
    } catch (err) {
      console.error("Failed to load library:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, mediaFilter, tagFilter]);

  // Refresh when filters change
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
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
  };
}
