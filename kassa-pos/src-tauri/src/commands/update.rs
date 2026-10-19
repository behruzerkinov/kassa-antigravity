use std::process::Command;

#[tauri::command]
pub fn restart_app_with_update(exe_path: Option<String>) -> Result<(), String> {
    let target = exe_path.unwrap_or_else(|| {
        let temp = std::env::temp_dir();
        temp.join("kassa-pos.exe").to_string_lossy().to_string()
    });

    #[cfg(target_os = "windows")]
    {
        // On Windows, spawn the new executable detached and exit current process
        Command::new("cmd")
            .args(["/c", "start", "", &target])
            .spawn()
            .map_err(|e| format!("Failed to launch update: {}", e))?;
        std::process::exit(0);
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = target;
        Ok(())
    }
}
