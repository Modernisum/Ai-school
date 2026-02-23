use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchoolLoginRequest {
    pub school_id: String,
    pub password: String,
    pub user_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub success: bool,
    pub message: String,
    pub school_id: Option<String>,
    pub password_temp: Option<bool>,
    pub access_token: Option<String>,
    pub expires_in: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenVerifyRequest {
    pub token: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenericResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetSecurityRequest {
    pub school_id: String,
    pub question: String,
    pub answer: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ForgotPasswordRequest {
    pub school_id: String,
    pub answer: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangePasswordRequest {
    pub school_id: String,
    pub old_password: String,
    pub new_password: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangeIdRequest {
    pub old_school_id: String,
    pub password: String,
    pub new_school_id: String,
}
