use tauri::State;
use crate::db::DbState;
use std::process::Command;

#[tauri::command]
pub fn list_printers(_state: State<'_, DbState>) -> Result<Vec<String>, String> {
    let output = Command::new("wmic")
        .args(["printer", "get", "name"])
        .output()
        .map_err(|e| format!("Failed to run wmic: {}", e))?;

    if !output.status.success() {
        return Err("wmic command failed".into());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut printers = Vec::new();
    
    for line in stdout.lines().skip(1) {
        let name = line.trim();
        if !name.is_empty() {
            printers.push(name.to_string());
        }
    }

    Ok(printers)
}

#[tauri::command]
pub fn print_receipt(_transaction_id: i64, _printer_name: String, _width: i32, _state: State<'_, DbState>) -> Result<(), String> {
    println!("Stub: Printing receipt {} on {} (width: {})", _transaction_id, _printer_name, _width);
    Ok(())
}

#[tauri::command]
pub fn print_x_report(_smena_id: i64, _printer_name: String, _width: i32, _state: State<'_, DbState>) -> Result<(), String> {
    println!("Printing X-report for smena {} on printer {} (width: {})", _smena_id, _printer_name, _width);
    Ok(())
}

#[tauri::command]
pub fn open_cash_drawer(printer_name: String) -> Result<(), String> {
    println!("Cash drawer open triggered for {}", printer_name);
    Ok(())
}

#[tauri::command]
pub fn create_desktop_shortcut() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe_str = exe_path.to_string_lossy().to_string();
        let script = format!(
            "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut(\"$([Environment]::GetFolderPath('Desktop'))\\Kassa POS.lnk\"); $sc.TargetPath = '{}'; $sc.Save()",
            exe_str.replace('\\', "\\\\")
        );
        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .output()
            .map_err(|e| format!("PowerShell error: {}", e))?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to create shortcut: {}", err));
        }
        Ok("Desktop shortcut created successfully".into())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok("Shortcuts only supported on Windows".into())
    }
}
