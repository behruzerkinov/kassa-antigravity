use tauri::State;
use serde::{Serialize, Deserialize};
use crate::db::DbState;
use crate::utils::get_session_cashier;
use crate::models::Smena;
use chrono::Utc;

#[derive(Serialize, Deserialize)]
pub struct XReport {
    pub smena_id: i64,
    pub opened_at: String,
    pub total_cash: f64,
    pub total_card: f64,
    pub total_returns: f64,
    pub total_expenses: f64,
    pub total_debt: f64,
    pub transaction_count: i64,
}

#[tauri::command]
pub fn open_smena(token: String, state: State<'_, DbState>) -> Result<Smena, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _) = get_session_cashier(&conn, &token)?;

    let open_count: i64 = conn.query_row("SELECT COUNT(*) FROM smenas WHERE cashier_id = ?1 AND status = 'open'", rusqlite::params![cashier_id], |r| r.get(0)).unwrap_or(0);
    if open_count > 0 {
        return Err("Smena already open".into());
    }

    let now = Utc::now().to_rfc3339();
    conn.execute("INSERT INTO smenas (cashier_id, opened_at) VALUES (?1, ?2)", rusqlite::params![cashier_id, now]).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();

    Ok(Smena { id, cashier_id, opened_at: now, closed_at: None, status: "open".into() })
}

#[tauri::command]
pub fn close_smena(token: String, smena_id: i64, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _) = get_session_cashier(&conn, &token)?;

    let pending: i64 = conn.query_row("SELECT COUNT(*) FROM transactions WHERE smena_id = ?1 AND sync_status = 'pending'", rusqlite::params![smena_id], |r| r.get(0)).unwrap_or(0);
    if pending > 0 {
        return Err("Cannot close smena with pending transactions".into());
    }

    let now = Utc::now().to_rfc3339();
    conn.execute("UPDATE smenas SET closed_at = ?1, status = 'closed' WHERE id = ?2 AND cashier_id = ?3 AND status = 'open'", rusqlite::params![now, smena_id, cashier_id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_current_smena(token: String, state: State<'_, DbState>) -> Result<Option<Smena>, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _) = get_session_cashier(&conn, &token)?;

    let res = conn.query_row("SELECT id, cashier_id, opened_at, closed_at, status FROM smenas WHERE cashier_id = ?1 AND status = 'open'", rusqlite::params![cashier_id], |row| {
        Ok(Smena { id: row.get(0)?, cashier_id: row.get(1)?, opened_at: row.get(2)?, closed_at: row.get(3)?, status: row.get(4)? })
    }).ok();
    Ok(res)
}

#[tauri::command]
pub fn get_x_report(token: String, smena_id: i64, state: State<'_, DbState>) -> Result<XReport, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _) = get_session_cashier(&conn, &token)?;

    let opened_at: String = conn.query_row(
        "SELECT opened_at FROM smenas WHERE id = ?1 AND cashier_id = ?2",
        rusqlite::params![smena_id, cashier_id],
        |r| r.get(0)
    ).map_err(|e| e.to_string())?;

    let totals = conn.query_row(
        "SELECT 
            COALESCE(SUM(cash_amount), 0.0),
            COALESCE(SUM(card_amount), 0.0),
            COALESCE(SUM(debt_amount), 0.0),
            COUNT(*)
         FROM transactions 
         WHERE smena_id = ?1 AND cashier_id = ?2 AND kind = 'sale'",
        rusqlite::params![smena_id, cashier_id],
        |r| Ok((r.get::<_, f64>(0)?, r.get::<_, f64>(1)?, r.get::<_, f64>(2)?, r.get::<_, i64>(3)?))
    ).unwrap_or((0.0, 0.0, 0.0, 0));

    let total_returns: f64 = conn.query_row(
        "SELECT COALESCE(ABS(SUM(total)), 0.0) FROM transactions WHERE smena_id = ?1 AND cashier_id = ?2 AND kind = 'return'",
        rusqlite::params![smena_id, cashier_id],
        |r| r.get(0)
    ).unwrap_or(0.0);

    let total_expenses: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0.0) FROM expenses WHERE smena_id = ?1",
        rusqlite::params![smena_id],
        |r| r.get(0)
    ).unwrap_or(0.0);

    Ok(XReport {
        smena_id,
        opened_at,
        total_cash: totals.0,
        total_card: totals.1,
        total_returns,
        total_expenses,
        total_debt: totals.2,
        transaction_count: totals.3,
    })
}
