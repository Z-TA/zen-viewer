use gif::DecodeOptions;
use image::ImageReader;
use serde::Serialize;
use std::fs;
use std::fs::File;
use std::path::Path;
use walkdir::WalkDir;

#[derive(serde::Serialize)]
pub struct MediaInfo {
    pub src: String,
    pub name: String,
    pub r#type: String,
    pub resolution: MediaResolution,
    pub size: u64,
}

// Get media type from file extension
pub fn get_media_type(path: &str) -> Result<String, String> {
    let path_obj = Path::new(path);
    let ext = path_obj
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "jpg" | "jpeg" | "png" => Ok("image".to_string()),
        "gif" => Ok("gif".to_string()),
        "mp4" | "webm" => Ok("video".to_string()),
        _ => Err("Unsupported file type".into()),
    }
}

// Convert file path to a working URL (hybrid approach)
#[tauri::command]
pub fn get_media_url(path: &str) -> Result<String, String> {
    // Validate file exists and is readable
    let _metadata = fs::metadata(path).map_err(|e| format!("Cannot access file: {}", e))?;

    // Try different URL formats based on file type and size
    let path_obj = Path::new(path);
    let ext = path_obj
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    // For videos, always use file:// protocol
    if matches!(ext.as_str(), "mp4" | "webm") {
        let file_url = if path.starts_with("\\\\") {
            format!("file:{}", path.replace("\\", "/"))
        } else {
            format!("file:///{}", path.replace("\\", "/"))
        };
        return Ok(file_url);
    }

    // For images, try file:// protocol first (most reliable)
    let file_url = if path.starts_with("\\\\") {
        format!("file:{}", path.replace("\\", "/"))
    } else {
        format!("file:///{}", path.replace("\\", "/"))
    };

    Ok(file_url)
}

pub fn get_media_name(path: &str) -> Result<String, String> {
    let path_obj = Path::new(path);
    let name = path_obj.file_name().and_then(|s| s.to_str()).unwrap_or("");
    Ok(name.to_string())
}

pub fn get_image_resolution(path: &str) -> Result<MediaResolution, String> {
    let reader = ImageReader::open(path)
        .map_err(|e| e.to_string())?
        .with_guessed_format()
        .map_err(|e| e.to_string())?;

    let (width, height) = reader.into_dimensions().map_err(|e| e.to_string())?;
    Ok(MediaResolution { width, height })
}

pub fn get_gif_resolution(path: &str) -> Result<MediaResolution, String> {
    let mut decoder = DecodeOptions::new();
    decoder.set_color_output(gif::ColorOutput::RGBA);

    let file = File::open(path).map_err(|e| e.to_string())?;
    let reader = decoder.read_info(file).map_err(|e| e.to_string())?;

    Ok(MediaResolution {
        width: reader.width() as u32,
        height: reader.height() as u32,
    })
}

#[derive(Serialize)]
pub struct MediaResolution {
    pub width: u32,
    pub height: u32,
}

pub fn get_media_resolution(path: &str, media_type: &str) -> Result<MediaResolution, String> {
    match media_type {
        "image" => get_image_resolution(path),
        "gif" => get_gif_resolution(path),
        "video" => Ok(MediaResolution {
            width: 0,
            height: 0,
        }),
        _ => Err("Unsupported file type".into()),
    }
}

#[tauri::command]
pub fn get_media_size(path: &str) -> Result<u64, String> {
    let metadata = fs::metadata(&path).map_err(|e| format!("Cannot access file: {}", e))?;
    Ok(metadata.len())
}

#[tauri::command]
pub fn copy_media_to_folder(src_path: String, dest_folder: String) -> Result<String, String> {
    let src = Path::new(&src_path);

    if !src.exists() {
        return Err("Source file does not exist".into());
    }

    let file_name = src.file_name().ok_or("Invalid source file name")?;

    let mut dest_path = Path::new(&dest_folder).join(file_name);

    // If file already exists, add (1), (2), etc.
    let mut count = 1;
    while dest_path.exists() {
        let stem = src
            .file_stem()
            .and_then(|s| s.to_str())
            .ok_or("Invalid file name")?;
        let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("");

        let new_name = if ext.is_empty() {
            format!("{} ({})", stem, count)
        } else {
            format!("{} ({}).{}", stem, count, ext)
        };

        dest_path = Path::new(&dest_folder).join(new_name);
        count += 1;
    }

    fs::copy(&src, &dest_path).map_err(|e| e.to_string())?;

    Ok(dest_path.to_string_lossy().to_string())
}

// Load a single media file with file info
#[tauri::command]
pub fn load_media(path: String) -> Result<MediaInfo, String> {
    let media_type = get_media_type(&path)?;
    let src = get_media_url(&path)?;
    let media_name = get_media_name(&path)?;
    let resolution = get_media_resolution(&path, &media_type).unwrap_or(MediaResolution {
        width: 0,
        height: 0,
    });
    let size = get_media_size(&path).unwrap_or(0);
    Ok(MediaInfo {
        src,
        name: media_name,
        r#type: media_type,
        resolution: resolution,
        size: size,
    })
}

pub fn filter_hidden(entry: &walkdir::DirEntry) -> bool {
    !entry.file_name().to_string_lossy().starts_with('.')
}

pub fn media_type_from_extension(ext: &str) -> Option<&'static str> {
    match ext {
        "gif" | "png" | "jpg" | "jpeg" | "webp" | "bmp" | "tiff" => Some("image"),
        "mp4" | "mov" | "avi" | "mkv" | "webm" => Some("video"),
        _ => None,
    }
}

pub fn is_media_supported(ext: &str) -> bool {
    media_type_from_extension(ext).is_some()
}

#[tauri::command]
pub fn scan_folder_alt(path: String) -> Result<Vec<String>, String> {
    let folder = Path::new(&path)
        .parent()
        .ok_or("Cannot get parent folder")?;

    let files: Vec<String> = WalkDir::new(folder)
        .into_iter()
        .filter_entry(|e| filter_hidden(e))
        .filter_map(|entry| entry.ok())
        .filter(|p| {
            if let Some(ext) = p.path().extension().and_then(|s| s.to_str()) {
                matches!(
                    ext.to_lowercase().as_str(),
                    "jpg" | "jpeg" | "png" | "gif" | "mp4" | "webm"
                )
            } else {
                false
            }
        })
        .map(|p| p.path().to_string_lossy().to_string())
        .collect();

    Ok(files)
}

#[tauri::command]
pub fn scan_folder(path: String) -> Result<Vec<String>, String> {
    let folder = Path::new(&path)
        .parent()
        .ok_or("Cannot get parent folder")?;

    let files: Vec<String> = fs::read_dir(folder)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|p| {
            if let Some(ext) = p.extension().and_then(|s| s.to_str()) {
                matches!(
                    ext.to_lowercase().as_str(),
                    "jpg" | "jpeg" | "png" | "gif" | "mp4" | "webm"
                )
            } else {
                false
            }
        })
        .map(|p| p.to_string_lossy().to_string())
        .collect();

    Ok(files)
}

#[tauri::command]
pub fn get_image_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|e| e.to_string())
}
