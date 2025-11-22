import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.metrics import mean_absolute_error, mean_squared_error, silhouette_score
from sklearn.cluster import DBSCAN
import json
import sys

# Load the data
data_path = 'data/bangalore_merged_crime_dataset_new.csv'
print(f"Loading crime data from: {data_path}")
data = pd.read_csv(data_path)
print(f"Total incidents: {len(data)}")
print(f"Date range: {data['date'].min()} to {data['date'].max()}")
print(f"\nColumns: {data.columns.tolist()}")

# Convert date to datetime
data['date'] = pd.to_datetime(data['date'])

# ============================================
# 1. FORECAST MODEL ACCURACY (Time Series)
# ============================================
print("\n" + "="*60)
print("1. FORECAST MODEL ACCURACY EVALUATION")
print("="*60)

# Aggregate by date
daily_crimes = data.groupby('date').size().reset_index(name='count')
daily_crimes = daily_crimes.sort_values('date')

# Use last 30 days as test set
test_days = 30
train_data = daily_crimes[:-test_days].copy()
test_data = daily_crimes[-test_days:].copy()

print(f"\nTrain period: {train_data['date'].min()} to {train_data['date'].max()}")
print(f"Test period: {test_data['date'].min()} to {test_data['date'].max()}")

# Simple baseline: Rolling average (7-day window)
window = 7
train_data['rolling_avg'] = train_data['count'].rolling(window=window, min_periods=1).mean()

# Predict using last rolling average
last_avg = train_data['rolling_avg'].iloc[-1]
predictions = [last_avg] * len(test_data)
actual = test_data['count'].values

# Calculate metrics
mae = mean_absolute_error(actual, predictions)
rmse = np.sqrt(mean_squared_error(actual, predictions))
mape = np.mean(np.abs((actual - predictions) / actual)) * 100

print(f"\n📊 Forecast Model Metrics (Rolling Average Baseline):")
print(f"   MAE (Mean Absolute Error): {mae:.2f} crimes/day")
print(f"   RMSE (Root Mean Squared Error): {rmse:.2f} crimes/day")
print(f"   MAPE (Mean Absolute % Error): {mape:.2f}%")
print(f"   Baseline Accuracy: {100 - mape:.2f}%")

# ============================================
# 2. CLUSTERING MODEL EVALUATION (DBSCAN)
# ============================================
print("\n" + "="*60)
print("2. CLUSTERING MODEL EVALUATION")
print("="*60)

# Extract coordinates
coords = data[['latitude', 'longitude']].values
print(f"\nClustering {len(coords)} crime incidents...")

# DBSCAN clustering (matching route_engine.py parameters)
eps = 0.0035  # ~390 meters
min_samples = 8  # Matching actual implementation
clustering = DBSCAN(eps=eps, min_samples=min_samples, metric='haversine').fit(np.radians(coords))
labels = clustering.labels_

# Count clusters
n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
n_noise = list(labels).count(-1)

print(f"\n📍 Clustering Results:")
print(f"   Number of clusters found: {n_clusters}")
print(f"   Number of noise points: {n_noise}")
print(f"   Percentage noise: {100 * n_noise / len(labels):.2f}%")

# Silhouette score (only if we have 2+ clusters)
if n_clusters > 1:
    # Filter out noise points for silhouette calculation
    mask = labels != -1
    if sum(mask) > 0:
        silhouette_avg = silhouette_score(np.radians(coords[mask]), labels[mask], metric='haversine')
        print(f"   Silhouette Score: {silhouette_avg:.3f}")
        print(f"   Quality: {'Excellent' if silhouette_avg > 0.7 else 'Good' if silhouette_avg > 0.5 else 'Fair' if silhouette_avg > 0.3 else 'Poor'}")
else:
    print(f"   ⚠️  Only {n_clusters} cluster found - consider adjusting parameters")

# Show top hotspots
if n_clusters > 0:
    print(f"\n🔥 Top Crime Hotspots:")
    cluster_counts = pd.Series(labels[labels != -1]).value_counts().head(5)
    for i, (cluster_id, count) in enumerate(cluster_counts.items(), 1):
        cluster_points = coords[labels == cluster_id]
        center_lat = cluster_points[:, 0].mean()
        center_lon = cluster_points[:, 1].mean()
        print(f"   Hotspot {i}: {count} incidents at ({center_lat:.4f}, {center_lon:.4f})")

# ============================================
# 3. RISK SCORE MODEL EVALUATION
# ============================================
print("\n" + "="*60)
print("3. RISK SCORE MODEL EVALUATION")
print("="*60)

# Severity mapping (matching actual implementation)
severity_map = {
    'critical': 100, 'high': 80, 'moderate': 50, 'low': 20
}

# Calculate risk scores using existing columns
data['severity_score'] = data['severity'].map(severity_map).fillna(50)

# Time-based risk (night = higher risk)
data['hour'] = data['time'].apply(lambda x: int(str(x).split(':')[0]) if ':' in str(x) else 12)
data['time_risk'] = data['hour'].apply(lambda h: 100 if 20 <= h or h <= 5 else 60 if 6 <= h < 11 else 40 if 12 <= h < 17 else 50)

# Weather risk from dataset
weather_map = {'rainy': 90, 'humid': 80, 'cloudy': 60, 'clear': 40}
data['weather_risk'] = data['weather'].map(weather_map).fillna(50)

# Combined risk score (weighted - matching implementation)
data['calculated_risk_score'] = (
    0.5 * data['severity_score'] +
    0.3 * data['time_risk'] +
    0.2 * data['weather_risk']
)

print(f"\n⚠️  Risk Score Distribution:")
print(f"   Mean risk score: {data['calculated_risk_score'].mean():.2f}")
print(f"   Median risk score: {data['calculated_risk_score'].median():.2f}")
print(f"   High risk incidents (>70): {(data['calculated_risk_score'] > 70).sum()} ({100*(data['calculated_risk_score'] > 70).sum()/len(data):.1f}%)")
print(f"   Medium risk (50-70): {((data['calculated_risk_score'] >= 50) & (data['calculated_risk_score'] <= 70)).sum()}")
print(f"   Low risk (<50): {(data['calculated_risk_score'] < 50).sum()}")

# Validate: Do high-risk scores correlate with severe crimes?
high_severity_types = ['critical', 'high']
high_risk_incidents = data[data['calculated_risk_score'] > 70]
severe_crimes_caught = high_risk_incidents['severity'].isin(high_severity_types).sum()
precision = severe_crimes_caught / len(high_risk_incidents) if len(high_risk_incidents) > 0 else 0

print(f"\n📈 Risk Model Validation:")
print(f"   Precision (high-risk = severe crime): {precision:.2%}")
print(f"   High-risk incidents correctly identified: {severe_crimes_caught}/{len(high_risk_incidents)}")

# ============================================
# OVERALL SUMMARY
# ============================================
print("\n" + "="*60)
print("📊 OVERALL MODEL PERFORMANCE SUMMARY")
print("="*60)
print(f"\n1. Forecast Model:")
print(f"   ✓ Accuracy: ~{100 - mape:.1f}% (MAPE: {mape:.1f}%)")
print(f"   ✓ Average error: ±{mae:.1f} crimes per day")
print(f"\n2. Clustering Model (DBSCAN):")
print(f"   ✓ Identified {n_clusters} crime hotspots")
if n_clusters > 1:
    print(f"   ✓ Cluster quality: {silhouette_avg:.3f} (silhouette score)")
print(f"   ✓ Parameters: eps={eps} (~{eps*111*1000:.0f}m), min_samples={min_samples}")
print(f"\n3. Risk Score Model:")
print(f"   ✓ High-risk detection precision: {precision:.1%}")
print(f"   ✓ Mean risk score: {data['calculated_risk_score'].mean():.1f}/100")

print("\n" + "="*60)
print("✅ ANALYSIS COMPLETE")
print("="*60)

# Save results to JSON for documentation
results = {
    "evaluation_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "dataset": {
        "total_incidents": len(data),
        "date_range": f"{data['date'].min()} to {data['date'].max()}"
    },
    "forecast_model": {
        "mae": float(mae),
        "rmse": float(rmse),
        "mape": float(mape),
        "accuracy_percent": float(100 - mape)
    },
    "clustering_model": {
        "n_clusters": int(n_clusters),
        "n_noise": int(n_noise),
        "noise_percent": float(100 * n_noise / len(labels)),
        "silhouette_score": float(silhouette_avg) if n_clusters > 1 else None,
        "parameters": {
            "eps": eps,
            "min_samples": min_samples
        }
    },
    "risk_score_model": {
        "mean_score": float(data['calculated_risk_score'].mean()),
        "median_score": float(data['calculated_risk_score'].median()),
        "high_risk_count": int((data['calculated_risk_score'] > 70).sum()),
        "precision": float(precision)
    }
}

with open('output/model_evaluation_results.json', 'w') as f:
    json.dump(results, f, indent=2)

print("\n💾 Results saved to: output/model_evaluation_results.json")
