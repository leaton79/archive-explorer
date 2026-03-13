# Archive Roulette

A desktop app for discovering, saving, and annotating items from the [Internet Archive](https://archive.org). Built with Tauri v2, React, and SQLite.

Archive Roulette turns the Internet Archive's vast collection into a serendipitous research and discovery tool — surfacing random items across media types, letting you save and annotate what you find, and organizing your discoveries into collections with rich connections between items.

## Features

### Discovery
- **Spotlight mode** — one random Archive.org item at a time, with embedded media preview (audio, video, images, text)
- **Grid mode** — browse 6, 9, or 12 items at once as thumbnail cards
- **Media type filtering** — focus on images, audio, video, texts, software, or all types
- **Quality filtering** — randomization engine with varied sort orders and offset strategies to surface interesting content

### Library & Organization
- **Save & tag** items for later with custom tags
- **Per-item journal entries** — timestamped, research-journal-style annotations per item
- **User collections** — create named collections with color coding
- **Smart filters** — auto-populated filters based on media type, tags, year range, keywords, or annotation status
- **Bulk actions** — tag or organize multiple items at once
- **Full-text search** across titles, descriptions, and your notes

### Connections & Visualization
- **Item-to-item links** — create labeled, bidirectional connections between saved items (e.g., "same creator," "responds to")
- **Connection map** — D3.js force-directed graph showing relationships between your saved items

### Search
- **Targeted Archive.org search** — intentional queries against the full Internet Archive API with filters for media type, year range, language, and sort order
- **Paginated results** with recent query history

### Sessions & Export
- **Passive session tracking** — every app launch is a session; see history of items discovered and saved per session
- **On-demand export** — export selected items, collections, or sessions as JSON or Markdown (with archive.org links)

### Themes
Seven switchable themes: Light Clean, Dark Mode, Retro Archival, Solarized, Nord, High Contrast, and Warm Paper.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | [Tauri v2](https://v2.tauri.app/) |
| Backend | Rust |
| Frontend | React + TypeScript + Vite |
| Database | SQLite (via rusqlite) |
| Visualization | D3.js (connection map) |
| API | [Internet Archive API](https://archive.org/developers/) |

## Prerequisites

- **macOS** (primary target; Tauri supports Windows/Linux cross-compilation)
- [Rust](https://rustup.rs/) (install via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- [Node.js](https://nodejs.org/) (v18+)
- Tauri CLI: `cargo install tauri-cli --version "^2.0"`

## Getting Started

```bash
# Clone the repo
git clone https://github.com/leaton79/archive-explorer.git
cd archive-explorer

# Install frontend dependencies
npm install

# Run in development mode (hot-reload)
cargo tauri dev
```

The first build compiles all Rust dependencies and takes 3–5 minutes. Subsequent launches are much faster.

## Building for Production

```bash
cargo tauri build
```

The `.dmg` installer will be at `src-tauri/target/release/bundle/dmg/`.

## Project Structure

```
├── src/                    # React frontend
│   ├── components/
│   │   ├── discovery/      # Discovery tab (spotlight + grid)
│   │   ├── library/        # Library tab (collections, filters, connections)
│   │   ├── search/         # Search tab (targeted Archive.org queries)
│   │   └── settings/       # Settings tab (themes, sessions, curated collections)
│   ├── hooks/              # React hooks for Tauri commands
│   └── lib/                # Types, commands, theme definitions
├── src-tauri/              # Rust backend
│   └── src/
│       ├── commands/       # Tauri command handlers
│       ├── archive_api.rs  # Archive.org API client
│       ├── db.rs           # SQLite database layer
│       └── models.rs       # Data models
└── package.json
```

## License

MIT
