use tauri::State;
use serde::{Serialize, Deserialize};
use crate::db::DbState;
use crate::utils::get_session_cashier;
use chrono::Utc;

#[derive(Serialize, Deserialize, Default, Clone)]
pub struct Cart {
    pub id: i64,
    pub cashier_id: i64,
    pub smena_id: Option<i64>,
    pub name: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Default, Clone)]
pub struct CartItem {
    pub id: i64,
    pub cart_id: i64,
    pub product_id: Option<i64>,
    pub barcode: Option<String>,
    pub name: String,
    pub price: f64,
    pub qty: f64,
    pub weight: Option<f64>,
    pub discount_type: Option<String>,
    pub discount_value: Option<f64>,
    pub final_price: f64,
    pub is_weighted: bool,
}

#[derive(Serialize, Deserialize, Default)]
pub struct CartItemResponse {
    pub item: CartItem,
}

#[derive(Serialize, Deserialize, Default)]
pub struct CartWithItems {
    pub cart: Cart,
    pub items: Vec<CartItem>,
    pub total: f64,
}

#[tauri::command]
pub fn create_cart(token: String, state: State<'_, DbState>) -> Result<Cart, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _) = get_session_cashier(&conn, &token)?;

    let smena_id: Option<i64> = conn.query_row(
        "SELECT id FROM smenas WHERE cashier_id = ?1 AND status = 'open'",
        rusqlite::params![cashier_id],
        |r| r.get(0)
    ).ok();
    
    let now = Utc::now().to_rfc3339();
    conn.execute("INSERT INTO carts (cashier_id, smena_id, status, created_at, updated_at) VALUES (?1, ?2, 'active', ?3, ?3)", rusqlite::params![cashier_id, smena_id, now.clone()]).map_err(|e| e.to_string())?;
    
    let id = conn.last_insert_rowid();
    Ok(Cart { id, cashier_id, smena_id, name: None, status: "active".into(), created_at: now.clone(), updated_at: now })
}

#[tauri::command]
pub fn add_to_cart(token: String, cart_id: i64, barcode: String, state: State<'_, DbState>) -> Result<CartItem, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let _ = get_session_cashier(&conn, &token)?;

    let settings_prefixes: String = conn.query_row("SELECT value FROM settings WHERE key = 'weighted_prefixes'", [], |r| r.get(0)).unwrap_or_else(|_| "27,28,29".into());
    let prefixes: Vec<&str> = settings_prefixes.split(',').collect();

    let mut is_weighted_barcode = false;
    let mut weight_from_barcode = None;
    let mut search_barcode = barcode.clone();

    if barcode.len() == 13 {
        for prefix in prefixes {
            if barcode.starts_with(prefix) {
                is_weighted_barcode = true;
                if let Ok(w) = barcode[7..12].parse::<f64>() {
                    weight_from_barcode = Some(w / 1000.0);
                }
                search_barcode = barcode[0..7].to_string();
                break;
            }
        }
    }

    let p = conn.query_row(
        "SELECT id, name, price, stock_qty, is_weighted FROM products WHERE barcode LIKE ?1 LIMIT 1",
        rusqlite::params![format!("{}%", search_barcode)],
        |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, f64>(2)?, row.get::<_, f64>(3)?, row.get::<_, i32>(4)? == 1))
    ).map_err(|_| "Товар не найден".to_string())?;

    let (product_id, name, price, stock_qty, is_weighted_product) = p;
    let is_w = is_weighted_barcode || is_weighted_product;
    
    let mut qty = 1.0;
    let mut final_price = price;
    let mut weight = None;

    if is_w {
        weight = weight_from_barcode.or(Some(1.0)); 
        qty = weight.unwrap();
        final_price = price * qty;
    }

    let existing: Option<(i64, f64, f64, Option<String>, Option<f64>)> = conn.query_row(
        "SELECT id, qty, price, discount_type, discount_value FROM cart_items WHERE cart_id = ?1 AND product_id = ?2",
        rusqlite::params![cart_id, product_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3).ok(), r.get(4).ok()))
    ).ok();

    let new_item_id;
    if let Some((item_id, old_qty, item_price, disc_type, disc_val)) = existing {
        let new_qty = old_qty + qty;
        if new_qty > stock_qty && !is_w { return Err("Нет в наличии".into()); }
        
        let mut new_final = item_price * new_qty;
        if let (Some(dt), Some(dv)) = (disc_type, disc_val) {
            if dt == "percentage" { new_final *= 1.0 - dv / 100.0; } else if dt == "fixed" { new_final -= dv; }
        }

        conn.execute("UPDATE cart_items SET qty = ?1, final_price = ?2 WHERE id = ?3", rusqlite::params![new_qty, new_final, item_id]).map_err(|e| e.to_string())?;
        new_item_id = item_id;
        qty = new_qty;
        final_price = new_final;
    } else {
        if qty > stock_qty && !is_w { return Err("Нет в наличии".into()); }
        conn.execute(
            "INSERT INTO cart_items (cart_id, product_id, barcode, name, price, qty, weight, final_price, is_weighted) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![cart_id, product_id, barcode, name, price, qty, weight, final_price, if is_w {1} else {0}]
        ).map_err(|e| e.to_string())?;
        new_item_id = conn.last_insert_rowid();
    }

    conn.execute("UPDATE carts SET updated_at = ?1 WHERE id = ?2", rusqlite::params![Utc::now().to_rfc3339(), cart_id]).ok();

    Ok(CartItem {
        id: new_item_id, cart_id, product_id: Some(product_id), barcode: Some(barcode), name, price, qty, weight, discount_type: None, discount_value: None, final_price, is_weighted: is_w
    })
}

#[tauri::command]
pub fn update_cart_item_qty(token: String, item_id: i64, qty: f64, state: State<'_, DbState>) -> Result<CartItem, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let _ = get_session_cashier(&conn, &token)?;

    let row = conn.query_row(
        "SELECT c.cart_id, c.product_id, p.stock_qty, c.price, c.discount_type, c.discount_value, c.barcode, c.name, c.weight, c.is_weighted 
         FROM cart_items c LEFT JOIN products p ON c.product_id = p.id WHERE c.id = ?1",
        rusqlite::params![item_id],
        |r| Ok((r.get::<_, i64>(0)?, r.get::<_, Option<i64>>(1)?, r.get::<_, Option<f64>>(2)?, r.get::<_, f64>(3)?, r.get::<_, Option<String>>(4)?, r.get::<_, Option<f64>>(5)?, r.get::<_, Option<String>>(6)?, r.get::<_, String>(7)?, r.get::<_, Option<f64>>(8)?, r.get::<_, i32>(9)? == 1))
    ).map_err(|_| "Item not found")?;

    let (cart_id, product_id, stock_qty, price, disc_type, disc_val, barcode, name, weight, is_weighted) = row;
    
    if let Some(sq) = stock_qty {
        if qty > sq && !is_weighted { return Err("Нет в наличии".into()); }
    }

    let mut final_price = price * qty;
    if let (Some(dt), Some(dv)) = (&disc_type, disc_val) {
        if dt == "percentage" { final_price *= 1.0 - dv / 100.0; } else if dt == "fixed" { final_price -= dv; }
    }

    conn.execute("UPDATE cart_items SET qty = ?1, final_price = ?2 WHERE id = ?3", rusqlite::params![qty, final_price, item_id]).map_err(|e| e.to_string())?;
    conn.execute("UPDATE carts SET updated_at = ?1 WHERE id = ?2", rusqlite::params![Utc::now().to_rfc3339(), cart_id]).ok();

    Ok(CartItem { id: item_id, cart_id, product_id, barcode, name, price, qty, weight, discount_type: disc_type, discount_value: disc_val, final_price, is_weighted })
}

#[tauri::command]
pub fn remove_cart_item(token: String, item_id: i64, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let _ = get_session_cashier(&conn, &token)?;
    let cart_id: i64 = conn.query_row("SELECT cart_id FROM cart_items WHERE id = ?1", rusqlite::params![item_id], |r| r.get(0)).unwrap_or(0);
    conn.execute("DELETE FROM cart_items WHERE id = ?1", rusqlite::params![item_id]).map_err(|e| e.to_string())?;
    conn.execute("UPDATE carts SET updated_at = ?1 WHERE id = ?2", rusqlite::params![Utc::now().to_rfc3339(), cart_id]).ok();
    Ok(())
}

#[tauri::command]
pub fn clear_cart(token: String, cart_id: i64, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let _ = get_session_cashier(&conn, &token)?;
    conn.execute("DELETE FROM cart_items WHERE cart_id = ?1", rusqlite::params![cart_id]).map_err(|e| e.to_string())?;
    conn.execute("UPDATE carts SET updated_at = ?1 WHERE id = ?2", rusqlite::params![Utc::now().to_rfc3339(), cart_id]).ok();
    Ok(())
}

#[tauri::command]
pub fn park_cart(token: String, cart_id: i64, name: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _) = get_session_cashier(&conn, &token)?;
    conn.execute("UPDATE carts SET status = 'parked', name = ?1, updated_at = ?2 WHERE id = ?3 AND cashier_id = ?4", rusqlite::params![name, Utc::now().to_rfc3339(), cart_id, cashier_id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn resume_cart(token: String, cart_id: i64, state: State<'_, DbState>) -> Result<CartWithItems, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _) = get_session_cashier(&conn, &token)?;
    conn.execute("UPDATE carts SET status = 'active', updated_at = ?1 WHERE id = ?2 AND cashier_id = ?3", rusqlite::params![Utc::now().to_rfc3339(), cart_id, cashier_id]).map_err(|e| e.to_string())?;
    get_cart_with_items(&conn, cart_id)
}

fn get_cart_with_items(conn: &rusqlite::Connection, cart_id: i64) -> Result<CartWithItems, String> {
    let cart = conn.query_row(
        "SELECT id, cashier_id, smena_id, name, status, created_at, updated_at FROM carts WHERE id = ?1",
        rusqlite::params![cart_id],
        |r| Ok(Cart { id: r.get(0)?, cashier_id: r.get(1)?, smena_id: r.get(2)?, name: r.get(3)?, status: r.get(4)?, created_at: r.get(5)?, updated_at: r.get(6)? })
    ).map_err(|_| "Cart not found")?;

    let mut stmt = conn.prepare("SELECT id, cart_id, product_id, barcode, name, price, qty, weight, discount_type, discount_value, final_price, is_weighted FROM cart_items WHERE cart_id = ?1").unwrap();
    let iter = stmt.query_map(rusqlite::params![cart_id], |r| Ok(CartItem {
        id: r.get(0)?, cart_id: r.get(1)?, product_id: r.get(2)?, barcode: r.get(3)?, name: r.get(4)?, price: r.get(5)?, qty: r.get(6)?, weight: r.get(7)?, discount_type: r.get(8)?, discount_value: r.get(9)?, final_price: r.get(10)?, is_weighted: r.get::<_, i32>(11)? == 1
    })).unwrap();
    
    let items: Vec<CartItem> = iter.flatten().collect();
    let total: f64 = items.iter().map(|i| i.final_price).sum();
    Ok(CartWithItems { cart, items, total })
}

#[tauri::command]
pub fn get_parked_carts(token: String, state: State<'_, DbState>) -> Result<Vec<Cart>, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _) = get_session_cashier(&conn, &token)?;
    let mut stmt = conn.prepare("SELECT id, cashier_id, smena_id, name, status, created_at, updated_at FROM carts WHERE cashier_id = ?1 AND status = 'parked' ORDER BY updated_at DESC").unwrap();
    let res: Vec<Cart> = stmt.query_map(rusqlite::params![cashier_id], |r| Ok(Cart { id: r.get(0)?, cashier_id: r.get(1)?, smena_id: r.get(2)?, name: r.get(3)?, status: r.get(4)?, created_at: r.get(5)?, updated_at: r.get(6)? })).unwrap().flatten().collect();
    Ok(res)
}

#[tauri::command]
pub fn get_active_carts(token: String, state: State<'_, DbState>) -> Result<Vec<CartWithItems>, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let (cashier_id, _) = get_session_cashier(&conn, &token)?;
    let mut stmt = conn.prepare("SELECT id FROM carts WHERE cashier_id = ?1 AND status = 'active' ORDER BY updated_at DESC").unwrap();
    let ids: Vec<i64> = stmt.query_map(rusqlite::params![cashier_id], |r| r.get(0)).unwrap().flatten().collect();
    
    let mut res = Vec::new();
    for id in ids {
        if let Ok(cwi) = get_cart_with_items(&conn, id) { res.push(cwi); }
    }
    Ok(res)
}

#[tauri::command]
pub fn apply_item_discount(token: String, item_id: i64, discount_type: String, value: f64, state: State<'_, DbState>) -> Result<CartItem, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let _ = get_session_cashier(&conn, &token)?;
    
    let (cart_id, price, qty): (i64, f64, f64) = conn.query_row("SELECT cart_id, price, qty FROM cart_items WHERE id = ?1", rusqlite::params![item_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).map_err(|_| "Item not found")?;
    
    let mut final_price = price * qty;
    if discount_type == "percentage" { final_price *= 1.0 - value / 100.0; }
    else if discount_type == "fixed" { final_price -= value; }

    conn.execute("UPDATE cart_items SET discount_type = ?1, discount_value = ?2, final_price = ?3 WHERE id = ?4", rusqlite::params![discount_type, value, final_price, item_id]).unwrap();
    conn.execute("UPDATE carts SET updated_at = ?1 WHERE id = ?2", rusqlite::params![Utc::now().to_rfc3339(), cart_id]).ok();
    
    let mut stmt = conn.prepare("SELECT id, cart_id, product_id, barcode, name, price, qty, weight, discount_type, discount_value, final_price, is_weighted FROM cart_items WHERE id = ?1").unwrap();
    let item = stmt.query_row(rusqlite::params![item_id], |r| Ok(CartItem {
        id: r.get(0)?, cart_id: r.get(1)?, product_id: r.get(2)?, barcode: r.get(3)?, name: r.get(4)?, price: r.get(5)?, qty: r.get(6)?, weight: r.get(7)?, discount_type: r.get(8)?, discount_value: r.get(9)?, final_price: r.get(10)?, is_weighted: r.get::<_, i32>(11)? == 1
    })).unwrap();
    
    Ok(item)
}

#[tauri::command]
pub fn apply_cart_discount(token: String, cart_id: i64, discount_type: String, value: f64, state: State<'_, DbState>) -> Result<Vec<CartItem>, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let _ = get_session_cashier(&conn, &token)?;
    
    let mut stmt = conn.prepare("SELECT id, price, qty FROM cart_items WHERE cart_id = ?1").unwrap();
    let items: Vec<(i64, f64, f64)> = stmt.query_map(rusqlite::params![cart_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).unwrap().flatten().collect();

    let total: f64 = items.iter().map(|&(_, p, q)| p * q).sum();
    if total == 0.0 { return Ok(vec![]); }

    for &(id, p, q) in &items {
        let mut f_price = p * q;
        let mut d_val = 0.0;
        if discount_type == "percentage" {
            d_val = value;
            f_price *= 1.0 - value / 100.0;
        } else if discount_type == "fixed" {
            let item_ratio = (p * q) / total;
            d_val = value * item_ratio;
            f_price -= d_val;
        }
        conn.execute("UPDATE cart_items SET discount_type = ?1, discount_value = ?2, final_price = ?3 WHERE id = ?4", rusqlite::params![discount_type, d_val, f_price, id]).unwrap();
    }
    
    conn.execute("UPDATE carts SET updated_at = ?1 WHERE id = ?2", rusqlite::params![Utc::now().to_rfc3339(), cart_id]).ok();
    
    let cwi = get_cart_with_items(&conn, cart_id)?;
    Ok(cwi.items)
}
