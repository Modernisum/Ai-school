use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{Pool, Postgres, Row};
use std::collections::{HashMap, HashSet};

/// Represents a single teaching assignment requirement
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubjectRequirement {
    pub subject_id: String,
    pub subject_name: String,
    pub teacher_id: String,
    pub teacher_name: String,
    pub periods_per_week: usize,
    /// Preferred room type: "classroom", "lab", "hall"
    pub room_type: String,
}

/// A single timetable slot that has been assigned
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimetableSlot {
    pub day: usize,    // 1 = Monday
    pub period: usize, // 1-based period number
    pub subject_id: String,
    pub subject_name: String,
    pub teacher_id: String,
    pub teacher_name: String,
    pub room_id: String,
    pub is_free_period: bool,
}

/// Optimization metrics for a timetable
#[derive(Debug, Serialize)]
pub struct OptimizationMetrics {
    pub total_slots: usize,
    pub assigned_slots: usize,
    pub free_slots: usize,
    pub teacher_utilization: HashMap<String, f64>,
    pub room_utilization: HashMap<String, f64>,
    pub conflicts_detected: usize,
}

pub struct TimetableOptimizer {
    pool: Pool<Postgres>,
}

impl TimetableOptimizer {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }

    /// Analyzes an existing timetable and provides optimization metrics
    pub async fn analyze_timetable(
        &self,
        school_id: &str,
        config_id: &str,
    ) -> Result<OptimizationMetrics, sqlx::Error> {
        let slot_rows = sqlx::query(
            "SELECT day_of_week, period_number, subject_id, teacher_id, room_id, is_free_period
             FROM timetable_slots WHERE school_id = $1 AND config_id = $2
             ORDER BY day_of_week, period_number",
        )
        .bind(school_id)
        .bind(config_id)
        .fetch_all(&self.pool)
        .await?;

        let total_slots = slot_rows.len();
        let mut assigned_slots = 0;
        let mut free_slots = 0;
        let mut teacher_usage: HashMap<String, usize> = HashMap::new();
        let mut room_usage: HashMap<String, usize> = HashMap::new();

        for row in slot_rows {
            let is_free = row.get::<bool, _>("is_free_period");
            if is_free {
                free_slots += 1;
            } else {
                assigned_slots += 1;
                let teacher_id = row.get::<String, _>("teacher_id");
                let room_id = row.get::<String, _>("room_id");
                
                *teacher_usage.entry(teacher_id.clone()).or_insert(0) += 1;
                *room_usage.entry(room_id.clone()).or_insert(0) += 1;
            }
        }

        // Calculate utilization percentages
        let mut teacher_utilization: HashMap<String, f64> = HashMap::new();
        let mut room_utilization: HashMap<String, f64> = HashMap::new();

        // Get teacher availability data
        let avail_rows = sqlx::query(
            "SELECT teacher_id, COUNT(*) as available_periods 
             FROM teacher_availability WHERE school_id = $1 AND is_available = true",
        )
        .bind(school_id)
        .fetch_all(&self.pool)
        .await?;

        for row in avail_rows {
            let tid: String = row.get("teacher_id");
            let available: i64 = row.get("available_periods");
            let used = teacher_usage.get(&tid).copied().unwrap_or(0);
            let utilization = if available > 0 {
                (used as f64 / available as f64) * 100.0
            } else {
                0.0
            };
            teacher_utilization.insert(tid, utilization);
        }

        // Get room capacity data
        let room_rows = sqlx::query(
            "SELECT room_id, room_type, capacity FROM timetable_rooms WHERE school_id = $1",
        )
        .bind(school_id)
        .fetch_all(&self.pool)
        .await?;

        for row in room_rows {
            let rid: String = row.get("room_id");
            let capacity: Option<i64> = row.get("capacity");
            let used = room_usage.get(&rid).copied().unwrap_or(0);
            let utilization = match capacity {
                Some(cap) if cap > 0 => (used as f64 / cap as f64) * 100.0,
                _ => 0.0,
            };
            room_utilization.insert(rid, utilization);
        }

        // Count conflicts
        let conflict_rows = sqlx::query(
            "SELECT COUNT(*) as conflict_count 
             FROM timetable_conflicts WHERE school_id = $1 AND config_id = $2",
        )
        .bind(school_id)
        .bind(config_id)
        .fetch_one(&self.pool)
        .await?;

        let conflicts_detected = conflict_rows.get::<i64, _>("conflict_count") as usize;

        Ok(OptimizationMetrics {
            total_slots,
            assigned_slots,
            free_slots,
            teacher_utilization,
            room_utilization,
            conflicts_detected,
        })
    }

    /// Suggests optimizations based on analysis
    pub fn suggest_optimizations(&self, metrics: &OptimizationMetrics) -> Vec<String> {
        let mut suggestions = Vec::new();

        // Check for underutilized teachers
        for (teacher_id, utilization) in &metrics.teacher_utilization {
            if *utilization < 50.0 {
                suggestions.push(format!(
                    "Teacher {} is underutilized ({}% utilization). Consider consolidating classes.",
                    teacher_id, utilization
                ));
            }
        }

        // Check for overutilized teachers
        for (teacher_id, utilization) in &metrics.teacher_utilization {
            if *utilization > 90.0 {
                suggestions.push(format!(
                    "Teacher {} is overutilized ({}% utilization). Consider reducing workload.",
                    teacher_id, utilization
                ));
            }
        }

        // Check for underutilized rooms
        for (room_id, utilization) in &metrics.room_utilization {
            if *utilization < 50.0 {
                suggestions.push(format!(
                    "Room {} is underutilized ({}% utilization). Consider sharing with other classes.",
                    room_id, utilization
                ));
            }
        }

        // Check for conflicts
        if metrics.conflicts_detected > 0 {
            suggestions.push(format!(
                "Found {} scheduling conflicts. Consider reviewing teacher availability and room assignments.",
                metrics.conflicts_detected
            ));
        }

        // Check for excessive free slots
        let free_ratio = if metrics.total_slots > 0 {
            (metrics.free_slots as f64 / metrics.total_slots as f64) * 100.0
        } else {
            0.0
        };

        if free_ratio > 30.0 {
            suggestions.push(format!(
                "High number of free slots ({}% of total). Consider reducing working days or consolidating classes.",
                free_ratio
            ));
        }

        suggestions
    }

    /// Finds available teachers for a specific period to act as substitutes (proxies).
    /// Rank them by subject relevance if possible.
    pub async fn find_available_substitutes(
        &self,
        school_id: &str,
        day: usize,
        period: usize,
        subject_id: Option<&str>,
    ) -> Result<Vec<Value>, sqlx::Error> {
        // 1. Get all teachers who ARE NOT assigned to any class in this (day, period)
        // This is done by looking at timetable_slots for the current school's LATEST config
        let busy_teachers = sqlx::query(
            "SELECT DISTINCT teacher_id FROM timetable_slots 
             WHERE school_id = $1 AND day_of_week = $2 AND period_number = $3 AND is_free_period = false"
        )
        .bind(school_id)
        .bind(day as i32)
        .bind(period as i32)
        .fetch_all(&self.pool)
        .await?;

        let busy_ids: HashSet<String> = busy_teachers.iter().map(|r| r.get::<String, _>("teacher_id")).collect();

        // 2. Get all employees of type 'teacher' or 'staff'
        let all_teachers = sqlx::query(
            "SELECT employee_id, data->>'name' as name, data->>'subject' as subject FROM employees 
             WHERE school_id = $1 AND (employee_type = 'teacher' OR employee_type = 'staff')"
        )
        .bind(school_id)
        .fetch_all(&self.pool)
        .await?;

        // 3. Filter out busy ones and rank
        let mut candidates = Vec::new();
        for row in all_teachers {
            let eid: String = row.get("employee_id");
            if busy_ids.contains(&eid) {
                continue;
            }

            let name: String = row.get::<Option<String>, _>("name").unwrap_or_else(|| eid.clone());
            let teacher_subject: String = row.get::<Option<String>, _>("subject").unwrap_or_default().to_lowercase();

            let mut score = 0;
            if let Some(target_sub) = subject_id {
                if teacher_subject.contains(&target_sub.to_lowercase()) {
                    score = 100;
                }
            }

            candidates.push(json!({
                "employee_id": eid,
                "name": name,
                "subject": teacher_subject,
                "score": score
            }));
        }

        // Sort by score descending
        candidates.sort_by(|a, b| b["score"].as_i64().unwrap_or(0).cmp(&a["score"].as_i64().unwrap_or(0)));

        Ok(candidates)
    }
}
