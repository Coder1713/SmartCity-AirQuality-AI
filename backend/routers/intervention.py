from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()

# ── TRANSPARENT SCENARIO-ESTIMATION ENGINE ──────────────────────
# This is a deterministic heuristic, not a trained causal model.
# Max reductions are illustrative assumptions, not measured field data.
# Designed so this function can later be replaced by a trained
# policy-impact ML model without changing the API contract.

MAX_IMPACT = {
    "construction_dust_control": 18.0,
    "road_water_sprinkling": 12.0,
    "heavy_vehicle_restrictions": 15.0,
    "traffic_flow_improvement": 10.0,
}

INTERVENTION_LABELS = {
    "construction_dust_control": "Construction Dust Control",
    "road_water_sprinkling": "Road Water Sprinkling",
    "heavy_vehicle_restrictions": "Heavy Vehicle Restrictions",
    "traffic_flow_improvement": "Traffic Flow Improvement",
}

# Overlap discount: interventions that partially address the same
# pollution pathway see reduced combined benefit (avoids double counting).
OVERLAP_PAIRS = [
    ("construction_dust_control", "road_water_sprinkling", 0.15),
    ("heavy_vehicle_restrictions", "traffic_flow_improvement", 0.15),
]

def get_category(aqi: float) -> str:
    if aqi <= 50: return "Good"
    if aqi <= 100: return "Satisfactory"
    if aqi <= 200: return "Moderate"
    if aqi <= 300: return "Poor"
    if aqi <= 400: return "Very Poor"
    return "Severe"


class InterventionRequest(BaseModel):
    station_id: str = "DL001"
    forecast_aqi: float = Field(..., ge=0, le=1000)
    interventions: dict[str, float]

    def validated_interventions(self) -> dict:
        clean = {}
        for key in MAX_IMPACT:
            val = self.interventions.get(key, 0)
            if val != val or val in (float("inf"), float("-inf")):  # NaN/inf check
                val = 0
            clean[key] = max(0.0, min(100.0, float(val)))
        return clean


@router.post("/simulate")
def simulate_intervention(req: InterventionRequest):
    interventions = req.validated_interventions()
    forecast_aqi = req.forecast_aqi

    # Diminishing returns: sqrt scaling instead of linear, so the
    # first 50% of an intervention matters more than the last 50%.
    raw_impacts = {}
    for key, pct in interventions.items():
        scale = (pct / 100.0) ** 0.85  # mild diminishing returns curve
        raw_impacts[key] = scale * MAX_IMPACT[key]

    # Apply overlap discount for pairs addressing similar pathways
    total_before_overlap = sum(raw_impacts.values())
    overlap_penalty = 0.0
    for a, b, discount in OVERLAP_PAIRS:
        pair_min = min(raw_impacts[a], raw_impacts[b])
        overlap_penalty += pair_min * discount

    total_reduction = max(0.0, total_before_overlap - overlap_penalty)
    # Cap total reduction so estimate never exceeds a defensible ceiling
    total_reduction = min(total_reduction, forecast_aqi * 0.6)

    estimated_aqi = max(0.0, round(forecast_aqi - total_reduction, 1))
    improvement_pct = round((total_reduction / forecast_aqi) * 100, 1) if forecast_aqi > 0 else 0.0

    most_effective_key = max(raw_impacts, key=raw_impacts.get) if any(raw_impacts.values()) else None
    most_effective = None
    if most_effective_key and raw_impacts[most_effective_key] > 0:
        active_count = sum(1 for v in interventions.values() if v > 30)
        most_effective = {
            "name": INTERVENTION_LABELS[most_effective_key],
            "estimated_aqi_reduction": round(raw_impacts[most_effective_key], 1),
            "cost": "High" if active_count >= 3 else "Medium" if active_count == 2 else "Low",
            "difficulty": "High" if interventions.get("heavy_vehicle_restrictions", 0) > 50 else "Medium" if active_count >= 2 else "Low",
            "time_to_effect": "Immediate" if interventions.get("road_water_sprinkling", 0) > 40 else "4-8 hours" if total_reduction > 15 else "24 hours",
        }

    active_count = sum(1 for v in interventions.values() if v > 30)
    feasibility = {
        "estimated_cost": "High" if active_count >= 3 else "Medium" if active_count == 2 else "Low",
        "implementation_difficulty": "High" if interventions.get("heavy_vehicle_restrictions", 0) > 50 else "Medium" if active_count >= 2 else "Low",
        "expected_time": "Immediate" if interventions.get("road_water_sprinkling", 0) > 40 else "4-8 hours" if total_reduction > 15 else "24 hours",
    }

    # Heuristic health estimates, clearly not measured field data
    population_protected = round((total_reduction / 100.0) * 320000)
    respiratory_risk_reduction = round(min(45.0, improvement_pct * 0.6), 1)

    recommendations = []
    if interventions["road_water_sprinkling"] < 50:
        recommendations.append("Increase road water sprinkling on identified dust corridors.")
    if interventions["construction_dust_control"] < 60:
        recommendations.append("Inspect active construction sites for dust suppression compliance.")
    if interventions["heavy_vehicle_restrictions"] < 40:
        recommendations.append("Restrict heavy diesel vehicles during peak hours.")
    if interventions["traffic_flow_improvement"] < 30:
        recommendations.append("Improve signal timing on high-congestion corridors.")
    if total_reduction < forecast_aqi * 0.1:
        recommendations.append("Selected intervention levels may be insufficient for meaningful improvement.")
    recommendations = recommendations[:3] if recommendations else ["Current intervention levels are near optimal for this station."]

    return {
        "station_id": req.station_id,
        "forecast_aqi": forecast_aqi,
        "estimated_aqi": estimated_aqi,
        "aqi_reduction": round(total_reduction, 1),
        "improvement_percent": improvement_pct,
        "estimated_category": get_category(estimated_aqi),
        "population_protected": population_protected,
        "respiratory_risk_reduction_percent": respiratory_risk_reduction,
        "most_effective_intervention": most_effective,
        "feasibility": feasibility,
        "recommended_actions": recommendations,
        "method": {
            "type": "transparent_heuristic",
            "version": "prototype-v1",
            "disclaimer": "Scenario estimate based on illustrative assumptions, not a causal guarantee. Designed to be replaced by a trained policy-impact model."
        }
    }