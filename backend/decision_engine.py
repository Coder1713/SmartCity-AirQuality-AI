# Deterministic decision-support rule engine.
# Enforcement output is NOT a legal order. Health guidance is
# informational, based on CPCB category and forecast trend context,
# and is not a substitute for medical advice.

SOURCE_ACTIONS = {
    "Vehicular Traffic": [
        {"id": "traffic-01", "title": "Restrict heavy diesel vehicles during peak hours", "owner": "Traffic police", "expected_effect": "Reduce vehicular NOx and PM contribution"},
        {"id": "traffic-02", "title": "Optimize signal timing on high-congestion corridors", "owner": "Traffic management authority", "expected_effect": "Reduce idling emissions"},
        {"id": "traffic-03", "title": "Issue public transport advisory", "owner": "Transport department", "expected_effect": "Reduce vehicle volume"},
        {"id": "traffic-04", "title": "Enforce anti-idling rules at major intersections", "owner": "Traffic police", "expected_effect": "Reduce localized emission spikes"},
    ],
    "Construction & Dust": [
        {"id": "construction-01", "title": "Inspect active construction sites for dust barrier compliance", "owner": "Municipal enforcement team", "expected_effect": "Reduce fugitive dust emissions"},
        {"id": "construction-02", "title": "Verify water sprinkling at construction sites", "owner": "Site inspection team", "expected_effect": "Suppress airborne dust"},
        {"id": "construction-03", "title": "Suspend high-dust work during severe conditions", "owner": "Municipal enforcement team", "expected_effect": "Halt active dust generation"},
        {"id": "construction-04", "title": "Verify debris covering during transport", "owner": "Site inspection team", "expected_effect": "Reduce transport-related dust"},
    ],
    "Industrial Emissions": [
        {"id": "industrial-01", "title": "Verify stack emission compliance at nearby units", "owner": "Pollution control board", "expected_effect": "Confirm regulatory compliance"},
        {"id": "industrial-02", "title": "Inspect high-emission industrial units", "owner": "Pollution control board", "expected_effect": "Identify non-compliant sources"},
        {"id": "industrial-03", "title": "Enforce temporary load reduction where legally permitted", "owner": "Pollution control board", "expected_effect": "Reduce peak industrial emissions"},
    ],
    "Biomass & Crop Burning": [
        {"id": "biomass-01", "title": "Patrol known open-burning hotspots", "owner": "Field enforcement team", "expected_effect": "Detect and stop active burning"},
        {"id": "biomass-02", "title": "Issue local burning prohibition notices", "owner": "Municipal enforcement team", "expected_effect": "Deter future burning"},
        {"id": "biomass-03", "title": "Coordinate waste collection to reduce burning incentive", "owner": "Municipal sanitation team", "expected_effect": "Reduce root cause of burning"},
    ],
    "Unknown / Mixed": [
        {"id": "mixed-01", "title": "Deploy mobile monitoring to identify dominant source", "owner": "Pollution control board", "expected_effect": "Improve source identification confidence"},
        {"id": "mixed-02", "title": "Continue standard air quality monitoring", "owner": "Monitoring team", "expected_effect": "Maintain situational awareness"},
    ],
}

def _severity_tier(category: str, trend: str) -> str:
    base = {
        "Good": "monitoring", "Satisfactory": "monitoring",
        "Moderate": "preventive", "Poor": "active",
        "Very Poor": "urgent", "Severe": "emergency"
    }.get(category, "preventive")
    if trend == "worsening" and base in ("preventive", "active"):
        order = ["monitoring", "preventive", "active", "urgent", "emergency"]
        idx = min(order.index(base) + 1, len(order) - 1)
        base = order[idx]
    return base

def build_decision_context(station_id, aqi_lag1, predicted_aqi, category, primary_source, primary_confidence):
    delta = predicted_aqi - aqi_lag1
    if delta > 5:
        trend = "worsening"
    elif delta < -5:
        trend = "improving"
    else:
        trend = "stable"
    return {
        "station_id": station_id, "current_aqi": round(aqi_lag1, 1),
        "predicted_aqi": predicted_aqi, "category": category, "trend": trend,
        "trend_delta": round(delta, 1), "dominant_source": primary_source,
        "source_confidence": primary_confidence, "forecast_hours": None,
        "expected_peak_aqi": None, "expected_peak_time": None, "high_risk_duration_hours": None
    }

def generate_field_response_plan(ctx: dict) -> dict:
    tier = _severity_tier(ctx["category"], ctx["trend"])
    source_actions = SOURCE_ACTIONS.get(ctx["dominant_source"], SOURCE_ACTIONS["Unknown / Mixed"])

    priority_by_tier = {
        "monitoring": "Monitoring", "preventive": "Within 24 hours",
        "active": "Within 6 hours", "urgent": "Immediate", "emergency": "Immediate"
    }
    priority = priority_by_tier[tier]

    n_actions = {"monitoring": 1, "preventive": 2, "active": 3, "urgent": 4, "emergency": 4}[tier]
    selected = source_actions[:n_actions]

    reason = f"{ctx['category']} AQI with {ctx['trend']} trend, dominant source {ctx['dominant_source']} at {ctx['source_confidence']} confidence."

    actions = [{
        "id": a["id"], "title": a["title"], "priority": priority,
        "source": ctx["dominant_source"], "reason": reason,
        "owner": a["owner"], "expected_effect": a["expected_effect"], "status": "recommended"
    } for a in selected]

    return {
        "severity": tier, "summary": f"{priority} response recommended for {ctx['category']} conditions "
        f"attributed to {ctx['dominant_source']}, trend is {ctx['trend']}.",
        "actions": actions
    }

def generate_health_guidance(ctx: dict) -> dict:
    category = ctx["category"]
    trend = ctx["trend"]

    risk_map = {"Good": "Low", "Satisfactory": "Low", "Moderate": "Moderate",
                "Poor": "High", "Very Poor": "Very High", "Severe": "Severe"}
    risk_level = risk_map.get(category, "Moderate")

    trend_phrase = {
        "worsening": "and is expected to worsen over the coming hours",
        "improving": "and is expected to improve over the coming hours",
        "stable": "and is expected to remain steady over the coming hours"
    }[trend]
    summary = f"Air quality is currently {category} {trend_phrase}."

    general_public, sensitive_groups, schools, outdoor_workers = [], [], [], []

    if category in ("Good", "Satisfactory"):
        general_public.append("Normal outdoor activity is safe.")
        sensitive_groups.append("No specific precautions required at this time.")
        schools.append("Outdoor activities can proceed as normal.")
        outdoor_workers.append("No special precautions required.")
    elif category == "Moderate":
        general_public.append("Consider reducing prolonged outdoor exertion if symptoms occur.")
        sensitive_groups.append("Children, older adults, and those with respiratory or heart conditions should limit prolonged outdoor exertion.")
        schools.append("Monitor sensitive students during outdoor activity.")
        outdoor_workers.append("Take periodic breaks during prolonged outdoor work.")
    elif category == "Poor":
        general_public.append("Reduce prolonged outdoor exertion during peak pollution hours.")
        sensitive_groups.append("Children, older adults, pregnant people, and individuals with heart or respiratory conditions should minimize outdoor exposure.")
        schools.append("Shift strenuous outdoor activities indoors during peak AQI periods.")
        outdoor_workers.append("Use task rotation and reduce high-exertion outdoor work.")
    elif category == "Very Poor":
        general_public.append("Avoid prolonged or heavy outdoor exertion.")
        sensitive_groups.append("Sensitive groups should avoid outdoor exposure entirely where possible.")
        schools.append("Move outdoor activities indoors.")
        outdoor_workers.append("Provide N95 masks and minimize outdoor exposure duration.")
    else:  # Severe
        general_public.append("Avoid all outdoor physical activity.")
        sensitive_groups.append("Sensitive groups should remain indoors with air filtration where available.")
        schools.append("Suspend outdoor activities entirely.")
        outdoor_workers.append("Postpone non-essential outdoor work; provide protective equipment if work is unavoidable.")

    if trend == "worsening":
        general_public.append("Conditions are trending worse, plan indoor alternatives where possible.")

    return {
        "risk_level": risk_level, "summary": summary,
        "general_public": general_public, "sensitive_groups": sensitive_groups,
        "schools": schools, "outdoor_workers": outdoor_workers,
        "recommended_window": None,  # requires hourly forecast curve, unavailable in this endpoint
        "emergency_signs": ["Seek medical care for severe breathlessness, chest pain, confusion, or bluish lips."],
        "method": "CPCB-category rule engine with forecast trend context"
    }