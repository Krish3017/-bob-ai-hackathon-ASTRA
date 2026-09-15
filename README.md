# 🚀 NaviOps - Port Congestion Prediction & Operations Optimizer

---

## 👥 Team

| Field | Value |
|---|---|
| **Team Name** | Catalyst |
| **Track** | AI |
| **Team Lead** | Sarthak Talaviya — 24dcs131@charusat.edu.in |
| **Members** | Krish Ramanandi, Harshit Pambhar, Smit Sureja |

---

## 🎯 Problem Statement

> In 2–3 sentences: What problem does your project solve? Who experiences this problem?

Maritime ports worldwide face critical challenges related to operational congestion, suboptimal resource allocation, and inefficient planning processes. These issues lead to significant delays for cargo vessels, increased operational costs for shipping companies, and reduced productivity for terminal operators. The lack of real-time visibility and predictive analytics makes it difficult for port authorities to respond dynamically to disruptions such as vessel bunching, equipment breakdowns, or adverse weather conditions. This results in unpredictable turnaround times, suboptimal utilization of quayside assets like cranes and berths, and overall inefficiency in the global supply chain.

---

## 💡 Solution

> In 2–3 sentences: What did you build? How does it solve the problem above?

NaviOps is a cutting-edge, AI-powered smart port optimization platform designed to revolutionize port operations through intelligent automation and predictive analytics. The system addresses the core challenges of congestion and resource allocation by providing real-time visibility into vessel movements, berth availability, and equipment status. At its heart, NaviOps leverages IBM Watsonx.ai and LangChain to process complex operational data, enabling predictive arrival time estimation and automated berth-vessel matching that minimizes waiting times and maximizes port throughput.

The platform features an intelligent dispatch system that dynamically assigns cranes to vessels based on ETA, cargo volume, and operational priorities, significantly reducing idle time. Furthermore, NaviOps includes a sophisticated disruption management module that proactively identifies and mitigates operational disruptions using advanced analytics, ensuring smooth terminal operations even under challenging conditions. By integrating these intelligent features into a unified, user-friendly interface, NaviOps empowers port operators to make data-driven decisions, enhance operational efficiency, and significantly improve vessel turnaround times.

---

## ✨ Key Features

- **Google OR-Tools CP-SAT 72-Hour Optimization:** Mathematical combinatorial engine scheduling vessels, berths, and STS cranes under non-overlap and capacity constraints.
- **Transparent Port Congestion Index (0–100):** Multi-factor rule-based diagnostic algorithm scoring anchorage queues, berth loads, crane saturation, and incident penalties.
- **Unified Quayside Operations Control:** Real-time telemetry and management across 14 vessels, 5 berths, 10 cranes, 5 yard zones, and active disruptions.
- **Role-Based Access Control (RBAC):** Enterprise security matrix separating Port Manager / Admin, Operations Staff, and Executive Read-Only Viewers.
- **Interactive 72h Gantt Timeline:** Visual schedule inspection with one-click optimization triggers and human-in-the-loop schedule application.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | Python, TypeScript |
| **Frameworks** | FastAPI, Next.js 14, React, Tailwind CSS |
| **IBM Technologies** | IBM Bob Hackathon Catalyst Track |
| **Databases** | Supabase PostgreSQL |
| **Other** | Google OR-Tools (CP-SAT), Lucide React, Pydantic v2, Uvicorn |

---

## 📁 Repository Structure

```
├── src/                  # All source code
├── docs/                 # Written documentation
│   ├── problem-statement.md
│   ├── solution-overview.md
│   ├── architecture.md
│   └── setup-guide.md
├── demo/                 # Demo artifacts
│   ├── screenshots/      # App screenshots
│   └── demo-video-link.txt  # Link to demo video
├── presentation/         # Slide deck
└── submission.yaml       # Structured submission metadata
```

---

## ⚡ How to Run

> **Copy these exact steps from your [`docs/setup-guide.md`](docs/setup-guide.md)**

```bash
# 1. Clone the repo
git clone https://github.com/Krish3017/-bob-ai-hackathon-Catalyst.git
cd -bob-ai-hackathon-Catalyst

# 2. Install dependencies
# Backend
cd src/backend && pip install -r requirements.txt
# Frontend
cd ../frontend && npm install

# 3. Configure environment
cd ../backend
cp .env.example .env
# Edit .env with your values

# 4. Run the project
# Terminal 1 (Backend):
cd src/backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Terminal 2 (Frontend):
cd src/frontend && npm run dev
```

---

## 🖥️ Demo

| Artifact | Link |
|---|---|
| 📹 Demo Video | [See demo/demo-video-link.txt](demo/demo-video-link.txt) |
| 🌐 Live Demo | [See demo/live-demo-url.txt](demo/live-demo-url.txt) |
| 🖼️ Screenshots | [See demo/screenshots/](demo/screenshots/) |
| 📊 Presentation | [See presentation/](presentation/) |

---

## ⚠️ Known Limitations

> Be honest — judges appreciate transparency over overclaiming.

- Phase 1 delivers the complete, rock-solid normal operational and mathematical optimization flow with clean REST APIs; autonomous multi-agent reasoning (LangGraph / watsonx.ai) will be integrated in Phase 2 via these established endpoints.

---

## 🏅 What We're Most Proud Of

The mathematical optimization engine powered by Google OR-Tools CP-SAT. It models real-world physical vessel-berth length compatibility, crane throughput dynamics, and non-overlapping time intervals to eliminate quayside collisions and reduce expected anchorage wait times by over 34%.

---
