from fastapi import APIRouter
import pandas as pd
import numpy as np

router = APIRouter()

# ── MULTI-CITY HARDCODED BASELINES ───────────────────────────
# Source: CPCB National Air Quality reports 2024
# Used for comparative intelligence dashboard
CITY_PROFILES = {
    "Delhi": {
        "stations": 38,
        "avg_aqi_2024": 218,
        "worst_months": ["October", "November", "December", "January"],
        "primary_sources": ["Vehicular Traffic", "Construction", "Biomass Burning"],
        "population_million": 32.9,
        "lat": 28.6139,
        "lon": 77.2090,
        "caaqms_count": 40,
        "days_poor_or_worse_2024": 203
    },
    "Mumbai": {
        "stations": 10,
        "avg_aqi_2024": 145,
        "worst_months": ["November", "December", "January"],
        "primary_sources": ["Vehicular Traffic", "Industrial Emissions", "Sea Salt"],
        "population_million": 20.7,
        "lat": 19.0760,
        "lon": 72.8777,
        "caaqms_count": 15,
        "days_poor_or_worse_2024": 61
    },
    "Kolkata": {
        "stations": 8,
        "avg_aqi_2024": 156,
        "worst_months": ["November", "December", "January", "February"],
        "primary_sources": ["Vehicular Traffic", "Biomass Burning", "Industrial Emissions"],
        "population_million": 14.8,
        "lat": 22.5726,
        "lon": 88.3639,
        "caaqms_count": 16,
        "days_poor_or_worse_2024": 98
    },
    "Bengaluru": {
        "stations": 7,
        "avg_aqi_2024": 98,
        "worst_months": ["January", "February", "March"],
        "primary_sources": ["Vehicular Traffic", "Construction"],
        "population_million": 13.2,
        "lat": 12.9716,
        "lon": 77.5946,
        "caaqms_count": 12,
        "days_poor_or_worse_2024": 28
    },
    "Chennai": {
        "stations": 6,
        "avg_aqi_2024": 89,
        "worst_months": ["January", "February"],
        "primary_sources": ["Vehicular Traffic", "Industrial Emissions"],
        "population_million": 11.5,
        "lat": 13.0827,
        "lon": 80.2707,
        "caaqms_count": 10,
        "days_poor_or_worse_2024": 19
    }
}

# ── AQI CATEGORY HELPER ───────────────────────────────────────
def get_category(aqi: float) -> str:
    if aqi <= 50:   return "Good"
    elif aqi <= 100: return "Satisfactory"
    elif aqi <= 200: return "Moderate"
    elif aqi <= 300: return "Poor"
    elif aqi <= 400: return "Very Poor"
    else:            return "Severe"

# ── INTERVENTION EFFECTIVENESS SCORING ───────────────────────
def score_intervention_readiness(city: str, profile: dict) -> dict:
    score = 0
    factors = []

    if profile["caaqms_count"] >= 15:
        score += 30
        factors.append("Good monitoring coverage")
    elif profile["caaqms_count"] >= 10:
        score += 15
        factors.append("Moderate monitoring coverage")
    else:
        factors.append("Limited monitoring coverage")

    if profile["days_poor_or_worse_2024"] > 150:
        score += 40
        factors.append("Critical pollution levels — highest intervention priority")
    elif profile["days_poor_or_worse_2024"] > 60:
        score += 25
        factors.append("Significant pollution — high intervention priority")
    else:
        score += 10
        factors.append("Moderate pollution — standard monitoring")

    if len(profile["primary_sources"]) >= 3:
        score += 30
        factors.append("Multiple source types — comprehensive enforcement needed")
    else:
        score += 15
        factors.append("Focused source types — targeted enforcement possible")

    return {
        "readiness_score": min(score, 100),
        "factors": factors
    }

# ── ENDPOINTS ─────────────────────────────────────────────────
@router.get("/overview")
def get_city_overview():
    cities = []
    for city, profile in CITY_PROFILES.items():
        readiness = score_intervention_readiness(city, profile)
        cities.append({
            "city": city,
            "avg_aqi_2024": profile["avg_aqi_2024"],
            "category": get_category(profile["avg_aqi_2024"]),
            "days_poor_or_worse": profile["days_poor_or_worse_2024"],
            "primary_sources": profile["primary_sources"],
            "caaqms_stations": profile["caaqms_count"],
            "population_million": profile["population_million"],
            "coordinates": {"lat": profile["lat"], "lon": profile["lon"]},
            "worst_months": profile["worst_months"],
            "intervention_readiness": readiness
        })

    # Sort by AQI descending (worst first)
    cities = sorted(cities, key=lambda x: x["avg_aqi_2024"], reverse=True)

    return {
        "cities": cities,
        "total_cities": len(cities),
        "data_source": "CPCB National Air Quality Reports 2024",
        "generated_by": "Multi-City Comparative Intelligence Dashboard"
    }

@router.get("/compare/{city1}/{city2}")
def compare_cities(city1: str, city2: str):
    if city1 not in CITY_PROFILES or city2 not in CITY_PROFILES:
        available = list(CITY_PROFILES.keys())
        return {"error": f"City not found. Available: {available}"}

    p1 = CITY_PROFILES[city1]
    p2 = CITY_PROFILES[city2]

    aqi_diff = p1["avg_aqi_2024"] - p2["avg_aqi_2024"]
    worse_city = city1 if aqi_diff > 0 else city2

    return {
        "comparison": {
            city1: {
                "avg_aqi_2024": p1["avg_aqi_2024"],
                "category": get_category(p1["avg_aqi_2024"]),
                "days_poor_or_worse": p1["days_poor_or_worse_2024"],
                "primary_sources": p1["primary_sources"],
                "caaqms_stations": p1["caaqms_count"]
            },
            city2: {
                "avg_aqi_2024": p2["avg_aqi_2024"],
                "category": get_category(p2["avg_aqi_2024"]),
                "days_poor_or_worse": p2["days_poor_or_worse_2024"],
                "primary_sources": p2["primary_sources"],
                "caaqms_stations": p2["caaqms_count"]
            }
        },
        "insight": f"{worse_city} has worse air quality by {abs(aqi_diff)} AQI points on average in 2024",
        "shared_sources": list(set(p1["primary_sources"]) & set(p2["primary_sources"])),
        "recommendation": f"Interventions that worked in {city2 if worse_city == city1 else city1} for shared sources can be adapted for {worse_city}"
    }