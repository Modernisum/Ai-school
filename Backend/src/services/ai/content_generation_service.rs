use crate::error::AppResult;
use crate::repository::Repositories;
use crate::services::traits::content_generation::{
    ContentGenerationService, QuestionType, DifficultyLevel, ExamQuestion, LessonPlan,
    StudyMaterialType, ComplexityLevel, StudyMaterials, PracticeProblem, ProblemType,
};
use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

/// Content generation service for educational materials
pub struct ContentGenerationServiceImpl {
    repos: Arc<Repositories>,
    ai_service: Arc<dyn crate::services::traits::resource::AiService>,
}

impl ContentGenerationServiceImpl {
    pub fn new(repos: Arc<Repositories>, ai_service: Arc<dyn crate::services::traits::resource::AiService>) -> Self {
        Self { repos, ai_service }
    }

    /// Generate prompt for exam questions based on parameters
    fn generate_exam_prompt(
        &self,
        subject: &str,
        class_level: &str,
        question_types: &[QuestionType],
        difficulty: &DifficultyLevel,
        num_questions: i32,
        syllabus_topics: Option<&Vec<String>>,
    ) -> String {
        let question_types_str: Vec<String> = question_types
            .iter()
            .map(|qt| format!("{:?}", qt))
            .collect();

        let topics_str = syllabus_topics
            .map(|topics| format!(" focusing on topics: {}", topics.join(", ")))
            .unwrap_or_default();

        format!(
            "Generate {} {} exam questions for class {} with {:?} difficulty level{}. \
             Include a mix of question types: {}. Each question should have: \
             1. Clear question text, 2. Correct answer, 3. Explanation if applicable, \
             4. Points/marks based on difficulty.",
            num_questions,
            subject,
            class_level,
            difficulty,
            topics_str,
            question_types_str.join(", ")
        )
    }

    /// Generate prompt for lesson plan
    fn generate_lesson_plan_prompt(
        &self,
        subject: &str,
        class_level: &str,
        topic: &str,
        duration_minutes: i32,
        learning_objectives: &[String],
        include_activities: bool,
    ) -> String {
        let activities_str = if include_activities {
            "Include interactive activities, group work, and assessment methods."
        } else {
            "Focus on lecture content and individual work."
        };

        format!(
            "Create a {} minute lesson plan for {} class {} on topic: {}. \
             Learning objectives: {}. {} \
             The lesson plan should include: 1. Introduction, 2. Main content, \
             3. Activities/exercises, 4. Assessment, 5. Homework/extension tasks.",
            duration_minutes,
            subject,
            class_level,
            topic,
            learning_objectives.join(", "),
            activities_str
        )
    }

    /// Generate prompt for study materials
    fn generate_study_materials_prompt(
        &self,
        subject: &str,
        topic: &str,
        material_type: &StudyMaterialType,
        complexity: &ComplexityLevel,
        include_examples: bool,
    ) -> String {
        let examples_str = if include_examples {
            "Include detailed examples with step-by-step explanations."
        } else {
            "Focus on conceptual explanations."
        };

        format!(
            "Create {:?} study materials for {} topic: {}. \
             Complexity level: {:?}. {} \
             The materials should be comprehensive, well-structured, and suitable for students.",
            material_type,
            subject,
            topic,
            complexity,
            examples_str
        )
    }
}

#[async_trait]
impl ContentGenerationService for ContentGenerationServiceImpl {
    async fn generate_exam_questions(
        &self,
        school_id: &str,
        subject: &str,
        class_level: &str,
        question_types: Vec<QuestionType>,
        difficulty: DifficultyLevel,
        num_questions: i32,
        syllabus_topics: Option<Vec<String>>,
    ) -> AppResult<Vec<ExamQuestion>> {
        // Generate prompt for AI
        let prompt = self.generate_exam_prompt(
            subject,
            class_level,
            &question_types,
            &difficulty,
            num_questions,
            syllabus_topics.as_ref(),
        );

        // Call AI service with the generated prompt
        let ai_response = self.ai_service.query_ai(school_id, &prompt).await?;

        // Try to parse structured response from AI, fall back to mock
        if let Some(questions) = ai_response.get("questions").and_then(|q| q.as_array()) {
            let parsed: Result<Vec<ExamQuestion>, _> = serde_json::from_value(serde_json::Value::Array(questions.clone()));
            if let Ok(questions) = parsed {
                return Ok(questions);
            }
        }

        // Fallback to mock if AI didn't return structured data
        Ok(self.generate_mock_exam_questions(
            subject, class_level, &question_types, &difficulty, num_questions,
        ))
    }

    async fn generate_lesson_plan(
        &self,
        school_id: &str,
        subject: &str,
        class_level: &str,
        topic: &str,
        duration_minutes: i32,
        learning_objectives: Vec<String>,
        include_activities: bool,
    ) -> AppResult<LessonPlan> {
        // Generate prompt for AI
        let prompt = self.generate_lesson_plan_prompt(
            subject,
            class_level,
            topic,
            duration_minutes,
            &learning_objectives,
            include_activities,
        );

        // Call AI service with the generated prompt
        let ai_response = self.ai_service.query_ai(school_id, &prompt).await?;

        // Try to parse structured response from AI, fall back to mock
        if let Ok(lesson_plan) = serde_json::from_value::<LessonPlan>(ai_response) {
            return Ok(lesson_plan);
        }

        Ok(self.generate_mock_lesson_plan(
            subject, class_level, topic, duration_minutes, learning_objectives, include_activities,
        ))
    }

    async fn generate_study_materials(
        &self,
        school_id: &str,
        subject: &str,
        topic: &str,
        material_type: StudyMaterialType,
        complexity: ComplexityLevel,
        include_examples: bool,
    ) -> AppResult<StudyMaterials> {
        // Generate prompt for AI
        let prompt = self.generate_study_materials_prompt(
            subject,
            topic,
            &material_type,
            &complexity,
            include_examples,
        );

        // Call AI service with the generated prompt
        let ai_response = self.ai_service.query_ai(school_id, &prompt).await?;

        // Try to parse structured response, fall back to mock
        if let Ok(materials) = serde_json::from_value::<StudyMaterials>(ai_response) {
            return Ok(materials);
        }

        Ok(self.generate_mock_study_materials(
            subject, topic, material_type, complexity, include_examples,
        ))
    }

    async fn generate_practice_problems(
        &self,
        school_id: &str,
        subject: &str,
        topic: &str,
        problem_type: ProblemType,
        num_problems: i32,
        include_solutions: bool,
    ) -> AppResult<Vec<PracticeProblem>> {
        // Build prompt for practice problems
        let prompt = format!(
            "Generate {} {:?} problems for {} topic: {}. {}",
            num_problems, problem_type, subject, topic,
            if include_solutions { "Include detailed solutions." } else { "Do not include solutions." }
        );

        let ai_response = self.ai_service.query_ai(school_id, &prompt).await?;
        if let Some(problems) = ai_response.get("problems").and_then(|p| p.as_array()) {
            let parsed: Result<Vec<PracticeProblem>, _> = serde_json::from_value(serde_json::Value::Array(problems.clone()));
            if let Ok(problems) = parsed {
                return Ok(problems);
            }
        }

        Ok(self.generate_mock_practice_problems(
            subject, topic, problem_type, num_problems, include_solutions,
        ))
    }

    async fn summarize_content(
        &self,
        school_id: &str,
        content: &str,
        target_length: crate::services::traits::content_generation::SummaryType,
    ) -> AppResult<String> {
        // Simple summarization logic
        let words: Vec<&str> = content.split_whitespace().collect();
        let target_length_words = 100; // hardcoded for fallback logic
        
        match target_length {
            crate::services::traits::content_generation::SummaryType::Brief => {
                let take_count = (words.len() / 10).max(1).min(target_length_words as usize);
                Ok(words[..take_count].join(" "))
            }
            crate::services::traits::content_generation::SummaryType::Detailed => {
                let take_count = (words.len() / 3).max(1).min(target_length_words as usize);
                Ok(words[..take_count].join(" "))
            }
            crate::services::traits::content_generation::SummaryType::BulletPoints => {
                let sentences: Vec<&str> = content.split('.').collect();
                let take_count = (sentences.len() / 4).clamp(1, 5);
                let bullet_points: Vec<String> = sentences[..take_count]
                    .iter()
                    .enumerate()
                    .map(|(i, s)| format!("{}. {}", i + 1, s.trim()))
                    .collect();
                Ok(bullet_points.join("\n"))
            }
        }
    }
}

// Mock implementations for demonstration
impl ContentGenerationServiceImpl {
    fn generate_mock_exam_questions(
        &self,
        subject: &str,
        class_level: &str,
        question_types: &[QuestionType],
        difficulty: &DifficultyLevel,
        num_questions: i32,
    ) -> Vec<ExamQuestion> {
        let mut questions = Vec::new();
        
        for i in 1..=num_questions {
            let question_type = if i % question_types.len() as i32 == 0 {
                question_types[question_types.len() - 1].clone()
            } else {
                question_types[(i as usize - 1) % question_types.len()].clone()
            };

            let marks = match difficulty {
                DifficultyLevel::Easy => 1.0,
                DifficultyLevel::Medium => 3.0,
                DifficultyLevel::Hard => 5.0,
                _ => 2.0,
            };

            let question = ExamQuestion {
                id: format!("q{}", i),
                question_text: format!("{} question {} for {} class {:?}", subject, i, class_level, question_type),
                question_type: question_type.clone(),
                options: Some(vec!["A".to_string(), "B".to_string()]),
                correct_answer: format!("Answer to question {}", i),
                explanation: Some(format!("Explanation for question {}", i)),
                marks,
                difficulty: difficulty.clone(),
                bloom_taxonomy_level: "Knowledge".to_string(),
                topic: subject.to_string(),
                sub_topic: None,
            };

            questions.push(question);
        }

        questions
    }

    fn generate_mock_lesson_plan(
        &self,
        subject: &str,
        class_level: &str,
        topic: &str,
        duration_minutes: i32,
        learning_objectives: Vec<String>,
        include_activities: bool,
    ) -> LessonPlan {
        use crate::services::traits::content_generation::{Activity, LessonStep};
        let activities = if include_activities {
            vec![Activity {
                name: "Group discussion".to_string(),
                description: "Discuss key concepts".to_string(),
                duration_minutes: 15,
                materials: vec![],
                instructions: vec![],
                learning_outcomes: vec![],
            }]
        } else {
            vec![]
        };

        LessonPlan {
            id: format!("lp_{}_{}_{}", subject, class_level, topic.replace(" ", "_")),
            subject: subject.to_string(),
            class_level: class_level.to_string(),
            topic: topic.to_string(),
            duration_minutes,
            learning_objectives,
            prerequisites: vec![],
            materials_needed: vec![
                "Textbook".to_string(),
                "Whiteboard markers".to_string(),
                "Worksheets".to_string(),
            ],
            lesson_structure: vec![LessonStep {
                step_number: 1,
                title: "Intro".to_string(),
                description: "Introduction".to_string(),
                duration_minutes: 5,
                teaching_method: "Lecture".to_string(),
                resources: vec![],
            }],
            activities,
            assessment_methods: vec![
                "Formative assessment through questioning".to_string(),
                "Summative assessment through quiz".to_string(),
            ],
            homework_suggestions: vec![format!("Review {} chapter and complete exercises", topic)],
            differentiation_strategies: vec![],
        }
    }

    fn generate_mock_study_materials(
        &self,
        subject: &str,
        topic: &str,
        material_type: StudyMaterialType,
        complexity: ComplexityLevel,
        include_examples: bool,
    ) -> StudyMaterials {
        let examples = if include_examples {
            vec![
                "Example 1: Basic concept application".to_string(),
                "Example 2: Intermediate problem solving".to_string(),
                "Example 3: Advanced scenario analysis".to_string(),
            ]
        } else {
            Vec::new()
        };

        let key_points = match complexity {
            ComplexityLevel::Basic => vec![
                format!("Basic definition of {}", topic),
                format!("Simple applications in {}", subject),
                format!("Fundamental principles"),
            ],
            ComplexityLevel::Intermediate => vec![
                format!("Detailed explanation of {}", topic),
                format!("Applications in real-world scenarios"),
                format!("Problem-solving techniques"),
            ],
            ComplexityLevel::Advanced => vec![
                format!("Advanced theories related to {}", topic),
                format!("Complex applications and edge cases"),
                format!("Critical analysis and evaluation"),
            ],
        };

        StudyMaterials {
            id: format!("sm_{}_{}", subject, topic.replace(" ", "_")),
            subject: subject.to_string(),
            topic: topic.to_string(),
            material_type,
            complexity,
            content: format!("Comprehensive study materials for {} topic: {}", subject, topic),
            key_points,
            examples,
            visual_aids: Some(vec![format!("Visual aid for {}", topic)]),
            review_questions: vec![
                "Question 1: Basic concept".to_string(),
                "Question 2: Intermediate problem".to_string(),
            ],
        }
    }

    fn generate_mock_practice_problems(
        &self,
        subject: &str,
        topic: &str,
        problem_type: ProblemType,
        num_problems: i32,
        include_solutions: bool,
    ) -> Vec<PracticeProblem> {
        let mut problems = Vec::new();

        for i in 1..=num_problems {
            let solution_text = if include_solutions {
                format!("Step-by-step solution for problem {}", i)
            } else {
                "".to_string()
            };

            let problem = PracticeProblem {
                id: format!("pp_{}_{}_{}", subject, topic.replace(" ", "_"), i),
                problem_type: problem_type.clone(),
                problem_statement: format!("{} problem {} on {}: {:?}", subject, i, topic, problem_type),
                context: None,
                constraints: None,
                solution: solution_text,
                explanation: format!("Explanation for problem {}", i),
                difficulty: match i {
                    1..=3 => DifficultyLevel::Easy,
                    4..=7 => DifficultyLevel::Medium,
                    _ => DifficultyLevel::Hard,
                },
                hints: vec![
                    format!("Hint 1 for problem {}", i),
                    format!("Hint 2 for problem {}", i),
                ],
                estimated_time_minutes: match i {
                    1..=3 => 5,
                    4..=7 => 10,
                    _ => 15,
                },
            };

            problems.push(problem);
        }

        problems
    }
}
