use tauri::State;
use serde::{Serialize, Deserialize};
use crate::db::DbState;
use crate::utils::get_session_cashier;
use crate::commands::payment::Transaction;
use crate::commands::cart::CartItem;

#[derive(Serialize, Deserialize, Default)]
pub struct TransactionSummary {
    pub id: i64,
    pub kind: String,
    pub total: f64,
    pub status: String,
    pub sync_status: String,
    pub created_at: String,
    pub client_name: Option<String>,
}

#[derive(Serialize, Deserialize, Default)]
pub struct TransactionDetail {
    pub transaction: Transaction,
    pub items: Vec<CartItem>, // We reuse CartItem shape for transaction_items, they are almost identical
}

#[tauri::command]
pub fn get_receipts(
    token: String, 
    search: Option<String>, 
    date_from: Option<String>, 
    date_to: Option<String>, 
    state: State<'_, DbState>
) -> Result<Vec<TransactionSummary>, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _) = get_session_cashier(&conn, &token)?;

    let mut query = "SELECT t.id, t.kind, t.total, t.status, t.sync_status, t.created_at, c.name FROM transactions t LEFT JOIN clients c ON t.client_id = c.id WHERE t.cashier_id = ?1".to_string();
    let mut params: Vec<rusqlite::types::Value> = vec![cashier_id.into()];
    
    if let Some(s) = search {
        if !s.is_empty() {
            query.push_str(" AND EXISTS (SELECT 1 FROM transaction_items ti WHERE ti.transaction_id = t.id AND (ti.name LIKE ?2 OR ti.barcode LIKE ?2))");
            params.push(format!("%{}%", s).into());
        }
    }
    
    if let (Some(df), Some(dt)) = (date_from, date_to) {
        query.push_str(&format!(" AND t.created_at BETWEEN ?{} AND ?{}", params.len() + 1, params.len() + 2));
        params.push(df.into());
        params.push(dt.into());
    }
    
    query.push_str(" ORDER BY t.created_at DESC");

    let mut stmt = conn.prepare(&query).unwrap();
    let iter = stmt.query_map(rusqlite::params_from_iter(params.iter()), |r| Ok(TransactionSummary {
        id: r.get(0)?, kind: r.get(1)?, total: r.get(2)?, status: r.get(3)?, sync_status: r.get(4)?, created_at: r.get(5)?, client_name: r.get(6)?
    })).unwrap();
    
    Ok(iter.flatten().collect())
}

#[tauri::command]
pub fn get_receipt_detail(
    token: String, 
    transaction_id: i64, 
    state: State<'_, DbState>
) -> Result<TransactionDetail, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _) = get_session_cashier(&conn, &token)?;

    let t = conn.query_row(
        "SELECT id, cart_id, cashier_id, smena_id, kind, total, discount_total, cash_amount, card_amount, debt_amount, change_amount, client_id, status, sync_status, created_at 
         FROM transactions WHERE id = ?1 AND cashier_id = ?2",
        rusqlite::params![transaction_id, cashier_id],
        |r| Ok(Transaction {
            id: r.get(0)?, cart_id: r.get(1)?, cashier_id: r.get(2)?, smena_id: r.get(3)?, kind: r.get(4)?, total: r.get(5)?, discount_total: r.get(6)?, cash_amount: r.get(7)?, card_amount: r.get(8)?, debt_amount: r.get(9)?, change_amount: r.get(10)?, client_id: r.get(11)?, status: r.get(12)?, sync_status: r.get(13)?, created_at: r.get(14)?
        })
    ).map_err(|_| "Transaction not found")?;

    let mut stmt = conn.prepare("SELECT id, transaction_id, product_id, barcode, name, price, qty, weight, discount_type, discount_value, final_price, 0 as is_weighted FROM transaction_items WHERE transaction_id = ?1").unwrap();
    let iter = stmt.query_map(rusqlite::params![transaction_id], |r| Ok(CartItem {
        id: r.get(0)?, cart_id: r.get(1)?, product_id: r.get(2)?, barcode: r.get(3)?, name: r.get(4)?, price: r.get(5)?, qty: r.get(6)?, weight: r.get(7)?, discount_type: r.get(8)?, discount_value: r.get(9)?, final_price: r.get(10)?, is_weighted: false
    })).unwrap();
    
    Ok(TransactionDetail { transaction: t, items: iter.flatten().collect() })
}
