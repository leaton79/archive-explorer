import { useState, useCallback } from "react";
import { discoverRandomItem, discoverBatch } from "../lib/tauri-commands";
import type { Item, DiscoveryFilters } from "../lib/types";

interface DiscoveryState {
  item: Item | null;
  gridItems: Item[];
  loading: boolean;
  error: string | null;
  filters: DiscoveryFilters;
}

export function useDiscovery() {
  const [state, setState] = useState<DiscoveryState>({
    item: null,
    gridItems: [],
    loading: false,
    error: null,
    filters: {
      media_type: "all",
      year_start: null,
      year_end: null,
      language: null,
      query: null,
      collection: null,
    },
  });

  const fetchNext = useCallback(
    async (overrideFilters?: DiscoveryFilters) => {
      const filters = overrideFilters || state.filters;
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const item = await discoverRandomItem(filters);
        setState((s) => ({ ...s, item, loading: false, filters }));
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: typeof err === "string" ? err : "Failed to fetch item",
        }));
      }
    },
    [state.filters]
  );

  const fetchBatch = useCallback(
    async (count: number, overrideFilters?: DiscoveryFilters) => {
      const filters = overrideFilters || state.filters;
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const items = await discoverBatch(filters, count);
        setState((s) => ({ ...s, gridItems: items, loading: false, filters }));
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: typeof err === "string" ? err : "Failed to fetch items",
        }));
      }
    },
    [state.filters]
  );

  const setFilters = useCallback((filters: DiscoveryFilters) => {
    setState((s) => ({ ...s, filters }));
  }, []);

  const setMediaType = useCallback(
    (mediaType: string) => {
      const newFilters = { ...state.filters, media_type: mediaType };
      fetchNext(newFilters);
    },
    [state.filters, fetchNext]
  );

  const setMediaTypeGrid = useCallback(
    (mediaType: string, gridCount: number) => {
      const newFilters = { ...state.filters, media_type: mediaType };
      fetchBatch(gridCount, newFilters);
    },
    [state.filters, fetchBatch]
  );

  return {
    item: state.item,
    gridItems: state.gridItems,
    loading: state.loading,
    error: state.error,
    filters: state.filters,
    fetchNext,
    fetchBatch,
    setFilters,
    setMediaType,
    setMediaTypeGrid,
  };
}
