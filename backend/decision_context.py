from backend.shared import get_aqi_category

def compute_decision_context(current_aqi, immediate_prediction_aqi, forecast_points, trend):
    """
    Builds one normalized decision context reused by advisory and enforcement.
    forecast_points: list of {"aqi": float} dicts from the 72h forecast curve, or None if unavailable.
    """
    current_category = get_aqi_category(current_aqi)
    immediate_category = get_aqi_category(immediate_prediction_aqi)

    forecast_24h_aqi = None
    forecast_24h_category = None
    expected_peak_aqi = None
    expected_peak_category = None

    if forecast_points:
        if len(forecast_points) >= 24:
            forecast_24h_aqi = round(forecast_points[23]["aqi"], 1)
            forecast_24h_category = get_aqi_category(forecast_24h_aqi)
        expected_peak_aqi = round(max(p["aqi"] for p in forecast_points), 1)
        expected_peak_category = get_aqi_category(expected_peak_aqi)

    candidates = [(current_aqi, "current observation")]
    if forecast_24h_aqi is not None:
        candidates.append((forecast_24h_aqi, "24-hour forecast"))
    if expected_peak_aqi is not None:
        candidates.append((expected_peak_aqi, "forecast peak"))

    decision_aqi, decision_basis = max(candidates, key=lambda c: c[0])
    decision_category = get_aqi_category(decision_aqi)

    ctx = {
        "current_aqi": round(current_aqi, 1),
        "current_category": current_category,
        "immediate_prediction_aqi": round(immediate_prediction_aqi, 1),
        "immediate_prediction_category": immediate_category,
        "forecast_24h_aqi": forecast_24h_aqi,
        "forecast_24h_category": forecast_24h_category,
        "expected_peak_aqi": expected_peak_aqi,
        "expected_peak_category": expected_peak_category,
        "trend": trend,
        "decision_aqi": decision_aqi,
        "decision_category": decision_category,
        "decision_basis": decision_basis,
    }
    return ctx