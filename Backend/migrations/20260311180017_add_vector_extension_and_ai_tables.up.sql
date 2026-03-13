-- Fallback: Use standard REAL[] arrays instead of pgvector
-- due to Windows PostgreSQL extension limitations.

-- Create ai_query_cache table for Semantic Caching & Text-to-SQL
CREATE TABLE IF NOT EXISTS ai_query_cache (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    question_text TEXT NOT NULL,
    question_embedding REAL[] NOT NULL, -- 768 dims (Gemini)
    generated_sql TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row-Level Security on ai_query_cache
ALTER TABLE ai_query_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS Policy for ai_query_cache
CREATE POLICY ai_query_cache_isolation_policy ON ai_query_cache
    FOR ALL
    USING (school_id = current_setting('app.current_school_id', true));

-- Create document_embeddings table for NotebookLM-like RAG
CREATE TABLE IF NOT EXISTS document_embeddings (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    document_id VARCHAR(100) NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_embedding REAL[] NOT NULL, -- 768 dims
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row-Level Security on document_embeddings
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Create RLS Policy for document_embeddings
CREATE POLICY document_embeddings_isolation_policy ON document_embeddings
    FOR ALL
    USING (school_id = current_setting('app.current_school_id', true));

-- Note: Cannot use hnsw/ivfflat indexes with standard REAL[] arrays.
-- Vector similarity (Cosine distance) will be calculated in Rust instead of SQL.
