use tauri::State;
use serde::{Serialize, Deserialize};
use chrono::Utc;
use rusqlite::{Connection, OptionalExtension};
use crate::db::DbState;
use crate::utils::get_session_cashier;

pub const QUICK_SELL_MAX: usize = 24;

const PRODUCT_COLUMNS: &str = "id, barcode, code, name, price, cost_price, wholesale_price, stock_qty, unit, category, is_weighted, vat, expiry_date, is_custom, updated_at";

#[derive(Serialize, Deserialize)]
pub struct Product {
    pub id: i64,
    pub barcode: Option<String>,
    pub code: Option<String>,
    pub name: String,
    pub price: f64,
    pub cost_price: Option<f64>,
    pub wholesale_price: Option<f64>,
    pub stock_qty: f64,
    pub unit: String,
    pub category: Option<String>,
    pub is_weighted: bool,
    pub vat: Option<f64>,
    pub expiry_date: Option<String>,
    pub is_custom: bool,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct ProductInput {
    pub category: Option<String>,
    pub name: String,
    pub barcode: Option<String>,
    pub code: Option<String>,
    pub unit: Option<String>,
    pub stock_qty: f64,
    pub cost_price: Option<f64>,
    pub wholesale_price: Option<f64>,
    pub price: f64,
    pub expiry_date: Option<String>,
    pub vat: Option<f64>,
}

#[derive(Serialize, Deserialize)]
pub struct WeightedParseResult {
    pub product_id: i64,
    pub product_name: String,
    pub unit_price: f64,
    pub weight: f64,
    pub computed_price: f64,
}

fn row_to_product(row: &rusqlite::Row) -> rusqlite::Result<Product> {
    Ok(Product {
        id: row.get(0)?, barcode: row.get(1)?, code: row.get(2)?, name: row.get(3)?, price: row.get(4)?,
        cost_price: row.get(5)?, wholesale_price: row.get(6)?, stock_qty: row.get(7)?, unit: row.get(8)?,
        category: row.get(9)?, is_weighted: row.get::<_, i32>(10)? == 1, vat: row.get(11)?, expiry_date: row.get(12)?,
        is_custom: row.get::<_, i32>(13)? == 1, updated_at: row.get(14)?,
    })
}

fn query_products(conn: &Connection, where_sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<Vec<Product>, String> {
    let sql = format!("SELECT {} FROM products WHERE deleted_at IS NULL AND ({})", PRODUCT_COLUMNS, where_sql);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params, row_to_product).map_err(|e| e.to_string())?;
    Ok(rows.flatten().collect())
}

pub fn get_product(conn: &Connection, id: i64) -> Result<Product, String> {
    query_products(conn, "id = ?1", &[&id])?.into_iter().next().ok_or_else(|| "product_not_found".to_string())
}

fn clean(s: Option<String>) -> Option<String> {
    s.map(|v| v.trim().to_string()).filter(|v| !v.is_empty())
}

fn validate(conn: &Connection, input: &ProductInput, exclude_id: Option<i64>) -> Result<(Option<String>, Option<String>), String> {
    if input.name.trim().is_empty() { return Err("name_required".into()); }
    if input.price < 0.0 || input.stock_qty < 0.0 { return Err("invalid_number".into()); }
    let barcode = clean(input.barcode.clone());
    let code = clean(input.code.clone());
    let exclude = exclude_id.unwrap_or(-1);
    if let Some(b) = &barcode {
        let taken: Option<i64> = conn.query_row("SELECT id FROM products WHERE barcode = ?1 AND id != ?2", rusqlite::params![b, exclude], |r| r.get(0)).optional().map_err(|e| e.to_string())?;
        if taken.is_some() { return Err("barcode_exists".into()); }
    }
    if let Some(c) = &code {
        let taken: Option<i64> = conn.query_row("SELECT id FROM products WHERE code = ?1 AND id != ?2 AND deleted_at IS NULL", rusqlite::params![c, exclude], |r| r.get(0)).optional().map_err(|e| e.to_string())?;
        if taken.is_some() { return Err("code_exists".into()); }
    }
    Ok((barcode, code))
}

#[tauri::command]
pub fn search_products(query: String, state: State<'_, DbState>) -> Result<Vec<Product>, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let like_query = format!("%{}%", query.trim());
    query_products(&conn, "name LIKE ?1 OR barcode LIKE ?1 OR code LIKE ?1 ORDER BY name LIMIT 50", &[&like_query])
}

#[tauri::command]
pub fn list_products(query: Option<String>, custom_only: bool, state: State<'_, DbState>) -> Result<Vec<Product>, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let like_query = format!("%{}%", query.unwrap_or_default().trim());
    let custom: i32 = if custom_only { 1 } else { 0 };
    query_products(&conn, "(name LIKE ?1 OR IFNULL(barcode, '') LIKE ?1 OR IFNULL(code, '') LIKE ?1) AND (?2 = 0 OR is_custom = 1) ORDER BY name LIMIT 200", &[&like_query, &custom])
}

#[tauri::command]
pub fn get_product_by_barcode(barcode: String, state: State<'_, DbState>) -> Result<Option<Product>, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    Ok(query_products(&conn, "barcode = ?1", &[&barcode])?.into_iter().next())
}

/// Numpad lookup: short product code first, then exact barcode.
#[tauri::command]
pub fn find_product_by_code(code: String, state: State<'_, DbState>) -> Result<Option<Product>, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let code = code.trim().to_string();
    if code.is_empty() { return Ok(None); }
    if let Some(p) = query_products(&conn, "code = ?1", &[&code])?.into_iter().next() { return Ok(Some(p)); }
    Ok(query_products(&conn, "barcode = ?1", &[&code])?.into_iter().next())
}

#[tauri::command]
pub fn create_product(token: String, input: ProductInput, state: State<'_, DbState>) -> Result<Product, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    get_session_cashier(&conn, &token)?;
    let (barcode, code) = validate(&conn, &input, None)?;
    conn.execute(
        "INSERT INTO products (barcode, code, name, price, cost_price, wholesale_price, stock_qty, unit, category, is_weighted, vat, expiry_date, is_custom, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10, ?11, 1, ?12)",
        rusqlite::params![barcode, code, input.name.trim(), input.price, input.cost_price, input.wholesale_price, input.stock_qty,
            clean(input.unit).unwrap_or_else(|| "шт".into()), clean(input.category), input.vat, clean(input.expiry_date), Utc::now().to_rfc3339()]
    ).map_err(|e| e.to_string())?;
    get_product(&conn, conn.last_insert_rowid())
}

#[tauri::command]
pub fn update_product(token: String, id: i64, input: ProductInput, state: State<'_, DbState>) -> Result<Product, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    get_session_cashier(&conn, &token)?;
    if !get_product(&conn, id)?.is_custom { return Err("not_custom".into()); }
    let (barcode, code) = validate(&conn, &input, Some(id))?;
    conn.execute(
        "UPDATE products SET barcode = ?1, code = ?2, name = ?3, price = ?4, cost_price = ?5, wholesale_price = ?6, stock_qty = ?7, unit = ?8, category = ?9, vat = ?10, expiry_date = ?11, updated_at = ?12 WHERE id = ?13",
        rusqlite::params![barcode, code, input.name.trim(), input.price, input.cost_price, input.wholesale_price, input.stock_qty,
            clean(input.unit).unwrap_or_else(|| "шт".into()), clean(input.category), input.vat, clean(input.expiry_date), Utc::now().to_rfc3339(), id]
    ).map_err(|e| e.to_string())?;
    get_product(&conn, id)
}

/// Soft delete: cart_items / transaction_items keep their own name/price/barcode copies
/// and their product_id reference stays valid. Barcode and code are released for reuse.
#[tauri::command]
pub fn delete_product(token: String, id: i64, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    get_session_cashier(&conn, &token)?;
    if !get_product(&conn, id)?.is_custom { return Err("not_custom".into()); }
    conn.execute("UPDATE products SET deleted_at = ?1, barcode = NULL, code = NULL WHERE id = ?2", rusqlite::params![Utc::now().to_rfc3339(), id]).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM quick_sell WHERE product_id = ?1", rusqlite::params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_quick_sell(state: State<'_, DbState>) -> Result<Vec<Product>, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let sql = format!("SELECT {} FROM products p JOIN quick_sell q ON q.product_id = p.id WHERE p.deleted_at IS NULL ORDER BY q.position",
        PRODUCT_COLUMNS.split(", ").map(|c| format!("p.{}", c)).collect::<Vec<_>>().join(", "));
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], row_to_product).map_err(|e| e.to_string())?;
    Ok(rows.flatten().collect())
}

#[tauri::command]
pub fn set_quick_sell(token: String, product_ids: Vec<i64>, state: State<'_, DbState>) -> Result<(), String> {
    let mut conn = state.pool.get().map_err(|e| e.to_string())?;
    get_session_cashier(&conn, &token)?;
    if product_ids.len() > QUICK_SELL_MAX { return Err("quick_sell_limit".into()); }
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM quick_sell", []).map_err(|e| e.to_string())?;
    for (pos, id) in product_ids.iter().enumerate() {
        tx.execute("INSERT OR IGNORE INTO quick_sell (product_id, position) VALUES (?1, ?2)", rusqlite::params![id, pos as i64]).map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn parse_weighted_barcode(barcode: String, state: State<'_, DbState>) -> Result<Option<WeightedParseResult>, String> {
    if barcode.len() != 13 { return Ok(None); }

    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let settings_prefixes: String = conn.query_row("SELECT value FROM settings WHERE key = 'weighted_prefixes'", [], |r| r.get(0)).unwrap_or_else(|_| "27,28,29".into());
    let prefixes: Vec<&str> = settings_prefixes.split(',').collect();

    for prefix in prefixes {
        if barcode.starts_with(prefix) {
            let weight_str = &barcode[7..12];
            if let Ok(w) = weight_str.parse::<f64>() {
                let weight = w / 1000.0;
                let search_barcode = &barcode[0..7];

                let p = conn.query_row(
                    "SELECT id, name, price FROM products WHERE barcode LIKE ?1 AND deleted_at IS NULL LIMIT 1",
                    rusqlite::params![format!("{}%", search_barcode)],
                    |r| Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, f64>(2)?))
                ).ok();

                if let Some((id, name, price)) = p {
                    return Ok(Some(WeightedParseResult { product_id: id, product_name: name, unit_price: price, weight, computed_price: price * weight }));
                }
            }
        }
    }

    Ok(None)
}
