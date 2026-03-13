import { invoke } from "@tauri-apps/api/core";
import type {
  Item,
  SavedItemSummary,
  JournalEntry,
  Tag,
  CuratedCollection,
  DiscoveryFilters,
  Session,
  UserCollection,
  SmartFilter,
  ItemLink,
  GraphData,
  SearchResponse,
} from "./types";

// ── Discovery ───────────────────────────────────────────────

export async function discoverRandomItem(
  filters: DiscoveryFilters
): Promise<Item> {
  return invoke("discover_random_item", { filters });
}

export async function fetchItemMetadata(identifier: string): Promise<Item> {
  return invoke("fetch_item_metadata", { identifier });
}

// ── Items ───────────────────────────────────────────────────

export async function saveItem(
  itemId: string,
  tagNames: string[]
): Promise<void> {
  return invoke("save_item", { itemId, tagNames });
}

export async function unsaveItem(itemId: string): Promise<void> {
  return invoke("unsave_item", { itemId });
}

export async function isItemSaved(itemId: string): Promise<boolean> {
  return invoke("is_item_saved", { itemId });
}

export async function getSavedItems(
  searchQuery?: string,
  mediaTypeFilter?: string,
  tagFilter?: string
): Promise<SavedItemSummary[]> {
  return invoke("get_saved_items", {
    searchQuery: searchQuery || null,
    mediaTypeFilter: mediaTypeFilter || null,
    tagFilter: tagFilter || null,
  });
}

export async function getItem(itemId: string): Promise<Item | null> {
  return invoke("get_item", { itemId });
}

// ── Journal ─────────────────────────────────────────────────

export async function addJournalEntry(
  itemId: string,
  content: string
): Promise<JournalEntry> {
  return invoke("add_journal_entry", { itemId, content });
}

export async function updateJournalEntry(
  entryId: number,
  content: string
): Promise<void> {
  return invoke("update_journal_entry", { entryId, content });
}

export async function deleteJournalEntry(entryId: number): Promise<void> {
  return invoke("delete_journal_entry", { entryId });
}

export async function getJournalEntries(
  itemId: string
): Promise<JournalEntry[]> {
  return invoke("get_journal_entries", { itemId });
}

// ── Tags ────────────────────────────────────────────────────

export async function getAllTags(): Promise<Tag[]> {
  return invoke("get_all_tags");
}

export async function getItemTags(itemId: string): Promise<Tag[]> {
  return invoke("get_item_tags", { itemId });
}

export async function addTagToItem(
  itemId: string,
  tagName: string
): Promise<Tag> {
  return invoke("add_tag_to_item", { itemId, tagName });
}

export async function removeTagFromItem(
  itemId: string,
  tagId: number
): Promise<void> {
  return invoke("remove_tag_from_item", { itemId, tagId });
}

export async function searchTags(prefix: string): Promise<Tag[]> {
  return invoke("search_tags", { prefix });
}

// ── Settings ────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  return invoke("get_setting", { key });
}

export async function setSetting(key: string, value: string): Promise<void> {
  return invoke("set_setting", { key, value });
}

// ── Curated Collections ─────────────────────────────────────

export async function getCuratedCollections(): Promise<CuratedCollection[]> {
  return invoke("get_curated_collections");
}

export async function getPinnedCollections(): Promise<CuratedCollection[]> {
  return invoke("get_pinned_collections");
}

export async function toggleCollectionPinned(
  collectionId: number,
  pinned: boolean
): Promise<void> {
  return invoke("toggle_collection_pinned", { collectionId, pinned });
}

export async function toggleCollectionEnabled(
  collectionId: number,
  enabled: boolean
): Promise<void> {
  return invoke("toggle_collection_enabled", { collectionId, enabled });
}

// ── Export ───────────────────────────────────────────────────

export async function exportSavedItemsJson(): Promise<string> {
  return invoke("export_saved_items_json");
}

export async function exportSavedItemsMarkdown(): Promise<string> {
  return invoke("export_saved_items_markdown");
}

// ── Sessions ────────────────────────────────────────────────

export async function startSession(): Promise<number> {
  return invoke("start_session");
}

export async function endSession(sessionId: number): Promise<void> {
  return invoke("end_session", { sessionId });
}

export async function recordSessionItem(
  sessionId: number,
  itemId: string,
  action: string
): Promise<void> {
  return invoke("record_session_item", { sessionId, itemId, action });
}

export async function getSessions(limit?: number): Promise<Session[]> {
  return invoke("get_sessions", { limit: limit || null });
}

// ── Batch Discovery ─────────────────────────────────────────

export async function discoverBatch(
  filters: DiscoveryFilters,
  count: number
): Promise<Item[]> {
  const results: Item[] = [];
  const seen = new Set<string>();

  // Fetch items one at a time, skipping duplicates within the batch
  for (let i = 0; i < count + 5 && results.length < count; i++) {
    try {
      const item = await discoverRandomItem(filters);
      if (!seen.has(item.id)) {
        seen.add(item.id);
        results.push(item);
      }
    } catch {
      // If one fetch fails, keep going
      continue;
    }
  }

  return results;
}

// ── User Collections ────────────────────────────────────────

export async function createCollection(
  name: string,
  description?: string,
  color?: string
): Promise<UserCollection> {
  return invoke("create_collection", {
    name,
    description: description || null,
    color: color || null,
  });
}

export async function updateCollection(
  collectionId: number,
  name: string,
  description?: string,
  color?: string
): Promise<void> {
  return invoke("update_collection", {
    collectionId,
    name,
    description: description || null,
    color: color || null,
  });
}

export async function deleteCollection(collectionId: number): Promise<void> {
  return invoke("delete_collection", { collectionId });
}

export async function getCollections(): Promise<UserCollection[]> {
  return invoke("get_collections");
}

export async function addItemToCollection(
  itemId: string,
  collectionId: number
): Promise<void> {
  return invoke("add_item_to_collection", { itemId, collectionId });
}

export async function removeItemFromCollection(
  itemId: string,
  collectionId: number
): Promise<void> {
  return invoke("remove_item_from_collection", { itemId, collectionId });
}

export async function getItemCollections(itemId: string): Promise<number[]> {
  return invoke("get_item_collections", { itemId });
}

export async function getItemsInCollection(
  collectionId: number
): Promise<string[]> {
  return invoke("get_items_in_collection", { collectionId });
}

// ── Bulk Operations ─────────────────────────────────────────

export async function bulkAddToCollection(
  itemIds: string[],
  collectionId: number
): Promise<number> {
  return invoke("bulk_add_to_collection", { itemIds, collectionId });
}

export async function bulkAddTags(
  itemIds: string[],
  tagNames: string[]
): Promise<void> {
  return invoke("bulk_add_tags", { itemIds, tagNames });
}

// ── Smart Filters ───────────────────────────────────────────

export async function createSmartFilter(
  name: string,
  filterJson: string,
  description?: string,
  color?: string
): Promise<SmartFilter> {
  return invoke("create_smart_filter", {
    name,
    filterJson,
    description: description || null,
    color: color || null,
  });
}

export async function deleteSmartFilter(filterId: number): Promise<void> {
  return invoke("delete_smart_filter", { filterId });
}

export async function getSmartFilters(): Promise<SmartFilter[]> {
  return invoke("get_smart_filters");
}

// ── Curated Collections Management ──────────────────────────

export async function addCuratedCollection(
  mediaType: string,
  collectionId: string,
  displayName?: string
): Promise<void> {
  return invoke("add_curated_collection", {
    mediaType,
    collectionId,
    displayName: displayName || null,
  });
}

export async function removeCuratedCollection(id: number): Promise<void> {
  return invoke("remove_curated_collection", { id });
}

// ── Item Links ──────────────────────────────────────────────

export async function createItemLink(
  sourceItemId: string,
  targetItemId: string,
  label?: string
): Promise<void> {
  return invoke("create_item_link", {
    sourceItemId,
    targetItemId,
    label: label || null,
  });
}

export async function deleteItemLink(linkId: number): Promise<void> {
  return invoke("delete_item_link", { linkId });
}

export async function getItemLinks(itemId: string): Promise<ItemLink[]> {
  return invoke("get_item_links", { itemId });
}

export async function getConnectionGraph(): Promise<GraphData> {
  return invoke("get_connection_graph");
}

// ── Archive Search ──────────────────────────────────────────

export async function searchArchive(
  query: string,
  mediaType?: string,
  yearStart?: number,
  yearEnd?: number,
  language?: string,
  sort?: string,
  page?: number
): Promise<SearchResponse> {
  return invoke("search_archive", {
    query,
    mediaType: mediaType || null,
    yearStart: yearStart || null,
    yearEnd: yearEnd || null,
    language: language || null,
    sort: sort || null,
    page: page || null,
  });
}
