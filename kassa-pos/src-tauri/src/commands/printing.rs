use tauri::State;
use crate::db::DbState;
use std::process::Command;

fn run_hidden(program: &str, args: &[&str]) -> Option<String> {
    let mut cmd = Command::new(program);
    cmd.args(args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let output = cmd.output().ok()?;
    if !output.status.success() { return None; }
    Some(String::from_utf8_lossy(&output.stdout).into_owned())
}

/// Queries the OS printer list. Only called on demand (manual refresh / print time).
pub fn system_printers() -> Result<Vec<String>, String> {
    #[cfg(windows)]
    let out = run_hidden("powershell", &["-NoProfile", "-NonInteractive", "-Command", "Get-Printer | Select-Object -ExpandProperty Name"])
        .or_else(|| run_hidden("wmic", &["printer", "get", "name"]).map(|s| s.lines().skip(1).collect::<Vec<_>>().join("\n")));
    #[cfg(not(windows))]
    let out = run_hidden("lpstat", &["-e"]);

    let out = out.ok_or_else(|| "printer_query_failed".to_string())?;
    Ok(out.lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()).collect())
}

#[tauri::command]
pub fn list_printers(_state: State<'_, DbState>) -> Result<Vec<String>, String> {
    system_printers()
}

#[tauri::command]
pub fn print_receipt(transaction_id: i64, printer_name: String, width: i32, _state: State<'_, DbState>) -> Result<(), String> {
    if printer_name.trim().is_empty() || !system_printers().unwrap_or_default().iter().any(|p| p == &printer_name) {
        return Err("printer_not_found".into());
    }
    println!("Stub: Printing receipt {} on {} (width: {})", transaction_id, printer_name, width);
    Ok(())
}

#[tauri::command]
pub fn open_cash_drawer(printer_name: String) -> Result<(), String> {
    println!("Cash drawer open triggered for {}", printer_name);
    Ok(())
}
