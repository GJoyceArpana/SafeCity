import React, { useEffect, useState } from "react";
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";

interface RiskScoreItem {
  incident_id: number;
  lat: number;
  lng: number;
  crime_type: string;
  risk_score: number;
  timestamp?: string | null;
}

export default function SafetyAlerts() {
  const [alerts, setAlerts] = useState<RiskScoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<RiskScoreItem | null>(null);

  const { isLoaded: mapsLoaded, loadError: mapsLoadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  // Fetch risk scores from backend
  const fetchRiskScores = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/riskScores");

      if (!res.ok) throw new Error("Backend error");

      const data = await res.json();
      // Guard shape and default to empty array
      const items = Array.isArray(data?.risk_scores) ? data.risk_scores : [];
      setAlerts(items);
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

  // Reverse geocode alerts to place names when maps loaded
  useEffect(() => {
    if (!mapsLoaded || alerts.length === 0 || mapsLoadError) return;
    const geocoder = new window.google.maps.Geocoder();
    const results: Record<string, string> = {};

    alerts.slice(0, 30).forEach((a) => {
      const key = String(a.incident_id ?? `${a.lat}-${a.lng}`);
      geocoder.geocode({ location: { lat: a.lat, lng: a.lng } }, (gResults, status) => {
        if (status === "OK" && gResults && gResults[0]) {
          results[key] = gResults[0].formatted_address;
        } else {
          results[key] = "Unknown location";
        }
        // update state incrementally
        setLocationNames((prev) => ({ ...prev, [key]: results[key] }));
      });
    });
  }, [mapsLoaded, alerts, mapsLoadError]);

  // Badge color based on risk score
  const getBadgeColor = (score: number) => {
    if (score >= 75) return "bg-red-600 text-white";
    if (score >= 50) return "bg-orange-500 text-white";
    if (score >= 25) return "bg-yellow-400 text-black";
    return "bg-green-600 text-white";
  };

  // Card background gradient by risk
  const getCardBg = (score: number) => {
    if (score >= 75) return "bg-gradient-to-r from-red-800/40 via-red-700/30 to-red-600/20";
    if (score >= 50) return "bg-gradient-to-r from-orange-700/30 via-orange-600/20 to-orange-500/10";
    if (score >= 25) return "bg-gradient-to-r from-yellow-600/20 via-yellow-400/10 to-yellow-300/5";
    return "bg-gradient-to-r from-green-700/20 via-green-600/10 to-green-500/5";
  };

  const humanizeType = (s?: string) => {
    if (!s) return "Unknown";
    return s.replaceAll("_", " ").split(" ").map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(" ");
  };

  // UI states
  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-40 bg-gray-700 rounded"></div>
          <div className="h-48 bg-gray-800 rounded"></div>
        </div>
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
        {alerts.slice(0, 50).map((a) => {
          const key = String(a.incident_id ?? `${a.lat}-${a.lng}`);
          return (
            <div
              key={key}
              onClick={() => setPreview(a)}
              className={`border p-4 rounded-lg shadow flex items-center justify-between ${getCardBg(a.risk_score ?? 0)} cursor-pointer transition hover:scale-[1.01]`}
            >
              <div>
                <p className="font-bold">{humanizeType(a.crime_type)}</p>

                <p className="text-sm text-gray-200">
                  <strong>Location:</strong> {locationNames[key] ?? "-"}
                </p>

                <p className="text-sm text-gray-200">
                  <strong>Coordinates:</strong> {(a.lat ?? 0).toFixed(4)}, {(a.lng ?? 0).toFixed(4)}
                </p>

                {a.timestamp && (
                  <p className="text-sm text-gray-200">
                    <strong>Time:</strong> {new Date(a.timestamp).toLocaleString()}
                  </p>
                )}

                <p className="text-sm text-gray-200">
                  <strong>Incident ID:</strong> {a.incident_id ?? "-"}
                </p>
              </div>

              <div className={`px-4 py-2 rounded-lg text-center font-semibold text-lg ${getBadgeColor(a.risk_score ?? 0)}`}>
                {a.risk_score ?? 0}
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal with mini-map */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#071026] rounded-lg w-11/12 max-w-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold">Alert Preview</h3>
              <button onClick={() => setPreview(null)} className="text-white/80">Close</button>
            </div>

            <div className="h-72">
              {mapsLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                  center={{ lat: preview.lat, lng: preview.lng }}
                  zoom={16}
                >
                  <Marker position={{ lat: preview.lat, lng: preview.lng }} />
                </GoogleMap>
              ) : (
                <div className="p-4 text-center text-gray-300">Map loading…</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
