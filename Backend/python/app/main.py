import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.migrations import run_database_migrations
from app.services.ai.background_evaluator import start_ai_background_worker
from app.services.ai.grpc_server import serve_grpc
from app.api.v1.ai import router as ai_router
from app.api.v1.academic import router as academic_router
from app.api.v1.auth import router as auth_router
from app.api.v1.stubs import router as stubs_router


background_tasks = set()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Run migrations on startup
    try:
        await run_database_migrations()
    except Exception as e:
        print(f"[STARTUP] Migrations failed: {e}")

    # 2. Start background worker task
    worker_task = asyncio.create_task(start_ai_background_worker())
    background_tasks.add(worker_task)
    worker_task.add_done_callback(background_tasks.discard)

    # 3. Start gRPC Server task
    grpc_task = asyncio.create_task(serve_grpc())
    background_tasks.add(grpc_task)
    grpc_task.add_done_callback(background_tasks.discard)

    print("[STARTUP] FastAPI initialization complete.")
    yield
    
    # 3. Clean up tasks on shutdown
    print("[SHUTDOWN] Cancelling background worker tasks...")
    for task in list(background_tasks):
        task.cancel()
    if background_tasks:
        await asyncio.gather(*background_tasks, return_exceptions=True)
    print("[SHUTDOWN] Complete.")

app = FastAPI(
    title="Modernisum AI School Management API",
    description="Python Backend API supporting RAG and AI-driven school workflows",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes (order matters - specific routes before catch-all)
app.include_router(ai_router, prefix="/api")
app.include_router(academic_router, prefix="/api")
app.include_router(auth_router)
app.include_router(stubs_router)  # catch-all last, no prefix


@app.get("/health")
def healthcheck():
    return {"status": "healthy", "service": "python-backend"}
