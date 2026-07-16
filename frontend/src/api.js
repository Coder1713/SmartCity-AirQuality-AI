import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

export const getSampleReading = (stationId = 'DL001') => ({
  station_id: stationId,
  pm25: 60 + Math.random() * 80,
  pm10: 100 + Math.random() * 120,
  no: 5 + Math.random() * 15,
  no2: 20 + Math.random() * 40,
  nox: 30 + Math.random() * 50,
  nh3: 10 + Math.random() * 20,
  co: 1 + Math.random() * 2,
  so2: 5 + Math.random() * 20,
  o3: 15 + Math.random() * 30,
  aqi_lag1: 140 + Math.random() * 80,
  aqi_lag3: 130 + Math.random() * 80,
  aqi_lag6: 120 + Math.random() * 80,
  aqi_lag24: 110 + Math.random() * 80,
  aqi_roll6: 135 + Math.random() * 60,
  aqi_roll24: 125 + Math.random() * 60,
});

// Approximate coordinates for Delhi CAAQMS stations (for map visualization)
export const STATION_COORDS = {
  DL001: [28.5718, 77.2431], DL002: [28.6517, 77.3152], DL003: [28.6127, 77.2295],
  DL004: [28.7041, 77.1025], DL005: [28.5921, 77.0460], DL006: [28.6692, 77.4538],
  DL007: [28.7500, 77.1200], DL008: [28.6280, 77.3649], DL009: [28.5504, 77.2661],
  DL010: [28.6469, 77.3152], DL012: [28.6863, 77.2160], DL013: [28.5729, 77.1996],
  DL014: [28.7196, 77.1751], DL015: [28.6100, 77.0980]
};

export const DELHI_STATIONS = Object.keys(STATION_COORDS);