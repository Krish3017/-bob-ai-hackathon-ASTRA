import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import vessels, berths, cranes, yards, disruptions, dashboard, optimization, auth

app = FastAPI(
    title="NaviOps API — Port Congestion Prediction & Operations Optimizer",
    description="Enterprise operational backend & OR-Tools CP-SAT scheduler for maritime port logistics.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Hackathon developer friendly
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(vessels.router)
app.include_router(berths.router)
app.include_router(cranes.router)
app.include_router(yards.router)
app.include_router(disruptions.router)
app.include_router(optimization.router)


@app.get("/")
def root():
    return {
        "system": "NaviOps Port Operations Platform",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": [
            "/api/dashboard/summary",
            "/api/dashboard/congestion",
            "/api/vessels",
            "/api/berths",
            "/api/cranes",
            "/api/yards",
            "/api/disruptions",
            "/api/optimization/run",
            "/api/optimization/runs/latest"
        ]
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "naviops-backend"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=True)
