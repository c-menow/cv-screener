-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- One row per chunk of a CV (e.g. one section: skills, work history, education...)
CREATE TABLE IF NOT EXISTS cv_chunks (
    id           SERIAL PRIMARY KEY,
    cv_id        TEXT NOT NULL,          -- e.g. "cv_014" (groups chunks back into one CV)
    source_file  TEXT NOT NULL,          -- original PDF filename
    candidate_name TEXT,
    candidate_email TEXT,
    section      TEXT NOT NULL,          -- "summary" | "work_history" | "education" | "skills" | "full"
    content      TEXT NOT NULL,          -- the chunk text itself
    embedding    vector(768) NOT NULL,   -- all-MiniLM-L6-v2 output dimension
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- Speeds up nearest-neighbor search once you have more than a few thousand rows.
-- (Not strictly necessary at 25-30 CVs / ~150 rows, but included so this scales.)
CREATE INDEX IF NOT EXISTS cv_chunks_embedding_idx
    ON cv_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 10);

CREATE INDEX IF NOT EXISTS cv_chunks_cv_id_idx ON cv_chunks (cv_id);