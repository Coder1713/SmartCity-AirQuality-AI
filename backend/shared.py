import pickle

_model = None
_features = None

def get_model_and_features():
    global _model, _features
    if _model is None:
        with open("ml/aqi_forecast_model.pkl", "rb") as f:
            _model = pickle.load(f)
        with open("ml/feature_columns.pkl", "rb") as f:
            _features = pickle.load(f)
    return _model, _features

def get_aqi_category(aqi: float) -> str:
    if aqi <= 50: return "Good"
    if aqi <= 100: return "Satisfactory"
    if aqi <= 200: return "Moderate"
    if aqi <= 300: return "Poor"
    if aqi <= 400: return "Very Poor"
    return "Severe"

CATEGORY_COLORS = {
    "Good": "#00e400", "Satisfactory": "#92d050", "Moderate": "#ffff00",
    "Poor": "#ff7e00", "Very Poor": "#ff0000", "Severe": "#7e0023"
}