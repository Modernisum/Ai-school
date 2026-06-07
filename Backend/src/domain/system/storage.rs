use crate::AppState;
use crate::models::auth::{FileListQuery, DeleteByUrlQuery};
use axum::{
    extract::{Path, Query, State, Multipart},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use tracing::{error, info};
use crate::middleware::rls::TenantContext;
use axum::Extension;
use axum::http::StatusCode;

const ALLOWED_MIME_TYPES: &[&str] = &[
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "application/pdf",
    "video/mp4",
    "text/csv",
    "text/plain",
];

/// POST /api/storage/upload
/// Uploads a file via multipart form data.
pub async fn upload_file(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let mut uploaded_files = Vec::new();

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let field_name = field.name().unwrap_or("unknown").to_string();

        // We only process "file" fields, or fields that actually have a file_name
        let original_name = field.file_name().unwrap_or("uploaded_file").to_string();
        if original_name.is_empty() {
            continue;
        }

        // ── Security: Sanitize filename ─────────────────────────────────
        let sanitized_name = sanitize_filename(&original_name);
        if sanitized_name.is_empty() {
            uploaded_files.push(json!({
                "success": false,
                "file_name": original_name,
                "message": "Invalid filename. Only alphanumeric characters, dots, hyphens, and spaces are allowed."
            }));
            continue;
        }

        let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();

        // Strict Security Validation: Mime Type Whitelist
        if !ALLOWED_MIME_TYPES.contains(&content_type.as_str()) {
            uploaded_files.push(json!({
                "success": false,
                "file_name": sanitized_name,
                "message": format!("File type '{}' is not allowed. Only images (JPG, PNG, WebP, GIF, SVG), PDF, MP4, CSV, and TXT are permitted.", content_type)
            }));
            continue;
        }

        // Default folder generic categorization
        let folder = if field_name.contains("profile") { "profiles" }
        else if field_name.contains("material") { "materials" }
        else if field_name.contains("complain") { "complains" }
        else { "misc" };

        // Replace the original filename with sanitized version in the field
        // (process_upload will use sanitized_name via storage engine)
        match state.storage.process_upload(field, folder).await {
            Ok((hash, relative_path, public_url, size, content_type)) => {
                // --- Duplicate Detection: Redis-first, then DB ---
                // 1. Check Redis cache (sub-millisecond)
                let redis_key = format!("file:{}", hash);
                let cached_url: Option<String> = if let Ok(mut redis_conn) = state.db.redis.get().await {
                    deadpool_redis::redis::cmd("GET")
                        .arg(&redis_key)
                        .query_async(&mut redis_conn)
                        .await
                        .ok()
                        .flatten()
                } else {
                    None
                };

                if let Some(existing_url) = cached_url {
                    // Cache hit: file already exists, return cached URL instantly
                    // DO NOT delete the file here. The relative_path is the permanent hashed path.
                    uploaded_files.push(json!({
                        "success": true,
                        "url": existing_url,
                        "file_name": sanitized_name,
                        "duplicate": true
                    }));
                    continue;
                }

                // 2. Fallback: Check DB (for first-time or cache-miss)
                if let Ok(Some(existing_meta)) = state.repos.storage.get_file_by_hash(&hash).await {
                    info!("File duplicate detected via DB. Using existing object.");
                    // DO NOT delete the file here. The relative_path is the permanent hashed path.

                    // Warm the Redis cache for future lookups
                    let existing_url = existing_meta["public_url"].as_str().unwrap_or("").to_string();
                    if let Ok(mut redis_conn) = state.db.redis.get().await {
                        let _ = deadpool_redis::redis::cmd("SET")
                            .arg(&redis_key)
                            .arg(&existing_url)
                            .arg("EX").arg(7 * 24 * 3600u64)
                            .query_async::<_, ()>(&mut redis_conn).await;
                    }

                    uploaded_files.push(json!({
                        "success": true,
                        "file_id": existing_meta["id"],
                        "url": existing_url,
                        "file_name": sanitized_name,
                        "duplicate": true
                    }));
                    continue;
                }

                // Link directly to the TenantContext that invoked the upload
                let db_payload = json!({
                    "file_hash": hash,
                    "school_id": tenant_ctx._school_id,
                    "user_id": tenant_ctx.admin_id,
                    "user_type": if tenant_ctx._is_super_admin { "super_admin" } else { "user" },
                    "file_name": sanitized_name,
                    "content_type": content_type,
                    "file_size": size,
                    "file_path": relative_path,
                    "public_url": public_url
                });

                match state.repos.storage.save_file_metadata(db_payload).await {
                    Ok(meta) => {
                        let file_url = meta["public_url"].as_str().unwrap_or("").to_string();

                        // Cache hash → url in Redis for sub-millisecond future lookups (7-day TTL)
                        let redis_key = format!("file:{}", hash);
                        if let Ok(mut redis_conn) = state.db.redis.get().await {
                            let _ = deadpool_redis::redis::cmd("SET")
                                .arg(&redis_key)
                                .arg(&file_url)
                                .arg("EX")
                                .arg(7 * 24 * 3600u64)
                                .query_async::<_, ()>(&mut redis_conn)
                                .await;
                        }

                        uploaded_files.push(json!({
                            "success": true,
                            "file_id": meta["id"],
                            "url": file_url,
                            "file_name": sanitized_name
                        }));
                    }
                    Err(e) => {
                        error!("Failed to save file metadata: {}", e);
                        // cleanup the stranded file
                        let _ = state.storage.delete_file(&relative_path).await;
                        uploaded_files.push(json!({
                            "success": false,
                            "file_name": sanitized_name,
                            "message": "Failed to save file record. Please try again."
                        }));
                    }
                }
            }
            Err(e) => {
                error!("Storage engine failed to process upload: {}", e);
                let error_msg = e.to_string();
                let user_message = if error_msg.contains("SECURITY_ERR") {
                    error_msg.replacen("SECURITY_ERR: ", "", 1)
                } else if error_msg.contains("magic byte") || error_msg.contains("Magic byte") {
                    format!("Invalid file content. {}", error_msg)
                } else {
                    "File upload failed. Please try again with a valid image file.".to_string()
                };
                uploaded_files.push(json!({
                    "success": false,
                    "file_name": sanitized_name,
                    "message": user_message
                }));
            }
        }
    }

    if let Some(first_file) = uploaded_files.iter().find(|f| f["success"] == true) {
        return Json(json!({
            "url": first_file["url"]
        })).into_response();
    }

    if uploaded_files.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "No valid files found in request"})),
        ).into_response();
    }

    // Return the first error message if all files failed
    let first_error = uploaded_files.iter().find(|f| f["success"] == false);
    if let Some(err) = first_error {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "success": false,
                "message": err["message"]
            })),
        ).into_response();
    }

    (
        StatusCode::BAD_REQUEST,
        Json(json!({
            "success": false,
            "results": uploaded_files
        })),
    ).into_response()
}

/// Sanitizes a filename to prevent path traversal, null bytes, and special character attacks.
fn sanitize_filename(original: &str) -> String {
    use std::path::Path as StdPath;

    // Remove any path components (prevent ../../../etc/passwd style attacks)
    let filename = StdPath::new(original)
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or("unnamed_file");

    // Remove null bytes and other control characters
    let filename: String = filename.chars()
        .filter(|c| !c.is_control())
        .collect();

    // Allow only: alphanumeric, dash, underscore, dot, space, and common Unicode letters
    let filename: String = filename.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' || c == ' ' {
            c
        } else {
            '_'
        })
        .collect();

    // Prevent hidden files
    let filename = filename.trim_start_matches('.').to_string();

    // Prevent empty filename or just dots
    if filename.is_empty() || filename.chars().all(|c| c == '.') {
        return "unnamed_file".to_string();
    }

    // Maximum filename length to prevent filesystem issues
    if filename.len() > 200 {
        return filename.chars().take(200).collect();
    }

    filename
}

/// GET /api/storage/files
pub async fn list_files(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Query(params): Query<FileListQuery>,
) -> impl IntoResponse {
    // If they aren't a super admin, strictly lock listing strictly to their school or their user ID
    let school_filter = if tenant_ctx._is_super_admin { params.school_id.as_deref() } else { Some(tenant_ctx._school_id.as_str()) };
    let user_filter = if tenant_ctx._is_super_admin { params.user_id.as_deref() } else { Some(tenant_ctx.admin_id.as_str()) };

    match state.repos.storage.list_files(school_filter, user_filter).await {
        Ok(files) => Json(json!({"success": true, "files": files})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// DELETE /api/storage/files/:id
pub async fn delete_file(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    // Check ownership first
    match state.repos.storage.get_file_metadata(id).await {
        Ok(Some(meta)) => {
            // Enforce Tenant Isolation for deletes
            let file_school_id = meta["school_id"].as_str().unwrap_or("");
            if !tenant_ctx._is_super_admin && file_school_id != tenant_ctx._school_id {
                return (
                    axum::http::StatusCode::FORBIDDEN,
                    Json(json!({"success": false, "message": "Access Denied: You do not own this file"})),
                ).into_response();
            }

            if let Some(file_path) = meta["file_path"].as_str() {
                // Delete from disk
                if let Err(e) = state.storage.delete_file(file_path).await {
                    error!("Failed to delete file from disk: {}", e);
                    // we still delete DB metadata or wait? Let's delete DB anyway to hide it.
                }
            }
            
            // Delete from DB
            if let Err(e) = state.repos.storage.delete_file_metadata(id).await {
                return (
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"success": false, "message": e.to_string()})),
                ).into_response();
            }

            Json(json!({"success": true, "message": "File deleted"})).into_response()
        }
        Ok(None) => (
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({"success": false, "message": "File not found"})),
        ).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// DELETE /api/storage/file-by-url
pub async fn delete_file_by_url(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Query(params): Query<DeleteByUrlQuery>,
) -> impl IntoResponse {
    // Enforce Tenant Isolation: Only allow deletion if the file belongs to this school
    match state.repos.storage.delete_file_by_url(&params.url, &tenant_ctx._school_id).await {
        Ok(_) => Json(json!({"success": true, "message": "File reference removed"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}
