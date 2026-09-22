use tauri::State;
use serde::{Serialize, Deserialize};
use crate::db::DbState;
use chrono::Utc;

#[derive(Serialize, Deserialize, Default)]
pub struct Client {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub balance: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn search_clients(query: String, state: State<'_, DbState>) -> Result<Vec<Client>, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let like_query = format!("%{}%", query);
    
    let mut stmt = conn.prepare("SELECT id, name, phone, balance, created_at, updated_at FROM clients WHERE name LIKE ?1 OR phone LIKE ?1").unwrap();
    let iter = stmt.query_map(rusqlite::params![like_query], |r| Ok(Client {
        id: r.get(0)?, name: r.get(1)?, phone: r.get(2)?, balance: r.get(3)?, created_at: r.get(4)?, updated_at: r.get(5)?
    })).unwrap();
    
    Ok(iter.flatten().collect())
}

#[tauri::command]
pub fn create_client(name: String, phone: Option<String>, state: State<'_, DbState>) -> Result<Client, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    
    conn.execute(
        "INSERT INTO clients (name, phone, balance, created_at, updated_at) VALUES (?1, ?2, 0, ?3, ?3)",
        rusqlite::params![name, phone, now]
    ).map_err(|e| e.to_string())?;
    
    let id = conn.last_insert_rowid();
    Ok(Client { id, name, phone, balance: 0.0, created_at: now.clone(), updated_at: now })
}

#[tauri::command]
pub fn get_client(client_id: i64, state: State<'_, DbState>) -> Result<Client, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let c = conn.query_row("SELECT id, name, phone, balance, created_at, updated_at FROM clients WHERE id = ?1", rusqlite::params![client_id], |r| Ok(Client {
        id: r.get(0)?, name: r.get(1)?, phone: r.get(2)?, balance: r.get(3)?, created_at: r.get(4)?, updated_at: r.get(5)?
    })).map_err(|_| "Client not found")?;
    Ok(c)
}
