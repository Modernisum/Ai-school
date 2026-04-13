use crate::error::{AppError, AppResult};
use serde_json::Value;

use async_trait::async_trait;

/// Trait for content generation services
#[async_trait]
pub trait ContentGenerationService: Send + Sync {
    /// Generate exam questions with multiple question types
    async fn generate_exam_questions(
        &self,
        school_id: &str,
        subject: &str,
        class_level: &str,
        question_types: Vec<QuestionType>,
        difficulty: DifficultyLevel,
        num_questions: i32,
        syllabus_topics: Option<Vec<String>>,
    ) -> AppResult<Vec<ExamQuestion>>;

    /// Generate lesson plan aligned with syllabus
    async fn generate_lesson_plan(
        &self,
        school_id: &str,
        subject: &str,
        class_level: &str,
        topic: &str,
        duration_minutes: i32,
        learning_objectives: Vec<String>,
        include_activities: bool,
    ) -> AppResult<LessonPlan>;

    /// Generate study materials (summaries, practice problems)
    async fn generate_study_materials(
        &self,
        school_id: &str,
        subject: &str,
        topic: &str,
        material_type: StudyMaterialType,
        complexity: ComplexityLevel,
        include_examples: bool,
    ) -> AppResult<StudyMaterials>;

    /// Generate practice problems with solutions
    async fn generate_practice_problems(
        &self,
        school_id: &str,
        subject: &str,
        topic: &str,
        problem_type: ProblemType,
        num_problems: i32,
        include_solutions: bool,
    ) -> AppResult<Vec<PracticeProblem>>;

    /// Summarize educational content
    async fn summarize_content(
        &self,
        school_id: &str,
        content: &str,
        target_length: SummaryType,
    ) -> AppResult<String>;
}

/// Question types for exam generation
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum QuestionType {
    MultipleChoice,
    TrueFalse,
    FillInTheBlanks,
    ShortAnswer,
    LongAnswer,
    Matching,
    DiagramBased,
    Essay,
    CaseStudy,
    ProblemSolving,
}

/// Difficulty levels
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum DifficultyLevel {
    Easy,
    Medium,
    Hard,
    Advanced,
}

/// Exam question structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ExamQuestion {
    pub id: String,
    pub question_type: QuestionType,
    pub question_text: String,
    pub options: Option<Vec<String>>,
    pub correct_answer: String,
    pub explanation: Option<String>,
    pub marks: f32,
    pub difficulty: DifficultyLevel,
    pub bloom_taxonomy_level: String,
    pub topic: String,
    pub sub_topic: Option<String>,
}

/// Lesson plan structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LessonPlan {
    pub id: String,
    pub subject: String,
    pub class_level: String,
    pub topic: String,
    pub duration_minutes: i32,
    pub learning_objectives: Vec<String>,
    pub prerequisites: Vec<String>,
    pub materials_needed: Vec<String>,
    pub lesson_structure: Vec<LessonStep>,
    pub activities: Vec<Activity>,
    pub assessment_methods: Vec<String>,
    pub homework_suggestions: Vec<String>,
    pub differentiation_strategies: Vec<String>,
}

/// Lesson step in a lesson plan
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LessonStep {
    pub step_number: i32,
    pub title: String,
    pub description: String,
    pub duration_minutes: i32,
    pub teaching_method: String,
    pub resources: Vec<String>,
}

/// Activity in a lesson plan
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Activity {
    pub name: String,
    pub description: String,
    pub duration_minutes: i32,
    pub materials: Vec<String>,
    pub instructions: Vec<String>,
    pub learning_outcomes: Vec<String>,
}

/// Study material types
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum StudyMaterialType {
    Summary,
    Notes,
    Flashcards,
    MindMap,
    CheatSheet,
    RevisionGuide,
    PracticeWorksheet,
}

/// Complexity levels
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum ComplexityLevel {
    Basic,
    Intermediate,
    Advanced,
}

/// Study materials structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StudyMaterials {
    pub id: String,
    pub material_type: StudyMaterialType,
    pub subject: String,
    pub topic: String,
    pub content: String,
    pub key_points: Vec<String>,
    pub examples: Vec<String>,
    pub visual_aids: Option<Vec<String>>,
    pub review_questions: Vec<String>,
    pub complexity: ComplexityLevel,
}

/// Problem types for practice problems
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum ProblemType {
    Numerical,
    Conceptual,
    Application,
    CriticalThinking,
    RealWorld,
}

/// Practice problem structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PracticeProblem {
    pub id: String,
    pub problem_type: ProblemType,
    pub problem_statement: String,
    pub context: Option<String>,
    pub constraints: Option<Vec<String>>,
    pub solution: String,
    pub explanation: String,
    pub hints: Vec<String>,
    pub difficulty: DifficultyLevel,
    pub estimated_time_minutes: i32,
}

/// Summary type options
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum SummaryType {
    Brief,
    Detailed,
    BulletPoints,
}