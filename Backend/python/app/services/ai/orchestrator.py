from typing import Dict, Any, List, Optional, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.ai.chat_handler import ChatHandler
from app.services.ai.analysis import AnalysisEngine
from app.services.ai.prediction import PredictionEngine
from app.services.ai.syllabus_planner import SyllabusPlanner

class AiOrchestrator:
    def __init__(self):
        self.chat_handler = ChatHandler()
        self.analysis = AnalysisEngine()
        self.prediction = PredictionEngine()
        self.syllabus_planner = SyllabusPlanner()

    async def process_query(self, session: AsyncSession, school_id: str, query: str) -> Dict[str, Any]:
        return await self.chat_handler.process_query(session, school_id, query)

    async def process_session_query(self, session: AsyncSession, school_id: str, session_id: str, query: str) -> Dict[str, Any]:
        return await self.chat_handler.process_query(session, school_id, query)

    async def post_session_query_stream(
        self, 
        session: AsyncSession, 
        school_id: str, 
        session_id: str, 
        query: str
    ) -> AsyncGenerator[str, None]:
        async for chunk in self.chat_handler.post_session_query_stream(session, school_id, session_id, query):
            yield chunk

    async def generate_embedding(self, session: AsyncSession, text_data: str) -> List[float]:
        return await self.analysis.generate_embedding(session, text_data)

    async def search_documents(self, session: AsyncSession, school_id: str, query: str) -> Dict[str, Any]:
        return await self.analysis.search_documents(session, school_id, query)

    async def generate_weekly_tasks_for_employee(self, session: AsyncSession, school_id: str, employee_id: str) -> Dict[str, Any]:
        return await self.prediction.generate_weekly_tasks_for_employee(session, school_id, employee_id)

    async def reorganize_tasks(self, session: AsyncSession, school_id: str, employee_id: str) -> Dict[str, Any]:
        return await self.prediction.reorganize_tasks(session, school_id, employee_id)

    async def generate_exam_questions(self, session: AsyncSession, school_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        return await self.prediction.generate_exam_questions(session, school_id, payload)

    async def regenerate_exam_question(self, session: AsyncSession, school_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        return await self.prediction.regenerate_exam_question(session, school_id, payload)

    async def grade_test_submission(self, session: AsyncSession, school_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        return await self.prediction.grade_test_submission(session, school_id, payload)

    async def annual_syllabus_plot(self, session: AsyncSession, school_id: str, class_id: str, subject_id: str, academic_year: int) -> Dict[str, Any]:
        return await self.syllabus_planner.annual_syllabus_plot(session, school_id, class_id, subject_id, academic_year)

    async def micro_plan_period_level(self, session: AsyncSession, school_id: str, class_id: str, subject_id: str, from_date: str, to_date: str) -> Dict[str, Any]:
        return await self.syllabus_planner.micro_plan_period_level(session, school_id, class_id, subject_id, from_date, to_date)

    async def restructure_syllabus_on_delay(self, session: AsyncSession, school_id: str, teacher_id: str, date: str) -> Dict[str, Any]:
        return await self.syllabus_planner.restructure_syllabus_on_delay(session, school_id, teacher_id, date)
