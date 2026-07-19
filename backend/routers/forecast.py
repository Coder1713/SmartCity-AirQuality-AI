from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
from datetime import datetime
from backend.shared import get_model_and_features, get_aqi_category, CATEGORY_COLORS

router = APIRouter()

try:
    model, FEATURES = get_model_and_features()
    print("✓ Forecasting model loaded")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None
    FEATURES = []

def is_model_loaded():
    return model is not None and FEATURES is not None and len(FEATURES) > 0

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
    aqi_lag1: float
    aqi_lag3: float
    aqi_lag6: float
    aqi_lag24: float
    aqi_roll6: float
    aqi_roll24: float

def _category_info(aqi: float) -> dict:
    category = get_aqi_category(aqi)
    impacts = {
        "Good": "Minimal impact",
        "Satisfactory": "Minor breathing discomfort to sensitive people",
        "Moderate": "Breathing discomfort to people with lung/heart disease",
        "Poor": "Breathing discomfort to most people on prolonged exposure",
        "Very Poor": "Respiratory illness on prolonged exposure",
        "Severe": "Health impact even on light activity. Serious risk"
    }
    return {"category": category, "color": CATEGORY_COLORS[category], "health_impact": impacts[category]}

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
    category_info = _category_info(predicted_aqi)

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

@router.get("/sample-stations")
def get_sample_stations():
    df = pd.read_csv("datasets/processed/delhi_aqi_clean.csv")
    latest = df.groupby('StationId').last().reset_index()
    stations = []
    for _, row in latest.iterrows():
        aqi = float(row['AQI']) if not pd.isna(row['AQI']) else 150.0
        info = _category_info(aqi)
        stations.append({
            "station_id": row['StationId'],
            "aqi":        round(aqi, 1),
            "category":   info["category"],
            "color":      info["color"]
        })
    return {"stations": stations, "total": len(stations)}