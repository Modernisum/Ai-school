use async_trait::async_trait;
use crate::models::system::{Country, StateModel, District};
use crate::repository::traits::AppError;

#[async_trait]
pub trait GeoRepository: Send + Sync {
    async fn get_countries(&self) -> Result<Vec<Country>, AppError>;
    async fn get_states(&self, country_id: i32) -> Result<Vec<StateModel>, AppError>;
    async fn get_districts(&self, state_id: i32) -> Result<Vec<District>, AppError>;
}
