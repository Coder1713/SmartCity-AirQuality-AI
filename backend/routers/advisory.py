from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import json
import os

router = APIRouter()

CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY")
print(f"Claude API key loaded: {'Yes' if CLAUDE_API_KEY else 'No - check .env file'}")

class AdvisoryInput(BaseModel):
    station_id: str = "DL001"
    predicted_aqi: float
    category: str
    language: str = "english"
    population_type: str = "general"

LANGUAGE_INSTRUCTIONS = {
    "english":  "Respond in English.",
    "hindi":    "Respond in Hindi.",
    "kannada":  "Respond in Kannada.",
    "tamil":    "Respond in Tamil."
}

POPULATION_CONTEXT = {
    "general":          "general public including adults",
    "elderly":          "elderly people above 60 years who are more vulnerable to air pollution",
    "children":         "children under 12 years who are highly sensitive to air pollution",
    "outdoor_workers":  "outdoor workers like construction workers, traffic police, street vendors"
}

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
Station: {data.station_id}
AQI: {data.predicted_aqi}
Category: {data.category}
Target population: {population_desc}

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
        if not CLAUDE_API_KEY:
            return _fallback_advisory(data)

        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "Content-Type": "application/json",
                "x-api-key": CLAUDE_API_KEY,
                "anthropic-version": "2023-06-01"
            },
            json={
                "model": "claude-sonnet-5",
                "max_tokens": 1000,
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=30
        )

        if response.status_code == 401:
            return _fallback_advisory(data)

        result = response.json()
        if response.status_code != 200:
            print(f"Claude API full error: {result}")
            return _fallback_advisory(data)
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
        print(f"Claude API error: {e}")
        return _fallback_advisory(data)


ADVISORY_TRANSLATIONS = {
    "green": {
        "english": {"headline": "Air quality is good, enjoy outdoor activities", "health_advice": "Air quality is satisfactory today. Safe for all activities including children and elderly.", "actions": ["Enjoy outdoor activities", "Open windows for ventilation", "Exercise outdoors"], "best_time": "Any time of day is suitable"},
        "hindi": {"headline": "वायु गुणवत्ता अच्छी है, बाहरी गतिविधियों का आनंद लें", "health_advice": "आज वायु गुणवत्ता संतोषजनक है। बच्चों और बुजुर्गों सहित सभी गतिविधियों के लिए सुरक्षित।", "actions": ["बाहरी गतिविधियों का आनंद लें", "वेंटिलेशन के लिए खिड़कियां खोलें", "बाहर व्यायाम करें"], "best_time": "दिन का कोई भी समय उपयुक्त है"},
        "kannada": {"headline": "ಗಾಳಿಯ ಗುಣಮಟ್ಟ ಉತ್ತಮವಾಗಿದೆ, ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳನ್ನು ಆನಂದಿಸಿ", "health_advice": "ಇಂದು ಗಾಳಿಯ ಗುಣಮಟ್ಟ ತೃಪ್ತಿಕರವಾಗಿದೆ. ಮಕ್ಕಳು ಮತ್ತು ವೃದ್ಧರು ಸೇರಿದಂತೆ ಎಲ್ಲಾ ಚಟುವಟಿಕೆಗಳಿಗೆ ಸುರಕ್ಷಿತ.", "actions": ["ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳನ್ನು ಆನಂದಿಸಿ", "ಗಾಳಿ ಬೆಳಕಿಗಾಗಿ ಕಿಟಕಿಗಳನ್ನು ತೆರೆಯಿರಿ", "ಹೊರಗೆ ವ್ಯಾಯಾಮ ಮಾಡಿ"], "best_time": "ದಿನದ ಯಾವುದೇ ಸಮಯ ಸೂಕ್ತವಾಗಿದೆ"},
        "tamil": {"headline": "காற்றின் தரம் நல்லது, வெளிப்புற செயல்பாடுகளை அனுபவிக்கவும்", "health_advice": "இன்று காற்றின் தரம் திருப்திகரமாக உள்ளது. குழந்தைகள் மற்றும் முதியவர்கள் உட்பட அனைத்து செயல்பாடுகளுக்கும் பாதுகாப்பானது.", "actions": ["வெளிப்புற செயல்பாடுகளை அனுபவிக்கவும்", "காற்றோட்டத்திற்கு ஜன்னல்களைத் திறக்கவும்", "வெளியில் உடற்பயிற்சி செய்யவும்"], "best_time": "நாளின் எந்த நேரமும் பொருத்தமானது"}
    },
    "yellow": {
        "english": {"headline": "Moderate air quality, sensitive groups take precaution", "health_advice": "Air quality is acceptable. Sensitive individuals may experience minor symptoms on prolonged outdoor exposure.", "actions": ["Limit prolonged outdoor exertion", "Keep windows closed during peak hours", "Stay hydrated"], "best_time": "Early morning (6-8 AM) is best"},
        "hindi": {"headline": "मध्यम वायु गुणवत्ता, संवेदनशील समूह सावधानी बरतें", "health_advice": "वायु गुणवत्ता स्वीकार्य है। लंबे समय तक बाहर रहने पर संवेदनशील व्यक्तियों को मामूली लक्षण हो सकते हैं।", "actions": ["लंबे समय तक बाहरी परिश्रम सीमित करें", "व्यस्त समय में खिड़कियां बंद रखें", "हाइड्रेटेड रहें"], "best_time": "सुबह जल्दी (6-8 बजे) सबसे अच्छा है"},
        "kannada": {"headline": "ಮಧ್ಯಮ ಗಾಳಿಯ ಗುಣಮಟ್ಟ, ಸೂಕ್ಷ್ಮ ಗುಂಪುಗಳು ಎಚ್ಚರಿಕೆ ವಹಿಸಿ", "health_advice": "ಗಾಳಿಯ ಗುಣಮಟ್ಟ ಸ್ವೀಕಾರಾರ್ಹವಾಗಿದೆ. ದೀರ್ಘಕಾಲ ಹೊರಾಂಗಣದಲ್ಲಿದ್ದರೆ ಸೂಕ್ಷ್ಮ ವ್ಯಕ್ತಿಗಳಿಗೆ ಸಣ್ಣ ಲಕ್ಷಣಗಳು ಕಾಣಿಸಬಹುದು.", "actions": ["ದೀರ್ಘಕಾಲ ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆ ಮಿತಿಗೊಳಿಸಿ", "ಗರಿಷ್ಠ ಸಮಯದಲ್ಲಿ ಕಿಟಕಿ ಮುಚ್ಚಿ", "ಹೈಡ್ರೇಟೆಡ್ ಆಗಿರಿ"], "best_time": "ಬೆಳಿಗ್ಗೆ ಬೇಗ (6-8 AM) ಉತ್ತಮ"},
        "tamil": {"headline": "மிதமான காற்றின் தரம், உணர்திறன் குழுக்கள் எச்சரிக்கையாக இருக்கவும்", "health_advice": "காற்றின் தரம் ஏற்றுக்கொள்ளக்கூடியது. நீண்ட நேரம் வெளியில் இருந்தால் உணர்திறன் உள்ளவர்களுக்கு சிறிய அறிகுறிகள் ஏற்படலாம்.", "actions": ["நீண்ட நேர வெளிப்புற உழைப்பை கட்டுப்படுத்தவும்", "உச்ச நேரங்களில் ஜன்னல்களை மூடவும்", "நீரேற்றமாக இருங்கள்"], "best_time": "அதிகாலை (6-8 AM) சிறந்தது"}
    },
    "orange": {
        "english": {"headline": "Poor air quality, limit outdoor exposure today", "health_advice": "Air quality is poor. Everyone may experience discomfort. Sensitive groups should avoid outdoor activities.", "actions": ["Wear N95 mask outdoors", "Keep windows and doors closed", "Use air purifier indoors"], "best_time": "Avoid going out if possible. If necessary, go before 7 AM"},
        "hindi": {"headline": "खराब वायु गुणवत्ता, आज बाहर जाना सीमित करें", "health_advice": "वायु गुणवत्ता खराब है। सभी को असुविधा हो सकती है। संवेदनशील समूहों को बाहरी गतिविधियों से बचना चाहिए।", "actions": ["बाहर N95 मास्क पहनें", "खिड़कियां और दरवाजे बंद रखें", "घर के अंदर एयर प्यूरीफायर का उपयोग करें"], "best_time": "यदि संभव हो तो बाहर जाने से बचें। आवश्यक होने पर सुबह 7 बजे से पहले जाएं"},
        "kannada": {"headline": "ಕಳಪೆ ಗಾಳಿಯ ಗುಣಮಟ್ಟ, ಇಂದು ಹೊರಾಂಗಣ ಸಂಪರ್ಕ ಮಿತಿಗೊಳಿಸಿ", "health_advice": "ಗಾಳಿಯ ಗುಣಮಟ್ಟ ಕಳಪೆಯಾಗಿದೆ. ಎಲ್ಲರಿಗೂ ಅಸ್ವಸ್ಥತೆ ಉಂಟಾಗಬಹುದು. ಸೂಕ್ಷ್ಮ ಗುಂಪುಗಳು ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳನ್ನು ತಪ್ಪಿಸಬೇಕು.", "actions": ["ಹೊರಗೆ N95 ಮಾಸ್ಕ್ ಧರಿಸಿ", "ಕಿಟಕಿ ಮತ್ತು ಬಾಗಿಲುಗಳನ್ನು ಮುಚ್ಚಿ", "ಒಳಾಂಗಣದಲ್ಲಿ ಏರ್ ಪ್ಯೂರಿಫೈಯರ್ ಬಳಸಿ"], "best_time": "ಸಾಧ್ಯವಾದರೆ ಹೊರಗೆ ಹೋಗುವುದನ್ನು ತಪ್ಪಿಸಿ. ಅಗತ್ಯವಿದ್ದರೆ ಬೆಳಿಗ್ಗೆ 7 ಗಂಟೆಯ ಮೊದಲು ಹೋಗಿ"},
        "tamil": {"headline": "மோசமான காற்றின் தரம், இன்று வெளிப்புற வெளிப்பாட்டைக் குறைக்கவும்", "health_advice": "காற்றின் தரம் மோசமாக உள்ளது. அனைவருக்கும் அசௌகரியம் ஏற்படலாம். உணர்திறன் குழுக்கள் வெளிப்புற செயல்பாடுகளைத் தவிர்க்க வேண்டும்.", "actions": ["வெளியில் N95 மாஸ்க் அணியவும்", "ஜன்னல்கள் மற்றும் கதவுகளை மூடி வைக்கவும்", "உள்ளே காற்று சுத்திகரிப்பு பயன்படுத்தவும்"], "best_time": "முடிந்தால் வெளியே செல்வதைத் தவிர்க்கவும். அவசியமானால் காலை 7 மணிக்கு முன் செல்லவும்"}
    },
    "red": {
        "english": {"headline": "Severe air quality, stay indoors and wear mask", "health_advice": "Air quality is severe. Avoid all outdoor activities. Wear N95 mask if going outside is unavoidable.", "actions": ["Stay indoors", "Wear N95 mask if going out", "Seek medical help if experiencing breathing difficulty"], "best_time": "Do not go outdoors today"},
        "hindi": {"headline": "गंभीर वायु गुणवत्ता, घर के अंदर रहें और मास्क पहनें", "health_advice": "वायु गुणवत्ता गंभीर है। सभी बाहरी गतिविधियों से बचें। यदि बाहर जाना अपरिहार्य है तो N95 मास्क पहनें।", "actions": ["घर के अंदर रहें", "बाहर जाते समय N95 मास्क पहनें", "सांस लेने में कठिनाई होने पर चिकित्सा सहायता लें"], "best_time": "आज बाहर न जाएं"},
        "kannada": {"headline": "ತೀವ್ರ ಗಾಳಿಯ ಗುಣಮಟ್ಟ, ಒಳಾಂಗಣದಲ್ಲಿರಿ ಮತ್ತು ಮಾಸ್ಕ್ ಧರಿಸಿ", "health_advice": "ಗಾಳಿಯ ಗುಣಮಟ್ಟ ತೀವ್ರವಾಗಿದೆ. ಎಲ್ಲಾ ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳನ್ನು ತಪ್ಪಿಸಿ. ಹೊರಗೆ ಹೋಗುವುದು ಅನಿವಾರ್ಯವಾಗಿದ್ದರೆ N95 ಮಾಸ್ಕ್ ಧರಿಸಿ.", "actions": ["ಒಳಾಂಗಣದಲ್ಲಿರಿ", "ಹೊರಗೆ ಹೋಗುವಾಗ N95 ಮಾಸ್ಕ್ ಧರಿಸಿ", "ಉಸಿರಾಟದ ತೊಂದರೆ ಇದ್ದರೆ ವೈದ್ಯಕೀಯ ಸಹಾಯ ಪಡೆಯಿರಿ"], "best_time": "ಇಂದು ಹೊರಗೆ ಹೋಗಬೇಡಿ"},
        "tamil": {"headline": "கடுமையான காற்றின் தரம், உள்ளே இருந்து மாஸ்க் அணியவும்", "health_advice": "காற்றின் தரம் கடுமையானது. அனைத்து வெளிப்புற செயல்பாடுகளையும் தவிர்க்கவும். வெளியே செல்வது தவிர்க்க முடியாதது என்றால் N95 மாஸ்க் அணியவும்.", "actions": ["உள்ளே இருக்கவும்", "வெளியே செல்லும்போது N95 மாஸ்க் அணியவும்", "சுவாசிப்பதில் சிரமம் இருந்தால் மருத்துவ உதவி பெறவும்"], "best_time": "இன்று வெளியே செல்ல வேண்டாம்"}
    }
}

def _fallback_advisory(data: AdvisoryInput) -> dict:
    aqi = data.predicted_aqi

    if aqi <= 50:
        level = "green"
    elif aqi <= 100:
        level = "yellow"
    elif aqi <= 200:
        level = "orange"
    else:
        level = "red"

    lang = data.language if data.language in ["english", "hindi", "kannada", "tamil"] else "english"
    content = ADVISORY_TRANSLATIONS[level][lang]

    advisory = {
        "alert_level": level,
        "headline": content["headline"],
        "health_advice": content["health_advice"],
        "recommended_actions": content["actions"],
        "avoid": ["Outdoor exposure" if level != "green" else "Nothing specific today"],
        "best_time_outdoors": content["best_time"]
    }

    return {
        "station_id":      data.station_id,
        "predicted_aqi":   data.predicted_aqi,
        "category":        data.category,
        "language":        data.language,
        "population_type": data.population_type,
        "advisory":        advisory,
        "powered_by":      "Multilingual rule-based advisory system"
    }