use crate::repository::Repositories;
use anyhow::Result;
use serde_json::Value;
use std::sync::Arc;

mod chat_handler;
mod analysis;
mod prediction;
mod syllabus_planner;
pub mod providers;
mod utils;

pub use chat_handler::ChatHandler;
pub use analysis::AnalysisEngine;
pub use prediction::PredictionEngine;
pub use syllabus_planner::SyllabusPlanner;

pub struct AiOrchestrator {
    pub repos: Arc<Repositories>,
    pub chat_handler: ChatHandler,
    pub analysis: AnalysisEngine,
    pub prediction: PredictionEngine,
    pub syllabus_planner: SyllabusPlanner,
}

impl AiOrchestrator {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self {
            chat_handler: ChatHandler::new(repos.clone()),
            analysis: AnalysisEngine::new(repos.clone()),
            prediction: PredictionEngine::new(repos.clone()),
            syllabus_planner: SyllabusPlanner::new(repos.clone()),
            repos,
        }
    }

    pub async fn process_query(&self, school_id: &str, query: &str) -> Result<Value> {
        self.chat_handler.process_query(school_id, query).await
    }

    pub async fn generate_weekly_tasks_for_employee(&self, school_id: &str, employee_id: &str) -> Result<Value> {
        self.prediction.generate_weekly_tasks_for_employee(school_id, employee_id).await
    }

    pub async fn reorganize_tasks(&self, school_id: &str, employee_id: &str) -> Result<Value> {
        self.prediction.reorganize_tasks(school_id, employee_id).await
    }

    pub async fn generate_embedding(&self, text: &str) -> Result<Vec<f32>> {
        self.analysis.generate_embedding(text).await
    }

    pub async fn generate_exam_questions(&self, school_id: &str, payload: &Value) -> Result<Value> {
        self.prediction.generate_exam_questions(school_id, payload).await
    }

    pub async fn regenerate_exam_question(&self, school_id: &str, payload: &Value) -> Result<Value> {
        self.prediction.regenerate_exam_question(school_id, payload).await
    }

    pub async fn grade_test_submission(&self, school_id: &str, payload: &Value) -> Result<Value> {
        self.prediction.grade_test_submission(school_id, payload).await
    }
}
