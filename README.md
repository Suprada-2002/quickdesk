# QuickDesk ⚡

QuickDesk is an internal AI-assisted helpdesk application designed to accelerate IT and operations support workflows. Rather than replacing human operators, QuickDesk acts as an intelligent co-pilot: when employees submit tickets, an automated LLM triage pipeline categorizes the issue, scores priority, calculates confidence, and synthesizes a grounded response draft retrieved from internal knowledge-base articles with citations. Support agents can review tickets, override classifications (with a full audit log), customize draft replies, and resolve tickets, triggering real-time WebSocket state updates on the employee dashboard without requiring page refreshes.

---

## 🏛 Architecture Diagram

```
                                  [ React + Vite Frontend ]
                         (Tailwind CSS, Lucide Icons, Socket.IO Client)
                                     /                    \
                       REST Calls   /                      \  Real-time Events
                   (Bearer JWT)    /                        \ (ticket_created,
                                  v                          v ticket_resolved)
                     +---------------------------------------------+
                     |            FastAPI Backend (ASGI)           |
                     |  - Python-SocketIO Server                   |
                     |  - JWT & Argon2id Security Layer            |
                     |  - Role-Based Access Control (RBAC)         |
                     +--------------+----------------+-------------+
                                    |                |
                          SQLAlchemy 2.0      LangChain Pipeline
                          (psycopg driver)           |
                                    |                v
                                    |       [ FastEmbed (ONNX) ]
                                    |     (BAAI/bge-small-en-v1.5)
                                    |                |
                                    v                v
                       +------------------+  +-------------------------------+
                       |  PostgreSQL DB   |  | In-Memory FAISS Vector Store  |
                       |  - Users         |  |  - 7 Markdown KB Articles     |
                       |  - Tickets       |  |  - Cosine Distance Threshold  |
                       |  - Audit Logs    |  |  - Citation Grounding Engine  |
                       +------------------+  +-------------------------------+
                                                             |
                                                             v
                                              [ Configurable AI Provider ]
                                               - Hugging Face Inference API
                                               - Groq API / Llama 3.1
                                               - Deterministic Heuristic Engine
```

---

## 🚀 How to Run Locally (Fresh Clone)

### Prerequisites
- **Python**: 3.11+ (Tested on Python 3.12)
- **Node.js**: v18+ & **npm**
- **PostgreSQL**: Local instance or Docker

### 1. Database Setup
Start a PostgreSQL database instance:
```bash
docker run -d --name quickdesk-postgres \
  -e POSTGRES_USER=quickdesk \
  -e POSTGRES_PASSWORD=quickdesk \
  -e POSTGRES_DB=quickdesk \
  -p 5433:5432 postgres:15-alpine
```

### 2. Backend Setup
```bash
cd backend

# Copy environment template
cp .env.example .env

# Install backend dependencies
pip install -r requirements.txt

# Seed database with sample users, tickets, and KB articles
python app/seeds/seed.py

# Run backend test suite
pytest tests/ -v

# Start FastAPI + Socket.IO server
python -m uvicorn app.main:socket_app --host 0.0.0.0 --port 8000 --reload
```
The backend API will be available at `http://localhost:8000`, and OpenAPI documentation at `http://localhost:8000/docs`.

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend

# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Running with Docker Compose (Single Command)
Alternatively, run the complete stack (Postgres + Backend + Frontend) using Docker Compose:
```bash
docker-compose up --build
```
Access the application at `http://localhost:3000`.

---

## 🔑 Demo Credentials

| Role | Email | Password | Purpose |
|---|---|---|---|
| **Support Agent** | `agent@quickdesk.com` | `Password123!` | View all tickets, filters, overrides, audit logs, RAG reply editor, and operations metrics. |
| **Employee** | `employee@quickdesk.com` | `Password123!` | Submit tickets, view only own tickets, live status updates. |
| **Employee 2** | `bob@quickdesk.com` | `Password123!` | Test cross-employee data isolation. |

> **Pro Tip**: The navigation bar includes an **Instant Demo Role Switcher** (`Employee View` / `Agent View`) to toggle between roles without repeatedly typing credentials during evaluations.

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth Required | Allowed Role |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Register employee or agent account | No | Public |
| `POST` | `/api/auth/login` | Authenticate with email/password, returns JWT | No | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & role | Yes | Any |
| `POST` | `/api/tickets` | Submit ticket; triggers AI classification & RAG draft | Yes | Employee, Agent |
| `GET` | `/api/tickets` | List tickets (filtered by ownership for employees, with status/category/priority/search filters for agents) | Yes | Any |
| `GET` | `/api/tickets/{id}` | Get ticket details, citations, AI drafts | Yes | Owner or Agent |
| `PATCH`| `/api/tickets/{id}/override` | Override category or priority; writes to audit log | Yes | **Agent only** |
| `GET` | `/api/tickets/{id}/overrides`| Fetch audit log history for ticket | Yes | **Agent only** |
| `POST` | `/api/tickets/{id}/generate-draft` | Re-run RAG pipeline for fresh draft & citations | Yes | **Agent only** |
| `POST` | `/api/tickets/{id}/reply` | Submit final agent reply, mark Resolved | Yes | **Agent only** |
| `GET` | `/api/metrics` | Fetch operations analytics & AI override % | Yes | **Agent only** |
| `GET` | `/api/health` | Service health check | No | Public |

---

## 🧠 Decisions and Tradeoffs

### a) Why did you pick this frontend framework (React vs Next.js)?
We selected a standalone **React.js Single Page Application (SPA) powered by Vite** paired with a dedicated **FastAPI** backend rather than Next.js. 
- *Rationale*: Next.js is optimized for Server-Side Rendering (SSR) and public e-commerce/content sites. An internal helpdesk is an authenticated, dynamic application behind a login barrier where SSR offers zero SEO benefit.
- *Separation of Concerns*: A decoupled React + FastAPI architecture allows the backend to serve as a pure, high-performance REST and WebSocket API. This avoids running two Node servers, simplifies containerization, and eliminates Next.js WebSocket middleware complexities when pairing with Socket.IO.

### b) How did you structure the RAG pipeline? Chunk size, embedding model, retriever, prompt?
1. **Knowledge Base**: 7 realistic Markdown articles in `backend/app/kb/` covering VPN setup, password resets, leave requests, expense reimbursements, laptop hardware policies, finance drive access, and software licenses (150–250 words each).
2. **Chunking**: `RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=50)`. Because articles are focused, 400 characters captures cohesive paragraphs while 50-character overlap maintains sentence context across boundaries.
3. **Embeddings**: `FastEmbed` (`BAAI/bge-small-en-v1.5`). We chose FastEmbed over heavy PyTorch sentence-transformers because it runs on an ONNX runtime, requires ~60MB of RAM, and generates vectors 4x faster on CPU with zero GPU dependencies.
4. **Retriever & Threshold**: Indexed into an in-memory `FAISS` vector store. When searching (`k=3`), we enforce a calibrated distance threshold of `0.88`. Relevant tickets score `0.50–0.73`, while out-of-domain queries score `1.07+`. If a query exceeds `0.88`, the system triggers a guardrail returning zero citations and stating that no internal documentation covers the topic, preventing hallucinated policies.
5. **Prompt**: Instructs the LLM to act as QuickDesk Assistant and synthesize an answer grounded strictly in the retrieved excerpts, preserving actionable steps without inventing external links.

### c) How did you handle the case where the LLM returns a category that does not match your allowed list?
LLMs frequently return conversational preamble or unofficial category names (e.g. *"Category: Information Technology"* or *"Network"* instead of *"IT"*).
- In `ai_service.py`, we implemented `sanitize_category()` and `sanitize_priority()`.
- The sanitizers use a dictionary mapping common aliases (e.g., `"human resources"` $\to$ `"HR"`, `"billing"` / `"payroll"` $\to$ `"Finance"`, `"urgent"` / `"blocker"` $\to$ `"High"`).
- If the output cannot be mapped to the allowed enum (`['IT', 'HR', 'Finance', 'Admin', 'Other']`), it safely falls back to `"Other"` and `"Medium"`. The system never throws a 500 error or writes invalid enum values to PostgreSQL.

### d) Where did you store the JWT on the client, and why?
The JWT is stored in **`localStorage`** and attached via an `Authorization: Bearer <token>` header on every request through an API client interceptor (`services/api.js`).
- *Tradeoff Analysis*: While `HttpOnly` cookies mitigate Cross-Site Scripting (XSS) extraction, they introduce Cross-Site Request Forgery (CSRF) vulnerabilities and complicate WebSocket authentication across decoupled domains. Given that QuickDesk is an internal corporate SPA that does not execute untrusted third-party scripts, `localStorage` provides a clean implementation that seamlessly transfers tokens to the Socket.IO handshake (`auth: { token }`).

### e) How did you enforce role-based access on the backend? What stops an employee from hitting an agent-only endpoint by guessing the URL?
Role enforcement is enforced **strictly at the backend framework level** using FastAPI dependency injection, not merely by hiding UI buttons.
- Any protected endpoint declares `current_user: User = Depends(require_agent)`.
- When an employee hits an agent route (such as `/api/tickets/{id}/override` or `/api/metrics`):
  1. `get_current_user` extracts the JWT Bearer token and verifies cryptographic signature and expiration.
  2. `require_agent` checks `if current_user.role != 'agent': raise HTTPException(status_code=403, detail="Access forbidden: Agent privileges required")`.
- The request is terminated before any controller or database operation executes. This is verified by automated pytest test cases in `tests/test_rbac.py`.

### f) Why did you pick Socket.io / WebSockets / SSE for real-time? What is the failure mode if the socket disconnects mid-session?
- **Choice**: **Socket.IO** (`python-socketio` + `socket.io-client`).
- *Why*: While Server-Sent Events (SSE) provide unidirectional streaming, Socket.IO offers bi-directional room segmentation (`agents` room vs. `user_{id}` room), built-in heartbeat pings, and automatic transport fallback from WebSockets to HTTP long-polling.
- *Failure Mode*: If the socket disconnects (e.g., laptop sleep, network blip), Socket.IO enters an automatic exponential backoff reconnection loop. The client continues to function: all actions (submitting tickets, sending replies) occur over idempotent HTTP REST. When connectivity restores, the socket automatically re-authenticates and re-joins its rooms.

### g) What is the worst failure mode in your system today, and what would you do to address it?
- **Current Worst Failure Mode**: The FAISS vector store is held **in-memory**. If the backend server restarts, the index is re-created from the markdown files on disk. While this takes under 1 second for 7 articles, in a production company with 50,000 internal documents, rebuilding an in-memory index on every restart would cause prolonged startup latency.
- **Production Solution**: Migrate the vector store to **`pgvector`** within the existing PostgreSQL database. This would persist vector embeddings alongside ticket data, allow atomic migrations, and enable ACID-compliant vector queries without memory overhead.

### h) Where did AI tools help you most? Where did they hurt or mislead you?
- **Where they helped most**: Rapidly drafting realistic Markdown knowledge-base articles and scaffolding the boilerplate for Pydantic v2 validation models.
- **Where they hurt/misled**: Early suggestions recommended using standard PyTorch `sentence-transformers` for embeddings. In a CPU container, this forced downloading a 550MB PyTorch wheel and 1.5GB of CUDA dependencies, slowing down builds. Replacing this with `fastembed` (ONNX runtime) reduced the dependency footprint by 95% and accelerated embedding execution.

---

## 🔬 Automated Test Suite

QuickDesk includes a comprehensive test suite (`pytest` + `httpx`) covering critical authentication, role enforcement, RAG retrieval, and operational workflows.

To run tests:
```bash
python3 -m pytest backend/tests/ -v
```

```text
backend/tests/test_auth.py::test_password_hashing PASSED
backend/tests/test_auth.py::test_user_registration PASSED
backend/tests/test_auth.py::test_login_success_and_failure PASSED
backend/tests/test_auth.py::test_get_current_user_me PASSED
backend/tests/test_metrics.py::test_agent_metrics_access_and_calculations PASSED
backend/tests/test_rag.py::test_rag_knowledge_base_initialized PASSED
backend/tests/test_rag.py::test_rag_vpn_retrieval_and_citations PASSED
backend/tests/test_rag.py::test_rag_irrelevant_query_guardrail PASSED
backend/tests/test_rag.py::test_ai_classification_categories PASSED
backend/tests/test_rag.py::test_sanitization_guardrails PASSED
backend/tests/test_rbac.py::test_rbac_unauthenticated_access PASSED
backend/tests/test_rbac.py::test_rbac_employee_denied_agent_route PASSED
backend/tests/test_rbac.py::test_rbac_agent_allowed_agent_route PASSED
backend/tests/test_socket.py::test_socket_room_assignment_agent PASSED
backend/tests/test_socket.py::test_socket_room_assignment_employee PASSED
backend/tests/test_socket.py::test_socket_invalid_or_missing_token PASSED
backend/tests/test_socket.py::test_broadcast_functions_execute_safely PASSED
backend/tests/test_tickets.py::test_ticket_submission_triggers_ai PASSED
backend/tests/test_tickets.py::test_employee_isolation_and_agent_visibility PASSED
backend/tests/test_tickets.py::test_agent_override_and_audit_log PASSED
backend/tests/test_tickets.py::test_agent_reply_and_resolution PASSED

======================== 21 passed in 2.45s ========================
```

---

## 📹 Demo Video Walkthrough Guide (3–5 Minutes)

When recording your presentation, follow this 4-step sequence:

1. **Architecture Overview (1 min)**:
   - Introduce QuickDesk: React + Tailwind frontend, FastAPI backend, PostgreSQL, and LangChain RAG with FastEmbed.
   - Highlight role segregation: Employee vs. Agent.
2. **Employee Submission & AI Classification (1 min)**:
   - Log in as Employee (`employee@quickdesk.com`).
   - Submit a ticket (e.g. *"My WireGuard VPN disconnects every 5 minutes on home Wi-Fi"*).
   - Point out the instant AI feedback: Category `IT`, Priority `High`, confidence score, and grounded suggestion citing `vpn_setup.md`.
3. **Agent Dashboard & Real-Time Pop-up (1.5 min)**:
   - Switch to Agent view (`agent@quickdesk.com`).
   - Show how new tickets appear via Socket.IO without page refresh.
   - Open the ticket: demonstrate overriding priority/category and show the **Audit Log** updating with agent identity and timestamp.
   - Review the RAG-generated draft, edit the response in the editor, and click **"Send Reply"**.
   - Show that both the original AI draft and the final agent reply are preserved.
4. **Real-time Status Flip & Metrics (0.5 min)**:
   - Toggle back to Employee view: the ticket status has flipped to `"Resolved"` with the agent reply displayed.
   - Visit the **Metrics Analytics** page: highlight total tickets, median resolution time, category breakdown, and the AI override rate.

---

## 🔮 What I Would Do With More Time
1. **`pgvector` Hybrid Search**: Replace in-memory FAISS with PostgreSQL `pgvector`, combining full-text keyword search (BM25) with vector similarity.
2. **Email Webhooks / Slack Notifications**: Trigger a Slack notification in `#it-support` when high-priority tickets arrive.
3. **Multi-Agent Reranking**: Add a cross-encoder reranker to refine top-k knowledge base passages before prompt injection.
