# AI Quizzer

An AI-powered quiz generation platform that creates rich, document-grounded quizzes through a multi-agent pipeline. Upload your documents, configure your preferences, and let the system produce a fully structured quiz — complete with a live editor, learning analytics, and xAPI integration.

---

## Features

- **Document-grounded quiz generation** — Upload PDFs, Word docs, Excel files, or plain text; the system chunks and embeds them with pgvector so every question traces back to source material.
- **Three-agent pipeline** — An *Architect* designs the quiz structure, a *Builder* writes the questions from the actual documents, and an *Editor* lets you surgically improve individual questions and options.
- **Streaming progress** — Quiz creation is streamed over SSE so users see live step-by-step feedback.
- **Interactive quiz editor** — Targeted patch operations (update question text, update a single option, change question type, add/remove distractors) prevent accidental data loss.
- **Multiple question types** — `true_false`, `single_choice`, and `multiple_choice` with strict structural rules enforced at generation time.
- **xAPI / LRS integration** — Learning events are emitted to a configurable Learning Record Store.
- **Authentication** — Email/password auth via Better Auth with session caching and secure cookies.
- **Fully containerised** — Separate Docker Compose configurations for development (DB only) and production (full stack).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL 16 + pgvector |
| ORM | Drizzle ORM |
| Auth | Better Auth |
| AI SDK | Vercel AI SDK |
| LLM providers | OpenAI, Mistral AI |
| Embeddings | OpenAI `text-embedding-3-small` |
| State management | React Query |
| UI | shadcn/ui + Tailwind CSS |
| Containerisation | Docker + Docker Compose |

---

## Project Structure

```
.
├── agents/
│   ├── architect.ts        # Designs quiz structure from documents
│   └── builder.ts          # Generates questions grounded in source docs
├── app/
│   ├── (auth)/             # Sign-in / sign-up pages
│   ├── (protected)/        # Authenticated routes (dashboard, editor, etc.)
│   └── api/
│       ├── quizzes/        # CRUD + streaming quiz creation
│       ├── quizzes/[id]/
│       │   ├── draft/      # Draft management (PATCH with targeted ops)
│       │   └── draft/improve/  # Question/option improvement via AI
│       └── upload/         # Document upload, chunking, and embedding
├── db/
│   └── schema.ts           # Drizzle schema (users, quizzes, questions, documents, embeddings)
├── lib/
│   ├── auth.ts             # Better Auth configuration
│   ├── tools/
│   │   ├── search-docs.ts       # Semantic vector search tool for agents
│   │   └── get-document-overview.ts
│   └── validators.ts       # Zod schemas
├── components/
│   ├── dialogs/            # New quiz dialog with step progress
│   ├── cards/              # Quiz cards
│   └── ai-elements/        # Reusable AI UI primitives
├── hooks/api/              # React Query hooks
├── docker/
│   ├── db/init.sql         # pgvector extension init
│   └── pgadmin/servers.json
├── docker-compose.yml          # Production stack
├── docker-compose.dev.yml      # Development (DB only)
└── Dockerfile              # Multi-stage build
```

---

## How the Pipeline Works

```
User submits quiz form
        │
        ▼
  [Step 0] Save quiz shell to DB
        │
        ▼
  [Step 1] Architect Agent
  • Calls getDocumentOverview (fetches first 15 chunks per document)
  • Optionally calls searchDocs for deeper semantic retrieval
  • Outputs a structured architecture (topics, distribution, difficulty, rules)
        │
        ▼
  [Step 2] Builder Agent
  • Receives architecture + document IDs
  • Calls searchDocs to ground each question in real content
  • Produces questions with typed options (true_false / single_choice / multiple_choice)
  • Persisted as a versioned Draft in the DB
        │
        ▼
  Quiz Editor — targeted PATCH operations, AI improvement endpoints
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- Docker & Docker Compose

### Local Development

1. **Clone the repo**

```bash
git clone <repo-url>
cd ai-quizzer
```

2. **Copy and fill in environment variables**

```bash
cp .env.example .env
```

3. **Start the database**

```bash
docker compose -f docker-compose.dev.yml up -d
```

4. **Push the schema**

```bash
npx drizzle-kit push
```

5. **Run the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

### Production (Docker)

Runs the full stack — database, migrations, pgAdmin, and the Next.js app — in one command.

```bash
docker compose up -d
```

| Service | Port |
|---|---|
| Next.js app | `3000` |
| PostgreSQL | `5432` |
| pgAdmin | `5050` |

---

## Environment Variables

Copy `.env.example` to `.env` and set the following:

```env
# Database
DATABASE_URL=postgresql://quizzer:quizzer@localhost:5432/ai_quizzer

# Auth (Better Auth)
BETTER_AUTH_SECRET=          # 32+ character secret
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
TRUSTED_ORIGINS=http://localhost:3000
SECURE_COOKIES=false         # set to true in production

# OpenAI
OPENAI_API_KEY=

# Mistral (used for PDF extraction)
MISTRAL_API_KEY=

# Agent model overrides (defaults to gpt-4o-mini)
ARCHITECT=gpt-4o
BUILDER=gpt-4o
QUIZ_EDITOR=gpt-4o-mini

# xAPI / LRS
XAPI_ENDPOINT=
XAPI_KEY=
XAPI_SECRET=

# Postgres credentials (Docker only)
POSTGRES_USER=quizzer
POSTGRES_PASSWORD=quizzer
POSTGRES_DB=ai_quizzer
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/quizzes` | List authenticated user's quizzes |
| `POST` | `/api/quizzes` | Create a quiz (SSE stream) |
| `GET` | `/api/quizzes/[id]` | Get a single quiz with questions |
| `PATCH` | `/api/quizzes/[id]/draft` | Apply targeted patch to draft |
| `POST` | `/api/quizzes/[id]/draft/improve` | AI-improve a question or option |
| `POST` | `/api/upload` | Upload a document (PDF/text), chunk, and embed |
| `GET` | `/api/documents` | List authenticated user's documents |

### Draft PATCH Operations

```ts
// Update question text
{ operation: "update_question", questionId, questionText }

// Update a single option
{ operation: "update_option", questionId, optionId, optionText, isCorrect }

// Change question type (rebuilds options automatically)
{ operation: "change_type", questionId, newType }

// Add a distractor option
{ operation: "add_distractor", questionId, optionText }

// Remove an option
{ operation: "remove_option", questionId, optionId }
```

---

## Database Schema (Overview)

```
user ──< quiz ──< question ──< option
                └──< draft        (versioned question snapshots)
                └──< conversation (agent chat history)

user ──< documents ──< documentChunks (vector embeddings)
```

---

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npx drizzle-kit push     # Push schema to DB
npx drizzle-kit studio   # Open Drizzle Studio (DB GUI)
```
