from fastapi import APIRouter
import pandas as pd
from datetime import datetime, timedelta
from backend.shared import get_model_and_features

router = APIRouter()

try:
    model, FEATURES = get_model_and_features()
except Exception as e:
    print(f"Trend agent model load error: {e}")
    model = None
    FEATURES = []

HISTORY_DF = pd.read_csv("datasets/processed/station_history.csv")
HISTORY_DF['Datetime'] = pd.to_datetime(HISTORY_DF['Datetime'])

POLLUTANT_COLS = ['PM2.5', 'PM10', 'NO', 'NO2', 'NOx', 'NH3', 'CO', 'SO2', 'O3']
for col in POLLUTANT_COLS:
    HISTORY_DF[col] = HISTORY_DF.groupby('StationId')[col].transform(lambda x: x.fillna(x.median()))
    HISTORY_DF[col] = HISTORY_DF[col].fillna(HISTORY_DF[col].median())

HISTORY_DF['AQI'] = HISTORY_DF['AQI'].fillna(HISTORY_DF['AQI'].median())


@router.get("/history/{station_id}")
def get_station_history(station_id: str, hours: int = 168):
    station_data = HISTORY_DF[HISTORY_DF['StationId'] == station_id].tail(hours)

    if station_data.empty:
        return {"station_id": station_id, "points": [], "error": "No history found for this station"}

    points = [
        {"timestamp": row['Datetime'].isoformat(), "aqi": round(float(row['AQI']), 1), "type": "actual"}
        for _, row in station_data.iterrows()
    ]

    return {"station_id": station_id, "points": points, "count": len(points)}


@router.get("/forecast-curve/{station_id}")
def get_forecast_curve(station_id: str):
    if model is None:
        return {"error": "Model not loaded"}

    station_data = HISTORY_DF[HISTORY_DF['StationId'] == station_id].tail(24)
    if station_data.empty:
        return {"station_id": station_id, "points": [], "error": "No history found"}

    last_row = station_data.iloc[-1]
    recent_aqi = station_data['AQI'].tolist()

    points = []
    now = datetime.now()

    aqi_lag1 = float(recent_aqi[-1]) if len(recent_aqi) >= 1 else 150.0
    aqi_lag3 = float(recent_aqi[-3]) if len(recent_aqi) >= 3 else aqi_lag1
    aqi_lag6 = float(recent_aqi[-6]) if len(recent_aqi) >= 6 else aqi_lag1
    aqi_lag24 = float(recent_aqi[0]) if len(recent_aqi) >= 24 else aqi_lag1
    roll6 = sum(recent_aqi[-6:]) / len(recent_aqi[-6:]) if recent_aqi else 150.0
    roll24 = sum(recent_aqi) / len(recent_aqi) if recent_aqi else 150.0

    for h in range(1, 73):
        future_time = now + timedelta(hours=h)

        input_df = pd.DataFrame([{
            'PM2.5': float(last_row['PM2.5']), 'PM10': float(last_row['PM10']),
            'NO': float(last_row['NO']), 'NO2': float(last_row['NO2']), 'NOx': float(last_row['NOx']),
            'NH3': float(last_row['NH3']), 'CO': float(last_row['CO']), 'SO2': float(last_row['SO2']),
            'O3': float(last_row['O3']),
            'hour': future_time.hour, 'day': future_time.day, 'month': future_time.month,
            'dayofweek': future_time.weekday(),
            'is_weekend': 1 if future_time.weekday() >= 5 else 0,
            'AQI_lag1': aqi_lag1, 'AQI_lag3': aqi_lag3, 'AQI_lag6': aqi_lag6, 'AQI_lag24': aqi_lag24,
            'AQI_roll6': roll6, 'AQI_roll24': roll24,
        }])

        raw_predicted = float(model.predict(input_df[FEATURES])[0])
        predicted = (0.6 * raw_predicted) + (0.4 * roll24)
        predicted = max(0, round(predicted, 1))

        points.append({"timestamp": future_time.isoformat(), "aqi": predicted, "type": "forecast"})

        aqi_lag1 = predicted
        roll6 = (roll6 * 5 + predicted) / 6
        roll24 = (roll24 * 23 + predicted) / 24

    return {"station_id": station_id, "points": points, "count": len(points)}