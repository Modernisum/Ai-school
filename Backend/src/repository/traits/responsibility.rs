use async_trait::async_trait;
use serde_json::Value;
  
use super::{AppError, JsonList};

/// Repository trait for responsibility data operations
///
/// This trait defines all database operations for the responsibility system,
/// including CRUD operations, assignments, analytics, and paginated queries.
#[async_trait]
pub trait ResponsibilityRepository: Send + Sync {
    /// Get all responsibilities for a school, optionally filtered by employee type
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `employee_type` - Optional filter for employee type (e.g., "teacher", "staff")
    ///
    /// # Returns
    /// A list of responsibility records as JSON
    async fn get_responsibilities(&self, school_id: &str, employee_type: Option<String>) -> Result<JsonList, AppError>;

    /// Get paginated responsibilities for a school with metadata
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `employee_type` - Optional filter for employee type
    /// * `page` - Page number (1-indexed)
    /// * `limit` - Number of items per page
    ///
    /// # Returns
    /// JSON object containing `data` array and `pagination` metadata
    async fn get_responsibilities_paginated(
        &self,
        school_id: &str,
        employee_type: Option<String>,
        page: i32,
        limit: i32,
    ) -> Result<Value, AppError>;

    /// Create a new responsibility definition
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `data` - Responsibility data including name, description, pricing, etc.
    ///
    /// # Returns
    /// The created responsibility record with generated ID
    async fn add_responsibility(&self, school_id: &str, data: Value) -> Result<Value, AppError>;

    /// Assign multiple employees to a responsibility with specific spaces
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `responsibility_id` - The responsibility to assign
    /// * `assignments` - Vector of (employee_id, space_ids) pairs
    async fn assign_employees_with_spaces(
        &self,
        school_id: &str,
        responsibility_id: &str,
        assignments: Vec<(String, Vec<String>)>,
    ) -> Result<(), AppError>;

    /// Assign a single employee to a responsibility
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `employee_id` - The employee to assign
    /// * `responsibility_id` - The responsibility to assign
    async fn assign_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), AppError>;

    /// Bulk assign responsibilities to multiple employees
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `employee_ids` - List of employee IDs
    /// * `responsibility_ids` - List of responsibility IDs
    /// * `space_ids` - List of space IDs (parallel to assignments)
    async fn bulk_assign_responsibilities(
        &self,
        school_id: &str,
        employee_ids: Vec<String>,
        responsibility_ids: Vec<String>,
        space_ids: Vec<String>,
    ) -> Result<(), AppError>;

    /// Calculate total student fees for a specific space
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `space_id` - The space identifier
    ///
    /// # Returns
    /// Sum of student fees for the space
    async fn get_student_fee_sum_for_space(&self, school_id: &str, space_id: &str) -> Result<f64, AppError>;

    /// Get analytics data for a specific responsibility
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `responsibility_id` - The responsibility identifier
    ///
    /// # Returns
    /// JSON object with analytics metrics (assignments, revenue, utilization, etc.)
    async fn get_responsibility_analytics(&self, school_id: &str, responsibility_id: &str) -> Result<Value, AppError>;

    /// Get all responsibilities assigned to a student
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `student_id` - The student identifier
    ///
    /// # Returns
    /// List of responsibility assignments for the student
    async fn get_student_responsibilities(&self, school_id: &str, student_id: &str) -> Result<Vec<Value>, AppError>;

    /// Get paginated responsibilities assigned to a student
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `student_id` - The student identifier
    /// * `page` - Page number (1-indexed)
    /// * `limit` - Number of items per page
    ///
    /// # Returns
    /// JSON object containing `data` array and `pagination` metadata
    async fn get_student_responsibilities_paginated(
        &self,
        school_id: &str,
        student_id: &str,
        page: i32,
        limit: i32,
    ) -> Result<Value, AppError>;

    /// Get a specific responsibility by ID
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `responsibility_id` - The responsibility identifier
    ///
    /// # Returns
    /// Optional responsibility record if found
    async fn get_responsibility(&self, school_id: &str, responsibility_id: &str) -> Result<Option<Value>, AppError>;

    /// Get a responsibility by name
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `name` - The responsibility name
    ///
    /// # Returns
    /// Optional responsibility record if found
    async fn get_responsibility_by_name(&self, school_id: &str, name: &str) -> Result<Option<Value>, AppError>;

    /// Update an existing responsibility
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `responsibility_id` - The responsibility identifier
    /// * `data` - Updated responsibility data
    async fn update_responsibility(&self, school_id: &str, responsibility_id: &str, data: Value) -> Result<(), AppError>;

    /// Remove a responsibility assignment from an employee
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `employee_id` - The employee identifier
    /// * `responsibility_id` - The responsibility identifier
    async fn remove_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), AppError>;

    /// Delete a responsibility definition
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `responsibility_id` - The responsibility identifier
    async fn delete_responsibility(&self, school_id: &str, responsibility_id: &str) -> Result<(), AppError>;

    /// Get all responsibilities assigned to an employee
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `employee_id` - The employee identifier
    ///
    /// # Returns
    /// List of responsibility assignments for the employee
    async fn get_employee_responsibilities(&self, school_id: &str, employee_id: &str) -> Result<JsonList, AppError>;

    /// Get paginated responsibilities assigned to an employee
    ///
    /// # Arguments
    /// * `school_id` - The school identifier
    /// * `employee_id` - The employee identifier
    /// * `page` - Page number (1-indexed)
    /// * `limit` - Number of items per page
    ///
    /// # Returns
    /// JSON object containing `data` array and `pagination` metadata
    async fn get_employee_responsibilities_paginated(
        &self,
        school_id: &str,
        employee_id: &str,
        page: i32,
        limit: i32,
    ) -> Result<Value, AppError>;
}
