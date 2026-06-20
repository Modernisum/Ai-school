# 🤖 Chapter 12: AI & OCR Domain Manual

Yeh manual school chat assistants, vector text embeddings, similarity queries, curriculum creators, aur OCR text extraction tools ko discuss karta hai.

---

## 📖 Overview aur Features (Udeshya aur Suvidhayein)

### 🎯 Feature Purpose (Kyun banaya gaya hai)
Predictive analytics, AI chatbot answers, aur automated syllabus timing provide karta hai. Iska kaam AI techniques se work management ko easy banana hai.


AI domain main machine learning features aur OCR techniques ko represent karta hai:
- **School Assistant Chatbot:** School result cards, holidays aur queries ke automated answers deta hai.
- **AI Task Manager:** Employee task lists ko AI se auto-generate aur manage karta hai.
- **AI Paper Generator:** Different chapters aur levels ke hisab se exam papers create karta hai.
- **AI Lesson Planner:** Topics ko daily timelines aur simple objectives mein slice karta hai.
- **AI Practice Problems:** Students ke liye homework sheets aur dynamic practice questions generate karta hai.
- **Text Embeddings & Search:** Documents ko vectors mein convert karke similarity checks lagata hai.
- **OCR Text Extraction:** Printed report cards, receipts aur scans ko read karke structured keys extract karta hai.

---

## 🏗️ Architecture aur Data Flow

### 🛠️ Tech Stack aur Dependencies
- **Main API Framework:** Rust (Axum)
- **AI Microservice Framework:** Python (FastAPI + gRPC)
- **Database:** Postgres (sqlx) / Vector DB (Qdrant/Milvus).
- **ML/AI:** Python-based AI logic (OpenAI API, local inference), communicating asynchronously with Rust via gRPC (`ai_service.proto`).



## 🔌 API Reference aur Specs (API Ki Jankari)


### 1. School Assistant Chat Bots

#### A. Submit Query to Assistant
- **Endpoint:** `POST /api/school/:schoolId/query`
- **Request Body:**
  ```json
  {
    "query": "How many students are registered in Class 10-A?"
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "reply": "There are currently 40 students registered in Class 10-A. The class teacher is Sunita Rao.",
      "tokensUsed": 105
    }
  }
  ```#### B. Start New Research Session
- **Endpoint:** `POST /api/school/:schoolId/ai/session`
- **Request Body:**
  ```json
  {
    "title": "Optional Session Title"
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "session_id": "486ed515-3d31-470c-a8a7-b864636f5003"
  }
  ```

#### C. Submit Query in Session Context
- **Endpoint:** `POST /api/school/:schoolId/ai/session/:sessionId/query`
- **Request Body:**
  ```json
  {
    "query": "How many students are registered?"
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "parts": [
        {
          "text": "There are currently 13 students registered in your school."
        }
      ]
    }
  }
  ```

#### D. Fetch Session History
- **Endpoint:** `GET /api/school/:schoolId/ai/session/:sessionId/history`
- **Success Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 29,
        "role": "user",
        "content": "How many students are registered?",
        "created_at": "2026-06-11T00:17:06.564Z"
      },
      {
        "id": 30,
        "role": "model",
        "content": "There are currently 13 students registered in your school.",
        "created_at": "2026-06-11T00:17:06.569Z"
      }
    ]
  }
  ```

#### E. List All Active Sessions
- **Endpoint:** `GET /api/school/:schoolId/ai/sessions`
- **Success Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "session_id": "486ed515-3d31-470c-a8a7-b864636f5003",
        "school_id": "689225",
        "user_id": "admin_user",
        "title": "School 689225 Research Session",
        "is_active": true,
        "created_at": "2026-06-11T00:17:06.497Z",
        "updated_at": "2026-06-11T00:17:06.497Z"
      }
    ]
  }
  ```

#### F. Delete Research Session
- **Endpoint:** `DELETE /api/school/:schoolId/ai/session/:sessionId`
- **Success Response:**
  ```json
  {
    "success": true,
    "deleted": true
  }
  ```
#### B. Generate Tasks via Assistant
- **Endpoint:** `POST /api/school/:schoolId/ai/chat/:schoolId/tasks/generate`
- **Request Body:**
  ```json
  {
    "employeeId": "EMP-00109"
  }
  ```

---

### 2. AI Content Generator

#### A. Generate Lesson Plan
- **Endpoint:** `POST /api/school/:schoolId/ai/content/generate/lesson-plan`
- **Request Body:**
  ```json
  {
    "subject": "Physics",
    "classLevel": "11-A",
    "topic": "Reflection of Light",
    "durationMinutes": 45,
    "learningObjectives": ["Explain Snell's Law", "Calculate focal lengths"],
    "includeActivities": true
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "objectives": ["Explain Snell's Law", "Calculate focal lengths"],
      "timeline": [
        { "time": "0-10m", "activity": "Introduction to refraction" },
        { "time": "10-30m", "activity": "Mathematical focal calculations" }
      ],
      "homeworkAssigned": "Solve problem sheet 4"
    }
  }
  ```

#### B. Generate Practice Problems Worksheets
- **Endpoint:** `POST /api/school/:schoolId/ai/content/generate/practice-problems`
- **Request Body:**
  ```json
  {
    "subject": "Math",
    "topic": "Quadratic Equations",
    "problemType": "word_problems",
    "numProblems": 5,
    "includeSolutions": true
  }
  ```

---

### 3. Text Embeddings & Search

#### A. Calculate Embedding from Text
- **Endpoint:** `POST /api/school/:schoolId/ai/chat/embedding/:schoolId`
- **Request Body:**
  ```json
  {
    "text": "School admission policies for year 2026."
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "embedding": [0.0128, -0.0452, 0.0881, "..."]
    }
  }
  ```

#### B. Search similar vector documents
- **Endpoint:** `POST /api/school/:schoolId/ai/chat/embedding/:schoolId/search`
- **Request Body:**
  ```json
  {
    "query": "Admission rules",
    "limit": 3
  }
  ```

---

### 4. OCR Text Extractions

#### A. Extract Text values from Image
- **Endpoint:** `POST /api/school/:schoolId/ai/ocr/extract`
- **Headers:** `Content-Type: multipart/form-data`
- **Request Payload:** Form fields `image` (binary).
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "rawText": "BOARD OF EDUCATION ... Name: Jane Doe ... Roll: 14",
      "extractedFields": {
        "name": "Jane Doe",
        "rollNumber": "14",
        "totalMarks": 450
      }
    }
  }
  ```

#### B. Extract Text from Multiple Images (Batch OCR)
- **Endpoint:** `POST /api/school/:schoolId/ai/ocr/extract-batch`
- **Headers:** `Content-Type: multipart/form-data`
- **Request Payload:** Multiple `images` fields (binary).
- **Success Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "index": 0,
        "rawText": "Report Card 1..."
      }
    ]
  }
  ```

---

## 🕒 Update History aur Status (Badlavo ki History)

*Is section mein hum saare bade badlavo, design decisions, aur future plans ko track karte hain.*

- **OCR integration:** OCR handler code `ocr_service.rs` and endpoints `/ocr/extract` and `/ocr/extract-batch` have been fully integrated into the `/school/:schoolId/ai` domain layout, deleting the redundant `/ocr` module declarations.
- **Python Microservice Migration (gRPC):** Saara AI backend logic (Chat, Tasks, OCR) ab ek dedicated Python microservice mein migrate kar diya gaya hai. Main Rust backend ab Python server se gRPC (port `50051`) ke zariye communicate karta hai taaki hum Python ecosystem ki powerful ML/AI libraries ka easily use kar sakein.
