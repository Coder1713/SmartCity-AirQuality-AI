from fastapi import APIRouter, HTTPException
import pandas as pd
from datetime import datetime
from backend.station_metadata import STATIONS, COORDINATE_NOTE
from backend.shared import get_aqi_category

router = APIRouter()

try:
    _HISTORY = pd.read_csv("datasets/processed/station_history.csv")
    _HISTORY['Datetime'] = pd.to_datetime(_HISTORY['Datetime'])
except Exception as e:
    print(f"Station history load error: {e}")
    _HISTORY = pd.DataFrame()

def _latest_observation(station_id: str):
    if _HISTORY.empty:
        return None
    rows = _HISTORY[_HISTORY['StationId'] == station_id]
    if rows.empty:
        return None
    return rows.sort_values('Datetime').iloc[-1]

def _trend_for_station(station_id: str):
    if _HISTORY.empty:
        return None
    rows = _HISTORY[_HISTORY['StationId'] == station_id].sort_values('Datetime')
    if len(rows) < 6:
        return None
    recent = rows['AQI'].tail(6).mean()
    earlier = rows['AQI'].tail(24).head(18).mean() if len(rows) >= 24 else rows['AQI'].mean()
    if pd.isna(recent) or pd.isna(earlier):
        return None
    delta = recent - earlier
    if delta > 5: return "worsening"
    if delta < -5: return "improving"
    return "stable"


@router.get("/overview")
def stations_overview():
    stations_out = []
    for sid, meta in STATIONS.items():
        latest = _latest_observation(sid)
        if latest is None:
            continue
        aqi = float(latest['AQI'])
        stations_out.append({
            "station_id": sid,
            "name": meta["name"],
            "latitude": meta["lat"],
            "longitude": meta["lon"],
            "current_aqi": round(aqi, 1),
            "category": get_aqi_category(aqi),
            "last_observed_at": latest['Datetime'].isoformat(),
            "value_type": "dataset_latest",
        })
    return {
        "generated_at": datetime.now().isoformat(),
        "data_source": "Delhi AQI historical dataset (station_hour.csv)",
        "data_status": "dataset_latest",
        "coordinate_note": COORDINATE_NOTE,
        "stations": stations_out
    }


@router.get("/{station_id}")
def station_detail(station_id: str):
    if station_id not in STATIONS:
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found")

    meta = STATIONS[station_id]
    latest = _latest_observation(station_id)

    if latest is None:
        return {
            "station_id": station_id, "name": meta["name"],
            "latitude": meta["lat"], "longitude": meta["lon"],
            "current": None, "pollutants": None, "trend": None,
            "data_source": "Delhi AQI historical dataset", "coordinate_note": COORDINATE_NOTE
        }

    aqi = float(latest['AQI'])

    def safe(v):
        return None if pd.isna(v) else round(float(v), 2)

    return {
        "station_id": station_id,
        "name": meta["name"],
        "latitude": meta["lat"],
        "longitude": meta["lon"],
        "current": {
            "aqi": round(aqi, 1),
            "category": get_aqi_category(aqi),
            "timestamp": latest['Datetime'].isoformat(),
            "value_type": "dataset_latest"
        },
        "pollutants": {
            "pm25": safe(latest.get('PM2.5')),
            "pm10": safe(latest.get('PM10')),
            "no2": safe(latest.get('NO2')),
            "so2": safe(latest.get('SO2')),
            "co": safe(latest.get('CO')),
            "o3": safe(latest.get('O3')),
        },
        "trend": _trend_for_station(station_id),
        "data_source": "Delhi AQI historical dataset (station_hour.csv)",
        "coordinate_note": COORDINATE_NOTE
    }