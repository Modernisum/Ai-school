use serde::Serialize;
use serde_json::Value;

/// Universal API response wrapper for ALL endpoints
#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pagination: Option<PaginationMeta>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub analytics: Option<Value>,
}

#[derive(Debug, Serialize)]
pub struct PaginationMeta {
    pub page: u32,
    pub per_page: u32,
    pub total: i64,
    pub total_pages: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub has_next: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub has_prev: Option<bool>,
}

impl PaginationMeta {
    pub fn new(page: u32, per_page: u32, total: i64) -> Self {
        let total_pages = if per_page > 0 {
            ((total as f64) / (per_page as f64)).ceil() as u32
        } else {
            0
        };
        Self {
            page,
            per_page,
            total,
            total_pages,
            has_next: Some(page < total_pages),
            has_prev: Some(page > 1),
        }
    }
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            pagination: None,
            message: None,
            analytics: None,
        }
    }

    pub fn success_with_pagination(data: T, page: u32, per_page: u32, total: i64) -> Self {
        Self {
            success: true,
            data: Some(data),
            pagination: Some(PaginationMeta::new(page, per_page, total)),
            message: None,
            analytics: None,
        }
    }

    pub fn error(message: String) -> Self {
        Self {
            success: false,
            data: None,
            pagination: None,
            message: Some(message),
            analytics: None,
        }
    }

    pub fn with_analytics(mut self, analytics: Value) -> Self {
        self.analytics = Some(analytics);
        self
    }
}
