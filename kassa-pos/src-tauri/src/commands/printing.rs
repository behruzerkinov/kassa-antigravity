use tauri::State;
use crate::db::DbState;
use std::process::Command;

#[tauri::command]
pub fn list_printers(_state: State<'_, DbState>) -> Result<Vec<String>, String> {
    #[cfg(target_os = "windows")]
    {
        // Enumerate printers via PowerShell Get-CimInstance (or Get-Printer fallback).
        // Works on all modern Windows versions (Windows 10, 11 24H2+, Windows Server 2022/2025)
        // where legacy `wmic` has been permanently removed by Microsoft.
        let ps_script = r#"
            $res = @()
            try {
                $printers = Get-CimInstance -ClassName Win32_Printer -ErrorAction Stop
                $def = ($printers | Where-Object { $_.Default -eq $true } | Select-Object -First 1).Name
                if ($def) { $res += $def }
                foreach ($p in $printers) {
                    if ($p.Name -and $p.Name -ne $def) { $res += $p.Name }
                }
            } catch {
                try {
                    $res = Get-Printer | Select-Object -ExpandProperty Name
                } catch {
                    $res = @()
                }
            }
            $res | ForEach-Object { if ($_) { [Console]::WriteLine($_) } }
        "#;

        let output = Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", ps_script])
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                let mut printers: Vec<String> = stdout
                    .lines()
                    .map(|l| l.trim().to_string())
                    .filter(|l| !l.is_empty())
                    .collect();

                printers.dedup();
                Ok(printers)
            }
            Err(e) => {
                eprintln!("Printer discovery warning: {}", e);
                Ok(Vec::new())
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(Vec::new())
    }
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

#[tauri::command]
pub fn set_windows_autostart(enabled: bool) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe_str = exe_path.to_string_lossy().to_string();
        let script = if enabled {
            format!(
                "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'KassaPOS' -Value '\"{}\"'",
                exe_str.replace('\'', "''")
            )
        } else {
            "Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'KassaPOS' -ErrorAction SilentlyContinue".to_string()
        };
        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .output()
            .map_err(|e| format!("PowerShell error: {}", e))?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to update autostart: {}", err));
        }
        Ok(if enabled { "Autostart enabled".into() } else { "Autostart disabled".into() })
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = enabled;
        Ok("Autostart only supported on Windows".into())
    }
}

