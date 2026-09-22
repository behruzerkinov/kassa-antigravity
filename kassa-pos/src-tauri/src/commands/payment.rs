use tauri::State;
use serde::{Serialize, Deserialize};
use crate::db::DbState;
use crate::utils::get_session_cashier;
use chrono::Utc;

#[derive(Serialize, Deserialize, Default, Clone)]
pub struct Transaction {
    pub id: i64,
    pub cart_id: Option<i64>,
    pub cashier_id: i64,
    pub smena_id: Option<i64>,
    pub kind: String,
    pub total: f64,
    pub discount_total: f64,
    pub cash_amount: f64,
    pub card_amount: f64,
    pub debt_amount: f64,
    pub change_amount: f64,
    pub client_id: Option<i64>,
    pub status: String,
    pub sync_status: String,
    pub created_at: String,
}

#[tauri::command]
pub fn process_payment(
    token: String, 
    cart_id: i64, 
    cash_amount: f64, 
    card_amount: f64, 
    client_id: Option<i64>, 
    debt_amount: f64, 
    state: State<'_, DbState>
) -> Result<Transaction, String> {
    let mut conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _) = get_session_cashier(&conn, &token)?;

    let smena_id: Option<i64> = conn.query_row("SELECT id FROM smenas WHERE cashier_id = ?1 AND status = 'open'", rusqlite::params![cashier_id], |r| r.get(0)).ok();

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let mut stmt = tx.prepare("SELECT id, product_id, barcode, name, price, qty, weight, discount_type, discount_value, final_price, is_weighted FROM cart_items WHERE cart_id = ?1").unwrap();
    let items_iter = stmt.query_map(rusqlite::params![cart_id], |r| Ok((
        r.get::<_, i64>(0)?, r.get::<_, Option<i64>>(1)?, r.get::<_, Option<String>>(2)?, r.get::<_, String>(3)?, r.get::<_, f64>(4)?, r.get::<_, f64>(5)?, r.get::<_, Option<f64>>(6)?, r.get::<_, Option<String>>(7)?, r.get::<_, Option<f64>>(8)?, r.get::<_, f64>(9)?, r.get::<_, i32>(10)?
    ))).unwrap();
    
    let items: Vec<_> = items_iter.flatten().collect();
    if items.is_empty() { return Err("Корзина пуста".into()); }

    let total: f64 = items.iter().map(|i| i.9).sum();
    let original_total: f64 = items.iter().map(|i| i.4 * i.5).sum();
    let discount_total = original_total - total;

    if cash_amount + card_amount + debt_amount < total { return Err("Недостаточно средств".into()); }

    let change_amount = (cash_amount + card_amount + debt_amount) - total;
    let status = if debt_amount > 0.0 { "debt_added" } else if discount_total > 0.0 { "success_with_discount" } else { "success" };

    if debt_amount > 0.0 {
        if let Some(cid) = client_id {
            tx.execute("UPDATE clients SET balance = balance - ?1 WHERE id = ?2", rusqlite::params![debt_amount, cid]).map_err(|e| e.to_string())?;
        } else {
            return Err("Укажите клиента для долга".into());
        }
    }

    let now = Utc::now().to_rfc3339();
    tx.execute(
        "INSERT INTO transactions (cart_id, cashier_id, smena_id, kind, total, discount_total, cash_amount, card_amount, debt_amount, change_amount, client_id, status, sync_status, created_at)
         VALUES (?1, ?2, ?3, 'sale', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'pending', ?12)",
        rusqlite::params![cart_id, cashier_id, smena_id, total, discount_total, cash_amount, card_amount, debt_amount, change_amount, client_id, status, now]
    ).map_err(|e| e.to_string())?;
    
    let transaction_id = tx.last_insert_rowid();

    for i in items {
        tx.execute(
            "INSERT INTO transaction_items (transaction_id, product_id, barcode, name, price, qty, weight, discount_type, discount_value, final_price, is_returned)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0)",
            rusqlite::params![transaction_id, i.1, i.2, i.3, i.4, i.5, i.6, i.7, i.8, i.9]
        ).unwrap();

        if let Some(pid) = i.1 {
            tx.execute("UPDATE products SET stock_qty = stock_qty - ?1 WHERE id = ?2 AND is_weighted = 0", rusqlite::params![i.5, pid]).ok();
        }
    }
    
    drop(stmt);

    tx.execute("UPDATE carts SET status = 'completed', updated_at = ?1 WHERE id = ?2", rusqlite::params![now, cart_id]).unwrap();

    tx.commit().map_err(|e| e.to_string())?;

    Ok(Transaction {
        id: transaction_id, cart_id: Some(cart_id), cashier_id, smena_id, kind: "sale".into(), total, discount_total, cash_amount, card_amount, debt_amount, change_amount, client_id, status: status.into(), sync_status: "pending".into(), created_at: now
    })
}

#[tauri::command]
pub fn process_return(
    token: String, 
    transaction_id: i64, 
    item_ids: Vec<i64>, 
    is_full: bool, 
    state: State<'_, DbState>
) -> Result<Transaction, String> {
    let mut conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _) = get_session_cashier(&conn, &token)?;

    let orig_tx = conn.query_row(
        "SELECT id, total, debt_amount, client_id, smena_id FROM transactions WHERE id = ?1 AND cashier_id = ?2",
        rusqlite::params![transaction_id, cashier_id],
        |r| Ok((r.get::<_, i64>(0)?, r.get::<_, f64>(1)?, r.get::<_, f64>(2)?, r.get::<_, Option<i64>>(3)?, r.get::<_, Option<i64>>(4)?))
    ).map_err(|_| "Чек не найден".to_string())?;

    let db_tx = conn.transaction().map_err(|e| e.to_string())?;
    
    let mut return_total = 0.0;
    
    let mut stmt = db_tx.prepare("SELECT id, product_id, final_price, qty FROM transaction_items WHERE transaction_id = ?1 AND is_returned = 0").unwrap();
    let iter = stmt.query_map(rusqlite::params![transaction_id], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, Option<i64>>(1)?, r.get::<_, f64>(2)?, r.get::<_, f64>(3)?))).unwrap();
    
    for item in iter.flatten() {
        if is_full || item_ids.contains(&item.0) {
            return_total += item.2;
            db_tx.execute("UPDATE transaction_items SET is_returned = 1 WHERE id = ?1", rusqlite::params![item.0]).unwrap();
            if let Some(pid) = item.1 {
                db_tx.execute("UPDATE products SET stock_qty = stock_qty + ?1 WHERE id = ?2 AND is_weighted = 0", rusqlite::params![item.3, pid]).ok();
            }
        }
    }
    
    drop(stmt);

    if orig_tx.2 > 0.0 && orig_tx.3.is_some() {
        let return_ratio = return_total / orig_tx.1;
        let debt_restore = orig_tx.2 * return_ratio;
        db_tx.execute("UPDATE clients SET balance = balance + ?1 WHERE id = ?2", rusqlite::params![debt_restore, orig_tx.3.unwrap()]).unwrap();
    }

    let new_status = if is_full { "full_return" } else { "partial_return" };
    db_tx.execute("UPDATE transactions SET status = ?1 WHERE id = ?2", rusqlite::params![new_status, transaction_id]).unwrap();

    let now = Utc::now().to_rfc3339();
    db_tx.execute(
        "INSERT INTO transactions (cart_id, cashier_id, smena_id, kind, total, status, sync_status, created_at)
         VALUES (NULL, ?1, ?2, 'return', ?3, 'success', 'pending', ?4)",
        rusqlite::params![cashier_id, orig_tx.4, -return_total, now]
    ).map_err(|e| e.to_string())?;
    
    let new_tx_id = db_tx.last_insert_rowid();
    db_tx.commit().map_err(|e| e.to_string())?;

    Ok(Transaction {
        id: new_tx_id, cart_id: None, cashier_id, smena_id: orig_tx.4, kind: "return".into(), total: -return_total, discount_total: 0.0, cash_amount: 0.0, card_amount: 0.0, debt_amount: 0.0, change_amount: 0.0, client_id: orig_tx.3, status: "success".into(), sync_status: "pending".into(), created_at: now
    })
}

#[tauri::command]
pub fn pay_client_debt(
    token: String, 
    client_id: i64, 
    amount: f64, 
    state: State<'_, DbState>
) -> Result<Transaction, String> {
    let mut conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _) = get_session_cashier(&conn, &token)?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("UPDATE clients SET balance = balance + ?1 WHERE id = ?2", rusqlite::params![amount, client_id]).map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    tx.execute(
        "INSERT INTO transactions (cashier_id, kind, total, cash_amount, client_id, status, sync_status, created_at)
         VALUES (?1, 'debt_payment', ?2, ?2, ?3, 'success', 'pending', ?4)",
        rusqlite::params![cashier_id, amount, client_id, now]
    ).map_err(|e| e.to_string())?;
    
    let tx_id = tx.last_insert_rowid();
    tx.commit().map_err(|e| e.to_string())?;

    Ok(Transaction {
        id: tx_id, cart_id: None, cashier_id, smena_id: None, kind: "debt_payment".into(), total: amount, discount_total: 0.0, cash_amount: amount, card_amount: 0.0, debt_amount: 0.0, change_amount: 0.0, client_id: Some(client_id), status: "success".into(), sync_status: "pending".into(), created_at: now
    })
}
