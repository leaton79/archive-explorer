export interface Item {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  date: string | null;
  year: number | null;
  creator: string | null;
  collection: string | null;
  language: string | null;
  thumbnail_url: string | null;
  archive_url: string;
  metadata_json: string | null;
  saved: boolean;
  saved_at: string | null;
  first_seen_at: string;
  updated_at: string;
}

export interface SavedItemSummary {
  id: string;
  title: string;
  media_type: string;
  date: string | null;
  thumbnail_url: string | null;
  archive_url: string;
  saved_at: string | null;
  tag_names: string[];
  note_count: number;
}

export interface JournalEntry {
  id: number;
  item_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface CuratedCollection {
  id: number;
  media_type: string;
  collection_id: string;
  display_name: string | null;
  is_default: boolean;
  pinned: boolean;
  enabled: boolean;
}

export interface DiscoveryFilters {
  media_type: string | null;
  year_start: number | null;
  year_end: number | null;
  language: string | null;
  query: string | null;
  collection: string | null;
}

export type ThemeId =
  | "light"
  | "dark"
  | "retro"
  | "solarized"
  | "nord"
  | "highcontrast"
  | "warmpaper";

export type DiscoveryViewMode = "spotlight" | "grid";

export interface Session {
  id: number;
  started_at: string;
  ended_at: string | null;
  items_seen: number;
  items_saved: number;
}

export interface UserCollection {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  item_count: number;
  created_at: string;
}

export interface SmartFilter {
  id: number;
  name: string;
  description: string | null;
  filter_json: string;
  color: string | null;
  item_count: number;
  created_at: string;
}

export interface SmartFilterCriteria {
  media_types: string[];
  tags: string[];
  tag_mode: "any" | "all";
  year_start: number | null;
  year_end: number | null;
  has_notes: boolean;
  keyword: string | null;
}

export interface ItemLink {
  id: number;
  source_item_id: string;
  target_item_id: string;
  label: string | null;
  created_at: string;
  target_title: string | null;
  target_media_type: string | null;
  target_thumbnail_url: string | null;
}

export interface GraphNode {
  id: string;
  title: string;
  media_type: string;
  thumbnail_url: string | null;
  link_count: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  date: string | null;
  creator: string | null;
  collection: string | null;
  thumbnail_url: string;
  archive_url: string;
  is_saved: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  total_found: number;
  page: number;
}

export const THEME_LABELS: Record<ThemeId, string> = {
  light: "Light Clean",
  dark: "Dark Mode",
  retro: "Retro Archival",
  solarized: "Solarized",
  nord: "Nord",
  highcontrast: "High Contrast",
  warmpaper: "Warm Paper",
};

export const MEDIA_TYPES = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "audio", label: "Audio" },
  { value: "movies", label: "Video" },
  { value: "texts", label: "Texts" },
  { value: "software", label: "Software" },
  { value: "web", label: "Web" },
  { value: "collection:newspapers", label: "Newspapers" },
  { value: "collection:magazine_rack", label: "Magazines" },
] as const;

export const LANGUAGES = [
  { value: "", label: "Any Language" },
  { value: "eng", label: "English" },
  { value: "spa", label: "Spanish" },
  { value: "fra", label: "French" },
  { value: "deu", label: "German" },
  { value: "ita", label: "Italian" },
  { value: "por", label: "Portuguese" },
  { value: "rus", label: "Russian" },
  { value: "jpn", label: "Japanese" },
  { value: "zho", label: "Chinese" },
  { value: "ara", label: "Arabic" },
  { value: "hin", label: "Hindi" },
  { value: "nld", label: "Dutch" },
  { value: "pol", label: "Polish" },
  { value: "kor", label: "Korean" },
  { value: "swe", label: "Swedish" },
  { value: "dan", label: "Danish" },
  { value: "nor", label: "Norwegian" },
  { value: "fin", label: "Finnish" },
  { value: "lat", label: "Latin" },
  { value: "grc", label: "Ancient Greek" },
] as const;

export interface ArchiveMetadata {
  metadata?: ArchiveMetadataInner;
  files?: ArchiveFile[];
}

export interface ArchiveMetadataInner {
  identifier?: string;
  title?: string;
  description?: string | string[];
  mediatype?: string;
  date?: string;
  year?: string | number;
  collection?: string | string[];
  creator?: string | string[];
  subject?: string | string[];
  language?: string | string[];
  runtime?: string;
  sound_type?: string;
  color?: string;
  isbn?: string | string[];
  issn?: string | string[];
  lccn?: string;
  publisher?: string | string[];
  contributor?: string | string[];
  sponsor?: string | string[];
  licenseurl?: string;
  rights?: string;
  source?: string;
  notes?: string;
  addeddate?: string;
  publicdate?: string;
  downloads?: number;
  num_reviews?: number;
  avg_rating?: number;
}

export interface ArchiveFile {
  name?: string;
  format?: string;
  size?: string;
  source?: string;
}
