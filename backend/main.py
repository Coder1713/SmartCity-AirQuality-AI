from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import forecast, advisory

app = FastAPI(
    title="SmartCity AQI Intelligence API",
    description="AI-powered Urban Air Quality Forecasting and Citizen Advisory System",
    version="1.0.0"
)

# Allow React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the two agents as separate routers
app.include_router(forecast.router, prefix="/forecast", tags=["Forecasting Agent"])
app.include_router(advisory.router, prefix="/advisory", tags=["Citizen Advisory Agent"])

@app.get("/")
def root():
    return {
        "status": "online",
        "project": "SmartCity AQI Intelligence",
        "agents": ["Forecasting Agent", "Citizen Advisory Agent"],
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}