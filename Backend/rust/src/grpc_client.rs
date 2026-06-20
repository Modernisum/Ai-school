pub mod ai_service {
    tonic::include_proto!("ai_service");
}

use ai_service::ai_service_client::AiServiceClient;
use ai_service::{OcrRequest, TasksRequest};
use tonic::transport::Channel;
use std::env;

#[derive(Clone)]
pub struct AiClient {
    client: AiServiceClient<Channel>,
}

impl AiClient {
    pub async fn connect() -> Result<Self, tonic::transport::Error> {
        let grpc_url = env::var("AI_BACKEND_GRPC_URL")
            .unwrap_or_else(|_| "http://ai_backend:50051".to_string());
        let client = AiServiceClient::connect(grpc_url).await?;
        Ok(Self { client })
    }

    pub async fn process_ocr(&self, school_id: &str, file_url: &str, doc_type: &str) -> Result<ai_service::OcrResponse, tonic::Status> {
        let mut client = self.client.clone();
        let request = tonic::Request::new(OcrRequest {
            school_id: school_id.to_string(),
            file_url: file_url.to_string(),
            doc_type: doc_type.to_string(),
        });
        let response = client.process_ocr(request).await?;
        Ok(response.into_inner())
    }

    pub async fn generate_tasks(&self, school_id: &str, payload_json: &str) -> Result<ai_service::TasksResponse, tonic::Status> {
        let mut client = self.client.clone();
        let request = tonic::Request::new(TasksRequest {
            school_id: school_id.to_string(),
            payload_json: payload_json.to_string(),
        });
        let response = client.generate_tasks(request).await?;
        Ok(response.into_inner())
    }

    pub async fn reorganize_tasks(&self, school_id: &str, payload_json: &str) -> Result<ai_service::TasksResponse, tonic::Status> {
        let mut client = self.client.clone();
        let request = tonic::Request::new(TasksRequest {
            school_id: school_id.to_string(),
            payload_json: payload_json.to_string(),
        });
        let response = client.reorganize_tasks(request).await?;
        Ok(response.into_inner())
    }
}
