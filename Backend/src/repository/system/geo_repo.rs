use crate::db::DbClient;
use crate::models::system::{Country, StateModel, District};
use crate::repository::traits::{AppError, GeoRepository};
use async_trait::async_trait;
use std::sync::Arc;

pub struct PostgresGeoRepository {
    pub client: Arc<DbClient>,
}

impl PostgresGeoRepository {
    pub fn new(client: Arc<DbClient>) -> Self {
        Self { client }
    }
}

#[async_trait]
impl GeoRepository for PostgresGeoRepository {
    async fn get_countries(&self) -> Result<Vec<Country>, AppError> {
        let countries = sqlx::query_as::<_, Country>(
            "SELECT id, name, code, phone_code FROM countries ORDER BY name"
        )
        .fetch_all(&self.client.pool)
        .await?;
        Ok(countries)
    }

    async fn get_states(&self, country_id: i32) -> Result<Vec<StateModel>, AppError> {
        let states = sqlx::query_as::<_, StateModel>(
            "SELECT id, country_id, name FROM states WHERE country_id = $1 ORDER BY name",
        )
        .bind(country_id)
        .fetch_all(&self.client.pool)
        .await?;
        Ok(states)
    }

    async fn get_districts(&self, state_id: i32) -> Result<Vec<District>, AppError> {
        let districts = sqlx::query_as::<_, District>(
            "SELECT id, state_id, name FROM districts WHERE state_id = $1 ORDER BY name",
        )
        .bind(state_id)
        .fetch_all(&self.client.pool)
        .await?;
        Ok(districts)
    }
}
