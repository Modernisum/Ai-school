use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::error::Error;
use std::sync::Arc;

pub struct PostgresAuxiliaryService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl AwardService for PostgresAuxiliaryService {
    async fn create_award(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.award.add_award(school_id, data).await
    }
    async fn list_awards(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.award.get_awards(school_id).await
    }
}

#[async_trait]
impl ComplainService for PostgresAuxiliaryService {
    async fn create_complain(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.complain.add_complain(school_id, data).await
    }
    async fn list_complains(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.complain.get_complains(school_id).await
    }
}

#[async_trait]
impl ReminderService for PostgresAuxiliaryService {
    async fn create_reminder(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.reminder.add_reminder(school_id, data).await
    }
    async fn list_reminders(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.reminder.get_reminders(school_id).await
    }
}

#[async_trait]
impl DocumentBoxService for PostgresAuxiliaryService {
    async fn upload_document(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.document_box.add_document(school_id, data).await
    }
    async fn list_documents(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.document_box.get_documents(school_id).await
    }
}

#[async_trait]
impl SchoolService for PostgresAuxiliaryService {
    async fn get_school_details(
        &self,
        school_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        match self.repos.school.get_school(school_id).await? {
            Some(school) => Ok(school),
            None => Err("School not found".into()),
        }
    }
}

#[async_trait]
impl ResponsibilityService for PostgresAuxiliaryService {
    async fn list_responsibilities(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos
            .responsibility
            .get_responsibilities(school_id)
            .await
    }

    async fn create_responsibility(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.responsibility.add_responsibility(school_id, data).await
    }

    async fn assign_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos
            .responsibility
            .assign_responsibility(school_id, employee_id, responsibility_id)
            .await
    }

    async fn remove_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos
            .responsibility
            .remove_responsibility(school_id, employee_id, responsibility_id)
            .await
    }

    async fn list_employee_responsibilities(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let responsibilities = self.repos
            .responsibility
            .get_employee_responsibilities(school_id, employee_id)
            .await?;
        
        // Calculate total per day price
        let total_per_day_price: f64 = responsibilities.iter()
            .map(|r| r["perDayPrice"].as_f64().unwrap_or(0.0))
            .sum();

        // Fetch employee base salary
        let employee = self.repos.employee.get_employee(school_id, employee_id).await?;
        let base_salary = employee.as_ref()
            .and_then(|e| e["baseSalary"].as_str())
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0);

        Ok(json!({
            "employee": {
                "employeeId": employee_id,
                "responsibilities": responsibilities,
                "totalPerDayPrice": total_per_day_price,
                "baseSalary": base_salary
            }
        }))
    }
}


#[async_trait]
impl TaskService for PostgresAuxiliaryService {
    async fn list_tasks(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.task.get_tasks(school_id).await
    }
}
