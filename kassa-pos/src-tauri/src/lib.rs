#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod utils;
mod models;

use commands::*;
use db::init_db;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("failed to get app data dir");
            let pool = init_db(&app_data_dir);
            app.manage(db::DbState { pool });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            auth::login,
            auth::logout,
            auth::validate_session,
            auth::lock_screen,
            auth::unlock_screen,
            
            smena::open_smena,
            smena::close_smena,
            smena::get_current_smena,
            smena::get_x_report,
            
            products::search_products,
            products::get_product_by_barcode,
            products::parse_weighted_barcode,
            
            cart::create_cart,
            cart::add_to_cart,
            cart::update_cart_item_qty,
            cart::remove_cart_item,
            cart::clear_cart,
            cart::park_cart,
            cart::resume_cart,
            cart::get_parked_carts,
            cart::get_active_carts,
            cart::apply_item_discount,
            cart::apply_cart_discount,
            
            payment::process_payment,
            payment::process_return,
            payment::pay_client_debt,
            
            clients::search_clients,
            clients::create_client,
            clients::get_client,
            
            receipts::get_receipts,
            receipts::get_receipt_detail,
            
            expenses::create_expense,
            expenses::get_expense_types,
            expenses::get_smena_expenses,
            
            printing::list_printers,
            printing::print_receipt,
            printing::open_cash_drawer,
            
            settings::get_all_settings,
            settings::update_setting,
            
            sync::get_sync_status,
            sync::retry_failed_sync,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
