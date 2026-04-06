use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{Pool, Postgres, Row};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

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

/// The generated result for a class
#[derive(Debug, Serialize, Deserialize)]
pub struct GeneratedTimetable {
    pub config_id: String,
    pub class_id: String,
    pub class_name: String,
    pub status: String,
    pub season: Option<String>,
    pub start_time: Option<chrono::NaiveTime>,
    pub end_time: Option<chrono::NaiveTime>,
    pub period_duration_minutes: i32,
    pub break_duration_minutes: i32,
    /// slots[day][period] = TimetableSlot
    pub slots: Vec<TimetableSlot>,
    pub conflicts: Vec<String>,
}

pub struct TimetableEngine {
    pool: Pool<Postgres>,
}

impl TimetableEngine {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }

    /// Main entry point: generates a timetable for a class based on constraints.
    /// Returns the generated timetable and saves it to the database.
    pub async fn generate_timetable(
        &self,
        school_id: &str,
        class_id: &str,
        class_name: &str,
        periods_per_day: usize,
        working_days: Vec<usize>,
        requirements: Vec<SubjectRequirement>,
        season: Option<String>,
        start_time: Option<chrono::NaiveTime>,
        end_time: Option<chrono::NaiveTime>,
        period_duration: i32,
        break_duration: i32,
    ) -> Result<GeneratedTimetable, sqlx::Error> {
        let config_id = Uuid::new_v4().to_string();
        let mut conflicts = Vec::new();

        // --- Step 1: Load teacher availability from DB ---
        let avail_rows = sqlx::query(
            "SELECT teacher_id, day_of_week, period_number, is_available 
             FROM teacher_availability WHERE school_id = $1",
        )
        .bind(school_id)
        .fetch_all(&self.pool)
        .await?;

        // teacher_busy[teacher_id][(day, period)] = true if NOT available
        let mut teacher_busy: HashMap<String, HashSet<(usize, usize)>> = HashMap::new();
        for row in avail_rows {
            let tid: String = row.get("teacher_id");
            let day: i32 = row.get("day_of_week");
            let period: i32 = row.get("period_number");
            let is_avail: bool = row.get("is_available");
            if !is_avail {
                teacher_busy
                    .entry(tid)
                    .or_default()
                    .insert((day as usize, period as usize));
            }
        }

        // --- Step 2: Load available rooms ---
        let room_rows = sqlx::query(
            "SELECT room_id, room_name, room_type FROM timetable_rooms WHERE school_id = $1",
        )
        .bind(school_id)
        .fetch_all(&self.pool)
        .await?;

        // rooms_by_type[room_type] = [(room_id, room_name)]
        let mut rooms_by_type: HashMap<String, Vec<(String, String)>> = HashMap::new();
        for row in room_rows {
            let rid: String = row.get("room_id");
            let rname: String = row.get("room_name");
            let rtype: String = row.get("room_type");
            rooms_by_type.entry(rtype).or_default().push((rid, rname));
        }

        // room_busy[(room_id)] = set of (day, period)
        let mut room_busy: HashMap<String, HashSet<(usize, usize)>> = HashMap::new();

        // --- Step 3: Constraint-Satisfaction Scheduling ---
        // We expand requirements into a flat list of (req, count) then try to assign each
        let mut pending: Vec<SubjectRequirement> = Vec::new();
        for req in &requirements {
            for _ in 0..req.periods_per_week {
                pending.push(req.clone());
            }
        }

        let mut assigned_slots: Vec<TimetableSlot> = Vec::new();
        // Track (teacher_id, day, period) already used in this schedule run
        let mut teacher_used_this_run: HashSet<(String, usize, usize)> = HashSet::new();

        for req in pending.drain(..) {
            let mut assigned = false;
            // Try each day/period in order (simple greedy CSP)
            'slot_search: for &day in &working_days {
                for period in 1..=periods_per_day {
                    // Check teacher not busy via DB availability
                    let teacher_blocked = teacher_busy
                        .get(&req.teacher_id)
                        .map(|s| s.contains(&(day, period)))
                        .unwrap_or(false);

                    // Check teacher not double booked in this run
                    let teacher_used =
                        teacher_used_this_run.contains(&(req.teacher_id.clone(), day, period));

                    // Check this slot not already assigned for this class
                    let slot_taken = assigned_slots
                        .iter()
                        .any(|s| s.day == day && s.period == period);

                    if teacher_blocked || teacher_used || slot_taken {
                        continue;
                    }

                    // Assign a room of the required type
                    let room_type = req.room_type.as_str();
                    let available_room = rooms_by_type
                        .get(room_type)
                        .or_else(|| rooms_by_type.get("classroom"))
                        .and_then(|rooms| {
                            rooms.iter().find(|(rid, _)| {
                                !room_busy
                                    .get(rid)
                                    .map(|s| s.contains(&(day, period)))
                                    .unwrap_or(false)
                            })
                        })
                        .map(|(rid, rname)| (rid.clone(), rname.clone()));

                    let (room_id, _room_name) = match available_room {
                        Some(r) => r,
                        None => {
                            // No room available, use a fallback virtual room
                            ("virtual".to_string(), "Virtual Room".to_string())
                        }
                    };

                    // Mark teacher and room as used
                    teacher_used_this_run.insert((req.teacher_id.clone(), day, period));
                    room_busy
                        .entry(room_id.clone())
                        .or_default()
                        .insert((day, period));

                    assigned_slots.push(TimetableSlot {
                        day,
                        period,
                        subject_id: req.subject_id.clone(),
                        subject_name: req.subject_name.clone(),
                        teacher_id: req.teacher_id.clone(),
                        teacher_name: req.teacher_name.clone(),
                        room_id: room_id.clone(),
                        is_free_period: false,
                    });
                    assigned = true;
                    break 'slot_search;
                }
            }

            if !assigned {
                conflicts.push(format!(
                    "Could not schedule '{}' for teacher '{}': no available slot found",
                    req.subject_name, req.teacher_name
                ));
            }
        }

        // --- Step 4: Fill remaining slots as free periods ---
        for &day in &working_days {
            for period in 1..=periods_per_day {
                let slot_filled = assigned_slots
                    .iter()
                    .any(|s| s.day == day && s.period == period);
                if !slot_filled {
                    assigned_slots.push(TimetableSlot {
                        day,
                        period,
                        subject_id: "".to_string(),
                        subject_name: "Free".to_string(),
                        teacher_id: "".to_string(),
                        teacher_name: "".to_string(),
                        room_id: "".to_string(),
                        is_free_period: true,
                    });
                }
            }
        }

        // Sort slots by day then period for clean output
        assigned_slots.sort_by(|a, b| a.day.cmp(&b.day).then(a.period.cmp(&b.period)));

        // --- Step 5: Persist to database ---
        self.save_timetable(
            school_id,
            &config_id,
            class_id,
            class_name,
            &assigned_slots,
            &conflicts,
            "PROPOSAL", // Default to proposal as per plan
            season.clone(),
            start_time,
            end_time,
            period_duration,
            break_duration,
        )
        .await?;

        Ok(GeneratedTimetable {
            config_id,
            class_id: class_id.to_string(),
            class_name: class_name.to_string(),
            status: "PROPOSAL".to_string(),
            season,
            start_time,
            end_time,
            period_duration_minutes: period_duration,
            break_duration_minutes: break_duration,
            slots: assigned_slots,
            conflicts,
        })
    }

    pub async fn save_timetable(
        &self,
        school_id: &str,
        config_id: &str,
        class_id: &str,
        class_name: &str,
        slots: &[TimetableSlot],
        conflicts: &[String],
        status: &str,
        season: Option<String>,
        start_time: Option<chrono::NaiveTime>,
        end_time: Option<chrono::NaiveTime>,
        period_duration: i32,
        break_duration: i32,
    ) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        // 1. Create the configuration record
        sqlx::query(
            "INSERT INTO timetable_configs 
             (school_id, config_id, class_id, class_name, periods_per_day, status, season, start_time, end_time, period_duration_minutes, break_duration_minutes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)"
        )
        .bind(school_id)
        .bind(config_id)
        .bind(class_id)
        .bind(class_name)
        .bind(slots.len() as i32 / 5) // Rough estimate or pass periods_per_day
        .bind(status)
        .bind(season)
        .bind(start_time)
        .bind(end_time)
        .bind(period_duration)
        .bind(break_duration)
        .execute(&mut *tx)
        .await?;
        for slot in slots {
            sqlx::query(
                "INSERT INTO timetable_slots 
                 (school_id, config_id, class_id, day_of_week, period_number, subject_id, subject_name, teacher_id, room_id, is_free_period)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 ON CONFLICT (school_id, config_id, day_of_week, period_number) DO NOTHING"
            )
            .bind(school_id)
            .bind(config_id)
            .bind(class_id)
            .bind(slot.day as i32)
            .bind(slot.period as i32)
            .bind(&slot.subject_id)
            .bind(&slot.subject_name)
            .bind(&slot.teacher_id)
            .bind(&slot.room_id)
            .bind(slot.is_free_period)
            .execute(&mut *tx)
            .await?;
        }

        // Save detected conflicts
        for conflict in conflicts {
            sqlx::query(
                "INSERT INTO timetable_conflicts (school_id, config_id, conflict_type, description)
                 VALUES ($1, $2, 'scheduling_conflict', $3)",
            )
            .bind(school_id)
            .bind(config_id)
            .bind(conflict)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(())
    }

    /// Fetch a previously generated timetable by config_id
    pub async fn get_timetable(
        &self,
        school_id: &str,
        config_id: &str,
    ) -> Result<Value, sqlx::Error> {
        let slot_rows = sqlx::query(
            "SELECT day_of_week, period_number, subject_name, teacher_id, room_id, is_free_period
             FROM timetable_slots WHERE school_id = $1 AND config_id = $2
             ORDER BY day_of_week, period_number",
        )
        .bind(school_id)
        .bind(config_id)
        .fetch_all(&self.pool)
        .await?;

        let slots: Vec<Value> = slot_rows
            .iter()
            .map(|row| {
                json!({
                    "day": row.get::<i32, _>("day_of_week"),
                    "period": row.get::<i32, _>("period_number"),
                    "subject": row.get::<Option<String>, _>("subject_name"),
                    "teacher_id": row.get::<Option<String>, _>("teacher_id"),
                    "room_id": row.get::<Option<String>, _>("room_id"),
                    "is_free": row.get::<bool, _>("is_free_period"),
                })
            })
            .collect();

        let conflict_rows = sqlx::query(
            "SELECT description FROM timetable_conflicts WHERE school_id = $1 AND config_id = $2",
        )
        .bind(school_id)
        .bind(config_id)
        .fetch_all(&self.pool)
        .await?;

        let conflicts: Vec<String> = conflict_rows
            .iter()
            .map(|r| {
                r.get::<Option<String>, _>("description")
                    .unwrap_or_default()
            })
            .collect();

        let config_info = sqlx::query(
            "SELECT status, season, start_time, end_time, period_duration_minutes, break_duration_minutes 
             FROM timetable_configs WHERE school_id = $1 AND config_id = $2"
        )
        .bind(school_id)
        .bind(config_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(json!({
            "config_id": config_id,
            "status": config_info.get::<String, _>("status"),
            "season": config_info.get::<Option<String>, _>("season"),
            "start_time": config_info.get::<Option<chrono::NaiveTime>, _>("start_time"),
            "end_time": config_info.get::<Option<chrono::NaiveTime>, _>("end_time"),
            "period_duration": config_info.get::<i32, _>("period_duration_minutes"),
            "break_duration": config_info.get::<i32, _>("break_duration_minutes"),
            "slots": slots,
            "conflicts": conflicts,
            "total_slots": slots.len(),
            "total_conflicts": conflicts.len(),
        }))
    }

    pub async fn list_timetable_configs(&self, school_id: &str) -> Result<Value, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT config_id, class_id, class_name, periods_per_day, status, season, created_at
             FROM timetable_configs WHERE school_id = $1 ORDER BY created_at DESC",
        )
        .bind(school_id)
        .fetch_all(&self.pool)
        .await?;

        let configs: Vec<Value> = rows.iter().map(|r| json!({
            "config_id": r.get::<String, _>("config_id"),
            "class_id": r.get::<String, _>("class_id"),
            "class_name": r.get::<String, _>("class_name"),
            "periods_per_day": r.get::<i32, _>("periods_per_day"),
            "status": r.get::<String, _>("status"),
            "season": r.get::<Option<String>, _>("season"),
            "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
        })).collect();

        Ok(json!({ "configs": configs }))
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

    /// Approves a timetable proposal, making it active.
    pub async fn approve_timetable(
        &self,
        school_id: &str,
        config_id: &str,
        admin_id: &str,
    ) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        // 1. Mark as APPROVED
        sqlx::query(
            "UPDATE timetable_configs 
             SET status = 'APPROVED', approved_by = $1, approved_at = NOW() 
             WHERE school_id = $2 AND config_id = $3"
        )
        .bind(admin_id)
        .bind(school_id)
        .bind(config_id)
        .execute(&mut *tx)
        .await?;

        // 2. Trigger notifications for affected users
        self.send_timetable_notifications(&mut tx, school_id, config_id).await?;

        tx.commit().await?;
        Ok(())
    }

    async fn send_timetable_notifications(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        school_id: &str,
        config_id: &str,
    ) -> Result<(), sqlx::Error> {
        // Get affected teachers
        let teachers = sqlx::query(
            "SELECT DISTINCT teacher_id FROM timetable_slots WHERE school_id = $1 AND config_id = $2 AND teacher_id IS NOT NULL AND teacher_id != ''"
        )
        .bind(school_id)
        .bind(config_id)
        .fetch_all(&mut **tx)
        .await?;

        for row in teachers {
            let tid: String = row.get("teacher_id");
            sqlx::query(
                "INSERT INTO timetable_notifications (school_id, config_id, user_id, user_type, notification_type)
                 VALUES ($1, $2, $3, 'teacher', 'timetable_approved')"
            )
            .bind(school_id)
            .bind(config_id)
            .bind(tid)
            .execute(&mut **tx)
            .await?;
        }

        // Get the class_id for this config to notify students
        let config_row = sqlx::query(
            "SELECT class_id FROM timetable_configs WHERE school_id = $1 AND config_id = $2"
        )
        .bind(school_id)
        .bind(config_id)
        .fetch_one(&mut **tx)
        .await?;
        
        let class_id: String = config_row.get("class_id");

        // Notify all students in this class
        let students = sqlx::query(
            "SELECT student_id FROM students WHERE school_id = $1 AND class_id = $2"
        )
        .bind(school_id)
        .bind(&class_id)
        .fetch_all(&mut **tx)
        .await?;

        for row in students {
            let sid: String = row.get("student_id");
            sqlx::query(
                "INSERT INTO timetable_notifications (school_id, config_id, user_id, user_type, notification_type)
                 VALUES ($1, $2, $3, 'student', 'timetable_approved')"
            )
            .bind(school_id)
            .bind(config_id)
            .bind(sid)
            .execute(&mut **tx)
            .await?;
        }

        Ok(())
    }
}
