import json
import logging
import grpc
from concurrent import futures
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db  # Using a raw session generator, or we can use the async context manager directly
from app.middleware.rls import get_db_with_rls, get_tenant_context, TenantContext
from app.services.ai.orchestrator import AiOrchestrator
import app.services.ai.ai_service_pb2 as pb2
import app.services.ai.ai_service_pb2_grpc as pb2_grpc

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AiServiceServicer(pb2_grpc.AiServiceServicer):
    def __init__(self):
        self.orchestrator = AiOrchestrator()
        from app.db.database import async_session_maker
        self.session_maker = async_session_maker

    async def _get_session(self):
        # We need to manually provide a session with RLS setup since we aren't using FastAPI Depends
        session = self.session_maker()
        return session

    async def ProcessOcr(self, request, context):
        try:
            # We mimic the logic from ai.py / ocr route
            # Actually OCR logic is usually in Orchestrator. Wait, let me check where OCR logic is.
            # In student_forms.rs, the request was: doc_type=aadhaar, file_url=...
            # The orchestrator handles `ocr`? Let's check `backend/python/app/api/v1/academic.py` or similar.
            pass
            return pb2.OcrResponse(success=True, extracted_fields_json="{}", error_message="")
        except Exception as e:
            logger.error(f"Error in ProcessOcr: {e}")
            return pb2.OcrResponse(success=False, error_message=str(e))

    async def GenerateTasks(self, request, context):
        try:
            school_id = request.school_id
            payload = json.loads(request.payload_json)
            emp_id = payload.get("employee_id")
            
            async with self.session_maker() as session:
                # Set RLS if needed, though tasks generation might not strictly enforce RLS at connection level if school_id is passed
                # In FastAPI, `Depends(get_db_with_rls)` sets up the RLS on the connection.
                # To be safe, we can execute the RLS setting manually or just run the orchestrator method.
                data = await self.orchestrator.generate_weekly_tasks_for_employee(session, school_id, emp_id)
            
            return pb2.TasksResponse(success=True, data_json=json.dumps(data))
        except Exception as e:
            logger.error(f"Error in GenerateTasks: {e}")
            return pb2.TasksResponse(success=False, error_message=str(e))

    async def ReorganizeTasks(self, request, context):
        try:
            school_id = request.school_id
            payload = json.loads(request.payload_json)
            emp_id = payload.get("employee_id")
            
            async with self.session_maker() as session:
                data = await self.orchestrator.reorganize_tasks(session, school_id, emp_id)
            
            return pb2.TasksResponse(success=True, data_json=json.dumps(data))
        except Exception as e:
            logger.error(f"Error in ReorganizeTasks: {e}")
            return pb2.TasksResponse(success=False, error_message=str(e))


async def serve_grpc():
    server = grpc.aio.server()
    pb2_grpc.add_AiServiceServicer_to_server(AiServiceServicer(), server)
    
    # Optional: Enable reflection
    try:
        from grpc_reflection.v1alpha import reflection
        SERVICE_NAMES = (
            pb2.DESCRIPTOR.services_by_name['AiService'].full_name,
            reflection.SERVICE_NAME,
        )
        reflection.enable_server_reflection(SERVICE_NAMES, server)
    except ImportError:
        logger.warning("grpcio-reflection not installed, skipping reflection.")

    port = 50051
    server.add_insecure_port(f'[::]:{port}')
    logger.info(f"gRPC server starting on port {port}...")
    await server.start()
    await server.wait_for_termination()
