use crate::repository::traits::*;
use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::error::Error;
use std::sync::Arc;

pub struct PostgresEmployeeService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl EmployeeService for PostgresEmployeeService {
    async fn create_employee(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let employee_id = self.repos.employee.generate_employee_id().await?;
        let mut emp_data = data.clone();
        emp_data["employeeId"] = json!(employee_id);
        emp_data["status"] = json!("active");

        self.repos
            .employee
            .add_employee(school_id, emp_data.clone())
            .await?;
        Ok(emp_data)
    }

    async fn list_employees(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.employee.get_employees(school_id).await
    }

    async fn get_employee(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<Option<Value>, Box<dyn Error + Send + Sync>> {
        self.repos
            .employee
            .get_employee(school_id, employee_id)
            .await
    }

    async fn update_employee(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos
            .employee
            .update_employee(school_id, employee_id, data)
            .await
    }

    async fn delete_employee(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos
            .employee
            .delete_employee(school_id, employee_id)
            .await
    }
}
