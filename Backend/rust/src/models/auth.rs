use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchoolLoginRequest {
    pub school_id: Option<String>,
    pub ident: Option<String>,
    pub password: Option<String>,
    pub user_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub school_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub school_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password_temp: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub access_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_in: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub profiles: Option<Vec<Value>>,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct SelectProfileRequest {
    pub ident: String,
    #[serde(alias = "userId", alias = "user_id")]
    pub user_id: String,
    #[serde(alias = "userType", alias = "user_type")]
    pub user_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileListQuery {
    pub school_id: Option<String>,
    pub user_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeleteByUrlQuery {
    pub url: String,
}

