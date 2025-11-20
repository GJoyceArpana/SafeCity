import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface BackendHotspot {
  cluster_id: number;
  lat: number;
  lng: number;
  count: number;
  intensity: number;
}

// Risk Level Based on Cluster Intensity
const riskColors: Record<'low' | 'moderate' | 'high' | 'critical', string> = {
  low: "#28A745",
  moderate: "#FFC107",
  high: "#FF8C00",
  critical: "#DC3545",
};

function getRiskLevel(intensity: number) {
  if (intensity > 200) return "critical";
  if (intensity > 100) return "high";
  if (intensity > 40) return "moderate";
  return "low";
}

export function CrimeMap() {
  const [hotspots, setHotspots] = useState<BackendHotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Layer[]>([]);

  // ------------------------------------
  // FETCH HOTSPOTS FROM BACKEND
  // ------------------------------------
  const fetchHotspots = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/getHeatmap");

      if (!res.ok) throw new Error("Backend Error");

      const data = await res.json();

      if (data.hotspots) {
        setHotspots(data.hotspots);
      }

      setLoading(false);
    } catch (err) {
      console.error("Heatmap Fetch Failed:", err);
      setError("Unable to load hotspot data from backend.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotspots();

    // OPTIONAL: Auto refresh every 20 seconds
    const interval = setInterval(fetchHotspots, 20000);
    return () => clearInterval(interval);
  }, []);

  // ------------------------------------
  // INITIALIZE MAP
  // ------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      attributionControl: false,
    }).setView([12.9716, 77.5946], 12); // Bangalore

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 19 }
    ).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ------------------------------------
  // RENDER HOTSPOTS ON MAP
  // ------------------------------------
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove previous markers
    markersRef.current.forEach((layer) => mapRef.current?.removeLayer(layer));
    markersRef.current = [];

    hotspots.forEach((h) => {
      const riskLevel = getRiskLevel(h.intensity);
      const radius = Math.min(300 + h.intensity * 3, 2000);

      const popupContent = `
        <div style="color:#1A1A2E; min-width:180px;">
          <h3 style="margin:0 0 6px 0; font-size:14px; font-weight:bold; text-transform:uppercase; color:${riskColors[riskLevel]};">
            ${riskLevel} RISK ZONE
          </h3>
          <p><strong>Incidents:</strong> ${h.count}</p>
          <p><strong>Coordinates:</strong> ${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}</p>
          <p><strong>Cluster ID:</strong> ${h.cluster_id}</p>
        </div>
      `;

      // Circle
      const circle = L.circle([h.lat, h.lng], {
        color: riskColors[riskLevel],
        fillColor: riskColors[riskLevel],
        fillOpacity: 0.35,
        radius,
        weight: 2,
      })
        .addTo(mapRef.current!)
        .bindPopup(popupContent);

      markersRef.current.push(circle);

      // Center point
      const marker = L.circleMarker([h.lat, h.lng], {
        radius: 7,
        fillColor: riskColors[riskLevel],
        color: "#fff",
        weight: 2,
        fillOpacity: 1,
      })
        .addTo(mapRef.current!)
        .bindPopup(popupContent);

      markersRef.current.push(marker);
    });
  }, [hotspots]);

  // ------------------------------------
  // UI STATES
  // ------------------------------------
  if (loading) {
    return (
      <div className="text-center p-4 text-gray-300">
        Loading crime heatmap...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-500">
        {error}
      </div>
    );
  }

  // ------------------------------------
  // COMPONENT RENDER
  // ------------------------------------
  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg overflow-hidden shadow-lg"
      style={{ minHeight: "500px" }}
    />
  );
}
