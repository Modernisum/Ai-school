use crate::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;

const ALLOWED_TABLES: &[&str] = &[
    "reminders",
    "webhook_endpoints",
    "awards",
    "complains",
    "document_box",
    "tasks",
];

fn is_table_allowed(table: &str) -> bool {
    ALLOWED_TABLES.contains(&table)
}

fn get_id_column(table: &str) -> &'static str {
    match table {
        "tasks" => "task_id",
        "api_keys" => "key_id",
        _ => "id",
    }
}

pub async fn generic_create(
    State(state): State<AppState>,
    Path((school_id, table)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    if !is_table_allowed(&table) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "Unauthorized table access"})),
        )
            .into_response();
    }

    match state.repos.base.insert_row(&school_id, &table, payload).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn generic_list(
    State(state): State<AppState>,
    Path((school_id, table)): Path<(String, String)>,
) -> impl IntoResponse {
    if !is_table_allowed(&table) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "Unauthorized table access"})),
        )
            .into_response();
    }

    match state.repos.base.select_all(&school_id, &table).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn generic_get(
    State(state): State<AppState>,
    Path((school_id, table, id)): Path<(String, String, String)>,
) -> impl IntoResponse {
    if !is_table_allowed(&table) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "Unauthorized table access"})),
        )
            .into_response();
    }

    let id_col = get_id_column(&table);
    let id_val = if id_col == "id" {
        if let Ok(num) = id.parse::<i32>() {
            json!(num)
        } else {
            json!(id)
        }
    } else {
        json!(id)
    };

    match state.repos.base.select_by_id(&school_id, &table, id_col, id_val).await {
        Ok(Some(data)) => Json(json!({"success": true, "data": data})).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({"success": false, "message": "Record not found"})),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn generic_update(
    State(state): State<AppState>,
    Path((school_id, table, id)): Path<(String, String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    if !is_table_allowed(&table) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "Unauthorized table access"})),
        )
            .into_response();
    }

    let id_col = get_id_column(&table);
    let id_val = if id_col == "id" {
        if let Ok(num) = id.parse::<i32>() {
            json!(num)
        } else {
            json!(id)
        }
    } else {
        json!(id)
    };

    match state.repos.base.update_row(&school_id, &table, id_col, id_val, payload).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn generic_delete(
    State(state): State<AppState>,
    Path((school_id, table, id)): Path<(String, String, String)>,
) -> impl IntoResponse {
    if !is_table_allowed(&table) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "Unauthorized table access"})),
        )
            .into_response();
    }

    let id_col = get_id_column(&table);
    let id_val = if id_col == "id" {
        if let Ok(num) = id.parse::<i32>() {
            json!(num)
        } else {
            json!(id)
        }
    } else {
        json!(id)
    };

    match state.repos.base.delete_row(&school_id, &table, id_col, id_val).await {
        Ok(_) => Json(json!({"success": true, "message": "Record deleted"})).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
