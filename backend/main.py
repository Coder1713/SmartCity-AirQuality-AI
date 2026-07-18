from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import forecast, advisory, attribution, enforcement, multicity, pipeline, trend, intervention
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

# ── 5 AGENTS ─────────────────────────────────────────────────
app.include_router(forecast.router,     prefix="/forecast",     tags=["1. Forecasting Agent"])
app.include_router(attribution.router,  prefix="/attribution",  tags=["2. Source Attribution Agent"])
app.include_router(enforcement.router,  prefix="/enforcement",  tags=["3. Enforcement Agent"])
app.include_router(advisory.router,     prefix="/advisory",     tags=["4. Citizen Advisory Agent"])
app.include_router(multicity.router,    prefix="/multicity",    tags=["5. Multi-City Dashboard"])
app.include_router(pipeline.router,     prefix="/pipeline",     tags=["6. Full Intelligence Pipeline"])
app.include_router(trend.router,        prefix="/trend",        tags=["7. Forecast Trend Agent"])
app.include_router(intervention.router, prefix="/intervention", tags=["8. Intervention Simulator"])
@app.get("/")
def root():
    return {
        "status": "online",
        "project": "SmartCity AQI Intelligence",
        "agents": [
            "1. Forecasting Agent",
            "2. Source Attribution Agent",
            "3. Enforcement Agent",
            "4. Citizen Advisory Agent",
            "5. Multi-City Comparative Dashboard",
            "6. Full Intelligence Pipeline"
        ],
        "docs": "/docs"
    }

from backend.routers.forecast import is_model_loaded

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": is_model_loaded()}