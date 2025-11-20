import json
import os

BASE_DIR = "backend/ml/output"
HOTSPOTS = f"{BASE_DIR}/hotspots.json"
PREDICTIONS = f"{BASE_DIR}/predictions.json"
RISK_SCORES = f"{BASE_DIR}/risk_scores_sample.json"

def load_json(path):
    if not os.path.exists(path):
        return None
    with open(path, "r") as f:
        return json.load(f)

def get_heatmap():
    return load_json(HOTSPOTS) or []

def get_predictions(ward=None):
    data = load_json(PREDICTIONS) or {}
    return data.get(ward, data)

def get_risk_scores():
    return load_json(RISK_SCORES) or []
