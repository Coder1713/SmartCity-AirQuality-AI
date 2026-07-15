from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pickle
import pandas as pd
import numpy as np
from datetime import datetime

router = APIRouter()

# Load model and feature list once when server starts
try:
    with open("ml/aqi_forecast_model.pkl", "rb") as f:
        model = pickle.load(f)
    with open("ml/feature_columns.pkl", "rb") as f:
        FEATURES = pickle.load(f)
    print("✓ Forecasting model loaded")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None
    FEATURES = []

# ── INPUT SCHEMA ─────────────────────────────────────────────
class ForecastInput(BaseModel):
    station_id: str = "DL001"
    pm25: float
    pm10: float
    no: float
    no2: float
    nox: float
    nh3: float
    co: float
    so2: float
    o3: float
    aqi_lag1: float   # AQI 1 hour ago
    aqi_lag3: float   # AQI 3 hours ago
    aqi_lag6: float   # AQI 6 hours ago
    aqi_lag24: float  # AQI 24 hours ago
    aqi_roll6: float  # 6 hour rolling average
    aqi_roll24: float # 24 hour rolling average

# ── AQI CATEGORY HELPER ──────────────────────────────────────
def get_aqi_category(aqi: float) -> dict:
    if aqi <= 50:
        return {"category": "Good", "color": "#00e400", "health_impact": "Minimal impact"}
    elif aqi <= 100:
        return {"category": "Satisfactory", "color": "#92d050", "health_impact": "Minor breathing discomfort to sensitive people"}
    elif aqi <= 200:
        return {"category": "Moderate", "color": "#ffff00", "health_impact": "Breathing discomfort to people with lung/heart disease"}
    elif aqi <= 300:
        return {"category": "Poor", "color": "#ff7e00", "health_impact": "Breathing discomfort to most people on prolonged exposure"}
    elif aqi <= 400:
        return {"category": "Very Poor", "color": "#ff0000", "health_impact": "Respiratory illness on prolonged exposure"}
    else:
        return {"category": "Severe", "color": "#7e0023", "health_impact": "Health impact even on light activity. Serious risk"}

# ── FORECAST ENDPOINT ────────────────────────────────────────
@router.post("/predict")
def predict_aqi(data: ForecastInput):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    now = datetime.now()

    input_df = pd.DataFrame([{
        'PM2.5':      data.pm25,
        'PM10':       data.pm10,
        'NO':         data.no,
        'NO2':        data.no2,
        'NOx':        data.nox,
        'NH3':        data.nh3,
        'CO':         data.co,
        'SO2':        data.so2,
        'O3':         data.o3,
        'hour':       now.hour,
        'day':        now.day,
        'month':      now.month,
        'dayofweek':  now.weekday(),
        'is_weekend': 1 if now.weekday() >= 5 else 0,
        'AQI_lag1':   data.aqi_lag1,
        'AQI_lag3':   data.aqi_lag3,
        'AQI_lag6':   data.aqi_lag6,
        'AQI_lag24':  data.aqi_lag24,
        'AQI_roll6':  data.aqi_roll6,
        'AQI_roll24': data.aqi_roll24,
    }])

    predicted_aqi = float(model.predict(input_df[FEATURES])[0])
    predicted_aqi = round(max(0, predicted_aqi), 2)
    category_info = get_aqi_category(predicted_aqi)

    return {
        "station_id":    data.station_id,
        "predicted_aqi": predicted_aqi,
        "category":      category_info["category"],
        "color":         category_info["color"],
        "health_impact": category_info["health_impact"],
        "timestamp":     now.isoformat(),
        "model_info": {
            "type":  "Gradient Boosting Regressor",
            "r2":    0.9964,
            "rmse":  6.25
        }
    }

# ── SAMPLE DATA ENDPOINT (for frontend testing) ──────────────
@router.get("/sample-stations")
def get_sample_stations():
    df = pd.read_csv("datasets/processed/delhi_aqi_clean.csv")
    latest = df.groupby('StationId').last().reset_index()
    stations = []
    for _, row in latest.iterrows():
        aqi = float(row['AQI']) if not pd.isna(row['AQI']) else 150.0
        cat = get_aqi_category(aqi)
        stations.append({
            "station_id": row['StationId'],
            "aqi":        round(aqi, 1),
            "category":   cat["category"],
            "color":      cat["color"]
        })
    return {"stations": stations, "total": len(stations)}