# CV Screener

A RAG app for screening CVs. A Gemini-powered pipeline generates a fictional set of candidate CVs, extracts and embeds their content into Postgres (pgvector) and a chat interface lets you ask questions ("Who has the most backend experience?") and get back a structured list of matching candidates.

## How it works

1. **Generate** — `generate-cvs` invents fictional candidates and renders each one as a PDF.
2. **Ingest** — `ingest-cvs` extracts text from each PDF, has Gemini structure it into JSON, splits it into per-section chunks (summary, experience, education, skills), embeds each chunk, and stores it in Postgres.
3. **Query** — the chat UI sends a question to the backend, which embeds the question, retrieves the most similar chunks via pgvector cosine similarity, groups them back by candidate, and asks Gemini to return only the candidates that actually match, as JSON (`{"matches": [{"name", "email", "reason"}]}`).

## Chat Preview

![CV Screener chat UI showing a question and a list of matching candidates](preview.png)

## Tech stack

- **Backend** — Node.js / TypeScript, Express, [`@google/genai`](https://www.npmjs.com/package/@google/genai) (Gemini for text generation, embeddings, and image generation), `pg` + [pgvector](https://github.com/pgvector/pgvector) for vector storage, `pdf-parse` / `pdfkit` for reading and writing CVs. Tests run on Vitest.
- **Frontend** — Next.js (App Router), React 19, Tailwind CSS 4, SWR.

## Project structure

```
backend/
  src/
    ai.ts            Gemini client
    app.ts            Express app (CORS, JSON body parsing, routes)
    config.ts          Env var loading
    db.ts               Postgres pool
    routes.ts            POST /api/chat
    rag/
      chunk.ts            Splits an extracted CV into per-section chunks
      embed.ts             Wraps Gemini's embedding endpoint
      extract.ts             PDF text extraction + structuring via Gemini
      store.ts                 Inserts/queries cv_chunks (pgvector)
      ingest.ts                  Orchestrates extract -> chunk -> embed -> store
      query.ts                    Orchestrates embed -> search -> answer
    scripts/
      generate-cvs.ts             Generates fictional CVs
      utils/
        seed-data.ts                Candidate names/genders used to seed generation
        build-pdf.ts                  Renders a CvData object to a PDF
        parse-response.ts               Strips markdown fences before JSON.parse
  sql/cvs.sql          Schema for the cv_chunks table
  data/cvs/              Generated CV PDFs (gitignored)
  test/rag/                Vitest suite for the rag/ pipeline

frontend/
  app/                  Root layout and chat page
  components/            Composer (chat box) + MessageList (chat messages)
  services/chat.ts         Fetcher for POST /api/chat

docker-compose.yml    Postgres/pgvector for local dev
```

## Prerequisites

- Node.js 20+
- Docker (for the local Postgres/pgvector container), or your own pgvector-enabled Postgres instance
- A [Gemini API key](https://ai.google.dev/)

## Setup

**1. Start Postgres**

From the repo root:

```bash
docker compose up -d
```

This starts a `pgvector/pgvector` Postgres container on port 5432 and runs `backend/sql/cvs.sql` on first boot to create the `cv_chunks` table.

**2. Configure environment variables**

Copy each `.env.example` and fill in your own values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env`:

```bash
GEMINI_API_KEY=your-gemini-api-key

# Must match the container's credentials — used both by docker-compose (to
# initialize Postgres) and by DATABASE_URL below (to connect to it).
DATABASE_USER=dbuser
DATABASE_PASSWORD=dbpassword
DATABASE_DB=dbname
DATABASE_URL=postgresql://dbuser:dbpassword@localhost:5432/dbname

PORT=3000
TOTAL_CVS=25     # how many CVs `generate-cvs` creates by default
TOP_K=5          # how many chunks are retrieved per chat question
```

`frontend/.env`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000   # must match backend/.env's PORT
```

**3. Install dependencies**

```bash
cd backend && npm install
cd ../frontend && npm install
```

**4. Generate and ingest CVs**

From `backend/`:

```bash
npm run generate-cvs   # creates TOTAL_CVS fictional CV PDFs in backend/data/cvs
npm run ingest-cvs     # extracts, embeds, and stores them in Postgres
```

Re-running `ingest-cvs` skips any CV that's already been ingested.

**5. Run the app**

```bash
# backend/ — listens on PORT (default 3000)
npm run dev

# frontend/ — listens on port 3002
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) and start asking questions about the candidates.

## Testing

```bash
cd backend
npm test        # runs the Vitest suite once
npm run test:watch
```

Coverage is on `backend/src/rag/` — chunking, embedding, PDF extraction, storage, and the end-to-end query orchestration — all mocked at the Gemini/Postgres boundary, so no API key or database is needed to run them.

```bash
cd frontend
npm test        # runs the Vitest suite once
npm run test:watch
```

Coverage is on `frontend/app/page.tsx` and `frontend/components/` (`Composer`, `MessageList`) — sending questions, rendering matches, sources, errors, and suggestion prompts — using Vitest, React Testing Library, and `user-event`, with `services/chat.ts` mocked so no backend is needed to run them.

## API

**`POST /api/chat`**

```jsonc
// Request
{ "message": "Who knows Rust?", "history": [{ "role": "user" | "assistant", "content": "..." }] }

// Response
{
  "answer": "{\"matches\":[{\"name\":\"Ada Lovelace\",\"email\":\"ada@example.com\",\"reason\":\"...\"}]}",
  "sources": [{ "cvId": "...", "name": "...", "file": "..." }]
}
```

`answer` is itself a JSON string (per Gemini's `systemInstruction` in `rag/query.ts`) listing only the candidates that matched the question, with `sources` giving the deduplicated list of CVs the answer was retrieved from for citation in the UI.
