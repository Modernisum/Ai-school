pub mod generator;
pub mod optimizer;

use serde::{Deserialize, Serialize};

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

// Note: The TimetableEngine struct and implementation have been removed
// because they conflict with the one in timetable_engine.rs which is
// actually used by the routes. This module now only contains the
// type definitions and exports the generator and optimizer submodules.
