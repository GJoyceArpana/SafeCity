import pandas as pd
import numpy as np
import json
import os
from datetime import datetime, timedelta

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "bangalore_merged_crime_dataset_new.csv")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "output", "predictions.json")

try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except:
    PROPHET_AVAILABLE = False
    print("Prophet missing → Using fallback model.")

def forecast_ward(ward, days=7):
    df = pd.read_csv(DATA_PATH)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df[df["ward"].str.lower() == ward.lower()]

    if df.empty:
        return {"ward": ward, "forecast": []}

    daily = df.groupby(df["date"].dt.date).size().reset_index(name="count")
    daily.columns = ["ds", "y"]
    daily["ds"] = pd.to_datetime(daily["ds"])

    if PROPHET_AVAILABLE and len(daily) > 10:
        m = Prophet()
        m.fit(daily)
        future = m.make_future_dataframe(periods=days)
        pred = m.predict(future)
        out = pred[["ds", "yhat"]].tail(days)
        result = [{"date": str(row["ds"].date()), "predicted_count": int(row["yhat"])} for _, row in out.iterrows()]
        return {"ward": ward, "forecast": result}

    # fallback model — rolling average
    daily = daily.set_index("ds").asfreq("D", fill_value=0)
    avg = int(daily["y"].tail(7).mean())
    future_dates = [(daily.index.max() + timedelta(days=i)).date() for i in range(1, days+1)]

    return {
        "ward": ward,
        "forecast": [{"date": str(d), "predicted_count": avg} for d in future_dates]
    }

def generate_all_forecasts(days=7):
    df = pd.read_csv(DATA_PATH)
    wards = df["ward"].unique().tolist()

    predictions = {}
    for w in wards:
        predictions[w] = forecast_ward(w, days)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(predictions, f, indent=2)

    print(f"Saved predictions → {OUTPUT_PATH}")
    return predictions

if __name__ == "__main__":
    generate_all_forecasts()
