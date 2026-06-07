use serde::{Deserialize, Serialize};
use crate::services::traits::content_generation::{
    QuestionType, DifficultyLevel, StudyMaterialType, ComplexityLevel, ProblemType, SummaryType,
};

/// Request payload for generating exam questions
#[derive(Debug, Deserialize, Serialize)]
pub struct GenerateExamRequest {
    pub subject: String,
    pub class_level: String,
    pub question_types: Vec<QuestionType>,
    pub difficulty: DifficultyLevel,
    pub num_questions: i32,
    pub syllabus_topics: Option<Vec<String>>,
}

/// Request payload for generating lesson plan
#[derive(Debug, Deserialize, Serialize)]
pub struct GenerateLessonPlanRequest {
    pub subject: String,
    pub class_level: String,
    pub topic: String,
    pub duration_minutes: i32,
    pub learning_objectives: Vec<String>,
    pub include_activities: bool,
}

/// Request payload for generating study materials
#[derive(Debug, Deserialize, Serialize)]
pub struct GenerateStudyMaterialsRequest {
    pub subject: String,
    pub topic: String,
    pub material_type: StudyMaterialType,
    pub complexity: ComplexityLevel,
    pub include_examples: bool,
}

/// Request payload for generating practice problems
#[derive(Debug, Deserialize, Serialize)]
pub struct GeneratePracticeProblemsRequest {
    pub subject: String,
    pub topic: String,
    pub problem_type: ProblemType,
    pub num_problems: i32,
    pub include_solutions: bool,
}

/// Request payload for content summarization
#[derive(Debug, Deserialize, Serialize)]
pub struct SummarizeContentRequest {
    pub content: String,
    pub summary_type: SummaryType,
    pub target_length_words: i32,
}
