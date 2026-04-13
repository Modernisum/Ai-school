# AI & Content Generation APIs - Expected Responses

## Authentication Requirements
- **All AI/content APIs**: RLS authentication (X-School-ID, X-Admin-ID headers)
- **Rate limiting**: May apply for AI generation endpoints

## 1. POST /api/content/:schoolId/generate/exam - Generate Exam Questions
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "exam_id": "exam_gen_123456",
    "subject": "Mathematics",
    "grade": "10",
    "topic": "Algebra",
    "generated_at": "2024-04-12T19:00:00Z",
    "questions": [
      {
        "id": "q1",
        "type": "multiple_choice",
        "question": "Solve for x: 2x + 5 = 15",
        "options": ["x = 5", "x = 10", "x = 7.5", "x = 5.5"],
        "correct_answer": "x = 5",
        "difficulty": "easy",
        "marks": 1
      },
      {
        "id": "q2",
        "type": "short_answer",
        "question": "Factorize: x² - 9",
        "correct_answer": "(x + 3)(x - 3)",
        "difficulty": "medium",
        "marks": 2
      }
    ],
    "answer_key": {
      "q1": "x = 5",
      "q2": "(x + 3)(x - 3)"
    },
    "total_questions": 10,
    "total_marks": 15
  }
}
```

### Error Responses
- **HTTP 400**: Invalid parameters (e.g., unsupported subject, invalid grade)
- **HTTP 401**: Missing or invalid RLS headers
- **HTTP 429**: Rate limit exceeded
- **HTTP 500**: AI service unavailable

## 2. POST /api/content/:schoolId/generate/lesson-plan - Generate Lesson Plan
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "lesson_plan_id": "lp_gen_789012",
    "subject": "Science",
    "grade": "8",
    "topic": "Photosynthesis",
    "duration_minutes": 45,
    "generated_at": "2024-04-12T19:01:00Z",
    "sections": [
      {
        "title": "Introduction (5 minutes)",
        "activities": ["Hook: Show a time-lapse video of plant growth", "Ask: What do plants need to grow?"]
      },
      {
        "title": "Direct Instruction (15 minutes)",
        "activities": ["Explain photosynthesis equation", "Diagram of chloroplast", "Role of sunlight and chlorophyll"]
      },
      {
        "title": "Guided Practice (15 minutes)",
        "activities": ["Worksheet: Label parts of plant cell", "Group discussion: Importance of photosynthesis"]
      },
      {
        "title": "Independent Practice (5 minutes)",
        "activities": ["Quick quiz: 3 questions", "Exit ticket: One thing learned today"]
      },
      {
        "title": "Closure (5 minutes)",
        "activities": ["Review key concepts", "Preview next lesson: Cellular respiration"]
      }
    ],
    "learning_objectives": [
      "Understand the process of photosynthesis",
      "Identify the reactants and products of photosynthesis",
      "Explain the importance of photosynthesis for life on Earth"
    ],
    "materials_needed": ["Whiteboard", "Markers", "Plant diagram", "Worksheet", "Projector"],
    "assessment_strategies": ["Formative: Exit ticket", "Summative: End-of-unit test"]
  }
}
```

### Error Responses
- **HTTP 400**: Missing required parameters
- **HTTP 401**: Missing or invalid RLS headers
- **HTTP 500**: AI service error

## 3. POST /api/content/:schoolId/generate/study-materials - Generate Study Materials
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "material_id": "study_mat_345678",
    "subject": "History",
    "grade": "11",
    "topic": "World War II",
    "content_type": "summary",
    "generated_at": "2024-04-12T19:02:00Z",
    "content": "World War II (1939-1945) was a global conflict involving most of the world's nations...",
    "sections": [
      {
        "title": "Causes of WWII",
        "content": "Treaty of Versailles, Rise of fascism, Appeasement policy..."
      },
      {
        "title": "Major Events",
        "content": "Invasion of Poland, Battle of Stalingrad, D-Day, Atomic bombings..."
      },
      {
        "title": "Key Figures",
        "content": "Winston Churchill, Franklin D. Roosevelt, Adolf Hitler, Joseph Stalin..."
      }
    ],
    "timeline": [
      {"year": "1939", "event": "Germany invades Poland"},
      {"year": "1941", "event": "Pearl Harbor attack"},
      {"year": "1945", "event": "Atomic bombs dropped on Japan"}
    ],
    "key_figures": [
      {"name": "Winston Churchill", "role": "British Prime Minister"},
      {"name": "Franklin D. Roosevelt", "role": "US President"}
    ],
    "study_tips": ["Focus on causes and consequences", "Memorize key dates", "Understand geopolitical shifts"]
  }
}
```

### Error Responses
- **HTTP 400**: Invalid content type or parameters
- **HTTP 401**: Missing or invalid RLS headers
- **HTTP 500**: Content generation failed

## 4. POST /api/content/:schoolId/generate/practice-problems - Generate Practice Problems
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "problem_set_id": "prob_set_901234",
    "subject": "Physics",
    "grade": "12",
    "topic": "Newton's Laws of Motion",
    "generated_at": "2024-04-12T19:03:00Z",
    "problems": [
      {
        "id": "p1",
        "difficulty": "easy",
        "problem": "A 5 kg object is pushed with a force of 20 N. What is its acceleration?",
        "solution": "a = F/m = 20/5 = 4 m/s²",
        "step_by_step": ["Use Newton's second law: F = ma", "Rearrange: a = F/m", "Substitute values: a = 20/5", "Calculate: a = 4 m/s²"]
      },
      {
        "id": "p2",
        "difficulty": "medium",
        "problem": "Two forces of 10 N and 15 N act on an object at right angles. What is the resultant force?",
        "solution": "F_resultant = √(10² + 15²) = √(100 + 225) = √325 ≈ 18.03 N",
        "step_by_step": ["Use Pythagorean theorem", "Calculate squares: 10² = 100, 15² = 225", "Sum: 100 + 225 = 325", "Square root: √325 ≈ 18.03 N"]
      }
    ],
    "difficulty_distribution": {"easy": 5, "medium": 7, "hard": 3},
    "total_problems": 15
  }
}
```

### Error Responses
- **HTTP 400**: Invalid problem count or difficulty levels
- **HTTP 401**: Missing or invalid RLS headers
- **HTTP 500**: Problem generation failed

## 5. POST /api/content/:schoolId/summarize - Summarize Content
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "summary_id": "sum_567890",
    "original_length": 250,
    "summary_length": 50,
    "generated_at": "2024-04-12T19:04:00Z",
    "summary": "Photosynthesis is the process where plants use sunlight to create food from carbon dioxide and water, producing oxygen.",
    "key_points": [
      "Uses sunlight energy",
      "Converts CO2 and water to food",
      "Produces oxygen as byproduct",
      "Essential for life on Earth"
    ],
    "compression_ratio": "5:1"
  }
}
```

### Error Responses
- **HTTP 400**: Text too short or missing
- **HTTP 401**: Missing or invalid RLS headers
- **HTTP 500**: Summarization failed

## 6. POST /api/content/:schoolId/enhanced/generate-exam - Enhanced Generate Exam
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "enhanced_exam_id": "enh_exam_123789",
    "subject": "Chemistry",
    "grade": "11",
    "total_marks": 100,
    "time_minutes": 180,
    "generated_at": "2024-04-12T19:05:00Z",
    "sections": [
      {
        "name": "Multiple Choice",
        "marks_per_question": 1,
        "question_count": 20,
        "questions": [
          {
            "id": "mc1",
            "question": "What is the atomic number of Carbon?",
            "options": ["6", "12", "14", "16"],
            "correct_option": 0
          }
        ]
      }
    ],
    "rubric": {
      "grading_criteria": ["Accuracy", "Completeness", "Clarity"],
      "marks_distribution": {"Multiple Choice": 20, "Short Answer": 30, "Long Answer": 50}
    },
    "answer_sheet": {
      "mc1": "A",
      "sa1": "Ionic bonds form between metals and non-metals"
    }
  }
}
```

### Error Responses
- **HTTP 400**: Invalid exam structure
- **HTTP 401**: Missing or invalid RLS headers
- **HTTP 500**: Enhanced generation failed

## 7. POST /api/exam/ai/:schoolId/generate - AI Generate Exam
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "ai_exam_id": "ai_exam_456123",
    "subject": "Biology",
    "class": "10",
    "exam_type": "unit_test",
    "generated_at": "2024-04-12T19:06:00Z",
    "questions": [
      {
        "id": "bio_q1",
        "type": "diagram_labeling",
        "question": "Label the parts of a plant cell",
        "diagram_url": "/diagrams/plant_cell.png",
        "labels_to_identify": ["Nucleus", "Chloroplast", "Cell wall", "Vacuole"]
      }
    ],
    "ai_metadata": {
      "model_used": "phi3-mini",
      "generation_time_ms": 1250,
      "confidence_score": 0.87
    }
  }
}
```

### Error Responses
- **HTTP 400**: Unsupported exam type
- **HTTP 401**: Missing or invalid RLS headers
- **HTTP 503**: AI model unavailable

## 8. POST /api/ai/:schoolId/query - AI Query
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "query_id": "ai_query_789456",
    "query": "Explain the water cycle in simple terms for a 5th grade student",
    "response": "The water cycle is like nature's recycling system for water. Imagine water going on a journey: 1) Sun heats water in oceans, lakes → turns to vapor (evaporation) 2) Vapor rises, cools, forms clouds (condensation) 3) Clouds get heavy, water falls as rain/snow (precipitation) 4) Water goes back to oceans, lakes, repeats!",
    "generated_at": "2024-04-12T19:07:00Z",
    "context_used": "science_education",
    "complexity_level": "simple",
    "ai_metadata": {
      "model_used": "llama-3-8b",
      "response_time_ms": 850,
      "tokens_used": 125
    }
  }
}
```

### Error Responses
- **HTTP 400**: Query too long or inappropriate
- **HTTP 401**: Missing or invalid RLS headers
- **HTTP 429**: Too many queries
- **HTTP 503**: AI service down

## 9. POST /api/task/ai/:schoolId/generate - AI Generate Tasks
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "task_plan_id": "task_plan_321654",
    "project": "School Science Fair",
    "generated_at": "2024-04-12T19:08:00Z",
    "timeline_days": 30,
    "tasks": [
      {
        "id": "t1",
        "title": "Form Planning Committee",
        "description": "Select 5 teachers and 3 students for planning",
        "duration_days": 3,
        "priority": "high",
        "dependencies": [],
        "responsible_person": "Science Department Head"
      },
      {
        "id": "t2",
        "title": "Announce Science Fair",
        "description": "Create posters and announcements",
        "duration_days": 2,
        "priority": "high",
        "dependencies": ["t1"],
        "responsible_person": "PR Committee"
      }
    ],
    "milestones": [
      {"day": 7, "milestone": "Registration opens"},
      {"day": 21, "milestone": "Project submissions due"},
      {"day": 30, "milestone": "Science Fair event"}
    ],
    "resource_requirements": ["Budget: $500", "Venue: School auditorium", "Materials: Display boards, tables"]
  }
}
```

### Error Responses
- **HTTP 400**: Invalid project parameters
- **HTTP 401**: Missing or invalid RLS headers
- **HTTP 500**: Task generation failed

## 10. POST /api/task/ai/:schoolId/reorganize - AI Reorganize Tasks
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "reorganized_plan_id": "reorg_987123",
    "original_tasks": 5,
    "optimized_for": "productivity",
    "generated_at": "2024-04-12T19:09:00Z",
    "optimized_schedule": [
      {
        "time_slot": "9:00-10:30",
        "task": "Prepare lesson plan for Monday",
        "priority": "high",
        "estimated_completion": "90%"
      },
      {
        "time_slot": "10:30-11:30",
        "task": "Meet with parents",
        "priority": "high",
        "estimated_completion": "100%"
      },
      {
        "time_slot": "11:30-13:00",
        "task": "Grade student assignments",
        "priority": "medium",
        "estimated_completion": "70%"
      }
    ],
    "productivity_metrics": {
      "estimated_time_saved": "2.5 hours",
      "focus_blocks_created": 3,
      "context_switches_reduced": 4
    },
    "recommendations": [
      "Batch similar tasks together",
      "Schedule high-priority tasks in morning",
      "Include buffer time between meetings"
    ]
  }
}
```

### Error Responses
- **HTTP 400**: Invalid task list or time constraints
- **HTTP 401**: Missing or invalid RLS headers
- **HTTP 500**: Reorganization failed

## Test Data Dependencies
1. **Valid School Context**: AI models may be trained on school-specific curriculum
2. **Subject/Grade Validation**: Some subjects/grades may not be supported
3. **AI Service Availability**: Requires working AI/ML backend
4. **Rate Limits**: May have daily/monthly generation limits

## Testing Notes
1. **Response Time**: AI endpoints may have longer response times (2-10 seconds)
2. **Content Quality**: AI-generated content should be educationally appropriate
3. **Format Consistency**: Responses should follow consistent structure
4. **Error Handling**: Graceful degradation when AI services are unavailable
5. **Caching**: Similar requests may return cached responses

## Success Criteria
1. ✅ Exam questions generated with appropriate difficulty and format
2. ✅ Lesson plans include all required sections and timing
3. ✅ Study materials are accurate and well-structured
4. ✅ Practice problems include solutions and step-by-step explanations
5. ✅ Summarization maintains key information while reducing length
6. ✅ Enhanced exams include rubrics and answer sheets
7. ✅ AI queries provide helpful, context-aware responses
8. ✅ Task generation creates realistic project plans
9. ✅ Task reorganization optimizes for productivity
10. ✅ Appropriate error handling for AI service failures