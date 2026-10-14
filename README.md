# QuickDesk

## What this is

QuickDesk is an internal AI-assisted helpdesk platform designed to streamline IT and operational support workflows for enterprise environments. Operating as an intelligent co-pilot for human support personnel, the system leverages an automated retrieval-augmented generation (RAG) pipeline to classify incoming tickets, calculate confidence scores, assess priority, and synthesize grounded draft responses with source citations from internal knowledge-base documentation. Support agents can review tickets, manually override automated classifications with full audit logging, adjust synthesized drafts, and submit official replies to resolve tickets. Built on FastAPI and React, QuickDesk incorporates bi-directional Socket.IO communication to push real-time queue updates across agent dashboards and employee interfaces without requiring manual page refreshes, maintaining strict role-based access control and tenant isolation throughout the ticket lifecycle.

---

## How to run it locally

### Prerequisites
- Docker and Docker Compose (recommended)
- Alternatively, for manual local execution:
  - Python 3.11 or higher
  - Node.js 18.x or higher and npm
  - PostgreSQL 15 or higher

### Option 1: Docker Compose (Recommended)

This method boots the complete stack (PostgreSQL, FastAPI backend, and React frontend) with a single command.

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone <repository-url>
   cd quickdesk
   ```

2. Start the services:
   ```bash
   docker compose up --build
   ```

3. Access the application:
   - Frontend Application: http://localhost:3000
   - Backend API: http://localhost:8000
   - Interactive API Documentation (Swagger): http://localhost:8000/docs

4. To stop the containers:
   ```bash
   docker compose down
   ```

---

### Option 2: Step-by-Step Manual Setup (Local Development)

#### 1. Database Setup
Start a PostgreSQL container on port 5433:
```bash
docker run -d --name quickdesk-postgres \
  -e POSTGRES_USER=quickdesk \
  -e POSTGRES_PASSWORD=quickdesk \
  -e POSTGRES_DB=quickdesk \
  -p 5433:5432 postgres:15-alpine
```

#### 2. Backend Setup
In a new terminal window:
```bash
cd backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

# Seed the database with initial users, sample tickets, and KB articles
python app/seeds/seed.py

# Run the test suite to verify backend integrity
python -m pytest tests/ -v

# Start the FastAPI and Socket.IO server
python -m uvicorn app.main:socket_app --host 0.0.0.0 --port 8000 --reload
```
The backend API is now running at http://localhost:8000.

#### 3. Frontend Setup
In a separate terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
The frontend development server is now running at http://localhost:5173.

---

### Demo Credentials (Pre-Seeded Users)

The database seed script (`backend/app/seeds/seed.py`) automatically provisions 4 default accounts with Argon2id password hashing:

| Name | Role | Email | Password | Access Level / Purpose |
|---|---|---|---|---|
| Sarah Agent | Support Agent | agent@quickdesk.com | Password123! | Primary support agent account: triage queues, execute overrides, audit logs, edit RAG drafts, and view operations metrics |
| David Support | Support Agent | david.agent@quickdesk.com | Password123! | Secondary support agent account: evaluate multi-agent workflows and concurrent queue updates |
| John Employee | Employee | employee@quickdesk.com | Password123! | Primary employee account: submit tickets, track status, view grounded citations, and receive real-time resolution updates |
| Bob Martinez | Employee | bob@quickdesk.com | Password123! | Secondary employee account: verify strict cross-user data isolation and tenant boundary enforcement |

To re-seed or reset these accounts manually:
```bash
cd backend
python app/seeds/seed.py
```

---

## Architecture diagram

```
                     +---------------------------------------+
                     |         React + Vite Frontend         |
                     |  - Tailwind CSS & Lucide Icons        |
                     |  - Socket.IO Client                   |
                     |  - Role-Based Route Guards            |
                     +-------------------+-------------------+
                                         |
                        REST Calls       |  Bidirectional Events
                    (Bearer JWT in Auth) |  (ticket_created, ticket_resolved)
                                         v
                     +---------------------------------------+
                     |        FastAPI Backend (ASGI)         |
                     |  - Python-SocketIO Server             |
                     |  - JWT & Argon2id Security Layer      |
                     |  - Route-Level RBAC Dependencies      |
                     +-------------------+-------------------+
                                         |
                     +-------------------+-------------------+
                     |                                       |
                     v                                       v
        +-------------------------+             +-------------------------+
        |   PostgreSQL Database   |             |   LangChain Pipeline    |
        |  (SQLAlchemy 2.0 ORM)   |             |  - Text Splitter        |
        |  - Users & Roles        |             |  - Distance Calibrator  |
        |  - Tickets & Statuses   |             +------------+------------+
        |  - Override Audit Logs  |                          |
        +-------------------------+                          v
                                                +-------------------------+
                                                |   FastEmbed (ONNX)      |
                                                |  (bge-small-en-v1.5)    |
                                                +------------+------------+
                                                             |
                                                             v
                                                +-------------------------+
                                                | In-Memory FAISS Store   |
                                                |  - 7 KB Articles        |
                                                |  - 0.88 Threshold Guard |
                                                +------------+------------+
                                                             |
                                                             v
                                                +-------------------------+
                                                |   LLM Triage Engine     |
                                                |  - Deterministic/Mock   |
                                                |  - Groq (Llama 3.1)     |
                                                |  - Hugging Face API     |
                                                +-------------------------+
```

---

## API endpoints

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| POST | /api/auth/register | Register a new user account (Employee or Agent role) | No (Public) |
| POST | /api/auth/login | Authenticate credentials and receive a Bearer JWT | No (Public) |
| GET | /api/auth/me | Retrieve profile and role for the authenticated user | Yes (Any authenticated user) |
| GET | /api/auth/agent-check | Verify whether the authenticated user has Agent privileges | Yes (Agent only) |
| POST | /api/tickets | Create ticket; triggers automated AI categorization, priority scoring, and RAG draft generation | Yes (Any authenticated user) |
| GET | /api/tickets | List tickets (filtered to own tickets for employees; faceted filters and search for agents) | Yes (Any authenticated user) |
| GET | /api/tickets/{id} | Retrieve detailed ticket information, citations, AI drafts, and override logs | Yes (Ticket owner or Agent) |
| PATCH | /api/tickets/{id}/override | Override ticket category or priority and append an entry to the audit log | Yes (Agent only) |
| GET | /api/tickets/{id}/overrides | Fetch chronological audit log history for a specific ticket | Yes (Agent only) |
| POST | /api/tickets/{id}/generate-draft | Re-run RAG pipeline to regenerate suggested response and citations | Yes (Agent only) |
| POST | /api/tickets/{id}/reply | Submit final agent response, send notification, and transition ticket to Resolved | Yes (Agent only) |
| GET | /api/metrics | Retrieve operational analytics, ticket breakdowns, resolution times, and AI override rate | Yes (Agent only) |
| GET | /api/health | Health check endpoint returning service status and version | No (Public) |

---

## Decisions and Tradeoffs

### a) Why did you pick this frontend framework (React vs Next.js)?
I chose a standard React Single Page Application built with Vite instead of Next.js. QuickDesk is an authenticated internal tool sitting entirely behind a login screen, which means Server-Side Rendering (SSR) offers zero SEO benefit while adding runtime complexity. A decoupled React SPA served over Nginx or Vite keeps the frontend lightweight, talks cleanly to our standalone FastAPI service without running a redundant Node server in production, and avoids the headaches of running persistent Socket.IO connections through Next.js serverless route handlers.

### b) How did you structure the RAG pipeline? Chunk size, embedding model, retriever, prompt?
- **Chunk size**: 400 characters with a 50-character overlap using LangChain's `RecursiveCharacterTextSplitter`. Because our 7 internal knowledge base articles are short and policy-specific, smaller chunks keep retrieved excerpts tightly focused without diluting context with irrelevant text.
- **Embedding model**: `FastEmbed` using `BAAI/bge-small-en-v1.5`. I picked this over heavy PyTorch sentence-transformers because it runs on an ONNX CPU runtime, uses only about 60MB of RAM, and generates embeddings fast without bloating our Docker image.
- **Retriever**: An in-memory FAISS vector store with a calibrated cosine distance threshold of 0.88. Queries scoring under 0.88 retrieve the top-3 relevant excerpts. Anything above 0.88 is treated as out-of-domain and triggers an anti-hallucination guardrail that returns zero citations, preventing the model from inventing company policies.
- **Prompt**: A strict system prompt instructing the LLM to act as the QuickDesk Assistant, synthesize answers solely from the retrieved context excerpts, give actionable steps, and explicitly state that no internal article covers the topic when citations are empty.

### c) How did you handle the case where the LLM returns a category that does not match your allowed list?
LLMs often reply with conversational filler or slight variations, like returning "Information Technology" instead of "IT", or "Urgent" instead of "High". In `ai_service.py`, I wrote two sanitizer helpers: `sanitize_category` and `sanitize_priority`. They pass raw model output through an alias mapping dictionary that normalizes synonyms to our exact enum values (`IT`, `HR`, `Finance`, `Admin`, `Other`). If a category is completely unrecognized, it safely falls back to `Other` and `Medium`. This ensures invalid strings never violate PostgreSQL database constraints or throw unhandled 500 errors.

### d) Where did you store the JWT on the client, and why?
I stored the JWT in browser `localStorage` and sent it via the standard `Authorization: Bearer <token>` header for API calls, as well as in the `auth` payload during the Socket.IO connection handshake. While `HttpOnly` cookies provide better protection against Cross-Site Scripting (XSS), they introduce Cross-Site Request Forgery (CSRF) concerns and make authenticating decoupled WebSocket connections across different ports and domains much more complicated. For an internal enterprise SPA where we control the codebase and don't run untrusted third-party scripts, `localStorage` provided the cleanest and most reliable integration.

### e) How did you enforce role-based access on the backend? What stops an employee from hitting an agent-only endpoint by guessing the URL?
Role enforcement is handled strictly on the backend through FastAPI dependency injection, not just by hiding buttons in the UI. Agent-only endpoints declare `current_user: User = Depends(require_agent)`. When a request hits an endpoint like `/api/tickets/{id}/override` or `/api/metrics`, the dependency inspects the decoded JWT, queries the database user record, and checks `if current_user.role != 'agent'`. If an employee tries to access it, FastAPI raises an immediate HTTP 403 Forbidden before any business logic or database modification runs.

### f) Why did you pick Socket.io / WebSockets / SSE for real-time? What is the failure mode if the socket disconnects mid-session?
I chose Socket.IO over raw WebSockets or Server-Sent Events (SSE) because we needed bidirectional room isolation. Agents join an `agents` room to see global triage activity, while employees join private `user_{user_id}` rooms so they never see each other's tickets. Socket.IO also includes built-in heartbeats, automatic reconnection, and transport fallbacks. If the socket disconnects mid-session (like during a laptop sleep or network drop), user actions don't break: creating tickets and submitting replies still work reliably because mutations run over standard REST endpoints. In the background, Socket.IO reconnects with exponential backoff and automatically rejoins the appropriate rooms once reconnected.

### g) What is the worst failure mode in your system today, and what would you do to address it?
The biggest weakness right now is that the FAISS vector index is held entirely in server memory. When the backend container restarts, it re-reads and re-indexes all Markdown files on startup. That is negligible for 7 articles, but in an enterprise setting with 50,000 documents, server restarts would crawl and document updates would require re-indexing the whole corpus in memory. To solve this in production, I would migrate the index to PostgreSQL using `pgvector`. This would persist embeddings on disk alongside ticket records, allow atomic article updates without restarting the application, and enable hybrid search combining vector similarity with PostgreSQL full-text search.

### h) Where did AI tools help you most? Where did they hurt or mislead you?
AI tools helped most with boilerplate and scaffolding. They quickly drafted realistic Markdown articles for the knowledge base, generated Pydantic validation schemas, and set up repetitive pytest fixtures. Where they hurt and misled me was early library recommendations: suggestions repeatedly leaned toward using standard PyTorch `sentence-transformers` for embeddings. Following that advice initially bloated the backend Docker image by over 2GB with CUDA dependencies we didn't need for CPU inference. Catching that and switching to `fastembed` (running on ONNX) reduced the image footprint drastically and sped up container build times.

---

## What I would do with more time

1. Production Vector Persistence with PostgreSQL `pgvector`
   Replace the in-memory FAISS index with `pgvector` inside the PostgreSQL database. This would enable hybrid search (combining dense vector embeddings with BM25 full-text keyword indexing), eliminate startup re-indexing overhead, and support real-time article additions without restarting backend instances.

2. Asynchronous Task Queue for LLM Processing
   Decouple ticket submission from AI inference by introducing a background task queue (such as Celery or ARQ backed by Redis). High-traffic spikes would queue tickets instantly with immediate HTTP 201 confirmations, while workers handle retrieval, classification, and drafting asynchronously, streaming results via WebSockets.

3. Cross-Encoder Reranking
   Integrate a cross-encoder reranker model (such as `BAAI/bge-reranker-base`) after initial vector retrieval. Scoring query-document pairs together before passing context to the LLM would eliminate low-relevance chunks and boost draft precision.

4. Multi-Channel Alerting and Integrations
   Implement outbound webhooks and integrations with communication tools (such as Slack, Microsoft Teams, or PagerDuty) to alert on-call support engineers when tickets are scored as `High` priority with high confidence.

5. Granular SLA Tracking and Reporting
   Build an automated Service Level Agreement (SLA) tracking engine with countdown timers, tracking First Response Time (FRT) and Mean Time to Resolution (MTTR), with automated escalation triggers for at-risk tickets.

6. Comprehensive CI/CD Pipeline and Helm Packaging
   Develop automated GitHub Actions workflows running linting, automated unit/integration tests, and container image scans, alongside Helm charts for production Kubernetes deployment.

---

## Known issues / limitations

1. In-Memory FAISS Vector Lifecycle
   The FAISS vector store is initialized in process memory upon backend startup. While performant and self-contained for local setups, changes or additions to Markdown files in `backend/app/kb/` require a backend restart to be re-indexed.

2. Synchronous Ticket Ingestion Latency
   Ticket submission via `POST /api/tickets` performs classification, embedding, vector retrieval, and draft generation synchronously. When running with cloud LLM providers (Groq or Hugging Face), network latency or API rate limits will directly impact the HTTP response time of ticket submission.

3. Single-Node Socket.IO State
   The Socket.IO server currently relies on the default in-memory manager without a distributed message broker. Scaling the backend horizontally across multiple container replicas requires attaching a Redis Pub/Sub adapter to synchronize WebSocket room broadcasts across instances.

4. Client-Side Token Storage Vulnerability
   Persisting JWTs in `localStorage` leaves tokens vulnerable if an XSS vulnerability were introduced into the frontend application. In a production environment with untrusted third-party dependencies, tokens should be transitioned to secure `HttpOnly`, `SameSite=Strict` cookies paired with CSRF protection mechanisms.

5. Static Knowledge Base Corpus
   The current RAG implementation operates on a static set of local Markdown documents rather than synchronizing bidirectionally with external enterprise knowledge management platforms (e.g., Notion, Confluence, or Google Drive).
