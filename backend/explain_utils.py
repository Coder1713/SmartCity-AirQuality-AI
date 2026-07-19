FEATURE_LABELS = {
    "PM2.5": "PM2.5 concentration", "PM10": "PM10 concentration",
    "NO": "Nitric oxide level", "NO2": "Nitrogen dioxide level",
    "NOx": "Total nitrogen oxides", "NH3": "Ammonia level",
    "CO": "Carbon monoxide level", "SO2": "Sulfur dioxide level",
    "O3": "Ozone level", "hour": "Time of day", "day": "Day of month",
    "month": "Seasonal pattern", "dayofweek": "Day of week",
    "is_weekend": "Weekend pattern", "AQI_lag1": "AQI one hour ago",
    "AQI_lag3": "AQI three hours ago", "AQI_lag6": "AQI six hours ago",
    "AQI_lag24": "AQI twenty-four hours ago", "AQI_roll6": "Six-hour AQI average",
    "AQI_roll24": "Twenty-four hour AQI baseline"
}

POLLUTANT_THRESHOLDS = {"PM2.5": 60, "PM10": 100, "NO": 40, "NO2": 40, "NOx": 60, "NH3": 40, "CO": 2, "SO2": 40, "O3": 50}
LAG_FEATURES = ["AQI_lag1", "AQI_lag3", "AQI_lag6", "AQI_roll6"]

def generate_forecast_drivers(input_dict, feature_names, importances, top_n=6):
    total = sum(importances) if sum(importances) > 0 else 1
    baseline = input_dict.get("AQI_roll24", 0)
    drivers = []

    for fname, imp in zip(feature_names, importances):
        norm_imp = imp / total
        value = input_dict.get(fname)
        label = FEATURE_LABELS.get(fname, fname)

        if fname in LAG_FEATURES:
            if value > baseline + 5:
                direction, observation = "increasing", f"{label} is above the 24-hour baseline ({value:.0f} vs {baseline:.0f})."
            elif value < baseline - 5:
                direction, observation = "decreasing", f"{label} is below the 24-hour baseline ({value:.0f} vs {baseline:.0f})."
            else:
                direction, observation = "stable", f"{label} is near the 24-hour baseline."
        elif fname == "AQI_roll24":
            direction, observation = "baseline", f"24-hour AQI baseline is {value:.0f}."
        elif fname in POLLUTANT_THRESHOLDS:
            t = POLLUTANT_THRESHOLDS[fname]
            if value > t:
                direction, observation = "elevated", f"{label} reading ({value:.1f}) is above typical levels ({t})."
            else:
                direction, observation = "typical", f"{label} reading ({value:.1f}) is within typical range."
        else:
            direction, observation = "contextual", f"{label}: {value}"

        impact = "high" if norm_imp >= 0.15 else "medium" if norm_imp >= 0.06 else "low"
        drivers.append({
            "feature": fname, "label": label,
            "value": round(value, 2) if isinstance(value, (int, float)) else value,
            "importance": round(norm_imp, 4), "impact": impact,
            "direction": direction, "observation": observation
        })

    return sorted(drivers, key=lambda d: d["importance"], reverse=True)[:top_n]