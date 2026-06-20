use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateOrderRequest {
    pub amount: f64,
    pub currency: Option<String>,
    pub student_id: String,
    pub fee_type: String, // "regular" or "custom"
    pub fee_id: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PendingFeesQuery {
    #[serde(rename = "minPercentage")]
    pub min_percentage: f64,
    #[serde(rename = "className")]
    pub class_name: Option<String>,
}
