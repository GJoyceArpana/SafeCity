// frontend/src/components/Citizen/CitizenDashboard.tsx
import React, { useEffect, useState } from "react";
import { MapPin, Navigation, Bell, Shield, AlertTriangle, LogOut } from "lucide-react";
import { CrimeMap } from "../Map/CrimeMap";
import SafeRoutes from "./SafeRoutes";
import SafetyAlerts from "./SafetyAlerts";
import { useAuth } from "../../context/AuthContext";

type Tab = "map" | "routes" | "alerts";

interface BackendHotspot {
  center?: { lat: number; lng: number };
  lat?: number;
  lng?: number;
  intensity?: number;
  count?: number;
  radius?: number;
}

export function CitizenDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const [hotspots, setHotspots] = useState<BackendHotspot[]>([]);
  const [cityRisk, setCityRisk] = useState<number>(0);
  const [alertsCount, setAlertsCount] = useState<number | string>("Live");
  const userLocation: [number, number] = [12.9716, 77.5946]; // Bangalore default

  useEffect(() => {
    async function load() {
      try {
        const hRes = await fetch("/getHeatmap");
        const hJson = await hRes.json();

        // Local type for hotspot objects returned by the backend
        type RawHotspot = {
          center?: { lat: number; lng: number };
          lat?: number;
          lng?: number;
          intensity?: number;
          count?: number;
          radius?: number;
        };

        const hs = (hJson.hotspots || []).map((h: RawHotspot) => ({
          center: h.center ?? (h.lat && h.lng ? { lat: h.lat, lng: h.lng } : undefined),
          lat: h.center?.lat ?? h.lat,
          lng: h.center?.lng ?? h.lng,
          intensity: h.intensity ?? h.count ?? 1,
          radius: h.radius ?? (h.intensity ? Math.min(150 + h.intensity * 0.8, 2500) : 150),
        }));
        setHotspots(hs);
      } catch (e) {
        setHotspots([]);
      }

      try {
        const rRes = await fetch("/api/cityRisk");
        if (rRes.ok) {
          const rJson = await rRes.json();
          setCityRisk(rJson.data?.risk_index ?? 0);
        } else {
          setCityRisk(0);
        }
      } catch {
        setCityRisk(0);
      }

      try {
        const aRes = await fetch("/riskScores");
        const aJson = await aRes.json();
        setAlertsCount((aJson.risk_scores || []).length || "Live");
      } catch {
        setAlertsCount("Live");
      }
    }
    load();

    // refresh periodically
    const iv = setInterval(load, 25000);
    return () => clearInterval(iv);
  }, []);

  const riskColor = (val: number) => {
    if (val >= 75) return "text-red-500";
    if (val >= 50) return "text-orange-400";
    if (val >= 25) return "text-yellow-400";
    return "text-green-400";
  };

  return (
    <div className="min-h-screen bg-[#071026] text-white">
      <header className="bg-[#061226] px-6 py-4 flex justify-between items-center border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Shield className="w-10 h-10 text-[#00BFFF]" />
          <div>
            <h1 className="text-xl font-bold">SafeCity</h1>
            <p className="text-gray-400 text-sm">Your Personal Safety Companion</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-medium">{user?.fullName}</p>
            <p className="text-gray-400 text-xs">{user?.email}</p>
          </div>

          <button onClick={logout} title="Logout" className="p-2 rounded-lg hover:bg-[#0f1724]">
            <LogOut className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-[#071026] p-6 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-[#FFC107]" />
              <div>
                <p className="text-sm text-gray-400">City Safety Index</p>
                <p className={`text-3xl font-bold ${riskColor(cityRisk)}`}>{cityRisk}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#071026] p-6 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3">
              <MapPin className="w-8 h-8 text-[#FF8C00]" />
              <div>
                <p className="text-sm text-gray-400">Active Hotspots</p>
                <p className="text-3xl font-bold">{hotspots.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#071026] p-6 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-[#DC3545]" />
              <div>
                <p className="text-sm text-gray-400">Alerts</p>
                <p className="text-3xl font-bold">{alertsCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#071026] rounded-lg border border-gray-700">
          <div className="flex gap-2 px-6 py-4 border-b border-gray-700">
            <button onClick={() => setActiveTab("map")} className={`px-4 py-2 rounded-lg ${activeTab === "map" ? "bg-[#00BFFF]" : "text-gray-400"}`}><MapPin className="inline w-4 h-4 mr-2" /> Safety Map</button>
            <button onClick={() => setActiveTab("routes")} className={`px-4 py-2 rounded-lg ${activeTab === "routes" ? "bg-[#00BFFF]" : "text-gray-400"}`}><Navigation className="inline w-4 h-4 mr-2" /> Safe Routes</button>
            <button onClick={() => setActiveTab("alerts")} className={`px-4 py-2 rounded-lg ${activeTab === "alerts" ? "bg-[#00BFFF]" : "text-gray-400"}`}><Bell className="inline w-4 h-4 mr-2" /> Alerts</button>
          </div>

          <div className="p-6">
            {activeTab === "map" && <CrimeMap hotspots={hotspots.map(h => ({ cluster_id: h.cluster_id, lat: h.center?.lat ?? h.lat, lng: h.center?.lng ?? h.lng, intensity: h.intensity ?? h.count }))} userLocation={userLocation} zoom={12} />}
            {activeTab === "routes" && <SafeRoutes userLocation={userLocation} />}
            {activeTab === "alerts" && <SafetyAlerts />}
          </div>
        </div>
      </div>
    </div>
  );
}
