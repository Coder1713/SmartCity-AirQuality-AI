export const FORECAST_EVIDENCE_FALLBACK = [
  { factor: "PM2.5 concentration trend", observation: "PM2.5 has increased continuously during the last 6 hours", impact: "High", contribution: 34 },
  { factor: "Wind speed", observation: "Low wind speed is reducing pollutant dispersion", impact: "High", contribution: 26 },
  { factor: "Traffic intensity", observation: "Traffic activity is elevated across major corridors", impact: "Medium", contribution: 18 },
  { factor: "Temperature inversion risk", observation: "Atmospheric conditions may trap pollutants near ground level", impact: "Medium", contribution: 14 },
  { factor: "Humidity", observation: "Humidity may support particulate accumulation", impact: "Low", contribution: 8 }
];

export const ATTRIBUTION_EVIDENCE_FALLBACK = [
  { statement: "Local PM10 to PM2.5 ratio is consistent with coarse dust", type: "Sensor", strength: "Strong" },
  { statement: "Nearby construction activity is elevated", type: "Operational", strength: "Strong" },
  { statement: "Low wind speed is allowing local accumulation", type: "Weather", strength: "Moderate" },
  { statement: "Traffic contribution remains secondary", type: "Traffic", strength: "Supporting" },
  { statement: "Historical patterns show similar source behaviour", type: "Historical", strength: "Supporting" }
];

export const VERIFICATION_CHECKLIST_FALLBACK = [
  "Verify active construction activity near the affected monitoring station",
  "Inspect dust-control compliance at nearby sites",
  "Confirm traffic congestion conditions during the predicted critical window"
];

export const DATA_COMPLETENESS_FALLBACK = 94;
export const HISTORICAL_MATCH_FALLBACK = 83;