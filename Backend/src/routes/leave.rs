use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json, Extension,
};
use crate::middleware::rls::TenantContext;
use serde_json::json;

pub async fn create_leave(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state.services.leave.create_leave(&school_id, &tenant_ctx.admin_id, payload).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn list_leaves(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.leave.get_leaves(&school_id).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn approve_leave(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, leave_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .leave
        .update_leave_status(&school_id, &tenant_ctx.admin_id, &leave_id, "approved")
        .await
    {
        Ok(_) => Json(json!({"success": true, "message": "Leave approved"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn reject_leave(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, leave_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .leave
        .update_leave_status(&school_id, &tenant_ctx.admin_id, &leave_id, "rejected")
        .await
    {
        Ok(_) => Json(json!({"success": true, "message": "Leave rejected"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn extend_leave(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, leave_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let days = payload["days"].as_i64().unwrap_or(0) as i32;
    match state
        .services
        .leave
        .update_leave_duration(&school_id, &tenant_ctx.admin_id, &leave_id, "extend", days)
        .await
    {
        Ok(_) => {
            Json(json!({"success": true, "message": "Leave duration extended"})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn reduce_leave(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, leave_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let days = payload["days"].as_i64().unwrap_or(0) as i32;
    match state
        .services
        .leave
        .update_leave_duration(&school_id, &tenant_ctx.admin_id, &leave_id, "reduce", days)
        .await
    {
        Ok(_) => {
            Json(json!({"success": true, "message": "Leave duration reduced"})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn download_leave_pdf(
    State(state): State<AppState>,
    Path((school_id, leave_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let leaves = match state.services.leave.get_leaves(&school_id).await {
        Ok(l) => l,
        Err(_) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"success": false, "message": "Failed"})),
            )
                .into_response()
        }
    };

    let leave = match leaves
        .into_iter()
        .find(|l| l["id"].as_str() == Some(&leave_id) || l["leaveId"].as_str() == Some(&leave_id))
    {
        Some(l) => l,
        None => {
            return (
                axum::http::StatusCode::NOT_FOUND,
                Json(json!({"success": false, "message": "Leave not found"})),
            )
                .into_response()
        }
    };

    let applicant_name = leave["applicantName"]
        .as_str()
        .unwrap_or(leave["studentName"].as_str().unwrap_or("Employee/Student"));
    let role = leave["role"].as_str().unwrap_or("Staff");
    let start_date = leave["startDate"].as_str().unwrap_or("N/A");
    let end_date = leave["endDate"].as_str().unwrap_or("N/A");
    let status = leave["status"].as_str().unwrap_or("Pending").to_uppercase();
    let reason = leave["reason"].as_str().unwrap_or("No reason provided");

    use printpdf::*;
    let (doc, page1, layer1) = PdfDocument::new("Leave Letter", Mm(210.0), Mm(297.0), "Layer 1");
    let current_layer = doc.get_page(page1).get_layer(layer1);

    let font = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).unwrap();

    current_layer.use_text(
        "OFFICIAL LEAVE LETTER",
        24.0,
        Mm(65.0),
        Mm(260.0),
        &font_bold,
    );
    current_layer.use_text(
        format!("Applicant: {}", applicant_name),
        14.0,
        Mm(20.0),
        Mm(230.0),
        &font,
    );
    current_layer.use_text(format!("Role: {}", role), 14.0, Mm(20.0), Mm(220.0), &font);
    current_layer.use_text(
        format!("Start Date: {}", start_date),
        14.0,
        Mm(20.0),
        Mm(210.0),
        &font,
    );
    current_layer.use_text(
        format!("End Date: {}", end_date),
        14.0,
        Mm(20.0),
        Mm(200.0),
        &font,
    );

    let status_color = if status == "APPROVED" {
        Color::Rgb(Rgb::new(0.0, 0.6, 0.0, None))
    } else if status == "REJECTED" {
        Color::Rgb(Rgb::new(0.8, 0.0, 0.0, None))
    } else {
        Color::Rgb(Rgb::new(0.5, 0.5, 0.5, None))
    };
    current_layer.set_fill_color(status_color);
    current_layer.use_text(
        format!("STATUS: {}", status),
        16.0,
        Mm(20.0),
        Mm(185.0),
        &font_bold,
    );

    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
    current_layer.use_text("Reason for Leave:", 14.0, Mm(20.0), Mm(160.0), &font_bold);

    let mut y_pos = 150.0;
    let chars_per_line = 75;
    let mut current_line = String::new();
    for word in reason.split_whitespace() {
        if current_line.len() + word.len() > chars_per_line {
            current_layer.use_text(&current_line, 12.0, Mm(20.0), Mm(y_pos), &font);
            y_pos -= 6.0;
            current_line = String::new();
        }
        current_line.push_str(word);
        current_line.push(' ');
    }
    if !current_line.is_empty() {
        current_layer.use_text(&current_line, 12.0, Mm(20.0), Mm(y_pos), &font);
    }

    current_layer.use_text(
        "Authorized Signature: _______________________",
        12.0,
        Mm(20.0),
        Mm(y_pos - 40.0),
        &font,
    );

    let buf = {
        use std::io::BufWriter;
        let mut writer = BufWriter::new(Vec::new());
        let _ = doc.save(&mut writer);
        writer.into_inner().unwrap_or_default()
    };

    use axum::body::Body;
    use axum::http::header;
    use axum::response::Response;

    let response = Response::builder()
        .header(header::CONTENT_TYPE, "application/pdf")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"Leave_Letter.pdf\""),
        )
        .body(Body::from(buf))
        .unwrap();

    response.into_response()
}

pub async fn get_proxy_suggestions(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    axum::extract::Query(params): axum::extract::Query<serde_json::Value>,
) -> impl IntoResponse {
    let date = params["date"].as_str().unwrap_or("");
    let period = params["period"].as_str().unwrap_or("1");
    let subject = params["subject"].as_str();

    match state.services.leave.get_proxy_suggestions(&school_id, date, period, subject).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
