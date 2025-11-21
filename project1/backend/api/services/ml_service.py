# backend/api/services/ml_service.py
import json
import os

# Paths are now relative to the backend root, which is three levels up from here (../..).
# Assuming the output files are in backend/ml/output/
BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "output")

HOTSPOTS = os.path.join(BASE_DIR, "hotspots.json")
PREDICTIONS = os.path.join(BASE_DIR, "predictions.json")
RISK_SCORES = os.path.join(BASE_DIR, "risk_scores_sample.json")

def load_json(path):
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception:
        # Fallback for empty/corrupted file
        return None

def get_heatmap():
    data = load_json(HOTSPOTS) or []
    # Hotspot data can be a list or wrapped in {"hotspots": [...]}.
    if isinstance(data, dict) and "hotspots" in data:
        return data["hotspots"]
    return data

def get_predictions(ward=None):
    data = load_json(PREDICTIONS) or {}
    return data.get(ward, data)

def get_risk_scores():
    data = load_json(RISK_SCORES) or []
    if isinstance(data, dict) and "risk_scores" in data:
        return data["risk_scores"]
    return data