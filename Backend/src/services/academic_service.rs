use crate::logic::storage_engine::StorageEngine;
use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct PostgresAcademicService {
    pub repos: Arc<Repositories>,
    pub responsibility: Arc<dyn ResponsibilityService>,
    pub storage: Option<Arc<StorageEngine>>,
}

#[async_trait]
impl AcademicService for PostgresAcademicService {
    async fn create_exam(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value> {
        let res = self.repos.academic.add_exam(school_id, data.clone()).await?;
        let exam_id = res["id"].as_i64().unwrap_or(0).to_string();
        let _ = self.repos.audit.log_action(school_id, admin_id, "EXAM", &exam_id, "CREATE", data).await;
        Ok(res)
    }

    async fn list_exams(&self, school_id: &str, student_id: String) -> AppResult<Vec<Value>> {
        let student_opt = if student_id.is_empty() { None } else { Some(student_id.as_str()) };
        Ok(self.repos.academic.get_exams(school_id, student_opt).await?)
    }

    async fn create_subject(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value> {
        // 1. Create Subject
        let res = self.repos.academic.add_subject(school_id, data.clone()).await?;
        let subject_id = if let Some(id) = res["id"].as_i64() { id.to_string() } else { res["id"].as_str().unwrap_or("0").to_string() };
        
        // 2. Automated Responsibility Creation (Follow User's Strict Validator)
        let subject_name = res["name"].as_str().or(res["subjectName"].as_str()).unwrap_or("Unknown Subject");
        let class_name = res["className"].as_str().unwrap_or("General");
        let class_id = res["classId"].as_str().unwrap_or("");
        
        // Get spaceIds (Room number from class)
        let mut space_ids = Vec::new();
        if !class_id.is_empty() {
             if let Ok(Some(cls)) = self.repos.academic.get_class(school_id, class_id).await {
                 if let Some(room) = cls["roomNumber"].as_str() {
                     if !room.is_empty() {
                         space_ids.push(room.to_string());
                     }
                 }
             }
        }

        let resp_payload = json!({
            "name": format!("{} - {}", subject_name, class_name),
            "description": format!("Teaching {} for {} sections", subject_name, class_name),
            "spaceCategory": "classroom",
            "employeeType": "teaching",
            "workLevel": "senior",
            "workAmount": 0.0,
            "workPeriod": "monthly",
            "spaceIds": space_ids,
            "studentFee": res["subjectFees"].as_f64().or(res["fees"].as_f64()).unwrap_or(0.0)
        });

        // Trigger the strict create_responsibility (it handles validation and audit internally)
        let _ = self.responsibility.create_responsibility(school_id, admin_id, resp_payload).await?;

        let _ = self.repos.audit.log_action(school_id, admin_id, "SUBJECT", &subject_id, "CREATE", data).await;
        Ok(res)
    }

    async fn list_subjects(&self, school_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.academic.get_subjects(school_id).await?)
    }

    async fn create_topic(&self, data: Value) -> AppResult<Value> {
        Ok(self.repos.academic.add_topic(data).await?)
    }

    async fn create_exam_section(&self, school_id: &str, admin_id: &str, exam_id: i32, data: Value) -> AppResult<Value> {
        let res = self.repos.academic.add_exam_section(school_id, exam_id, data.clone()).await?;
        let section_id = res["id"].as_i64().unwrap_or(0).to_string();
        let _ = self.repos.audit.log_action(school_id, admin_id, "EXAM_SECTION", &section_id, "CREATE", data).await;
        Ok(res)
    }

    async fn list_exam_sections(&self, school_id: &str, exam_id: i32) -> AppResult<Vec<Value>> {
        Ok(self.repos.academic.get_exam_sections(school_id, exam_id).await?)
    }

    async fn update_exam_section(&self, school_id: &str, admin_id: &str, section_id: i32, data: Value) -> AppResult<()> {
        self.repos.academic.update_exam_section(school_id, section_id, data.clone()).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "EXAM_SECTION", &section_id.to_string(), "UPDATE", data).await;
        Ok(())
    }

    async fn create_chapter(&self, school_id: &str, admin_id: &str, subject_id: &str, data: Value) -> AppResult<Value> {
        let res = self.repos.academic.add_chapter(school_id, subject_id, data.clone()).await?;
        let chapter_id = res["id"].as_i64().unwrap_or(0).to_string();
        let _ = self.repos.audit.log_action(school_id, admin_id, "CHAPTER", &chapter_id, "CREATE", data).await;
        Ok(res)
    }

    async fn list_chapters(&self, school_id: &str, subject_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.academic.get_chapters(school_id, subject_id).await?)
    }

    async fn update_chapter(&self, school_id: &str, admin_id: &str, chapter_id: i32, data: Value) -> AppResult<()> {
        self.repos.academic.update_chapter(school_id, chapter_id, data.clone()).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "CHAPTER", &chapter_id.to_string(), "UPDATE", data).await;
        Ok(())
    }

    async fn get_auto_syllabus(&self, school_id: &str, subject_id: &str) -> AppResult<Value> {
        let chapters = self.repos.academic.get_chapters(school_id, subject_id).await?;
        let n = chapters.len();
        
        let mut q1 = Vec::new();
        let mut q2 = Vec::new();
        let mut q3 = Vec::new();
        let mut q4 = Vec::new();

        if n == 0 {
            return Ok(json!({
                "Q1": q1,
                "Q2": q2,
                "Q3": q3,
                "Q4": q4,
            }));
        }

        if n < 4 {
            for (idx, ch) in chapters.into_iter().enumerate() {
                match idx {
                    0 => q1.push(ch),
                    1 => q2.push(ch),
                    2 => q3.push(ch),
                    _ => {}
                }
            }
        } else {
            // Find optimal partitioning sequential indices i, j, k
            let mut best_partition = (0, 1, 2);
            let mut min_error = f64::MAX;
            
            // Total weight
            let total_weight: i32 = chapters.iter()
                .map(|c| c["weightage"].as_i64().unwrap_or(1) as i32)
                .sum();
            let target = total_weight as f64 / 4.0;

            for i in 0..n {
                for j in (i+1)..n {
                    for k in (j+1)..n {
                        if k >= n - 1 { continue; }
                        
                        let w1: i32 = chapters[0..=i].iter()
                            .map(|c| c["weightage"].as_i64().unwrap_or(1) as i32)
                            .sum();
                        let w2: i32 = chapters[(i+1)..=j].iter()
                            .map(|c| c["weightage"].as_i64().unwrap_or(1) as i32)
                            .sum();
                        let w3: i32 = chapters[(j+1)..=k].iter()
                            .map(|c| c["weightage"].as_i64().unwrap_or(1) as i32)
                            .sum();
                        let w4: i32 = chapters[(k+1)..].iter()
                            .map(|c| c["weightage"].as_i64().unwrap_or(1) as i32)
                            .sum();

                        let err = (w1 as f64 - target).powi(2) + 
                                  (w2 as f64 - target).powi(2) + 
                                  (w3 as f64 - target).powi(2) + 
                                  (w4 as f64 - target).powi(2);

                        if err < min_error {
                            min_error = err;
                            best_partition = (i, j, k);
                        }
                    }
                }
            }

            let (p1, p2, p3) = best_partition;
            for (idx, ch) in chapters.into_iter().enumerate() {
                if idx <= p1 {
                    q1.push(ch);
                } else if idx <= p2 {
                    q2.push(ch);
                } else if idx <= p3 {
                    q3.push(ch);
                } else {
                    q4.push(ch);
                }
            }
        }

        Ok(json!({
            "Q1": q1,
            "Q2": q2,
            "Q3": q3,
            "Q4": q4,
        }))
    }

    async fn create_teacher_test(&self, school_id: &str, teacher_id: &str, data: Value) -> AppResult<Value> {
        let class_id = data["classId"].as_str()
            .ok_or_else(|| AppError::from("classId is required"))?;
        let subject_id = data["subjectId"].as_str()
            .ok_or_else(|| AppError::from("subjectId is required"))?;
        let name = data["name"].as_str()
            .ok_or_else(|| AppError::from("Test name is required"))?;
        
        // 1. Fetch class details
        let class = self.repos.academic.get_class(school_id, class_id).await?
            .ok_or_else(|| AppError::from(format!("Class '{}' does not exist", class_id)))?;
        let class_name = class["className"].as_str().unwrap_or("General");

        // 2. Fetch subject details
        let subject = self.repos.academic.get_subject(school_id, subject_id).await?
            .ok_or_else(|| AppError::from(format!("Subject '{}' does not exist", subject_id)))?;
        let subject_name = subject["name"].as_str().unwrap_or("Unknown");

        // 3. Verify responsibility mapping (Teacher must be assigned to this class/subject)
        let responsibilities = self.responsibility.get_employee_responsibilities(school_id, teacher_id).await?;
        let expected_name = format!("{} - {}", subject_name, class_name);
        
        let has_responsibility = responsibilities.iter().any(|r| {
            if let Some(r_name) = r["name"].as_str() {
                r_name.trim().eq_ignore_ascii_case(expected_name.trim())
            } else {
                false
            }
        });

        if !has_responsibility {
            return Err(AppError::from(format!("Teacher is not mapped to the responsibility '{}'", expected_name)));
        }

        // 4. Validate syllabus: "Filter available chapters by querying chapters WHERE is_taught = true."
        let syllabus_ids = data["syllabus"].as_array()
            .ok_or_else(|| AppError::from("syllabus array is required"))?;

        let db_chapters = self.repos.academic.get_chapters(school_id, subject_id).await?;
        for sys_ch in syllabus_ids {
            let ch_id_opt = sys_ch.as_i64().or_else(|| sys_ch.as_str().and_then(|s| s.parse::<i64>().ok()));
            let ch_name_opt = sys_ch.as_str();

            let matched_ch = db_chapters.iter().find(|ch| {
                if let Some(id) = ch_id_opt {
                    ch["id"].as_i64() == Some(id)
                } else if let Some(name) = ch_name_opt {
                    ch["name"].as_str().map(|s| s.eq_ignore_ascii_case(name)).unwrap_or(false)
                } else {
                    false
                }
            });

            match matched_ch {
                None => {
                    return Err(AppError::from(format!("Chapter '{:?}' not found in subject", sys_ch)));
                }
                Some(ch) => {
                    let is_taught = ch["isTaught"].as_bool().unwrap_or(false);
                    if !is_taught {
                        return Err(AppError::from(format!(
                            "Chapter '{}' has not been taught yet (is_taught = false) and cannot be included in the test",
                            ch["name"].as_str().unwrap_or("")
                        )));
                    }
                }
            }
        }

        // 5. OMR Rules & Date constraint
        let is_omr = data["isOmr"].as_bool().unwrap_or(false);
        let wants_announcement = data["wantsAnnouncement"].as_bool().unwrap_or(false);

        if is_omr {
            let total_q = data["totalQuestions"].as_i64()
                .ok_or_else(|| AppError::from("totalQuestions is required for OMR tests"))?;
            if total_q % 5 != 0 {
                return Err(AppError::from("OMR tests must have total questions in multiples of 5"));
            }
        }

        if is_omr || wants_announcement {
            let test_date_str = data["testDate"].as_str()
                .ok_or_else(|| AppError::from("testDate is required for OMR/announced tests"))?;
            let test_date = test_date_str.parse::<chrono::NaiveDate>()
                .map_err(|_| AppError::from("Invalid testDate format (expected YYYY-MM-DD)"))?;
            let today = chrono::Utc::now().date_naive();
            
            if (test_date - today).num_days() < 3 {
                return Err(AppError::from("OMR/announced tests must be scheduled at least 3 days in advance"));
            }
        }

        // 6. Create test
        let exam_payload = json!({
            "name": name,
            "quarter": data.get("quarter").cloned().unwrap_or(json!("Q1")),
            "startDate": data.get("testDate").cloned().unwrap_or(json!(chrono::Utc::now().date_naive().to_string())),
            "endDate": data.get("testDate").cloned().unwrap_or(json!(chrono::Utc::now().date_naive().to_string())),
            "status": "SCHEDULED",
            "examType": "TEACHER_TEST"
        });

        let exam_res = self.repos.academic.add_exam(school_id, exam_payload).await?;
        let exam_id = exam_res["id"].as_i64().unwrap_or(0) as i32;

        // Create exam section
        let section_payload = json!({
            "classId": class_id,
            "subjectId": subject_id,
            "syllabus": data["syllabus"],
            "aiGeneratedPaper": data.get("aiGeneratedPaper").cloned().unwrap_or(json!(false)),
            "questions": data.get("questions").cloned().unwrap_or(json!([])),
            "totalMarks": data.get("totalMarks").cloned().unwrap_or(json!(20))
        });

        let section_res = self.repos.academic.add_exam_section(school_id, exam_id, section_payload).await?;

        // 7. Audit log
        let _ = self.repos.audit.log_action(school_id, teacher_id, "TEACHER_TEST", &exam_id.to_string(), "CREATE", data.clone()).await;

        Ok(json!({
            "exam": exam_res,
            "section": section_res
        }))
    }

    // ---- Exam Checker Workflow ----

    async fn assign_exam_checker(&self, school_id: &str, admin_id: &str, exam_id: &str, checker_employee_id: &str) -> AppResult<Value> {
        let res = self.repos.academic.assign_exam_checker(school_id, exam_id, checker_employee_id).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "EXAM_CHECKER", exam_id, "ASSIGN", json!({
            "checkerEmployeeId": checker_employee_id
        })).await;
        Ok(res)
    }

    async fn list_checker_exams(&self, school_id: &str, checker_employee_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.academic.get_checker_exams(school_id, checker_employee_id).await?)
    }

    async fn get_exam_submissions_for_checker(&self, school_id: &str, _checker_id: &str, exam_id: &str, status: Option<&str>) -> AppResult<Vec<Value>> {
        Ok(self.repos.academic.get_exam_submissions(school_id, exam_id, status).await?)
    }

    async fn checker_review_submission(&self, school_id: &str, checker_id: &str, submission_id: &str, data: Value) -> AppResult<Value> {
        let checked_at = chrono::Utc::now().to_rfc3339();
        self.repos.academic.update_submission_checker(school_id, submission_id, checker_id, &checked_at, data.clone()).await?;
        let _ = self.repos.audit.log_action(school_id, checker_id, "SUBMISSION", submission_id, "CHECKER_REVIEW", data.clone()).await;
        Ok(json!({"success": true, "submissionId": submission_id, "status": "checker_reviewed"}))
    }

    async fn teacher_approve_submission(&self, school_id: &str, teacher_id: &str, submission_id: &str, data: Value) -> AppResult<Value> {
        let mut payload = data.clone();
        payload["teacherApproved"] = json!(true);
        self.repos.academic.update_exam_grading_approval(school_id, submission_id, teacher_id, payload).await?;
        let _ = self.repos.audit.log_action(school_id, teacher_id, "SUBMISSION", submission_id, "APPROVE", json!({})).await;

        // Auto-delete scanned page images after teacher approval
        if let Some(ref storage) = self.storage {
            let sid = uuid::Uuid::parse_str(submission_id).ok();
            if let Some(sid) = sid {
                let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
                let pages: Vec<String> = sqlx::query_scalar(
                    "SELECT image_url FROM exam_submission_pages WHERE school_id = $1 AND submission_id = $2::uuid AND is_permanent = FALSE"
                )
                .bind(school_id).bind(sid)
                .fetch_all(&mut *conn)
                .await
                .unwrap_or_default();
                for url in &pages {
                    if let Some(relative_path) = url.strip_prefix("/uploads/") {
                        let _ = storage.delete_file(relative_path).await;
                    }
                }
                if !pages.is_empty() {
                    let _ = sqlx::query("DELETE FROM exam_submission_pages WHERE school_id = $1 AND submission_id = $2::uuid AND is_permanent = FALSE")
                        .bind(school_id).bind(sid)
                        .execute(&mut *conn)
                        .await;
                }
            }
        }

        Ok(json!({"success": true, "submissionId": submission_id, "status": "approved"}))
    }

    async fn teacher_reject_submission(&self, school_id: &str, teacher_id: &str, submission_id: &str, data: Value) -> AppResult<Value> {
        let mut payload = data.clone();
        payload["teacherApproved"] = json!(false);
        self.repos.academic.update_exam_grading_approval(school_id, submission_id, teacher_id, payload).await?;
        let _ = self.repos.audit.log_action(school_id, teacher_id, "SUBMISSION", submission_id, "REJECT", data.clone()).await;
        Ok(json!({"success": true, "submissionId": submission_id, "status": "rejected"}))
    }

    async fn publish_exam_results(&self, school_id: &str, admin_id: &str, exam_id: &str) -> AppResult<Value> {
        let res = self.repos.academic.publish_exam_results(school_id, exam_id, admin_id).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "EXAM", exam_id, "PUBLISH_RESULTS", json!({})).await;
        Ok(res)
    }
}
