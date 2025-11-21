import json
import os
import time
import threading
from datetime import datetime

# Paths to JSON files
HOTSPOTS_PATH = "backend/ml/output/hotspots.json"
RISK_SCORES_PATH = "backend/ml/output/risk_scores_sample.json"

CACHE_TTL = 5  # seconds


# -----------------------------
# TTL CACHE IMPLEMENTATION
# -----------------------------
class TTLCache:
    def __init__(self, ttl=5):
        self.ttl = ttl
        self.value = None
        self.timestamp = 0
        self.lock = threading.Lock()

    def get(self, loader):
        with self.lock:
            now = time.time()
            if self.value is None or (now - self.timestamp) > self.ttl:
                try:
                    self.value = loader()
                except:
                    self.value = None
                self.timestamp = now
            return self.value


hotspots_cache = TTLCache(ttl=CACHE_TTL)
risk_scores_cache = TTLCache(ttl=CACHE_TTL)


# -----------------------------
# FILE HELPERS
# -----------------------------
def load_json(path):
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r") as f:
            return json.load(f)
    except:
        return None


def load_hotspots():
    data = hotspots_cache.get(lambda: load_json(HOTSPOTS_PATH))
    if not data:
        return []
    if isinstance(data, dict) and "hotspots" in data:
        return data["hotspots"]
    return data


def load_risk_scores():
    data = risk_scores_cache.get(lambda: load_json(RISK_SCORES_PATH))
    if not data:
        return []
    if isinstance(data, dict) and "risk_scores" in data:
        return data["risk_scores"]
    return data


# -----------------------------
# RISK SCORE CALCULATIONS
# -----------------------------
def severity_from_intensity(intensity):
    if intensity > 200:
        return "critical"
    if intensity > 100:
        return "high"
    if intensity > 40:
        return "moderate"
    return "low"


def weight_from_severity(sev):
    return {
        "critical": 15,
        "high": 10,
        "moderate": 5,
        "low": 2
    }.get(sev, 2)


def compute_hotspot_weight_score(hotspots):
    total = 0
    for h in hotspots:
        intensity = h.get("intensity") or h.get("count", 0)
        sev = severity_from_intensity(intensity)
        total += weight_from_severity(sev)
    return total


def compute_average_risk(risks):
    if not risks:
        return 0

    vals = []
    for r in risks:
        if "risk_score" in r:
            try:
                vals.append(float(r["risk_score"]))
            except:
                pass

    if not vals:
        return 0

    avg = sum(vals) / len(vals)
    return (avg / 100) * 30


def time_multiplier():
    hour = datetime.now().hour

    if hour >= 21 or hour < 4:
        return 1.4
    if 18 <= hour < 21:
        return 1.2
    if 8 <= hour < 18:
        return 1.0
    return 0.9


# -----------------------------
# MAIN FUNCTION
# -----------------------------
def compute_city_risk_index():
    hotspots = load_hotspots()
    risks = load_risk_scores()

    hotspot_score = compute_hotspot_weight_score(hotspots)
    avg_risk_score = compute_average_risk(risks)
    tm = time_multiplier()

    raw_score = (hotspot_score + avg_risk_score) * tm

    NOMINAL_MAX = 460
    risk_index = (raw_score / NOMINAL_MAX) * 100
    risk_index = max(0, min(100, risk_index))

    if risk_index >= 75:
        level = "critical"
    elif risk_index >= 50:
        level = "high"
    elif risk_index >= 25:
        level = "moderate"
    else:
        level = "low"

    return {
        "risk_index": round(risk_index, 1),
        "risk_level": level,
        "active_hotspots": len(hotspots),
        "timestamp": datetime.now().isoformat()
    }
