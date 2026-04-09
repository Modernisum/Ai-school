use serde::{Deserialize, Serialize};
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

pub struct TimetableGenerator {
    pool: Pool<Postgres>,
}

impl TimetableGenerator {
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
}
