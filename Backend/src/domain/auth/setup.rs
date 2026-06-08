use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};

pub async fn get_setup(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.setup.get_setup(&school_id).await {
        Ok(setup) => Json(serde_json::json!({"success": true, "data": setup})).into_response(),
        Err(e) => {
            let msg = e.to_string();
            let status = if msg.contains("School not found") {
                axum::http::StatusCode::NOT_FOUND
            } else {
                axum::http::StatusCode::INTERNAL_SERVER_ERROR
            };
            (status, Json(serde_json::json!({"success": false, "message": msg}))).into_response()
        }
    }
}

pub async fn setup_school_handler(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let password = payload["password"].as_str().unwrap_or("").to_string();

    let admin_id = "setup_admin";
    match state.services.setup.setup_school(admin_id, payload).await {
        Ok(res) => {
            let school_id = res["schoolId"].as_str().unwrap_or("");
            let login_data = serde_json::json!({
                "schoolId": school_id,
                "password": password,
                "userType": "school-admin" // default role for setup
            });

            match state.services.auth.login(login_data).await {
                Ok(login_res) => Json(serde_json::json!({
                    "success": true,
                    "schoolId": school_id,
                    "schoolCode": res["schoolCode"],
                    "accessToken": login_res["accessToken"],
                    "message": "School setup completed and signed in automatically"
                }))
                .into_response(),
                Err(e) => {
                    println!("Automatic login failed after setup: {}", e);
                    Json(res).into_response()
                }
            }
        }
        Err(e) => {
            let msg = e.to_string();
            println!("School setup failed: {}", msg);
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"success": false, "message": msg})),
            )
                .into_response()
        }
    }
}
