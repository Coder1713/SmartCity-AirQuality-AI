import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import pickle
import os

print("=" * 60)
print("PHASE 2 — DATA CLEANING + MODEL TRAINING")
print("=" * 60)

# ── 1. LOAD & FILTER TO DELHI ────────────────────────────────
print("\n[1/6] Loading raw data...")
df = pd.read_csv("datasets/raw/delhi_aqi_raw.csv", low_memory=False)
delhi_stations = [s for s in df['StationId'].unique() if s.startswith('DL')]
df = df[df['StationId'].isin(delhi_stations)].copy()
print(f"✓ Delhi rows loaded: {len(df)}")

# ── 2. CLEAN ─────────────────────────────────────────────────
print("\n[2/6] Cleaning data...")

# Parse datetime
df['Datetime'] = pd.to_datetime(df['Datetime'])

# Drop rows where AQI (our target) is missing
df = df.dropna(subset=['AQI'])
print(f"✓ Rows after dropping missing AQI: {len(df)}")

# Fill missing pollutant values with station median
pollutants = ['PM2.5', 'PM10', 'NO', 'NO2', 'NOx', 'NH3', 'CO', 'SO2', 'O3']
for col in pollutants:
    df[col] = df.groupby('StationId')[col].transform(
        lambda x: x.fillna(x.median())
    )

# Drop any remaining rows with nulls
df = df.dropna(subset=pollutants)
print(f"✓ Rows after filling pollutant nulls: {len(df)}")

# ── 3. FEATURE ENGINEERING ───────────────────────────────────
print("\n[3/6] Engineering features...")

df['hour']       = df['Datetime'].dt.hour
df['day']        = df['Datetime'].dt.day
df['month']      = df['Datetime'].dt.month
df['dayofweek']  = df['Datetime'].dt.dayofweek
df['is_weekend'] = (df['dayofweek'] >= 5).astype(int)

# Lag features — previous hour's AQI per station
df = df.sort_values(['StationId', 'Datetime'])
df['AQI_lag1'] = df.groupby('StationId')['AQI'].shift(1)
df['AQI_lag3'] = df.groupby('StationId')['AQI'].shift(3)
df['AQI_lag6'] = df.groupby('StationId')['AQI'].shift(6)
df['AQI_lag24'] = df.groupby('StationId')['AQI'].shift(24)

# Rolling average — 6h and 24h
df['AQI_roll6']  = df.groupby('StationId')['AQI'].transform(
    lambda x: x.rolling(6, min_periods=1).mean()
)
df['AQI_roll24'] = df.groupby('StationId')['AQI'].transform(
    lambda x: x.rolling(24, min_periods=1).mean()
)

# Drop rows where lag features are null (first rows per station)
df = df.dropna(subset=['AQI_lag1', 'AQI_lag24'])
print(f"✓ Rows after lag feature creation: {len(df)}")

# ── 4. TRAIN / TEST SPLIT ────────────────────────────────────
print("\n[4/6] Splitting data...")

FEATURES = [
    'PM2.5', 'PM10', 'NO', 'NO2', 'NOx', 'NH3', 'CO', 'SO2', 'O3',
    'hour', 'day', 'month', 'dayofweek', 'is_weekend',
    'AQI_lag1', 'AQI_lag3', 'AQI_lag6', 'AQI_lag24',
    'AQI_roll6', 'AQI_roll24'
]
TARGET = 'AQI'

X = df[FEATURES]
y = df[TARGET]

# Time-based split — train on 2015-2019, test on 2020
train_mask = df['Datetime'] < '2020-01-01'
X_train, X_test = X[train_mask], X[~train_mask]
y_train, y_test = y[train_mask], y[~train_mask]

print(f"✓ Training rows: {len(X_train)}")
print(f"✓ Testing rows:  {len(X_test)}")

# ── 5. TRAIN MODEL ───────────────────────────────────────────
print("\n[5/6] Training model (takes 1-2 mins)...")

model = GradientBoostingRegressor(
    n_estimators=200,
    learning_rate=0.1,
    max_depth=5,
    random_state=42
)
model.fit(X_train, y_train)
print("✓ Model trained")

# ── 6. EVALUATE ──────────────────────────────────────────────
print("\n[6/6] Evaluating model...")

y_pred = model.predict(X_test)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
mae  = mean_absolute_error(y_test, y_pred)
r2   = r2_score(y_test, y_pred)

print(f"✓ RMSE : {rmse:.2f}  (lower is better)")
print(f"✓ MAE  : {mae:.2f}  (average error in AQI points)")
print(f"✓ R²   : {r2:.4f} (closer to 1.0 is better)")

# Save metrics
os.makedirs("datasets/processed", exist_ok=True)
metrics = pd.DataFrame({
    'metric': ['RMSE', 'MAE', 'R2'],
    'value':  [round(rmse,2), round(mae,2), round(r2,4)]
})
metrics.to_csv("datasets/processed/model_metrics.csv", index=False)
print("✓ Metrics saved to datasets/processed/model_metrics.csv")

# Save model
os.makedirs("ml", exist_ok=True)
with open("ml/aqi_forecast_model.pkl", "wb") as f:
    pickle.dump(model, f)
print("✓ Model saved to ml/aqi_forecast_model.pkl")

# Save feature list (needed by backend later)
with open("ml/feature_columns.pkl", "wb") as f:
    pickle.dump(FEATURES, f)
print("✓ Feature list saved to ml/feature_columns.pkl")

# Save a sample of cleaned data for the frontend to use
df.tail(500).to_csv("datasets/processed/delhi_aqi_clean.csv", index=False)
print("✓ Clean sample saved to datasets/processed/delhi_aqi_clean.csv")

print("\n" + "=" * 60)
print("✅ PHASE 2 COMPLETE")
print(f"   Model R² = {r2:.4f} | RMSE = {rmse:.2f} AQI points")
print("=" * 60)