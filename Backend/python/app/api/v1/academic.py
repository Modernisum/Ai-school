from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.middleware.rls import get_db_with_rls
from app.services.ai.orchestrator import AiOrchestrator
from pydantic import BaseModel

router = APIRouter()
orchestrator = AiOrchestrator()

class RestructurePayload(BaseModel):
    teacherId: str
    date: str

class PlotPayload(BaseModel):
    academicYear: Optional[int] = 2026
    spaceId: Optional[str] = "general"

class MicroPlanPayload(BaseModel):
    fromDate: str
    toDate: str
    spaceId: Optional[str] = "general"

class GenerateExamPayload(BaseModel):
    subjectId: str
    classId: str
    chapterIds: list[int]
    totalMarks: int
    difficulty: Optional[str] = "medium"

class RegenerateQuestionPayload(BaseModel):
    currentQuestion: Dict[str, Any]
    difficulty: Optional[str] = "medium"
    topicConstraint: Optional[str] = None

class SubmitTestPayload(BaseModel):
    studentId: str
    examId: str
    answers: list[Dict[str, Any]]

# Exams AI Generate
@router.post("/school/{schoolId}/academic/exams/ai/generate")
async def ai_generate_exam(
    schoolId: str,
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_db_with_rls)
):
    try:
        data = await orchestrator.generate_exam_questions(session, schoolId, payload)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Exams AI Regenerate Single Question
@router.post("/school/{schoolId}/academic/exams/ai/regenerate-question")
async def ai_regenerate_question(
    schoolId: str,
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_db_with_rls)
):
    try:
        data = await orchestrator.regenerate_exam_question(session, schoolId, payload)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Submit exam and grade using AI
@router.post("/school/{schoolId}/academic/exams/submit-test")
async def submit_test(
    schoolId: str,
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_db_with_rls)
):
    try:
        data = await orchestrator.grade_test_submission(session, schoolId, payload)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Syllabus annual plot
@router.post("/school/{schoolId}/academic/syllabus/{responsibilityId}/plot")
async def plot_annual(
    schoolId: str,
    responsibilityId: str,
    payload: PlotPayload,
    session: AsyncSession = Depends(get_db_with_rls)
):
    try:
        # derivations matching Rust: spaceId is the class_id
        # subject_id can be responsibilityId
        data = await orchestrator.annual_syllabus_plot(
            session=session,
            school_id=schoolId,
            class_id=payload.spaceId,
            subject_id=responsibilityId,
            academic_year=payload.academicYear
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Syllabus micro plan period level
@router.post("/school/{schoolId}/academic/syllabus/{responsibilityId}/micro-plan")
async def micro_plan_periods(
    schoolId: str,
    responsibilityId: str,
    payload: MicroPlanPayload,
    session: AsyncSession = Depends(get_db_with_rls)
):
    try:
        data = await orchestrator.micro_plan_period_level(
            session=session,
            school_id=schoolId,
            class_id=payload.spaceId,
            subject_id=responsibilityId,
            from_date=payload.fromDate,
            to_date=payload.toDate
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Restructure period plans on delay
@router.post("/school/{schoolId}/academic/period-plans/restructure")
async def restructure_pending(
    schoolId: str,
    payload: RestructurePayload,
    session: AsyncSession = Depends(get_db_with_rls)
):
    try:
        data = await orchestrator.restructure_syllabus_on_delay(
            session=session,
            school_id=schoolId,
            teacher_id=payload.teacherId,
            date=payload.date
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
