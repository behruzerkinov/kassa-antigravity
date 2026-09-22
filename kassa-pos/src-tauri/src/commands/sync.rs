use tauri::State;
use serde::{Serialize, Deserialize};
use crate::db::DbState;

#[derive(Serialize, Deserialize, Default)]
pub struct SyncStatus {
    pub pending_count: i64,
    pub failed_count: i64,
    pub last_synced_at: Option<String>,
}

#[tauri::command]
pub fn get_sync_status(state: State<'_, DbState>) -> Result<SyncStatus, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let pending_transactions: i64 = conn.query_row("SELECT COUNT(*) FROM transactions WHERE sync_status = 'pending'", [], |r| r.get(0)).unwrap_or(0);
    let pending_expenses: i64 = conn.query_row("SELECT COUNT(*) FROM expenses WHERE sync_status = 'pending'", [], |r| r.get(0)).unwrap_or(0);
    
    Ok(SyncStatus {
        pending_count: pending_transactions + pending_expenses,
        failed_count: 0,
        last_synced_at: None,
    })
}

#[tauri::command]
pub fn retry_failed_sync(_state: State<'_, DbState>) -> Result<i64, String> {
    Ok(0)
}
