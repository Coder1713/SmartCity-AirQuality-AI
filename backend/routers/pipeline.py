from fastapi import APIRouter
from pydantic import BaseModel
import time
import pickle
import pandas as pd
from datetime import datetime
from backend.routers.advisory import ADVISORY_TRANSLATIONS

router = APIRouter()

# Load model once
try:
    with open("ml/aqi_forecast_model.pkl", "rb") as f:
        model = pickle.load(f)
    with open("ml/feature_columns.pkl", "rb") as f:
        FEATURES = pickle.load(f)
except:
    model = None
    FEATURES = []

# ── INPUT SCHEMA ─────────────────────────────────────────────
class PipelineInput(BaseModel):
    station_id: str = "DL001"
    pm25: float = 89.0
    pm10: float = 145.0
    no: float = 12.0
    no2: float = 38.0
    nox: float = 52.0
    nh3: float = 18.0
    co: float = 1.8
    so2: float = 14.0
    o3: float = 22.0
    aqi_lag1: float = 178.0
    aqi_lag3: float = 165.0
    aqi_lag6: float = 155.0
    aqi_lag24: float = 142.0
    aqi_roll6: float = 160.0
    aqi_roll24: float = 148.0
    language: str = "english"
    population_type: str = "general"
    available_inspectors: int = 3

# ── HELPERS ───────────────────────────────────────────────────
def get_aqi_category(aqi: float) -> str:
    if aqi <= 50:    return "Good"
    elif aqi <= 100: return "Satisfactory"
    elif aqi <= 200: return "Moderate"
    elif aqi <= 300: return "Poor"
    elif aqi <= 400: return "Very Poor"
    else:            return "Severe"

POPULATION_ADDENDUM = {
    "elderly": {
        "english": "Elderly individuals should take extra precaution and avoid outdoor exposure even at moderate AQI levels.",
        "hindi": "बुजुर्गों को अतिरिक्त सावधानी बरतनी चाहिए और मध्यम AQI स्तर पर भी बाहरी संपर्क से बचना चाहिए।",
        "kannada": "ವೃದ್ಧರು ಹೆಚ್ಚುವರಿ ಎಚ್ಚರಿಕೆ ವಹಿಸಬೇಕು ಮತ್ತು ಮಧ್ಯಮ AQI ಮಟ್ಟದಲ್ಲಿಯೂ ಹೊರಾಂಗಣ ಸಂಪರ್ಕ ತಪ್ಪಿಸಬೇಕು.",
        "tamil": "முதியவர்கள் கூடுதல் எச்சரிக்கை உடன் இருக்க வேண்டும் மற்றும் மிதமான AQI அளவிலும் வெளிப்புற வெளிப்பாட்டைத் தவிர்க்க வேண்டும்."
    },
    "children": {
        "english": "Children's developing lungs are highly sensitive — limit outdoor playtime and monitor for coughing or breathing difficulty.",
        "hindi": "बच्चों के विकासशील फेफड़े अत्यधिक संवेदनशील होते हैं — बाहरी खेल का समय सीमित करें और खांसी या सांस लेने में कठिनाई पर नज़र रखें।",
        "kannada": "ಮಕ್ಕಳ ಬೆಳವಣಿಗೆಯ ಶ್ವಾಸಕೋಶಗಳು ಹೆಚ್ಚು ಸೂಕ್ಷ್ಮ — ಹೊರಾಂಗಣ ಆಟದ ಸಮಯ ಮಿತಿಗೊಳಿಸಿ ಮತ್ತು ಕೆಮ್ಮು ಅಥವಾ ಉಸಿರಾಟದ ತೊಂದರೆಯನ್ನು ಗಮನಿಸಿ.",
        "tamil": "குழந்தைகளின் வளரும் நுரையீரல்கள் மிகவும் உணர்திறன் கொண்டவை — வெளிப்புற விளையாட்டு நேரத்தை கட்டுப்படுத்தி இருமல் அல்லது சுவாசிக்க சிரமத்தை கண்காணிக்கவும்."
    },
    "outdoor_workers": {
        "english": "Outdoor workers should take frequent breaks indoors, use N95 masks during work hours, and stay hydrated throughout shifts.",
        "hindi": "बाहरी श्रमिकों को घर के अंदर बार-बार ब्रेक लेना चाहिए, काम के घंटों के दौरान N95 मास्क का उपयोग करना चाहिए, और पूरी शिफ्ट में हाइड्रेटेड रहना चाहिए।",
        "kannada": "ಹೊರಾಂಗಣ ಕಾರ್ಮಿಕರು ಆಗಾಗ್ಗೆ ಒಳಾಂಗಣದಲ್ಲಿ ವಿರಾಮ ತೆಗೆದುಕೊಳ್ಳಬೇಕು, ಕೆಲಸದ ಸಮಯದಲ್ಲಿ N95 ಮಾಸ್ಕ್ ಬಳಸಬೇಕು, ಮತ್ತು ಪೂರ್ತಿ ಶಿಫ್ಟ್‌ನಲ್ಲಿ ಹೈಡ್ರೇಟೆಡ್ ಆಗಿರಬೇಕು.",
        "tamil": "வெளிப்புற தொழிலாளர்கள் அடிக்கடி உள்ளே ஓய்வு எடுக்க வேண்டும், வேலை நேரங்களில் N95 மாஸ்க் பயன்படுத்த வேண்டும், மற்றும் முழு ஷிப்ட் முழுவதும் நீரேற்றமாக இருக்க வேண்டும்."
    }
}

def get_advisory(aqi: float, population_type: str, language: str = "english") -> dict:
    if aqi <= 50:
        level = "green"
    elif aqi <= 100:
        level = "yellow"
    elif aqi <= 200:
        level = "orange"
    else:
        level = "red"

    lang = language if language in ["english", "hindi", "kannada", "tamil"] else "english"
    content = ADVISORY_TRANSLATIONS[level][lang]

    health_advice = content["health_advice"]
    if population_type in POPULATION_ADDENDUM:
        health_advice = health_advice + " " + POPULATION_ADDENDUM[population_type][lang]

    return {
        "alert_level": level,
        "headline": content["headline"],
        "health_advice": health_advice,
        "recommended_actions": content["actions"],
        "avoid": ["Outdoor exposure" if level != "green" else "Nothing specific today"],
        "best_time_outdoors": content["best_time"],
        "population_type": population_type
    }

def get_attribution(data: PipelineInput) -> dict:
    sources = []
    now = datetime.now()

    traffic_score = 0
    if data.nox > 40: traffic_score += 30
    if data.co > 1.5: traffic_score += 25
    if data.no2 > 30: traffic_score += 20
    if now.hour in [7,8,9,10,17,18,19,20]: traffic_score += 25
    if traffic_score > 0:
        sources.append({"source": "Vehicular Traffic", "confidence": min(traffic_score,100)})

    construction_score = 0
    if data.pm10 > 100: construction_score += 35
    if data.pm25 > 60:  construction_score += 25
    if data.pm10 > data.pm25 * 2: construction_score += 20
    if construction_score > 0:
        sources.append({"source": "Construction & Dust", "confidence": min(construction_score,100)})

    industry_score = 0
    if data.so2 > 15: industry_score += 40
    if data.nox > 60: industry_score += 30
    if industry_score > 0:
        sources.append({"source": "Industrial Emissions", "confidence": min(industry_score,100)})

    biomass_score = 0
    if data.pm25 > 80: biomass_score += 30
    if data.co > 2.0:  biomass_score += 30
    if now.month in [10,11,12,1,2]: biomass_score += 25
    if biomass_score > 0:
        sources.append({"source": "Biomass & Crop Burning", "confidence": min(biomass_score,100)})

    sources = sorted(sources, key=lambda x: x["confidence"], reverse=True)
    if not sources:
        sources.append({"source": "Unknown / Mixed", "confidence": 50})

    return sources

# ── PIPELINE ENDPOINT ─────────────────────────────────────────
@router.post("/analyze")
def run_full_pipeline(data: PipelineInput):
    pipeline_start = time.time()
    steps = []

    # ── STEP 1: FORECAST ─────────────────────────────────────
    t0 = time.time()
    now = datetime.now()
    input_df = pd.DataFrame([{
        'PM2.5': data.pm25, 'PM10': data.pm10,
        'NO': data.no, 'NO2': data.no2, 'NOx': data.nox,
        'NH3': data.nh3, 'CO': data.co, 'SO2': data.so2, 'O3': data.o3,
        'hour': now.hour, 'day': now.day, 'month': now.month,
        'dayofweek': now.weekday(),
        'is_weekend': 1 if now.weekday() >= 5 else 0,
        'AQI_lag1': data.aqi_lag1, 'AQI_lag3': data.aqi_lag3,
        'AQI_lag6': data.aqi_lag6, 'AQI_lag24': data.aqi_lag24,
        'AQI_roll6': data.aqi_roll6, 'AQI_roll24': data.aqi_roll24,
    }])
    predicted_aqi = float(model.predict(input_df[FEATURES])[0])
    predicted_aqi = round(max(0, predicted_aqi), 2)
    category = get_aqi_category(predicted_aqi)
    forecast_time = round((time.time() - t0) * 1000, 2)
    steps.append({"step": "1. Forecasting Agent", "time_ms": forecast_time})

    # ── STEP 2: ATTRIBUTION ──────────────────────────────────
    t0 = time.time()
    sources = get_attribution(data)
    primary_source = sources[0]["source"]
    primary_confidence = sources[0]["confidence"]
    attribution_time = round((time.time() - t0) * 1000, 2)
    steps.append({"step": "2. Source Attribution Agent", "time_ms": attribution_time})

    # ── STEP 3: ENFORCEMENT ──────────────────────────────────
    t0 = time.time()
    enforcement_score = 0
    enforcement_actions = []
    reasons = []

    if predicted_aqi > 300:
        enforcement_score += 40
        reasons.append(f"Severe AQI ({predicted_aqi:.0f})")
    elif predicted_aqi > 200:
        enforcement_score += 30
        reasons.append(f"Very Poor AQI ({predicted_aqi:.0f})")
    elif predicted_aqi > 100:
        enforcement_score += 15
        reasons.append(f"Moderate AQI ({predicted_aqi:.0f})")

    if "Industrial" in primary_source:
        enforcement_score += 40
        enforcement_actions.append("Inspect nearby industrial units for CPCB compliance")
        enforcement_actions.append("Check stack emission permits")
    elif "Vehicular" in primary_source:
        enforcement_score += 30
        enforcement_actions.append("Deploy traffic management at this station zone")
        enforcement_actions.append("Check diesel vehicle PUC compliance")
    elif "Construction" in primary_source:
        enforcement_score += 35
        enforcement_actions.append("Inspect construction sites for dust suppression")
        enforcement_actions.append("Verify water sprinkling compliance")
    elif "Biomass" in primary_source:
        enforcement_score += 35
        enforcement_actions.append("Deploy field teams to locate active burning")
        enforcement_actions.append("Issue notices to identified burning locations")

    urgency = (
        "IMMEDIATE" if enforcement_score >= 70 else
        "HIGH"      if enforcement_score >= 50 else
        "MEDIUM"    if enforcement_score >= 30 else
        "LOW"
    )
    enforcement_time = round((time.time() - t0) * 1000, 2)
    steps.append({"step": "3. Enforcement Agent", "time_ms": enforcement_time})

    # ── STEP 4: ADVISORY ─────────────────────────────────────
    t0 = time.time()
    advisory = get_advisory(predicted_aqi, data.population_type, data.language)
    advisory_time = round((time.time() - t0) * 1000, 2)
    steps.append({"step": "4. Citizen Advisory Agent", "time_ms": advisory_time})

    # ── TOTAL TIME ───────────────────────────────────────────
    total_time_ms = round((time.time() - pipeline_start) * 1000, 2)

    return {
        "station_id": data.station_id,
        "timestamp": now.isoformat(),
        "pipeline_summary": {
            "total_response_time_ms": total_time_ms,
            "steps_completed": len(steps),
            "signal_to_intervention_ms": total_time_ms
        },
        "step_timings": steps,
        "forecast": {
            "predicted_aqi": predicted_aqi,
            "category": category,
            "model_r2": 0.9964,
            "model_rmse": 6.25
        },
        "attribution": {
            "primary_source": primary_source,
            "confidence": f"{primary_confidence}%",
            "all_sources": sources
        },
        "enforcement": {
            "urgency": urgency,
            "enforcement_score": min(enforcement_score, 100),
            "reasons": reasons,
            "recommended_actions": enforcement_actions
        },
        "advisory": {
            "alert_level": advisory["alert_level"],
            "headline": advisory["headline"],
            "health_advice": advisory["health_advice"],
            "recommended_actions": advisory["recommended_actions"],
            "language": data.language,
            "population_type": data.population_type
        },
        "generated_by": "SmartCity AQI Full Intelligence Pipeline"
    }