// Plugin installation management for stud-bridge
// Handles checking if plugin is installed and installing it to Roblox Plugins folder

use std::fs;
use std::path::PathBuf;

// Embed the plugin source directly in the binary
const PLUGIN_SOURCE: &str = include_str!("../../studio-plugin/stud-bridge.server.lua");
const PLUGIN_FILENAME: &str = "stud-bridge.server.lua";

/// Check if Roblox Studio is installed on the system
#[tauri::command]
pub fn check_roblox_studio_installed() -> bool {
    #[cfg(target_os = "macos")]
    {
        // Check common installation locations on macOS
        let paths = [
            PathBuf::from("/Applications/RobloxStudio.app"),
            PathBuf::from("/Applications/Roblox Studio.app"),
        ];

        for path in paths {
            if path.exists() {
                return true;
            }
        }

        // Also check if Roblox folder exists in Documents (indicates previous use)
        if let Some(home) = dirs::home_dir() {
            let roblox_folder = home.join("Documents").join("Roblox");
            if roblox_folder.exists() {
                return true;
            }
        }

        return false;
    }

    #[cfg(target_os = "windows")]
    {
        // Check common installation locations on Windows
        if let Some(local_app_data) = dirs::data_local_dir() {
            let roblox_versions = local_app_data.join("Roblox").join("Versions");
            if roblox_versions.exists() {
                // Look for RobloxStudioBeta.exe in any version folder
                if let Ok(entries) = fs::read_dir(&roblox_versions) {
                    for entry in entries.flatten() {
                        let studio_exe = entry.path().join("RobloxStudioBeta.exe");
                        if studio_exe.exists() {
                            return true;
                        }
                    }
                }
            }
        }

        // Check Program Files
        let program_files = [
            PathBuf::from("C:\\Program Files\\Roblox"),
            PathBuf::from("C:\\Program Files (x86)\\Roblox"),
        ];

        for path in program_files {
            if path.exists() {
                return true;
            }
        }

        return false;
    }

    #[cfg(target_os = "linux")]
    {
        // Roblox Studio doesn't officially support Linux
        // Check for Wine installation
        if let Some(home) = dirs::home_dir() {
            let wine_roblox = home
                .join(".wine")
                .join("drive_c")
                .join("users")
                .join("Public")
                .join("Documents")
                .join("Roblox");
            if wine_roblox.exists() {
                return true;
            }
        }
        return false;
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        false
    }
}

/// Get the Roblox Plugins folder path for the current platform
fn get_plugins_folder() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        if let Some(home) = dirs::home_dir() {
            return Some(home.join("Documents").join("Roblox").join("Plugins"));
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Some(local_app_data) = dirs::data_local_dir() {
            return Some(local_app_data.join("Roblox").join("Plugins"));
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Roblox Studio doesn't officially support Linux, but some use Wine
        if let Some(home) = dirs::home_dir() {
            return Some(
                home.join(".wine")
                    .join("drive_c")
                    .join("users")
                    .join("Public")
                    .join("Documents")
                    .join("Roblox")
                    .join("Plugins"),
            );
        }
    }

    None
}

/// Check if the stud-bridge plugin is installed
#[tauri::command]
pub fn check_plugin_installed() -> Result<PluginStatus, String> {
    let plugins_folder = get_plugins_folder()
        .ok_or_else(|| "Could not determine Roblox Plugins folder".to_string())?;

    let plugin_path = plugins_folder.join(PLUGIN_FILENAME);

    if plugin_path.exists() {
        // Check if it's the current version by comparing content
        if let Ok(existing_content) = fs::read_to_string(&plugin_path) {
            let is_current = existing_content.trim() == PLUGIN_SOURCE.trim();
            Ok(PluginStatus {
                installed: true,
                path: plugin_path.to_string_lossy().to_string(),
                is_current_version: is_current,
                plugins_folder: plugins_folder.to_string_lossy().to_string(),
            })
        } else {
            Ok(PluginStatus {
                installed: true,
                path: plugin_path.to_string_lossy().to_string(),
                is_current_version: false, // Can't read, assume outdated
                plugins_folder: plugins_folder.to_string_lossy().to_string(),
            })
        }
    } else {
        Ok(PluginStatus {
            installed: false,
            path: plugin_path.to_string_lossy().to_string(),
            is_current_version: false,
            plugins_folder: plugins_folder.to_string_lossy().to_string(),
        })
    }
}

/// Install the stud-bridge plugin to the Roblox Plugins folder
#[tauri::command]
pub fn install_plugin() -> Result<InstallResult, String> {
    let plugins_folder = get_plugins_folder()
        .ok_or_else(|| "Could not determine Roblox Plugins folder".to_string())?;

    // Create the Plugins folder if it doesn't exist
    if !plugins_folder.exists() {
        fs::create_dir_all(&plugins_folder)
            .map_err(|e| format!("Failed to create Plugins folder: {}", e))?;
    }

    let plugin_path = plugins_folder.join(PLUGIN_FILENAME);

    // Write the plugin file
    fs::write(&plugin_path, PLUGIN_SOURCE)
        .map_err(|e| format!("Failed to write plugin file: {}", e))?;

    Ok(InstallResult {
        success: true,
        path: plugin_path.to_string_lossy().to_string(),
        message: "Plugin installed successfully. Restart Roblox Studio to load it.".to_string(),
    })
}

/// Get the plugins folder path (for manual installation info)
#[tauri::command]
pub fn get_plugins_path() -> Result<String, String> {
    get_plugins_folder()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not determine Roblox Plugins folder".to_string())
}

#[derive(serde::Serialize)]
pub struct PluginStatus {
    pub installed: bool,
    pub path: String,
    pub is_current_version: bool,
    pub plugins_folder: String,
}

#[derive(serde::Serialize)]
pub struct InstallResult {
    pub success: bool,
    pub path: String,
    pub message: String,
}
