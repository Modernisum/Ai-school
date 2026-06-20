import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.ai.providers import GeminiProvider
from app.services.ai.utils import fetch_api_key

class PredictionEngine:
    def __init__(self, provider: Optional[GeminiProvider] = None):
        self.provider = provider

    async def get_provider(self, session: AsyncSession) -> GeminiProvider:
        """Fetch the GeminiProvider using DB config key."""
        if self.provider:
            return self.provider
        api_key = await fetch_api_key(session)
        self.provider = GeminiProvider(api_key=api_key)
        return self.provider

    async def generate_weekly_tasks_for_employee(self, session: AsyncSession, school_id: str, employee_id: str) -> Dict[str, Any]:
        """Generate a 7-day task schedule for an employee based on duties and holidays."""
        # 0. Fetch Employee Role/Category
        emp_result = await session.execute(
            text("SELECT data->>'employee_type' as category FROM employees WHERE school_id = :sid AND employee_id = :eid"),
            {"sid": school_id, "eid": employee_id}
        )
        row = emp_result.first()
        category = row[0] if row and row[0] else "Unknown"
        is_teacher = "teach" in category.lower() or "faculty" in category.lower()

        # 1. Fetch employee responsibilities and spaces
        resp_result = await session.execute(
            text(
                "SELECT er.responsibility_id, r.name as subject_name, s.name as space_name "
                "FROM employee_responsibilities er "
                "JOIN responsibilities r ON er.responsibility_id = r.responsibility_id "
                "LEFT JOIN spaces s ON r.space_id = s.space_id "
                "WHERE er.school_id = :sid AND er.employee_id = :eid"
            ),
            {"sid": school_id, "eid": employee_id}
        )
        responsibilities = resp_result.all()
        context_str = ""
        for r in responsibilities:
            context_str += f"Responsibility: {r[1]} (Location: {r[2] or 'N/A'})\n"

        # 2. Fetch pending topics (if teacher)
        pending_topics = ""
        if is_teacher:
            topics_result = await session.execute(
                text(
                    "SELECT class_name, subject_name, chapter_name, component_name "
                    "FROM academic_components "
                    "WHERE school_id = :sid AND component_type = 'topic' AND (status->>'completed')::boolean IS NOT TRUE "
                    "LIMIT 20"
                ),
                {"sid": school_id}
            )
            for t in topics_result.all():
                pending_topics += f"Class: {t[0]}, Subject: {t[1]}, Chapter: {t[2]}, Topic: {t[3]}\n"

        # 3. Fetch holidays in next 7 days
        holiday_result = await session.execute(
            text(
                "SELECT date, status FROM attendance "
                "WHERE school_id = :sid AND role = 'holiday' "
                "AND date >= CURRENT_DATE AND date <= (CURRENT_DATE + INTERVAL '7 days')"
            ),
            {"sid": school_id}
        )
        upcoming_holidays = ""
        for h in holiday_result.all():
            upcoming_holidays += f"{h[0]} ({h[1] or 'Holiday'})\n"

        # 4. Construct AI prompt
        if is_teacher:
            prompt = (
                f"You are Vidhyam AI Task Scheduler.\n"
                f"Teacher has these subjects: {context_str}\n"
                f"Pending Topics across classes: {pending_topics}\n"
                f"Upcoming holidays (do not schedule tasks here): {upcoming_holidays}\n"
                f"Schedule 1-2 pending topics per day for the next 7 working days.\n"
                f"Call 'schedule_tasks' tool with a list of tasks. Provide date, task name, related entity (topic name), and priority."
            )
        else:
            prompt = (
                f"You are Vidhyam AI Operational Scheduler.\n"
                f"Employee Role: '{category}'\n"
                f"Employee has these broad duties: {context_str}\n"
                f"Upcoming holidays (do not schedule heavy tasks here): {upcoming_holidays}\n"
                f"Generate a structured, day-by-day operational agenda for the next 7 working days, breaking down their broad duties into specific actionable daily tasks.\n"
                f"Call 'schedule_tasks' tool with a list of tasks. Provide date, task name, related entity (duty), and priority."
            )

        tools = [{
            "function_declarations": [{
                "name": "schedule_tasks",
                "description": "Save generated tasks to database.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "tasks": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "date": { "type": "string", "description": "YYYY-MM-DD" },
                                    "task_name": { "type": "string" },
                                    "entity_type": { "type": "string", "description": "e.g., 'topic'" },
                                    "entity_id": { "type": "string", "description": "Name of topic" },
                                    "priority": { "type": "string", "description": "High/Medium/Low" }
                                }
                            }
                        }
                    },
                    "required": ["tasks"]
                }
            }]
        }]

        contents = [{"role": "user", "parts": [{"text": prompt}]}]
        provider = await self.get_provider(session)
        res = await provider.generate_content(
            contents=contents,
            system_instruction="Plan efficiently. Only output tool call.",
            tools=tools
        )

        created_tasks = []
        try:
            candidates = res.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                for part in parts:
                    call = part.get("functionCall")
                    if call and call.get("name") == "schedule_tasks":
                        tasks_list = call.get("args", {}).get("tasks", [])
                        for t in tasks_list:
                            deadline_str = f"{t.get('date', '')}T23:59:59Z"
                            task_id = str(uuid.uuid4())
                            
                            # Insert into database
                            await session.execute(
                                text(
                                    "INSERT INTO tasks (task_id, school_id, user_type, parent_id, task_name, "
                                    "complete_percentage, status, priority, entity_type, entity_id, "
                                    "is_ai_generated, deadline) "
                                    "VALUES (:tid, :sid, 'employee', :pid, :name, 0.0, 'pending', :priority, :etype, :eid, true, :deadline::timestamp)"
                                ),
                                {
                                    "tid": task_id,
                                    "sid": school_id,
                                    "pid": employee_id,
                                    "name": t.get("task_name", "AI Task"),
                                    "priority": t.get("priority", "Medium"),
                                    "etype": t.get("entity_type", "topic"),
                                    "eid": t.get("entity_id", ""),
                                    "deadline": deadline_str
                                }
                            )
                            created_tasks.append(task_id)
            await session.commit()
        except Exception as e:
            await session.rollback()
            print(f"Failed to generate weekly tasks: {e}")

        return {"success": True, "tasks_created": len(created_tasks), "tasks": created_tasks}

    async def reorganize_tasks(self, session: AsyncSession, school_id: str, employee_id: str) -> Dict[str, Any]:
        """Reschedule pending past-deadline AI tasks."""
        # 1. Fetch pending past tasks
        past_tasks_result = await session.execute(
            text(
                "SELECT task_id, task_name, deadline FROM tasks "
                "WHERE school_id = :sid AND parent_id = :pid AND status != 'completed' "
                "AND deadline < CURRENT_TIMESTAMP AND is_ai_generated = true"
            ),
            {"sid": school_id, "pid": employee_id}
        )
        past_tasks = past_tasks_result.all()
        if not past_tasks:
            return {"success": True, "message": "No pending tasks to reorganize."}

        tasks_str = ""
        for row in past_tasks:
            tasks_str += f"Task: {row[1]}\n"

        # 2. Fetch holidays in next 14 days
        holiday_result = await session.execute(
            text(
                "SELECT date, status FROM attendance "
                "WHERE school_id = :sid AND role = 'holiday' "
                "AND date >= CURRENT_DATE AND date <= (CURRENT_DATE + INTERVAL '14 days')"
            ),
            {"sid": school_id}
        )
        upcoming_holidays = ""
        for h in holiday_result.all():
            upcoming_holidays += f"{h[0]} ({h[1] or 'Holiday'})\n"

        prompt = (
            f"Teacher has missed these tasks:\n{tasks_str}\n"
            f"Upcoming holidays: {upcoming_holidays}\n"
            f"Reschedule these tasks starting from tomorrow.\n"
            f"Call 'reorganize_tool' with new dates for these tasks."
        )

        tools = [{
            "function_declarations": [{
                "name": "reorganize_tool",
                "description": "Update deadlines for tasks.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "updates": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "task_name": { "type": "string" },
                                    "new_date": { "type": "string", "description": "YYYY-MM-DD" }
                                }
                            }
                        }
                    },
                    "required": ["updates"]
                }
            }]
        }]

        contents = [{"role": "user", "parts": [{"text": prompt}]}]
        provider = await self.get_provider(session)
        res = await provider.generate_content(
            contents=contents,
            system_instruction="Plan efficiently.",
            tools=tools
        )

        updated_count = 0
        try:
            candidates = res.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                for part in parts:
                    call = part.get("functionCall")
                    if call and call.get("name") == "reorganize_tool":
                        updates = call.get("args", {}).get("updates", [])
                        for u in updates:
                            tname = u.get("task_name", "")
                            new_date = f"{u.get('new_date', '')}T23:59:59Z"
                            
                            await session.execute(
                                text(
                                    "UPDATE tasks SET deadline = :deadline::timestamp, status = 'pending' "
                                    "WHERE school_id = :sid AND parent_id = :pid AND task_name = :tname AND is_ai_generated = true"
                                ),
                                {
                                    "deadline": new_date,
                                    "sid": school_id,
                                    "pid": employee_id,
                                    "tname": tname
                                }
                            )
                            updated_count += 1
            await session.commit()
        except Exception as e:
            await session.rollback()
            print(f"Failed to reorganize tasks: {e}")

        return {"success": True, "message": f"Reorganized {updated_count} tasks"}

    async def generate_exam_questions(self, session: AsyncSession, school_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Generate full exam questions according to template type rules."""
        class_id = payload.get("classId", "")
        subject = payload.get("subject", "")
        difficulty = payload.get("difficulty", "Medium")
        format_val = payload.get("format", "Mixed")
        
        template = payload.get("template", payload.get("template_type", ""))
        total_marks = payload.get("totalMarks", payload.get("total_marks", 0))

        if total_marks == 30 or "nursery" in template.lower():
            template_prompt = (
                "The exam must strictly follow the Nursery pattern for a total of 30 marks: "
                "- Exactly 10 MCQ questions (each 1 mark) "
                "- Exactly 5 Match the following questions (each 2 marks) "
                "- Exactly 5 Oral or Tracing questions (each 2 marks). "
                "Each question object MUST have a type of 'MCQ', 'Match', or 'Oral'/'Trace' and include a \"marks\" integer field with the correct weight."
            )
            num_questions_str = "Exactly 20 questions matching the Nursery schema specified above"
        elif total_marks == 50 or "primary" in template.lower():
            template_prompt = (
                "The exam must strictly follow the Primary pattern for a total of 50 marks: "
                "- Exactly 15 MCQ questions (each 1 mark) "
                "- Exactly 10 Short Answer questions (each 2 marks) "
                "- Exactly 3 Long Answer questions (each 5 marks). "
                "Each question object MUST have a type of 'MCQ', 'Short', or 'Long' and include a \"marks\" integer field with the correct weight."
            )
            num_questions_str = "Exactly 28 questions matching the Primary schema specified above"
        elif total_marks == 70 or "secondary" in template.lower():
            template_prompt = (
                "The exam must strictly follow the Secondary pattern for a total of 70 marks: "
                "- Exactly 20 MCQ questions (each 1 mark) "
                "- Exactly 15 Short Answer questions (each 2 marks) "
                "- Exactly 4 Long Answer questions (each 5 marks). "
                "Each question object MUST have a type of 'MCQ', 'Short', or 'Long' and include a \"marks\" integer field with the correct weight."
            )
            num_questions_str = "Exactly 39 questions matching the Secondary schema specified above"
        else:
            template_prompt = (
                "Design a balanced mix of MCQ (1 mark), Short Answer (2 marks), and Long Answer (5 marks) questions. "
                "Each question object MUST include a \"marks\" integer field with the correct weight."
            )
            num_questions_str = "5 excellent questions"

        prompt = (
            f"You are Vidhyam AI.\n"
            f"Design a professional school exam for class level: '{class_id}' and Subject: '{subject}'.\n"
            f"Difficulty level: '{difficulty}'.\n"
            f"Desired format: '{format_val}' (e.g. MCQ, Short Answer, Long Answer, or Mixed).\n"
            f"{template_prompt}\n"
            f"Generate a JSON array using tool 'save_exam'. The array MUST have objects exactly matching:\n"
            f"{{ \"type\": \"MCQ\" | \"Short\" | \"Long\" | \"Match\" | \"Oral\" | \"Trace\", \"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"] (only for MCQ), \"answer\": \"...\", \"marks\": i32 }}\n"
            f"Provide {num_questions_str}."
        )

        tools = [{
            "function_declarations": [{
                "name": "save_exam",
                "description": "Save generated exam questions.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "questions": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "type": { "type": "string" },
                                    "question": { "type": "string" },
                                    "options": { "type": "array", "items": { "type": "string" } },
                                    "answer": { "type": "string" },
                                    "marks": { "type": "integer" }
                                },
                                "required": ["type", "question", "answer", "marks"]
                            }
                        }
                    },
                    "required": ["questions"]
                }
            }]
        }]

        contents = [{"role": "user", "parts": [{"text": prompt}]}]
        provider = await self.get_provider(session)
        res = await provider.generate_content(
            contents=contents,
            system_instruction="Draft academic exam questions.",
            tools=tools
        )

        questions = []
        candidates = res.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                call = part.get("functionCall")
                if call and call.get("name") == "save_exam":
                    questions = call.get("args", {}).get("questions", [])
                    break
        return {"success": True, "data": questions}

    async def regenerate_exam_question(self, session: AsyncSession, school_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Regenerate a single question in an exam section and update the database."""
        section_id = payload.get("examSectionId", payload.get("sectionId"))
        if not section_id:
            raise ValueError("examSectionId is required")
        question_index = payload.get("questionIndex")
        if question_index is None:
            raise ValueError("questionIndex is required")
        question_index = int(question_index)

        # 1. Fetch current questions
        result = await session.execute(
            text("SELECT questions FROM exam_sections WHERE school_id = :sid AND id = :id"),
            {"sid": school_id, "id": int(section_id)}
        )
        row = result.first()
        if not row:
            raise Exception("Exam section not found")

        # Questions is JSONB list
        questions_arr = row[0] if isinstance(row[0], list) else json.loads(row[0] or "[]")
        if question_index >= len(questions_arr):
            raise IndexError("Question index out of bounds")

        original_q = questions_arr[question_index]
        q_type = original_q.get("type", "MCQ")
        q_marks = original_q.get("marks", 1)
        q_text = original_q.get("question", "")

        topic = payload.get("topic", "")
        difficulty = payload.get("difficulty", "Medium")
        class_id = payload.get("classId", "")
        subject = payload.get("subject", "")

        # 2. Call Gemini
        prompt = (
            f"You are a professional school examiner.\n"
            f"Regenerate exactly ONE question to replace an existing one.\n"
            f"Target Question Type: '{q_type}'\n"
            f"Target Marks: {q_marks}\n"
            f"Topic/Context: '{topic}'\n"
            f"Subject: '{subject}'\n"
            f"Class Level: '{class_id}'\n"
            f"Difficulty: '{difficulty}'\n"
            f"Original question to replace (do not generate a duplicate of this): '{q_text}'\n\n"
            f"Generate a single question object using the tool 'save_single_question'. The object MUST exactly match:\n"
            f"{{ \"type\": \"{q_type}\", \"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"] (only if MCQ), \"answer\": \"...\", \"marks\": {q_marks} }}"
        )

        tools = [{
            "function_declarations": [{
                "name": "save_single_question",
                "description": "Save the single regenerated question.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "question": {
                            "type": "object",
                            "properties": {
                                "type": { "type": "string" },
                                "question": { "type": "string" },
                                "options": { "type": "array", "items": { "type": "string" } },
                                "answer": { "type": "string" },
                                "marks": { "type": "integer" }
                            },
                            "required": ["type", "question", "answer", "marks"]
                        }
                    },
                    "required": ["question"]
                }
            }]
        }]

        contents = [{"role": "user", "parts": [{"text": prompt}]}]
        provider = await self.get_provider(session)
        res = await provider.generate_content(
            contents=contents,
            system_instruction="Draft a single academic question.",
            tools=tools
        )

        new_question = None
        candidates = res.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                call = part.get("functionCall")
                if call and call.get("name") == "save_single_question":
                    new_question = call.get("args", {}).get("question")
                    break

        if not new_question:
            raise Exception("AI failed to generate a valid replacement question")

        # 3. Update questions array and save back to DB
        questions_arr[question_index] = new_question
        await session.execute(
            text("UPDATE exam_sections SET questions = :qs WHERE school_id = :sid AND id = :id"),
            {"qs": json.dumps(questions_arr), "sid": school_id, "id": int(section_id)}
        )
        await session.commit()

        return {
            "success": True,
            "regeneratedQuestion": new_question,
            "questions": questions_arr
        }

    async def grade_test_submission(self, session: AsyncSession, school_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Grades MCQ (OMR) submissions deterministically, or essay submissions via Gemini API."""
        student_id = payload.get("studentId")
        exam_id_str = payload.get("examId")
        submission_type = payload.get("submissionType", "exam")
        is_omr = payload.get("isOmr", False)
        student_answers = payload.get("answers", [])

        if not student_id or not exam_id_str:
            raise ValueError("studentId and examId are required")

        exam_id_i32 = int(exam_id_str)
        strictness = payload.get("strictness", "medium")

        # 1. Fetch exam questions & default strictness
        result = await session.execute(
            text(
                "SELECT es.questions, es.total_marks, COALESCE(e.strictness_level, 'medium') as strictness "
                "FROM exam_sections es "
                "JOIN exams e ON e.id = es.exam_id AND e.school_id = es.school_id "
                "WHERE es.school_id = :sid AND es.exam_id = :eid"
            ),
            {"sid": school_id, "eid": exam_id_i32}
        )
        row = result.first()
        if not row:
            raise Exception(f"Exam section questions not found for exam_id {exam_id_str}")

        questions_arr = row[0] if isinstance(row[0], list) else json.loads(row[0] or "[]")
        total_marks = int(row[1] or 100)
        exam_strictness = row[2]

        effective_strictness = exam_strictness if strictness == "exam_default" else strictness

        final_score = 0.0
        criteria_scores = []
        overall_feedback = ""

        # 2. Grading path
        if is_omr:
            # Deterministic scoring for OMR multiple choice
            correct_count = 0
            for idx, q in enumerate(questions_arr):
                max_marks = float(q.get("marks", 1))
                correct_ans = str(q.get("answer", "")).strip()
                
                # Match index
                student_ans = ""
                for ans in student_answers:
                    if ans.get("questionIndex") == idx:
                        student_ans = str(ans.get("answerText", "")).strip()
                        break

                is_correct = student_ans.lower() == correct_ans.lower()
                scored_marks = max_marks if is_correct else 0.0
                if is_correct:
                    correct_count += 1
                final_score += scored_marks

                criteria_scores.append({
                    "question_index": idx,
                    "type": q.get("type", "MCQ"),
                    "max_marks": max_marks,
                    "score": scored_marks,
                    "correct_answer": correct_ans,
                    "student_answer": student_ans,
                    "feedback": "Correct answer" if is_correct else "Incorrect answer"
                })
            overall_feedback = f"OMR Auto-Graded successfully. Correct: {correct_count}/{len(questions_arr)} questions."
        else:
            # AI evaluation for descriptive responses
            questions_prompt = ""
            for idx, q in enumerate(questions_arr):
                questions_prompt += (
                    f"Question {idx}: (Type: {q.get('type','')}, Max Marks: {q.get('marks',1)})\n"
                    f"Text: {q.get('question','')}\n"
                    f"Correct Answer Key: {q.get('answer','')}\n\n"
                )

            student_prompt = ""
            for ans in student_answers:
                student_prompt += f"Student Response for Question {ans.get('questionIndex')}: '{ans.get('answerText','')}'\n"

            strictness_guide = {
                "hard": "Be very strict and critical. Deduct marks for minor errors, incomplete reasoning, or imprecise wording.",
                "low": "Be lenient. Award partial marks generously. Focus on conceptual understanding.",
            }.get(effective_strictness, "Be balanced and fair. Award marks proportionally for reasonable approaches.")

            prompt = (
                f"You are an expert academic grader.\n"
                f"Grade this student's exam submission fairly based on the questions and answer key provided.\n\n"
                f"Strictness Level: {effective_strictness} — {strictness_guide}\n\n"
                f"EXAM QUESTIONS AND KEY:\n{questions_prompt}\n"
                f"STUDENT SUBMISSIONS:\n{student_prompt}\n"
                f"Grade each response. Provide a partial or full score based on max marks, brief qualitative feedback, and overall qualitative feedback.\n"
                f"Use the tool 'save_grading' to submit the scores."
            )

            tools = [{
                "function_declarations": [{
                    "name": "save_grading",
                    "description": "Save AI grading results.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "overall_score": { "type": "number" },
                            "feedback": { "type": "string" },
                            "criteria_scores": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "question_index": { "type": "integer" },
                                        "score": { "type": "number" },
                                        "feedback": { "type": "string" }
                                    },
                                    "required": ["question_index", "score", "feedback"]
                                }
                            }
                        },
                        "required": ["overall_score", "feedback", "criteria_scores"]
                    }
                }]
            }]

            contents = [{"role": "user", "parts": [{"text": prompt}]}]
            provider = await self.get_provider(session)
            res = await provider.generate_content(
                contents=contents,
                system_instruction="Grade academic exams accurately.",
                tools=tools
            )

            candidates = res.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                for part in parts:
                    call = part.get("functionCall")
                    if call and call.get("name") == "save_grading":
                        args = call.get("args", {})
                        final_score = float(args.get("overall_score", 0.0))
                        overall_feedback = args.get("feedback", "")
                        criteria_scores = args.get("criteria_scores", [])
                        break

        # Calculate Grade
        percentage = (final_score / max(total_marks, 1)) * 100.0
        if percentage >= 90.0:
            grade = "A"
        elif percentage >= 80.0:
            grade = "B"
        elif percentage >= 70.0:
            grade = "C"
        elif percentage >= 60.0:
            grade = "D"
        else:
            grade = "F"

        # 3. Save to database
        submission_id = str(uuid.uuid4())
        try:
            # Save submission
            await session.execute(
                text(
                    "INSERT INTO student_submissions (submission_id, school_id, student_id, exam_id, submission_type, content, status) "
                    "VALUES (:sid, :school, :student, :exam, :stype, :content, 'ai_graded')"
                ),
                {
                    "sid": submission_id,
                    "school": school_id,
                    "student": student_id,
                    "exam": exam_id_str,
                    "stype": submission_type,
                    "content": json.dumps(student_answers)
                }
            )

            # Save AI grading results
            await session.execute(
                text(
                    "INSERT INTO ai_grading_results (submission_id, school_id, overall_score, grade, criteria_scores, feedback, "
                    "confidence_score, grading_provider, grading_model, strictness_used) "
                    "VALUES (:sid, :school, :score, :grade, :criteria::jsonb, :feedback, 95.0, 'Gemini', 'gemini-2.5-flash', :strictness)"
                ),
                {
                    "sid": submission_id,
                    "school": school_id,
                    "score": final_score,
                    "grade": grade,
                    "criteria": json.dumps(criteria_scores),
                    "feedback": overall_feedback,
                    "strictness": effective_strictness
                }
            )
            await session.commit()
        except Exception as e:
            await session.rollback()
            print(f"Failed to record grading results: {e}")
            raise e

        return {
            "success": True,
            "submissionId": submission_id,
            "overallScore": final_score,
            "grade": grade,
            "feedback": overall_feedback,
            "criteriaScores": criteria_scores
        }
