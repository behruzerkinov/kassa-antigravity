use tauri::State;
use serde::{Serialize, Deserialize};
use crate::db::DbState;
use crate::utils::get_session_cashier;
use crate::models::Smena;
use chrono::{Utc, Duration};
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub cashier_id: i64,
    pub cashier_name: String,
    pub open_smena: Option<Smena>,
}

#[derive(Serialize, Deserialize)]
pub struct SessionInfo {
    pub cashier_id: i64,
    pub cashier_name: String,
    pub is_locked: bool,
    pub open_smena: Option<Smena>,
}

#[tauri::command]
pub fn login(username: String, password: String, state: State<'_, DbState>) -> Result<LoginResponse, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    
    let (id, hash): (i64, String) = conn.query_row(
        "SELECT id, password_hash FROM cashiers WHERE username = ?1",
        rusqlite::params![username],
        |row| Ok((row.get(0)?, row.get(1)?))
    ).map_err(|_| "Invalid username or password".to_string())?;

    if !bcrypt::verify(&password, &hash).unwrap_or(false) {
        return Err("Invalid username or password".to_string());
    }

    let token = Uuid::new_v4().to_string();
    let now = Utc::now();
    let expires = now + Duration::hours(12);

    conn.execute(
        "INSERT INTO sessions (cashier_id, token, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, token, now.to_rfc3339(), expires.to_rfc3339()]
    ).map_err(|e| e.to_string())?;

    let smena_opt = get_open_smena(&conn, id);

    Ok(LoginResponse {
        token,
        cashier_id: id,
        cashier_name: username,
        open_smena: smena_opt,
    })
}

#[tauri::command]
pub fn logout(token: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM sessions WHERE token = ?1", rusqlite::params![token]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn validate_session(token: String, state: State<'_, DbState>) -> Result<SessionInfo, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, cashier_name) = get_session_cashier(&conn, &token)?;
    let smena_opt = get_open_smena(&conn, cashier_id);

    Ok(SessionInfo {
        cashier_id,
        cashier_name,
        is_locked: false, // Stub for now
        open_smena: smena_opt,
    })
}

#[tauri::command]
pub fn lock_screen(token: String, state: State<'_, DbState>) -> Result<(), String> {
    // Stub
    Ok(())
}

#[tauri::command]
pub fn has_cashiers(state: State<'_, DbState>) -> Result<bool, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let count: i64 = conn.query_row("SELECT count(*) FROM cashiers", [], |r| r.get(0)).unwrap_or(0);
    Ok(count > 0)
}

#[tauri::command]
pub fn bootstrap_cashier(username: String, password: String, state: State<'_, DbState>) -> Result<LoginResponse, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let count: i64 = conn.query_row("SELECT count(*) FROM cashiers", [], |r| r.get(0)).unwrap_or(0);
    if count > 0 {
        return Err("Cashiers already exist. Use standard login.".to_string());
    }
    if username.trim().is_empty() || password.len() < 4 {
        return Err("Username is required and password must be at least 4 characters.".to_string());
    }
    let hash = bcrypt::hash(&password, bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;
    let now = Utc::now();
    conn.execute(
        "INSERT INTO cashiers (username, password_hash, created_at) VALUES (?1, ?2, ?3)",
        rusqlite::params![username.trim(), hash, now.to_rfc3339()]
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();

    let token = Uuid::new_v4().to_string();
    let expires = now + Duration::hours(12);
    conn.execute(
        "INSERT INTO sessions (cashier_id, token, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, token, now.to_rfc3339(), expires.to_rfc3339()]
    ).map_err(|e| e.to_string())?;

    Ok(LoginResponse {
        token,
        cashier_id: id,
        cashier_name: username.trim().to_string(),
        open_smena: None,
    })
}

#[tauri::command]
pub fn unlock_screen(token: String, password: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _name) = get_session_cashier(&conn, &token)?;
    
    let hash: String = conn.query_row("SELECT password_hash FROM cashiers WHERE id = ?1", rusqlite::params![cashier_id], |r| r.get(0)).map_err(|e| e.to_string())?;
    if !bcrypt::verify(&password, &hash).unwrap_or(false) {
        return Err("Invalid password".into());
    }
    
    Ok(())
}

fn get_open_smena(conn: &rusqlite::Connection, cashier_id: i64) -> Option<Smena> {
    conn.query_row(
        "SELECT id, cashier_id, opened_at, closed_at, status FROM smenas WHERE cashier_id = ?1 AND status = 'open'",
        rusqlite::params![cashier_id],
        |row| {
            Ok(Smena {
                id: row.get(0)?,
                cashier_id: row.get(1)?,
                opened_at: row.get(2)?,
                closed_at: row.get(3)?,
                status: row.get(4)?,
            })
        }
    ).ok()
}
