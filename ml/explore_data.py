import pandas as pd

print("Loading raw data...")
df = pd.read_csv("datasets/raw/delhi_aqi_raw.csv", low_memory=False)

# Find Delhi stations (start with DL)
delhi_stations = [s for s in df['StationId'].unique() if s.startswith('DL')]
print(f"\n✓ Delhi stations found: {delhi_stations}")

# Filter to Delhi only
delhi = df[df['StationId'].isin(delhi_stations)]
print(f"✓ Delhi rows: {len(delhi)}")

# Check AQI availability for Delhi
print(f"✓ Delhi rows WITH AQI value: {delhi['AQI'].notna().sum()}")
print(f"✓ Delhi rows WITHOUT AQI value: {delhi['AQI'].isnull().sum()}")

# Check per station
print(f"\n✓ Rows per Delhi station:")
print(delhi.groupby('StationId')['AQI'].count())

# Date range for Delhi
print(f"\n✓ Delhi date range: {delhi['Datetime'].min()} to {delhi['Datetime'].max()}")

# Preview
print(f"\n✓ Sample Delhi rows:")
print(delhi.head(3))