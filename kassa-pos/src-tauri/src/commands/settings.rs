use tauri::State;
use std::collections::HashMap;
use crate::db::DbState;

#[tauri::command]
pub fn get_all_settings(state: State<'_, DbState>) -> Result<HashMap<String, String>, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT key, value FROM settings").unwrap();
    let rows = stmt.query_map([], |row| {
        Ok((row.get(0)?, row.get(1)?))
    }).unwrap();

    let mut map = HashMap::new();
    for row in rows.flatten() {
        map.insert(row.0, row.1);
    }
    Ok(map)
}

#[tauri::command]
pub fn update_setting(key: String, value: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)", rusqlite::params![key, value]).map_err(|e| e.to_string())?;
    Ok(())
}
