use rusqlite::Connection;
use chrono::Utc;

pub fn get_session_cashier(conn: &Connection, token: &str) -> Result<(i64, String), String> {
    let now = Utc::now().to_rfc3339();
    let query = "
        SELECT s.cashier_id, c.username 
        FROM sessions s 
        JOIN cashiers c ON s.cashier_id = c.id 
        WHERE s.token = ?1 AND s.expires_at > ?2
    ";
    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    
    let mut rows = stmt.query(rusqlite::params![token, now]).map_err(|e| e.to_string())?;
    
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let cashier_id: i64 = row.get(0).map_err(|e| e.to_string())?;
        let username: String = row.get(1).map_err(|e| e.to_string())?;
        Ok((cashier_id, username))
    } else {
        Err("Invalid or expired session".into())
    }
}
