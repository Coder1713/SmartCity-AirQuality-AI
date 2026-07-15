from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()

# ── INPUT SCHEMA ─────────────────────────────────────────────
class StationData(BaseModel):
    station_id: str
    aqi: float
    primary_source: str
    primary_confidence: float
    pm25: float
    pm10: float
    so2: float
    nox: float

class EnforcementInput(BaseModel):
    stations: List[StationData]
    available_inspectors: int = 3

# ── ENFORCEMENT SCORING LOGIC ─────────────────────────────────
def calculate_enforcement_priority(station: StationData) -> dict:
    score = 0
    reasons = []
    actions = []

    # AQI severity score (0-40 points)
    if station.aqi > 300:
        score += 40
        reasons.append(f"Severe AQI ({station.aqi:.0f}) — immediate health risk")
        actions.append("Issue emergency public health advisory for this zone")
    elif station.aqi > 200:
        score += 30
        reasons.append(f"Very Poor AQI ({station.aqi:.0f}) — high health risk")
        actions.append("Issue health advisory for sensitive groups")
    elif station.aqi > 100:
        score += 15
        reasons.append(f"Moderate-Poor AQI ({station.aqi:.0f})")

    # Source-specific enforcement actions (0-40 points)
    if "Industrial" in station.primary_source:
        score += 40
        reasons.append(f"Industrial emission signature detected (SO2={station.so2:.1f})")
        actions.append("Inspect nearby industrial units for compliance violations")
        actions.append("Check stack emission permits and CPCB consent conditions")

    elif "Vehicular" in station.primary_source:
        score += 30
        reasons.append(f"Heavy vehicular emission signature (NOx={station.nox:.1f})")
        actions.append("Deploy traffic management to reduce congestion at this station")
        actions.append("Check for diesel vehicle violations and PUC compliance")

    elif "Construction" in station.primary_source:
        score += 35
        reasons.append(f"Construction dust signature (PM10={station.pm10:.1f})")
        actions.append("Inspect active construction sites for dust suppression compliance")
        actions.append("Verify water sprinkling and green net coverage at sites")

    elif "Biomass" in station.primary_source:
        score += 35
        reasons.append("Biomass/crop burning signature detected")
        actions.append("Deploy field teams to locate and stop active burning")
        actions.append("Issue notices to identified burning locations")

    # Confidence bonus (0-20 points)
    if station.primary_confidence >= 80:
        score += 20
        reasons.append(f"High attribution confidence ({station.primary_confidence:.0f}%)")
    elif station.primary_confidence >= 60:
        score += 10

    return {
        "station_id": station.station_id,
        "aqi": station.aqi,
        "enforcement_score": min(score, 100),
        "primary_source": station.primary_source,
        "attribution_confidence": f"{station.primary_confidence:.0f}%",
        "reasons": reasons,
        "recommended_actions": actions,
        "urgency": (
            "IMMEDIATE" if score >= 70 else
            "HIGH"      if score >= 50 else
            "MEDIUM"    if score >= 30 else
            "LOW"
        )
    }

# ── ENFORCEMENT ENDPOINT ──────────────────────────────────────
@router.post("/prioritize")
def prioritize_enforcement(data: EnforcementInput):
    # Score all stations
    scored = [calculate_enforcement_priority(s) for s in data.stations]

    # Sort by enforcement score descending
    scored = sorted(scored, key=lambda x: x["enforcement_score"], reverse=True)

    # Assign inspectors to top stations
    top = scored[:data.available_inspectors]
    for i, station in enumerate(top):
        station["inspector_assigned"] = f"Inspector Team {i+1}"

    return {
        "total_stations_analyzed": len(data.stations),
        "inspectors_available": data.available_inspectors,
        "prioritized_deployments": top,
        "remaining_stations": scored[data.available_inspectors:],
        "methodology": "Multi-factor scoring: AQI severity (40pts) + source-specific enforcement weight (40pts) + attribution confidence (20pts)",
        "generated_by": "Enforcement Intelligence & Prioritisation Agent"
    }