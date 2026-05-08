use crate::repository::Repositories;
use crate::services::traits::*;
use serde_json::{json, Value};
use std::sync::Arc;
use sqlx::Row;

pub struct ResponsibilityBulkOperations {
    pub repos: Arc<Repositories>,
}

impl ResponsibilityBulkOperations {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn bulk_update_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
        admin_id: &str,
        updates: Vec<(String, Vec<String>)>,
    ) -> AppResult<usize> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        let mut count = 0;
        let updates_for_log = updates.clone();

        for (employee_id, space_ids) in updates.iter() {
            // Verify employee exists
            let emp_exists = self.repos.employee.get_employee(school_id, employee_id).await?;
            if emp_exists.is_none() {
                continue;
            }

            // Verify responsibility exists
            let resp_exists = self.repos.responsibility.get_responsibility(school_id, responsibility_id).await?;
            if resp_exists.is_none() {
                continue;
            }

            // Verify spaces exist
            for sid in space_ids {
                let space_exists = self.repos.resource.get_space_details(school_id, sid).await?;
                if space_exists.is_none() {
                    return Err(AppError::from(format!("Space ID '{}' does not exist", sid)));
                }
            }

            // Update employee_responsibility
            sqlx::query(
                "UPDATE employee_responsibilities
                 SET space_ids = $1, updated_at = NOW()
                 WHERE school_id = $2 AND responsibility_id = $3 AND employee_id = $4"
            )
            .bind(space_ids)
            .bind(school_id)
            .bind(responsibility_id)
            .bind(employee_id)
            .execute(&mut *conn)
            .await?;

            count += 1;
        }

        // Log bulk update action
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "RESPONSIBILITY_BULK_UPDATE",
            responsibility_id,
            "BULK_UPDATE",
            json!({
                "count": count,
                "updates": updates_for_log
            })
        ).await;

        Ok(count)
    }

    pub async fn bulk_assign_responsibilities(
        &self,
        school_id: &str,
        admin_id: &str,
        assignments: Vec<(String, String, Vec<String>)>, // (employee_id, responsibility_id, space_ids)
    ) -> AppResult<usize> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        let mut count = 0;
        let assignments_for_log = assignments.clone();

        for (employee_id, responsibility_id, space_ids) in assignments.iter() {
            // Verify employee exists
            let emp_exists = self.repos.employee.get_employee(school_id, employee_id).await?;
            if emp_exists.is_none() {
                continue;
            }

            // Verify responsibility exists
            let resp_exists = self.repos.responsibility.get_responsibility(school_id, responsibility_id).await?;
            if resp_exists.is_none() {
                continue;
            }

            // Verify spaces exist
            for sid in space_ids {
                let space_exists = self.repos.resource.get_space_details(school_id, sid).await?;
                if space_exists.is_none() {
                    return Err(AppError::from(format!("Space ID '{}' does not exist", sid)));
                }
            }

            // Check for duplicate assignment
            let existing_assignments = self.repos.responsibility.get_employee_responsibilities(school_id, employee_id).await?;
            let already_assigned = existing_assignments.iter().any(|a|
                a["responsibilityId"].as_str() == Some(responsibility_id)
            );
            
            if already_assigned {
                continue;
            }

            // Create employee_responsibility
            sqlx::query(
                "INSERT INTO employee_responsibilities
                 (school_id, employee_id, responsibility_id, space_ids, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, NOW(), NOW())"
            )
            .bind(school_id)
            .bind(employee_id)
            .bind(responsibility_id)
            .bind(space_ids)
            .execute(&mut *conn)
            .await?;

            count += 1;
        }

        // Log bulk assign action
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "RESPONSIBILITY_BULK_ASSIGN",
            "bulk",
            "BULK_ASSIGN",
            json!({
                "count": count,
                "assignments": assignments_for_log
            })
        ).await;

        Ok(count)
    }

    pub async fn bulk_remove_responsibilities(
        &self,
        school_id: &str,
        admin_id: &str,
        removals: Vec<(String, String)>, // (employee_id, responsibility_id)
    ) -> AppResult<usize> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        let mut count = 0;
        let removals_for_log = removals.clone();

        for (employee_id, responsibility_id) in removals.iter() {
            // Delete employee_responsibility
            let result = sqlx::query(
                "DELETE FROM employee_responsibilities
                 WHERE school_id = $1 AND employee_id = $2 AND responsibility_id = $3"
            )
            .bind(school_id)
            .bind(employee_id)
            .bind(responsibility_id)
            .execute(&mut *conn)
            .await?;

            if result.rows_affected() > 0 {
                count += 1;
            }
        }

        // Log bulk remove action
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "RESPONSIBILITY_BULK_REMOVE",
            "bulk",
            "BULK_REMOVE",
            json!({
                "count": count,
                "removals": removals_for_log
            })
        ).await;

        Ok(count)
    }
}
