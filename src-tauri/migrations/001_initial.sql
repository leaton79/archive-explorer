-- Archive Roulette v2 — Initial Schema

CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    media_type TEXT NOT NULL,
    date TEXT,
    year INTEGER,
    creator TEXT,
    collection TEXT,
    language TEXT,
    thumbnail_url TEXT,
    archive_url TEXT GENERATED ALWAYS AS ('https://archive.org/details/' || id) STORED,
    metadata_json TEXT,
    saved INTEGER NOT NULL DEFAULT 0,
    saved_at TEXT,
    first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item_tags (
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);

CREATE TABLE IF NOT EXISTS item_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    target_item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    label TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(source_item_id, target_item_id),
    CHECK(source_item_id != target_item_id)
);

CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item_collections (
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (item_id, collection_id)
);

CREATE TABLE IF NOT EXISTS smart_filters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    filter_json TEXT NOT NULL,
    color TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    items_seen INTEGER NOT NULL DEFAULT 0,
    items_saved INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS session_items (
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK(action IN ('seen', 'saved')),
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (session_id, item_id, action)
);

CREATE TABLE IF NOT EXISTS seen_history (
    item_id TEXT PRIMARY KEY,
    seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS curated_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_type TEXT NOT NULL,
    collection_id TEXT NOT NULL,
    display_name TEXT,
    is_default INTEGER NOT NULL DEFAULT 1,
    pinned INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    UNIQUE(media_type, collection_id)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_saved ON items(saved) WHERE saved = 1;
CREATE INDEX IF NOT EXISTS idx_items_media_type ON items(media_type);
CREATE INDEX IF NOT EXISTS idx_items_year ON items(year);
CREATE INDEX IF NOT EXISTS idx_journal_item ON journal_entries(item_id);
CREATE INDEX IF NOT EXISTS idx_journal_created ON journal_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_item_links_target ON item_links(target_item_id);
CREATE INDEX IF NOT EXISTS idx_session_items_session ON session_items(session_id);
CREATE INDEX IF NOT EXISTS idx_seen_history_seen ON seen_history(seen_at);

-- Full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
    title, description, creator, content='items', content_rowid='rowid'
);

CREATE VIRTUAL TABLE IF NOT EXISTS journal_fts USING fts5(
    content, content='journal_entries', content_rowid='id'
);

-- FTS triggers to keep in sync
CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
    INSERT INTO items_fts(rowid, title, description, creator)
    VALUES (NEW.rowid, NEW.title, NEW.description, NEW.creator);
END;

CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, title, description, creator)
    VALUES ('delete', OLD.rowid, OLD.title, OLD.description, OLD.creator);
    INSERT INTO items_fts(rowid, title, description, creator)
    VALUES (NEW.rowid, NEW.title, NEW.description, NEW.creator);
END;

CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, title, description, creator)
    VALUES ('delete', OLD.rowid, OLD.title, OLD.description, OLD.creator);
END;

CREATE TRIGGER IF NOT EXISTS journal_ai AFTER INSERT ON journal_entries BEGIN
    INSERT INTO journal_fts(rowid, content) VALUES (NEW.id, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS journal_au AFTER UPDATE ON journal_entries BEGIN
    INSERT INTO journal_fts(journal_fts, rowid, content) VALUES ('delete', OLD.id, OLD.content);
    INSERT INTO journal_fts(rowid, content) VALUES (NEW.id, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS journal_ad AFTER DELETE ON journal_entries BEGIN
    INSERT INTO journal_fts(journal_fts, rowid, content) VALUES ('delete', OLD.id, OLD.content);
END;

-- Seed default curated collections
INSERT OR IGNORE INTO curated_collections (media_type, collection_id, display_name, is_default, pinned, enabled) VALUES
-- Images
('image', 'flickrcommons', 'Flickr Commons', 1, 0, 1),
('image', 'brooklynmuseum', 'Brooklyn Museum', 1, 0, 1),
('image', 'nypl', 'NYPL', 1, 0, 1),
('image', 'smithsonian', 'Smithsonian', 1, 0, 1),
('image', 'library_of_congress', 'Library of Congress', 1, 0, 1),
('image', 'nasa', 'NASA', 1, 0, 1),
('image', 'biodiversity', 'Biodiversity Heritage', 1, 0, 1),
('image', 'artvee', 'Artvee', 1, 0, 1),
('image', 'moma', 'MoMA', 1, 0, 1),
('image', 'metropolitanmuseumofart-gallery', 'The Met', 1, 0, 1),
('image', 'rijksmuseum', 'Rijksmuseum', 1, 0, 1),
-- Audio
('audio', 'librivoxaudio', 'LibriVox', 1, 0, 1),
('audio', 'GratefulDead', 'Grateful Dead', 1, 0, 1),
('audio', 'etree', 'Live Music Archive', 1, 0, 1),
('audio', 'audio_music', 'Audio Music', 1, 0, 1),
('audio', 'oldtimeradio', 'Old Time Radio', 1, 0, 1),
('audio', 'opensource_audio', 'Open Source Audio', 1, 0, 1),
('audio', '78rpm', '78rpm Records', 1, 0, 1),
('audio', 'audio_bookspoetry', 'Books & Poetry', 1, 0, 1),
-- Movies
('movies', 'prelinger', 'Prelinger Archives', 1, 0, 1),
('movies', 'classic_tv', 'Classic TV', 1, 0, 1),
('movies', 'feature_films', 'Feature Films', 1, 0, 1),
('movies', 'silent_films', 'Silent Films', 1, 0, 1),
('movies', 'stock_footage', 'Stock Footage', 1, 0, 1),
('movies', 'computersandtechvideos', 'Computers & Tech', 1, 0, 1),
('movies', 'newsandpublicaffairs', 'News & Public Affairs', 1, 0, 1),
('movies', 'animationandcartoons', 'Animation & Cartoons', 1, 0, 1),
('movies', 'classic_cartoons', 'Classic Cartoons', 1, 0, 1),
-- Texts
('texts', 'gutenberg', 'Project Gutenberg', 1, 0, 1),
('texts', 'americana', 'Americana', 1, 0, 1),
('texts', 'medicalheritagelibrary', 'Medical Heritage', 1, 0, 1),
('texts', 'iacl', 'IACL', 1, 0, 1),
('texts', 'magazine_rack', 'Magazine Rack', 1, 0, 1),
('texts', 'pulpmagazinearchive', 'Pulp Magazines', 1, 0, 1),
('texts', 'sciencefiction', 'Science Fiction', 1, 0, 1),
-- Software
('software', 'softwarelibrary_msdos_games', 'MS-DOS Games', 1, 0, 1),
('software', 'softwarelibrary_apple', 'Apple Software', 1, 0, 1),
('software', 'softwarelibrary_c64', 'C64 Software', 1, 0, 1),
('software', 'internetarcade', 'Internet Arcade', 1, 0, 1),
('software', 'consolelivingroom', 'Console Living Room', 1, 0, 1),
('software', 'softwarelibrary', 'Software Library', 1, 0, 1);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
('theme', 'light'),
('discovery_view_mode', 'spotlight'),
('grid_items_count', '9'),
('duplicate_window', '500');
