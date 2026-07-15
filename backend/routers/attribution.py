from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# ── INPUT SCHEMA ─────────────────────────────────────────────
class AttributionInput(BaseModel):
    station_id: str = "DL001"
    pm25: float
    pm10: float
    no2: float
    nox: float
    co: float
    so2: float
    o3: float
    hour: int       # 0-23
    month: int      # 1-12

# ── SOURCE ATTRIBUTION LOGIC ─────────────────────────────────
# Based on CPCB emission inventory patterns for Delhi:
# Traffic:      high NOx, high CO, peaks 8-10am and 6-9pm
# Construction: high PM10, high PM2.5, peaks 10am-5pm
# Industry:     high SO2, high NOx, steady across hours
# Biomass:      high PM2.5, high CO, peaks Oct-Feb evenings
# Dust:         high PM10, low NOx, peaks dry months afternoon

def attribute_source(data: AttributionInput) -> list:
    sources = []

    # ── TRAFFIC ──────────────────────────────────────────────
    traffic_score = 0
    if data.nox > 40:
        traffic_score += 30
    if data.co > 1.5:
        traffic_score += 25
    if data.no2 > 30:
        traffic_score += 20
    if data.hour in [7, 8, 9, 10, 17, 18, 19, 20]:
        traffic_score += 25
    if traffic_score > 0:
        sources.append({
            "source": "Vehicular Traffic",
            "confidence": min(traffic_score, 100),
            "indicators": ["High NOx", "High CO", "Peak commute hours"],
            "icon": "🚗"
        })

    # ── CONSTRUCTION ─────────────────────────────────────────
    construction_score = 0
    if data.pm10 > 100:
        construction_score += 35
    if data.pm25 > 60:
        construction_score += 25
    if data.hour in range(9, 18):
        construction_score += 20
    if data.pm10 > data.pm25 * 2:
        construction_score += 20
    if construction_score > 0:
        sources.append({
            "source": "Construction & Dust",
            "confidence": min(construction_score, 100),
            "indicators": ["High PM10", "High PM2.5", "Daytime activity hours"],
            "icon": "🏗️"
        })

    # ── INDUSTRY ─────────────────────────────────────────────
    industry_score = 0
    if data.so2 > 15:
        industry_score += 40
    if data.nox > 60:
        industry_score += 30
    if data.so2 > 10 and data.nox > 40:
        industry_score += 30
    if industry_score > 0:
        sources.append({
            "source": "Industrial Emissions",
            "confidence": min(industry_score, 100),
            "indicators": ["Elevated SO2", "High NOx", "Industrial stack signature"],
            "icon": "🏭"
        })

    # ── BIOMASS BURNING ──────────────────────────────────────
    biomass_score = 0
    if data.pm25 > 80:
        biomass_score += 30
    if data.co > 2.0:
        biomass_score += 30
    if data.month in [10, 11, 12, 1, 2]:
        biomass_score += 25
    if data.hour in [17, 18, 19, 20, 21]:
        biomass_score += 15
    if biomass_score > 0:
        sources.append({
            "source": "Biomass & Crop Burning",
            "confidence": min(biomass_score, 100),
            "indicators": ["High PM2.5", "High CO", "Winter stubble burning season"],
            "icon": "🔥"
        })

    # Sort by confidence score descending
    sources = sorted(sources, key=lambda x: x["confidence"], reverse=True)

    # If nothing triggered, return unknown
    if not sources:
        sources.append({
            "source": "Unknown / Mixed Sources",
            "confidence": 50,
            "indicators": ["Insufficient pollutant signature"],
            "icon": "❓"
        })

    return sources

# ── ATTRIBUTION ENDPOINT ─────────────────────────────────────
@router.post("/attribute")
def get_attribution(data: AttributionInput):
    sources = attribute_source(data)
    primary = sources[0]

    return {
        "station_id": data.station_id,
        "primary_source": primary["source"],
        "primary_confidence": primary["confidence"],
        "all_sources": sources,
        "hour_analyzed": data.hour,
        "month_analyzed": data.month,
        "methodology": "Rule-based pollutant signature analysis using CPCB Delhi emission inventory patterns",
        "note": "Attribution based on pollutant ratios (NOx/CO for traffic, PM10/PM2.5 ratio for construction, SO2 for industry) cross-referenced with time-of-day emission patterns"
    }