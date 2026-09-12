# NaviOps Setup & Execution Guide

This guide provides step-by-step instructions to run the NaviOps Port Operations Management & 72-Hour Optimization platform locally.

---

## 1. Prerequisites

- **Node.js**: v18.0+ (Tested on v22.14.0)
- **Python**: 3.10+ (Tested on 3.11.7)
- **Git**

---

## 2. Backend Setup (FastAPI + Google OR-Tools)

The backend code is located in `src/backend/`.

### Step 1: Navigate to backend directory
```bash
cd src/backend
```

### Step 2: Install Python dependencies
```bash
pip install -r requirements.txt
```
*(Dependencies include: `fastapi`, `uvicorn`, `ortools`, `pydantic`, `pydantic-settings`, `supabase`, `httpx`, `pytest`)*

### Step 3: Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```
Default configuration works out-of-the-box using the built-in pre-seeded repository. If you have a Supabase PostgreSQL instance, set `SUPABASE_URL` and `SUPABASE_KEY` in `.env`.

### Step 4: Run Backend Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API server will start at:
- **API URL**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Step 5: Run Automated Tests
```bash
python -m pytest tests/test_backend.py -v
```

---

## 3. Frontend Setup (Next.js 14 + Tailwind CSS)

The frontend code is located in `src/frontend/`.

### Step 1: Navigate to frontend directory
```bash
cd src/frontend
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Run Development Server
```bash
npm run dev
```
The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## 4. Database Setup (Supabase PostgreSQL)

Database DDL and seed scripts are located in:
- `src/database/schema.sql` (Table definitions, foreign keys, indexes, and RBAC constraints)
- `src/database/seed.sql` (14 vessels, 5 berths, 10 cranes, 5 yard zones, 3 active disruptions, 3 RBAC users)

To initialize on Supabase:
1. Open the Supabase Dashboard -> **SQL Editor**.
2. Run `src/database/schema.sql`.
3. Run `src/database/seed.sql`.
4. Copy your Project URL and Anon API key to `src/backend/.env`.

---

## 5. Demo Accounts & Role-Based Access Control (RBAC)

Use the Role Switcher at the bottom-left of the sidebar to test different operational permissions:

| Role | Account Email | Permissions |
|---|---|---|
| **Port Manager / Admin** | `admin@naviops.port` | Full CRUD, Disruption Management, Schedule Approval & Application, User Management |
| **Operations Staff** | `ops@naviops.port` | Quayside Control, Create/Update Records, Inject Disruptions, Trigger 72h Optimization |
| **Viewer / Executive** | `executive@naviops.port` | Read-only access to KPIs, Congestion Breakdown, Schedules, and Reports |

---

## 6. Testing the Normal Operational Flow

1. Open [http://localhost:3000](http://localhost:3000).
2. Inspect the **Overview** dashboard: note the Port Congestion Index score and diagnostic factor contributions.
3. Click **Operations Control** in the sidebar:
   - Click **Add Vessel** to register an incoming ship.
   - Click **Report Disruption** to inject a crane failure (e.g. CR-02 electrical fault).
   - Observe how the Congestion Index score immediately increases with the added disruption penalty.
4. Click **Optimization** in the sidebar:
   - Click **Generate Optimized 72-Hour Plan**.
   - Watch the Google OR-Tools CP-SAT solver compute non-overlapping berth allocations and crane schedules.
   - Inspect the visual 72-hour Gantt schedule timeline.
   - Click **Approve & Apply Plan** (as Admin) to lock in the operational schedule.
5. Click **Bob Copilot** to preview the Phase 2 conversational interface with suggested operational questions.
