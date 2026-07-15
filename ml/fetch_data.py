import os
import requests
import pandas as pd

# ==========================================================
# CONFIG
# ==========================================================

STATION_URL = (
    "https://saketkc.github.io/vayuayan-archive/data/"
    "delhi__anand_vihar__anand_vihar__site_244.csv.gz"
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(BASE_DIR, "..", "datasets", "raw")
os.makedirs(RAW_DIR, exist_ok=True)


# ==========================================================
# FETCH AQI DATA
# ==========================================================

def fetch_aqi_data():
    print("=" * 60)
    print("Fetching AQI data...")

    try:
        df = pd.read_csv(STATION_URL, compression="gzip")

        # Convert first column to datetime
        df.iloc[:, 0] = pd.to_datetime(df.iloc[:, 0])

        # Clean column names
        df.columns = [col.strip().lower() for col in df.columns]

        print(f"✓ AQI Records : {len(df)}")
        print(f"✓ Date Range  : {df.iloc[0,0]}  -->  {df.iloc[-1,0]}")
        print(f"✓ Columns     : {len(df.columns)}")
        print(f"✓ Missing Values:\n{df.isnull().sum()}")

        return df

    except Exception as e:
        print(f"❌ Error fetching AQI data:\n{e}")
        raise


# ==========================================================
# FETCH WEATHER DATA
# ==========================================================

def fetch_weather_data():
    print("\n" + "=" * 60)
    print("Fetching Weather data...")

    url = (
        "https://archive-api.open-meteo.com/v1/archive?"
        "latitude=28.6469"
        "&longitude=77.3152"
        "&start_date=2023-01-01"
        "&end_date=2024-12-31"
        "&hourly="
        "temperature_2m,"
        "relative_humidity_2m,"
        "wind_speed_10m,"
        "wind_direction_10m"
        "&timezone=Asia/Kolkata"
    )

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        data = response.json()

        if "hourly" not in data:
            raise Exception("Hourly weather data not found.")

        df = pd.DataFrame({
            "datetime": data["hourly"]["time"],
            "temperature": data["hourly"]["temperature_2m"],
            "humidity": data["hourly"]["relative_humidity_2m"],
            "wind_speed": data["hourly"]["wind_speed_10m"],
            "wind_direction": data["hourly"]["wind_direction_10m"],
        })

        df["datetime"] = pd.to_datetime(df["datetime"])

        print(f"✓ Weather Records : {len(df)}")
        print(f"✓ Date Range      : {df['datetime'].min()} --> {df['datetime'].max()}")
        print(f"✓ Missing Values:\n{df.isnull().sum()}")

        return df

    except Exception as e:
        print(f"❌ Error fetching weather data:\n{e}")
        raise


# ==========================================================
# SAVE DATA
# ==========================================================

def save_data(aqi_df, weather_df):
    aqi_path = os.path.join(RAW_DIR, "delhi_anand_vihar_aqi.csv")
    weather_path = os.path.join(RAW_DIR, "delhi_weather.csv")

    aqi_df.to_csv(aqi_path, index=False)
    weather_df.to_csv(weather_path, index=False)

    print("\n" + "=" * 60)
    print("Files Saved Successfully")
    print(f"✓ AQI     : {aqi_path}")
    print(f"✓ Weather : {weather_path}")


# ==========================================================
# MAIN
# ==========================================================

if __name__ == "__main__":

    print("\nStarting Data Collection...\n")

    aqi_df = fetch_aqi_data()
    weather_df = fetch_weather_data()

    save_data(aqi_df, weather_df)

    print("\n" + "=" * 60)
    print("✅ Phase 1 Complete!")
    print("=" * 60)