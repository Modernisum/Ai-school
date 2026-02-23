use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Section {
    pub section_name: String,
    pub student_range: String,
    pub total_students: i32,
    pub room_number: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassModel {
    pub class_name: String,
    pub total_class_students: i32,
    pub total_class_teachers: i32,
    pub total_periods: i32,
    pub room_number: String,
    pub streams: Vec<Value>,
    pub subjects: Vec<Value>,
    pub subject_groups: Vec<Value>,
    pub class_fees: f64,
    pub sections: Vec<Section>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubjectModel {
    pub subject_id: String,
    pub subject_name: String,
    pub class_name: String,
    pub subject_fees: f64,
    pub subject_teachers: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamModel {
    pub exam_name: String,
    pub exam_type: Option<String>,
    pub subject_name: Option<String>,
    pub chapters: Vec<String>,
    pub exam_date: Option<String>,
    pub announcement_date: Option<String>,
    pub conduct_teacher: Option<String>,
    pub result: Option<Value>,
    pub created_at: String,
    pub updated_at: String,
}
