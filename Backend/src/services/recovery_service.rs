use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct PostgresRecoveryService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl RecoveryService for PostgresRecoveryService {
    async fn list_student_history(&self, school_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.student.get_all_student_history(school_id).await?)
    }

    async fn undo_student_change(&self, school_id: &str, history_id: i32) -> AppResult<()> {
        let entry = self.repos.student.get_history_by_id(school_id, history_id).await?
            .ok_or_else(|| AppError::NotFound("History entry not found".to_string()))?;

        let student_id = entry["studentId"].as_str().ok_or_else(|| AppError::Validation("Missing studentId".to_string()))?;
        let snapshot = entry["snapshot"].clone();

        let exists = self.repos.student.get_student(school_id, student_id).await?.is_some();

        if exists {
            self.repos.student.update_student(school_id, student_id, snapshot).await?;
        } else {
            self.repos.student.add_student(school_id, snapshot).await?;
        }
        
        Ok(())
    }

    async fn list_audit_logs(&self, school_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.audit.get_logs(school_id, None, 100).await?) // Default limit 100
    }

    async fn undo_audit_log(&self, school_id: &str, log_id: i32) -> AppResult<()> {
        let log = self.repos.audit.get_log_by_id(school_id, log_id).await?
            .ok_or_else(|| AppError::NotFound("Audit log not found".to_string()))?;

        let entity_type = log["entityType"].as_str().unwrap_or("").to_uppercase();
        let entity_id = log["entityId"].as_str().unwrap_or("");
        let action_type = log["actionType"].as_str().unwrap_or("").to_uppercase();
        let changed_data = &log["changedData"];

        match (entity_type.as_str(), action_type.as_str()) {
            ("STUDENT", "CREATE" | "CREATE_BULK") => {
                self.repos.student.delete_student(school_id, entity_id).await?;
            }
            ("STUDENT", "DELETE") => {
                self.repos.student.add_student(school_id, changed_data.clone()).await?;
            }
            ("STUDENT", "UPDATE") => {
                let mut rollback = json!({});
                if let Some(delta_obj) = changed_data.as_object() {
                    for (key, val) in delta_obj {
                        if let Some(old_val) = val.get("old") {
                            rollback[key] = old_val.clone();
                        }
                    }
                }
                if !rollback.as_object().unwrap().is_empty() {
                    self.repos.student.update_student(school_id, entity_id, rollback).await?;
                }
            }
            ("EMPLOYEE", "CREATE" | "CREATE_BULK") => {
                self.repos.employee.delete_employee(school_id, entity_id).await?;
            }
            ("EMPLOYEE", "DELETE") => {
                self.repos.employee.add_employee(school_id, changed_data.clone()).await?;
            }
            ("EMPLOYEE", "UPDATE") => {
                let mut rollback = json!({});
                if let Some(delta_obj) = changed_data.as_object() {
                    for (key, val) in delta_obj {
                        if let Some(old_val) = val.get("old") {
                            rollback[key] = old_val.clone();
                        }
                    }
                }
                if !rollback.as_object().unwrap().is_empty() {
                    self.repos.employee.update_employee(school_id, entity_id, rollback).await?;
                }
            }
            ("ANNOUNCEMENT", "CREATE") => {
                let id = entity_id.parse::<i32>().map_err(|_| AppError::Validation("Invalid ID".into()))?;
                self.repos.resource.delete_announcement(school_id, id).await?;
            }
            ("MATERIAL", "CREATE") => {
                self.repos.resource.delete_material(school_id, entity_id).await?;
            }
            ("EVENT", "CREATE") => {
                let id = entity_id.parse::<i32>().map_err(|_| AppError::Validation("Invalid ID".into()))?;
                self.repos.resource.delete_event(school_id, id).await?;
            }
            ("SPACE", "CREATE") => {
                self.repos.resource.delete_space(school_id, entity_id).await?;
            }
            ("LEAVE", "CREATE") => {
                self.repos.leave.delete_leave_application(school_id, entity_id).await?;
            }
            ("AWARD", "CREATE") => {
                let id = entity_id.parse::<i32>().map_err(|_| AppError::Validation("Invalid ID".into()))?;
                self.repos.award.delete_award(school_id, id).await?;
            }
            ("COMPLAIN", "CREATE") => {
                let id = entity_id.parse::<i32>().map_err(|_| AppError::Validation("Invalid ID".into()))?;
                self.repos.complain.delete_complain(school_id, id).await?;
            }
            ("REMINDER", "CREATE") => {
                let id = entity_id.parse::<i32>().map_err(|_| AppError::Validation("Invalid ID".into()))?;
                self.repos.reminder.delete_reminder(school_id, id).await?;
            }
            ("DOCUMENT", "CREATE") => {
                let id = entity_id.parse::<i32>().map_err(|_| AppError::Validation("Invalid ID".into()))?;
                self.repos.document_box.delete_document(school_id, id).await?;
            }
            _ => {
                match action_type.as_str() {
                    "DELETE" => {
                        match entity_type.as_str() {
                            "SPACE" => {
                                let category = changed_data["spaceCategory"].as_str().unwrap_or("General");
                                let name = changed_data["spaceName"].as_str().unwrap_or("Restored Space");
                                self.repos.resource.create_space(school_id, category, name.to_string()).await?;
                            },
                            "LEAVE" => { self.repos.leave.add_leave(school_id, changed_data.clone()).await?; },
                            "AWARD" => { self.repos.award.add_award(school_id, changed_data.clone()).await?; },
                            "COMPLAIN" => { self.repos.complain.add_complain(school_id, changed_data.clone()).await?; },
                            "REMINDER" => { self.repos.reminder.add_reminder(school_id, changed_data.clone()).await?; },
                            "DOCUMENT" => { self.repos.document_box.add_document(school_id, changed_data.clone()).await?; },
                            "CLASS" => { self.repos.academic.add_class(school_id, changed_data.clone()).await?; },
                            "SUBJECT" => { self.repos.academic.add_subject(school_id, changed_data.clone()).await?; },
                            "EXAM" => { self.repos.academic.add_exam(school_id, changed_data.clone()).await?; },
                            "ANNOUNCEMENT" => { self.repos.resource.add_announcement(school_id, "all", "admin", changed_data.clone()).await?; },
                            "MATERIAL" => { self.repos.resource.add_material(school_id, changed_data.clone()).await?; },
                            "EVENT" => { self.repos.resource.add_event_summary(school_id, changed_data.clone()).await?; },
                            "STUDENT" => { self.repos.student.add_student(school_id, changed_data.clone()).await?; },
                            "EMPLOYEE" => { self.repos.employee.add_employee(school_id, changed_data.clone()).await?; },
                            _ => return Err(AppError::Internal(format!("Undo DELETE for {} is not yet implemented", entity_type))),
                        }
                    }
                    "UPDATE" => {
                        let mut rollback = json!({});
                        if let Some(delta_obj) = changed_data.as_object() {
                            for (key, val) in delta_obj {
                                if let Some(old_val) = val.get("old") {
                                    rollback[key] = old_val.clone();
                                }
                            }
                        }
                        if !rollback.as_object().unwrap().is_empty() {
                            match entity_type.as_str() {
                                "SPACE" => self.repos.resource.update_space(school_id, entity_id, rollback).await?,
                                "MATERIAL" => self.repos.resource.update_material(school_id, "SYSTEM_RECOVERY", entity_id, rollback).await?,
                                "LEAVE" => {
                                   if let Some(status) = rollback["status"].as_str() {
                                       self.repos.leave.update_leave_status(school_id, entity_id, status).await?;
                                   }
                                },
                                "STUDENT" => { self.repos.student.update_student(school_id, entity_id, rollback).await?; },
                                "EMPLOYEE" => { self.repos.employee.update_employee(school_id, entity_id, rollback).await?; },
                                "CLASS" => self.repos.academic.update_class(school_id, entity_id, rollback).await?,
                                "SUBJECT" => self.repos.academic.update_subject(school_id, entity_id, rollback).await?,
                                "EXAM" => self.repos.academic.update_exam(school_id, entity_id, rollback).await?,
                                _ => return Err(AppError::Internal(format!("Undo UPDATE for {} is not yet implemented", entity_type))),
                            }
                        }
                    }
                    _ => return Err(AppError::Internal(format!("Undo for {} {} is not yet implemented", entity_type, action_type))),
                }
            }
        }
        
        Ok(())
    }
}
