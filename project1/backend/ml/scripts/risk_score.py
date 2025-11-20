import pandas as pd
import json
import random

DATA_PATH = "backend/ml/data/bangalore_merged_crime_dataset_new.csv"
OUTPUT_PATH = "backend/ml/output/risk_scores_sample.json"

SEVERITY_WEIGHT = {
    "critical": 1.0,
    "high": 0.8,
    "moderate": 0.5,
    "low": 0.2
}

def time_factor(t):
    hour = int(t.split(":")[0])
    if hour >= 20 or hour <= 5:
        return 1.0
    if 6 <= hour <= 11:
        return 0.6
    if 12 <= hour <= 17:
        return 0.4
    return 0.5

def weather_factor(w):
    return {
        "rainy": 0.9,
        "humid": 0.8,
        "cloudy": 0.6,
        "clear": 0.4
    }.get(w.lower(), 0.5)

def compute_score(row):
    s = SEVERITY_WEIGHT.get(row["severity"], 0.5)
    t = time_factor(row["time"])
    w = weather_factor(row["weather"])
    return int((0.5*s + 0.3*t + 0.2*w) * 100)

def run_risk_model():
    df = pd.read_csv(DATA_PATH)
    sample = df.sample(1200)

    results = []
    for _, row in sample.iterrows():
        results.append({
            "incident_id": int(row["incident_id"]),
            "lat": row["latitude"],
            "lng": row["longitude"],
            "crime_type": row["crime_type"],
            "risk_score": compute_score(row)
        })

    with open(OUTPUT_PATH, "w") as f:
        json.dump(results, f, indent=2)

    print(f"Saved risk scores → {OUTPUT_PATH}")
    return results

if __name__ == "__main__":
    run_risk_model()
