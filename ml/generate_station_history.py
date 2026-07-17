import pandas as pd
import os

print("Loading raw data to extract per-station history...")
df = pd.read_csv("datasets/raw/delhi_aqi_raw.csv", low_memory=False)

delhi_stations = [s for s in df['StationId'].unique() if s.startswith('DL')]
df = df[df['StationId'].isin(delhi_stations)].copy()
df['Datetime'] = pd.to_datetime(df['Datetime'])
df = df.dropna(subset=['AQI'])

# Get last 7 days (168 hours) of data PER STATION
df = df.sort_values(['StationId', 'Datetime'])
history = df.groupby('StationId').tail(168)[['StationId', 'Datetime', 'AQI', 'PM2.5', 'PM10', 'NO', 'NO2', 'NOx', 'NH3', 'CO', 'SO2', 'O3']]

os.makedirs("datasets/processed", exist_ok=True)
history.to_csv("datasets/processed/station_history.csv", index=False)

print(f"✓ Saved history for {history['StationId'].nunique()} stations")
print(f"✓ Total rows: {len(history)}")
print(f"✓ File size check:")
size_kb = os.path.getsize("datasets/processed/station_history.csv") / 1024
print(f"  {size_kb:.1f} KB")