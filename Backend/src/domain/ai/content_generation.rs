use crate::AppState;
use crate::services::traits::content_generation::{
    QuestionType, DifficultyLevel, StudyMaterialType, ComplexityLevel, ProblemType, SummaryType,
};
use crate::models::ai::{
    GenerateExamRequest, GenerateLessonPlanRequest, GenerateStudyMaterialsRequest,
    GeneratePracticeProblemsRequest, SummarizeContentRequest,
};
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;



/// Generate exam questions with multiple question types
pub async fn generate_exam_questions(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<GenerateExamRequest>,
) -> impl IntoResponse {
    match state
        .services
        .content_generation
        .generate_exam_questions(
            &school_id,
            &payload.subject,
            &payload.class_level,
            payload.question_types,
            payload.difficulty,
            payload.num_questions,
            payload.syllabus_topics,
        )
        .await
    {
        Ok(questions) => Json(json!({
            "success": true,
            "data": questions,
            "message": "Exam questions generated successfully"
        }))
        .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "success": false,
                "message": format!("Failed to generate exam questions: {}", e)
            })),
        )
            .into_response(),
    }
}

/// Generate lesson plan aligned with syllabus
pub async fn generate_lesson_plan(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<GenerateLessonPlanRequest>,
) -> impl IntoResponse {
    match state
        .services
        .content_generation
        .generate_lesson_plan(
            &school_id,
            &payload.subject,
            &payload.class_level,
            &payload.topic,
            payload.duration_minutes,
            payload.learning_objectives,
            payload.include_activities,
        )
        .await
    {
        Ok(lesson_plan) => Json(json!({
            "success": true,
            "data": lesson_plan,
            "message": "Lesson plan generated successfully"
        }))
        .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "success": false,
                "message": format!("Failed to generate lesson plan: {}", e)
            })),
        )
            .into_response(),
    }
}

/// Generate study materials (summaries, practice problems)
pub async fn generate_study_materials(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<GenerateStudyMaterialsRequest>,
) -> impl IntoResponse {
    match state
        .services
        .content_generation
        .generate_study_materials(
            &school_id,
            &payload.subject,
            &payload.topic,
            payload.material_type,
            payload.complexity,
            payload.include_examples,
        )
        .await
    {
        Ok(study_materials) => Json(json!({
            "success": true,
            "data": study_materials,
            "message": "Study materials generated successfully"
        }))
        .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "success": false,
                "message": format!("Failed to generate study materials: {}", e)
            })),
        )
            .into_response(),
    }
}

/// Generate practice problems with solutions
pub async fn generate_practice_problems(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<GeneratePracticeProblemsRequest>,
) -> impl IntoResponse {
    match state
        .services
        .content_generation
        .generate_practice_problems(
            &school_id,
            &payload.subject,
            &payload.topic,
            payload.problem_type,
            payload.num_problems,
            payload.include_solutions,
        )
        .await
    {
        Ok(problems) => Json(json!({
            "success": true,
            "data": problems,
            "message": "Practice problems generated successfully"
        }))
        .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "success": false,
                "message": format!("Failed to generate practice problems: {}", e)
            })),
        )
            .into_response(),
    }
}

/// Summarize content (text summarization)
pub async fn summarize_content(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<SummarizeContentRequest>,
) -> impl IntoResponse {
    match state
        .services
        .content_generation
        .summarize_content(
            &school_id,
            &payload.content,
            payload.summary_type,
        )
        .await
    {
        Ok(summary) => Json(json!({
            "success": true,
            "data": summary,
            "message": "Content summarized successfully"
        }))
        .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "success": false,
                "message": format!("Failed to summarize content: {}", e)
            })),
        )
            .into_response(),
    }
}

/// Enhanced exam generation endpoint that supports multiple question types
/// This is a wrapper around the existing AI service but uses the new content generation service
pub async fn enhanced_generate_exam(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    // Parse the payload to extract parameters
    let subject = payload["subject"].as_str().unwrap_or("General").to_string();
    let class_level = payload["class_level"].as_str().unwrap_or("10").to_string();
    
    // Parse question types from payload
    let question_types = if let Some(types_array) = payload["question_types"].as_array() {
        types_array
            .iter()
            .filter_map(|v| v.as_str())
            .filter_map(|s| match s.to_lowercase().as_str() {
                "mcq" => Some(QuestionType::MultipleChoice),
                "true_false" => Some(QuestionType::TrueFalse),
                "fill_blank" => Some(QuestionType::FillInTheBlanks),
                "short_answer" => Some(QuestionType::ShortAnswer),
                "essay" => Some(QuestionType::Essay),
                "matching" => Some(QuestionType::Matching),
                "diagram" => Some(QuestionType::DiagramBased),
                "coding" => Some(QuestionType::ProblemSolving),
                _ => None,
            })
            .collect()
    } else {
        // Default to multiple choice if not specified
        vec![QuestionType::MultipleChoice]
    };
    
    let difficulty = match payload["difficulty"].as_str().unwrap_or("medium") {
        "easy" => DifficultyLevel::Easy,
        "hard" => DifficultyLevel::Hard,
        _ => DifficultyLevel::Medium,
    };
    
    let num_questions = payload["num_questions"].as_i64().unwrap_or(10) as i32;
    
    let syllabus_topics = payload["syllabus_topics"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect());
    
    // Call the content generation service
    match state
        .services
        .content_generation
        .generate_exam_questions(
            &school_id,
            &subject,
            &class_level,
            question_types,
            difficulty,
            num_questions,
            syllabus_topics,
        )
        .await
    {
        Ok(questions) => Json(json!({
            "success": true,
            "data": questions,
            "message": "Enhanced exam questions generated successfully"
        }))
        .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "success": false,
                "message": format!("Failed to generate enhanced exam questions: {}", e)
            })),
        )
            .into_response(),
    }
}