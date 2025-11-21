import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
import json
import os

# ----------------------------------------------------------------------------------
# FIX: Corrected DATA_PATH and OUTPUT_PATH to be relative to the 'backend' folder
# ----------------------------------------------------------------------------------
DATA_PATH = "ml/data/bangalore_merged_crime_dataset_new.csv"
OUTPUT_PATH = "ml/output/hotspots.json"

def run_dbscan(eps=0.0035, min_samples=8):
    # 1. Load Data
    df = pd.read_csv(DATA_PATH)
    df = df.dropna(subset=["latitude", "longitude"])

    coords = df[["latitude", "longitude"]].to_numpy()
    coords_radians = np.radians(coords)

    # 2. Run DBSCAN Clustering (geographical data uses 'haversine' metric)
    db = DBSCAN(
        eps=eps,
        min_samples=min_samples,
        metric="haversine"
    ).fit(coords_radians)

    df["cluster"] = db.labels_
    clusters = []

    # 3. Process Clusters and calculate center/intensity
    for label in sorted(set(db.labels_)):
        if label == -1:
            continue # Ignore noise points

        cluster_df = df[df["cluster"] == label]
        center_lat = cluster_df["latitude"].mean()
        center_lng = cluster_df["longitude"].mean()
        intensity = len(cluster_df)

        clusters.append({
            "cluster_id": int(label),
            "lat": round(center_lat, 6),
            "lng": round(center_lng, 6),
            "count": int(len(cluster_df)),
            "intensity": float(intensity)
        })

    # 4. Save output JSON
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(clusters, f, indent=2)

    print(f"Saved hotspots → {OUTPUT_PATH}")
    return clusters

if __name__ == "__main__":
    run_dbscan()