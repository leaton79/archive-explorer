mod archive_api;
mod commands;
mod db;
mod models;
mod quality_filter;

use archive_api::ArchiveApi;
use db::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let database = Database::new().expect("Failed to initialize database");
    let api = ArchiveApi::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(database)
        .manage(api)
        .invoke_handler(tauri::generate_handler![
            // Discovery
            commands::discovery::discover_random_item,
            commands::discovery::fetch_item_metadata,
            // Items
            commands::items::save_item,
            commands::items::unsave_item,
            commands::items::is_item_saved,
            commands::items::get_saved_items,
            commands::items::get_item,
            commands::items::add_journal_entry,
            commands::items::update_journal_entry,
            commands::items::delete_journal_entry,
            commands::items::get_journal_entries,
            // Tags
            commands::tags::get_all_tags,
            commands::tags::get_item_tags,
            commands::tags::add_tag_to_item,
            commands::tags::remove_tag_from_item,
            commands::tags::search_tags,
            // Settings & Export
            commands::settings::get_setting,
            commands::settings::set_setting,
            commands::settings::get_curated_collections,
            commands::settings::get_pinned_collections,
            commands::settings::toggle_collection_pinned,
            commands::settings::toggle_collection_enabled,
            commands::settings::export_saved_items_json,
            commands::settings::export_saved_items_markdown,
            // Sessions
            commands::sessions::start_session,
            commands::sessions::end_session,
            commands::sessions::record_session_item,
            commands::sessions::get_sessions,
            // Collections
            commands::collections::create_collection,
            commands::collections::update_collection,
            commands::collections::delete_collection,
            commands::collections::get_collections,
            commands::collections::add_item_to_collection,
            commands::collections::remove_item_from_collection,
            commands::collections::get_item_collections,
            commands::collections::get_items_in_collection,
            commands::collections::bulk_add_to_collection,
            commands::collections::bulk_add_tags,
            commands::collections::create_smart_filter,
            commands::collections::delete_smart_filter,
            commands::collections::get_smart_filters,
            commands::collections::add_curated_collection,
            commands::collections::remove_curated_collection,
            // Links
            commands::links::create_item_link,
            commands::links::delete_item_link,
            commands::links::get_item_links,
            commands::links::get_connection_graph,
            // Search
            commands::search::search_archive,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Archive Roulette");
}
