use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::Connection;
use std::path::Path;

pub struct DbState {
    pub pool: Pool<SqliteConnectionManager>,
}

pub fn init_db(app_data_dir: &Path) -> Pool<SqliteConnectionManager> {
    std::fs::create_dir_all(app_data_dir).expect("Failed to create app data dir");
    let db_path = app_data_dir.join("kassa.db");
    
    let manager = SqliteConnectionManager::file(&db_path).with_init(|c| {
        c.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA foreign_keys = ON;"
        )
    });
    let pool = Pool::new(manager).expect("Failed to create pool");

    let conn = pool.get().expect("Failed to get connection from pool");
    run_schema(&conn);
    seed_db(&conn);

    pool
}

fn run_schema(conn: &Connection) {
    let schema = "
        CREATE TABLE IF NOT EXISTS cashiers (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY,
            cashier_id INTEGER NOT NULL REFERENCES cashiers(id),
            token TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS smenas (
            id INTEGER PRIMARY KEY,
            cashier_id INTEGER NOT NULL REFERENCES cashiers(id),
            opened_at TEXT NOT NULL,
            closed_at TEXT,
            status TEXT NOT NULL DEFAULT 'open'
        );
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            barcode TEXT UNIQUE,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            stock_qty REAL NOT NULL DEFAULT 0,
            unit TEXT NOT NULL DEFAULT 'шт',
            category TEXT,
            is_weighted INTEGER NOT NULL DEFAULT 0,
            vat REAL,
            expiry_date TEXT,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS carts (
            id INTEGER PRIMARY KEY,
            cashier_id INTEGER NOT NULL,
            smena_id INTEGER,
            name TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY,
            cart_id INTEGER NOT NULL REFERENCES carts(id),
            product_id INTEGER REFERENCES products(id),
            barcode TEXT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            qty REAL NOT NULL DEFAULT 1,
            weight REAL,
            discount_type TEXT,
            discount_value REAL,
            final_price REAL NOT NULL,
            is_weighted INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY,
            cart_id INTEGER,
            cashier_id INTEGER NOT NULL,
            smena_id INTEGER,
            kind TEXT NOT NULL,
            total REAL NOT NULL,
            discount_total REAL NOT NULL DEFAULT 0,
            cash_amount REAL NOT NULL DEFAULT 0,
            card_amount REAL NOT NULL DEFAULT 0,
            debt_amount REAL NOT NULL DEFAULT 0,
            change_amount REAL NOT NULL DEFAULT 0,
            client_id INTEGER,
            status TEXT NOT NULL,
            sync_status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS transaction_items (
            id INTEGER PRIMARY KEY,
            transaction_id INTEGER NOT NULL REFERENCES transactions(id),
            product_id INTEGER,
            barcode TEXT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            qty REAL NOT NULL,
            weight REAL,
            discount_type TEXT,
            discount_value REAL,
            final_price REAL NOT NULL,
            is_returned INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            balance REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS expense_types (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY,
            cashier_id INTEGER NOT NULL,
            smena_id INTEGER,
            expense_type_id INTEGER REFERENCES expense_types(id),
            amount REAL NOT NULL,
            note TEXT,
            sync_status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    ";
    conn.execute_batch(schema).expect("Failed to create schema");
}

fn seed_db(conn: &Connection) {
    let admin_exists: i64 = conn.query_row("SELECT count(*) FROM cashiers WHERE username = 'admin'", [], |row| row.get(0)).unwrap_or(0);
    if admin_exists == 0 {
        let hash = bcrypt::hash("1234", bcrypt::DEFAULT_COST).unwrap();
        conn.execute(
            "INSERT INTO cashiers (username, password_hash, created_at) VALUES (?1, ?2, datetime('now'))",
            rusqlite::params!["admin", hash]
        ).expect("Failed to seed admin user");
    }

    let default_expenses = vec!["Инкассация", "Хоз. нужды", "Выдача з/п", "Прочее"];
    for exp in default_expenses {
        conn.execute("INSERT OR IGNORE INTO expense_types (name) VALUES (?1)", rusqlite::params![exp]).ok();
    }

    let default_settings = vec![
        ("language", "ru"),
        ("auto_print", "true"),
        ("lock_timeout", "5"),
        ("weighted_prefixes", "27,28,29"),
        ("printer_name", ""),
        ("printer_width", "80"),
        ("autostart", "false"),
    ];

    for (k, v) in default_settings {
        conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)", rusqlite::params![k, v]).ok();
    }
}
