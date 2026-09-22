use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct Smena {
    pub id: i64,
    pub cashier_id: i64,
    pub opened_at: String,
    pub closed_at: Option<String>,
    pub status: String,
}
