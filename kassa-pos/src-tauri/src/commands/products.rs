use tauri::State;
use serde::{Serialize, Deserialize};
use crate::db::DbState;
use crate::utils::get_session_cashier;

#[derive(Serialize, Deserialize)]
pub struct Product {
    pub id: i64,
    pub barcode: Option<String>,
    pub name: String,
    pub price: f64,
    pub stock_qty: f64,
    pub unit: String,
    pub category: Option<String>,
    pub is_weighted: bool,
    pub vat: Option<f64>,
    pub expiry_date: Option<String>,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct WeightedParseResult {
    pub product_id: i64,
    pub product_name: String,
    pub unit_price: f64,
    pub weight: f64,
    pub computed_price: f64,
}

#[tauri::command]
pub fn search_products(query: String, state: State<'_, DbState>) -> Result<Vec<Product>, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let like_query = format!("%{}%", query);
    
    let mut stmt = conn.prepare("SELECT id, barcode, name, price, stock_qty, unit, category, is_weighted, vat, expiry_date, updated_at FROM products WHERE name LIKE ?1 OR barcode LIKE ?1 LIMIT 50").map_err(|e| e.to_string())?;
    let iter = stmt.query_map(rusqlite::params![like_query], |row| {
        Ok(Product {
            id: row.get(0)?, barcode: row.get(1)?, name: row.get(2)?, price: row.get(3)?, stock_qty: row.get(4)?, unit: row.get(5)?, category: row.get(6)?, is_weighted: {let w: i32 = row.get(7)?; w == 1}, vat: row.get(8)?, expiry_date: row.get(9)?, updated_at: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?;
    
    Ok(iter.flatten().collect())
}

#[tauri::command]
pub fn get_product_by_barcode(barcode: String, state: State<'_, DbState>) -> Result<Option<Product>, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, barcode, name, price, stock_qty, unit, category, is_weighted, vat, expiry_date, updated_at FROM products WHERE barcode = ?1").map_err(|e| e.to_string())?;
    let p = stmt.query_row(rusqlite::params![barcode], |row| {
        Ok(Product {
            id: row.get(0)?, barcode: row.get(1)?, name: row.get(2)?, price: row.get(3)?, stock_qty: row.get(4)?, unit: row.get(5)?, category: row.get(6)?, is_weighted: {let w: i32 = row.get(7)?; w == 1}, vat: row.get(8)?, expiry_date: row.get(9)?, updated_at: row.get(10)?,
        })
    }).ok();
    Ok(p)
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
                    "SELECT id, name, price FROM products WHERE barcode LIKE ?1 LIMIT 1",
                    rusqlite::params![format!("{}%", search_barcode)],
                    |r| Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, f64>(2)?))
                ).ok();

                if let Some((id, name, price)) = p {
                    return Ok(Some(WeightedParseResult {
                        product_id: id,
                        product_name: name,
                        unit_price: price,
                        weight,
                        computed_price: price * weight
                    }));
                }
            }
        }
    }
    
    Ok(None)
}

#[tauri::command]
pub fn load_demo_products(state: State<'_, DbState>) -> Result<usize, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;

    // Idempotent deterministic demo product seed
    // Tagged clearly with category = 'DEMO_*' so they are isolated from production sync
    let demo_items = vec![
        ("4780000100018", "Кока-Кола 0.5л Classic", 7000.0, 150.0, "шт", "DEMO_Напитки", 0, Some(12.0)),
        ("4780000100025", "Вода минеральная Hydrolife 1.5л", 4000.0, 200.0, "шт", "DEMO_Напитки", 0, Some(12.0)),
        ("4780000100032", "Хлеб формовой Буханка", 3000.0, 50.0, "шт", "DEMO_Выпечка", 0, None),
        ("4780000100049", "Лепёшка тандырная Самарканд", 5000.0, 40.0, "шт", "DEMO_Выпечка", 0, None),
        ("4780000100056", "Молоко Musaffo 3.2% 1л", 14000.0, 80.0, "шт", "DEMO_Молочные", 0, Some(12.0)),
        ("4780000100063", "Сыр Российский 45% 200г", 28000.0, 35.0, "шт", "DEMO_Молочные", 0, Some(12.0)),
        ("4780000100070", "Шоколад Alpen Gold молочный", 12500.0, 95.0, "шт", "DEMO_Сладости", 0, Some(12.0)),
        ("4780000100087", "Чай черный Ahmad Tea Ceylon 100г", 22000.0, 60.0, "шт", "DEMO_Бакалея", 0, Some(12.0)),
        ("4780000100094", "Масло подсолнечное Щедрое Лето 1л", 18500.0, 45.0, "шт", "DEMO_Бакалея", 0, Some(12.0)),
        ("4780000100100", "Рис лазер премиум 1кг", 26000.0, 70.0, "шт", "DEMO_Бакалея", 0, None),
        // Weighted items: prefix 27: 2700001 for Apples, 2700002 for Bananas
        ("2700001000000", "Яблоки Голден (весовые)", 16000.0, 120.0, "кг", "DEMO_Фрукты", 1, None),
        ("2700002000000", "Бананы Эквадор (весовые)", 22000.0, 85.0, "кг", "DEMO_Фрукты", 1, None),
    ];

    let now = chrono::Utc::now().to_rfc3339();
    let mut inserted = 0;

    for (barcode, name, price, stock, unit, cat, is_weighted, vat) in demo_items {
        let res = conn.execute(
            "INSERT INTO products (barcode, name, price, stock_qty, unit, category, is_weighted, vat, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(barcode) DO UPDATE SET
               name = excluded.name,
               price = excluded.price,
               stock_qty = excluded.stock_qty,
               unit = excluded.unit,
               category = excluded.category,
               is_weighted = excluded.is_weighted,
               vat = excluded.vat,
               updated_at = excluded.updated_at",
            rusqlite::params![barcode, name, price, stock, unit, cat, is_weighted, vat, now],
        );
        if res.is_ok() {
            inserted += 1;
        }
    }

    Ok(inserted)
}

#[tauri::command]
pub fn clear_demo_products(state: State<'_, DbState>) -> Result<usize, String> {
    let conn = state.pool.get().map_err(|e| e.to_string())?;
    let count = conn.execute("DELETE FROM products WHERE category LIKE 'DEMO%'", [])
        .map_err(|e| e.to_string())?;
    Ok(count)
}

