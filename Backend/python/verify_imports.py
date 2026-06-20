import sys
import os

# Add current directory to python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Testing python imports...")
try:
    from app.config import settings
    print("OK: app.config loaded successfully")
    
    from app.db.session import engine, async_session_factory
    print("OK: app.db.session loaded successfully")
    
    from app.db.connection_utils import ConnectionUtils
    print("OK: app.db.connection_utils loaded successfully")
    
    from app.middleware.rls import get_db_with_rls, get_tenant_context
    print("OK: app.middleware.rls loaded successfully")
    
    from app.services.ai.providers import GeminiProvider, DeepSeekProvider, OllamaProvider
    print("OK: app.services.ai.providers loaded successfully")
    
    from app.services.ai.ai_cache import AiCacheService
    print("OK: app.services.ai.ai_cache loaded successfully")
    
    from app.services.ai.prompt_builder import PromptBuilder
    print("OK: app.services.ai.prompt_builder loaded successfully")
    
    from app.services.ai.analysis import AnalysisEngine
    print("OK: app.services.ai.analysis loaded successfully")
    
    from app.services.ai.prediction import PredictionEngine
    print("OK: app.services.ai.prediction loaded successfully")
    
    from app.services.ai.syllabus_planner import SyllabusPlanner
    print("OK: app.services.ai.syllabus_planner loaded successfully")
    
    from app.services.ai.chat_handler import ChatHandler
    print("OK: app.services.ai.chat_handler loaded successfully")
    
    from app.services.ai.background_evaluator import start_ai_background_worker
    print("OK: app.services.ai.background_evaluator loaded successfully")
    
    from app.services.ai.orchestrator import AiOrchestrator
    print("OK: app.services.ai.orchestrator loaded successfully")
    
    from app.api.v1.ai import router as ai_router
    print("OK: app.api.v1.ai loaded successfully")
    
    from app.api.v1.academic import router as academic_router
    print("OK: app.api.v1.academic loaded successfully")
    
    from app.main import app
    print("OK: app.main loaded successfully")
    
    print("\nAll modules imported successfully without syntax errors!")
except Exception as e:
    print(f"\nERROR: Error during import validation: {str(e)}")
    sys.exit(1)
