use tauri::State;
use serde::{Serialize, Deserialize};
use crate::db::DbState;
use crate::utils::get_session_cashier;
use chrono::Utc;

#[derive(Serialize, Deserialize, Default)]
pub struct Expense {
    pub id: i64,
    pub cashier_id: i64,
    pub smena_id: Option<i64>,
    pub expense_type_id: Option<i64>,
    pub amount: f64,
    pub note: Option<String>,
    pub sync_status: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Default)]
pub struct ExpenseType {
    pub id: i64,
    pub name: String,
}

#[tauri::command]
pub fn create_expense(
    token: String, 
    expense_type_id: i64, 
    amount: f64, 
    note: Option<String>, 
    state: State<'_, DbState>
) -> Result<Expense, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _) = get_session_cashier(&conn, &token)?;

    let smena_id: Option<i64> = conn.query_row("SELECT id FROM smenas WHERE cashier_id = ?1 AND status = 'open'", rusqlite::params![cashier_id], |r| r.get(0)).ok();
    
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO expenses (cashier_id, smena_id, expense_type_id, amount, note, sync_status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6)",
        rusqlite::params![cashier_id, smena_id, expense_type_id, amount, note, now]
    ).map_err(|e| e.to_string())?;
    
    let id = conn.last_insert_rowid();
    Ok(Expense { id, cashier_id, smena_id, expense_type_id: Some(expense_type_id), amount, note, sync_status: "pending".into(), created_at: now })
}

#[tauri::command]
pub fn get_expense_types(state: State<'_, DbState>) -> Result<Vec<ExpenseType>, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, name FROM expense_types").unwrap();
    let iter = stmt.query_map([], |r| Ok(ExpenseType { id: r.get(0)?, name: r.get(1)? })).unwrap();
    Ok(iter.flatten().collect())
}

#[tauri::command]
pub fn get_smena_expenses(token: String, smena_id: i64, state: State<'_, DbState>) -> Result<Vec<Expense>, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _) = get_session_cashier(&conn, &token)?;

    let mut stmt = conn.prepare("SELECT id, cashier_id, smena_id, expense_type_id, amount, note, sync_status, created_at FROM expenses WHERE smena_id = ?1 AND cashier_id = ?2").unwrap();
    let iter = stmt.query_map(rusqlite::params![smena_id, cashier_id], |r| Ok(Expense {
        id: r.get(0)?, cashier_id: r.get(1)?, smena_id: r.get(2)?, expense_type_id: r.get(3)?, amount: r.get(4)?, note: r.get(5)?, sync_status: r.get(6)?, created_at: r.get(7)?
    })).unwrap();
    
    Ok(iter.flatten().collect())
}
