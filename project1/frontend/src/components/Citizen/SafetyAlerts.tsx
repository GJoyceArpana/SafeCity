import React, { useEffect, useState } from "react";

interface RiskScoreItem {
  incident_id: number;
  lat: number;
  lng: number;
  crime_type: string;
  risk_score: number;
}

export default function SafetyAlerts() {
  const [alerts, setAlerts] = useState<RiskScoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch risk scores from backend
  const fetchRiskScores = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/riskScores");

      if (!res.ok) throw new Error("Backend error");

      const data = await res.json();
      setAlerts(data.risk_scores || []);
      setLoading(false);
    } catch (err) {
      console.error("Risk score fetch failed:", err);
      setError("Unable to load safety alerts.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskScores();

    // Optional auto-refresh every 25 seconds
    const interval = setInterval(fetchRiskScores, 25000);
    return () => clearInterval(interval);
  }, []);

  // Color based on risk score
  const getColor = (score: number) => {
    if (score >= 75) return "bg-red-600 text-white";
    if (score >= 50) return "bg-yellow-500 text-black";
    return "bg-green-600 text-white";
  };

  // UI states
  if (loading) {
    return (
      <div className="p-4 text-center text-gray-300">
        Loading safety alerts...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500 font-semibold">
        {error}
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Safety Alerts</h1>

      <div className="space-y-3">
        {alerts.slice(0, 50).map((a, i) => (
          <div
            key={i}
            className="border p-4 rounded-lg shadow flex items-center justify-between bg-gray-100"
          >
            <div>
              <p className="font-bold capitalize">{a.crime_type.replace("_", " ")}</p>

              <p className="text-sm text-gray-700">
                <strong>Location:</strong> {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
              </p>

              <p className="text-sm text-gray-700">
                <strong>Incident ID:</strong> {a.incident_id}
              </p>
            </div>

            <div
              className={`px-4 py-2 rounded-lg text-center font-semibold text-lg ${getColor(
                a.risk_score
              )}`}
            >
              {a.risk_score}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
