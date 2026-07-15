from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import json

router = APIRouter()

# ── INPUT SCHEMA ─────────────────────────────────────────────
class AdvisoryInput(BaseModel):
    station_id: str = "DL001"
    predicted_aqi: float
    category: str
    language: str = "english"  # english, hindi, kannada, tamil
    population_type: str = "general"  # general, elderly, children, outdoor_workers

# ── LANGUAGE SYSTEM PROMPTS ──────────────────────────────────
LANGUAGE_INSTRUCTIONS = {
    "english":  "Respond in English.",
    "hindi":    "Respond in Hindi (हिंदी में जवाब दें).",
    "kannada":  "Respond in Kannada (ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ).",
    "tamil":    "Respond in Tamil (தமிழில் பதில் அளிக்கவும்)."
}

POPULATION_CONTEXT = {
    "general":          "general public including adults",
    "elderly":          "elderly people above 60 years who are more vulnerable to air pollution",
    "children":         "children under 12 years who are highly sensitive to air pollution",
    "outdoor_workers":  "outdoor workers like construction workers, traffic police, street vendors"
}

# ── ADVISORY ENDPOINT ────────────────────────────────────────
@router.post("/generate")
def generate_advisory(data: AdvisoryInput):
    lang_instruction = LANGUAGE_INSTRUCTIONS.get(
        data.language, LANGUAGE_INSTRUCTIONS["english"]
    )
    population_desc = POPULATION_CONTEXT.get(
        data.population_type, POPULATION_CONTEXT["general"]
    )

    prompt = f"""You are an AI health advisor for a smart city air quality system in India.

Current air quality data:
- Station: {data.station_id}
- AQI: {data.predicted_aqi}
- Category: {data.category}
- Target population: {population_desc}

Generate a health advisory with exactly this JSON structure:
{{
    "alert_level": "green/yellow/orange/red",
    "headline": "one line summary under 15 words",
    "health_advice": "2-3 sentences of specific health advice for this population",
    "recommended_actions": ["action 1", "action 2", "action 3"],
    "avoid": ["thing to avoid 1", "thing to avoid 2"],
    "best_time_outdoors": "specific time recommendation"
}}

{lang_instruction}
Return ONLY the JSON object, no extra text."""

    try:
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={"Content-Type": "application/json"},
            json={
                "model": "claude-sonnet-4-6",
                "max_tokens": 1000,
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=30
        )

        if response.status_code == 401:
            # No API key yet — return smart fallback
            return _fallback_advisory(data)

        result = response.json()
        text = result["content"][0]["text"]
        advisory = json.loads(text)

        return {
            "station_id":      data.station_id,
            "predicted_aqi":   data.predicted_aqi,
            "category":        data.category,
            "language":        data.language,
            "population_type": data.population_type,
            "advisory":        advisory,
            "powered_by":      "Claude AI"
        }

    except Exception as e:
        return _fallback_advisory(data)

# ── FALLBACK (when no API key yet) ───────────────────────────
def _fallback_advisory(data: AdvisoryInput) -> dict:
    aqi = data.predicted_aqi

    if aqi <= 50:
        advisory = {
            "alert_level": "green",
            "headline": "Air quality is good — enjoy outdoor activities",
            "health_advice": "Air quality is satisfactory today. Safe for all activities including children and elderly.",
            "recommended_actions": ["Enjoy outdoor activities", "Open windows for ventilation", "Exercise outdoors"],
            "avoid": ["Nothing specific today"],
            "best_time_outdoors": "Any time of day is suitable"
        }
    elif aqi <= 100:
        advisory = {
            "alert_level": "yellow",
            "headline": "Moderate air quality — sensitive groups take precaution",
            "health_advice": "Air quality is acceptable. Sensitive individuals may experience minor symptoms on prolonged outdoor exposure.",
            "recommended_actions": ["Limit prolonged outdoor exertion", "Keep windows closed during peak hours", "Stay hydrated"],
            "avoid": ["Heavy outdoor exercise during afternoon hours"],
            "best_time_outdoors": "Early morning (6-8 AM) is best"
        }
    elif aqi <= 200:
        advisory = {
            "alert_level": "orange",
            "headline": "Poor air quality — limit outdoor exposure today",
            "health_advice": "Air quality is poor. Everyone may experience discomfort. Sensitive groups should avoid outdoor activities.",
            "recommended_actions": ["Wear N95 mask outdoors", "Keep windows and doors closed", "Use air purifier indoors"],
            "avoid": ["Outdoor exercise", "Opening windows", "Burning garbage or leaves"],
            "best_time_outdoors": "Avoid going out if possible. If necessary, go before 7 AM"
        }
    else:
        advisory = {
            "alert_level": "red",
            "headline": "Severe air quality — stay indoors and wear mask",
            "health_advice": "Air quality is severe. Avoid all outdoor activities. Wear N95 mask if going outside is unavoidable.",
            "recommended_actions": ["Stay indoors", "Wear N95 mask if going out", "Seek medical help if experiencing breathing difficulty"],
            "avoid": ["All outdoor activities", "Opening windows", "Physical exertion"],
            "best_time_outdoors": "Do not go outdoors today"
        }

    return {
        "station_id":      data.station_id,
        "predicted_aqi":   data.predicted_aqi,
        "category":        data.category,
        "language":        data.language,
        "population_type": data.population_type,
        "advisory":        advisory,
        "powered_by":      "Rule-based fallback (add Claude API key for AI-generated advisories)"
    }