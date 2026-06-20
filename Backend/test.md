# Backend Testing Instructions

To test the backend after the folder restructuring and gRPC integration:

## 1. Rust Main Backend
1. Navigate to the Rust directory: `cd backend/rust`
2. Run database migrations: `sqlx migrate run --source ../migrations`
3. Run the development server: `cargo run`
4. The server will start on port 8000. It will attempt to connect to the Python gRPC server at `http://localhost:50051`.

## 2. Python AI Microservice
1. Navigate to the Python directory: `cd backend/python`
2. Activate your virtual environment and install dependencies: `pip install -r requirements.txt`
3. Run the application: `uvicorn app.main:app --reload --port 8080`
   *(This starts the FastAPI server on 8080 and asynchronously starts the gRPC server on 50051).*

## 3. Docker Compose
To run everything together, use the `docker-compose.yml` located in the root directory:
```bash
docker-compose up --build
```
This will automatically map the correct volumes from `backend/rust` and `backend/python` and handle inter-container networking (the Rust container will access `http://ai_backend:50051`).
