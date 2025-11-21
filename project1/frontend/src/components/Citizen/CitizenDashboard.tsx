// frontend/src/components/Citizen/CitizenDashboard.tsx
import React, { useEffect, useState, useRef } from "react";
import { MapPin, Navigation, Bell, AlertTriangle, LogOut, RefreshCw } from "lucide-react";
import { CrimeMap } from "../Map/CrimeMap";
import SafeRoutes from "./SafeRoutes";
import SafetyAlerts from "./SafetyAlerts";
import { useAuth } from "../../context/AuthContext";
import { BackendHotspot } from "../Map/CrimeMap";
import { SOSButton } from "../SOS/SOSButton";
import { ChatWidget } from "../Chat/ChatWidget";

type Tab = "map" | "routes" | "alerts";

interface RawHotspot {
  id?: string;
  centerLat?: number;
  centerLng?: number;
  latitude?: number;
  longitude?: number;
  center?: { lat: number; lng: number };
  lat?: number;
  lng?: number;
  riskScore?: number;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  radiusMeters?: number;
  radius?: number;
}

interface ErrorState {
  hotspots: boolean;
  cityRisk: boolean;
  alerts: boolean;
}

export function CitizenDashboard() {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const [hotspots, setHotspots] = useState<BackendHotspot[]>([]);
  const [cityRisk, setCityRisk] = useState<number>(0);
  const [alertsCount, setAlertsCount] = useState<number | string>("Live");
  const [initialLoading, setInitialLoading] = useState(true);
  const [errors, setErrors] = useState<ErrorState>({ hotspots: false, cityRisk: false, alerts: false });
  const [refreshing, setRefreshing] = useState(false);
  const userLocation: [number, number] = [12.9716, 77.5946]; // Bangalore default
  const firstLoad = useRef(true);
  const retryCount = useRef({ hotspots: 0, cityRisk: 0, alerts: 0 });

  useEffect(() => {
    async function load(isManualRefresh = false) {
      if (isManualRefresh) setRefreshing(true);
      
      const safeFetch = async (url: string, maxRetries = 2) => {
        let lastError: Error | null = null;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
            return await res.json();
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
        throw lastError;
      };

      const newErrors: ErrorState = { hotspots: false, cityRisk: false, alerts: false };

      // 1) Try backend heatmap, if absent fallback to mock-generated hotspots
      let hs: BackendHotspot[] = [];
      try {
        const hJson = await safeFetch("http://127.0.0.1:8000/getHeatmap");
        const fromBackend = (hJson.hotspots || []).map((h: Record<string, unknown>) => {
          const center = h.center as { lat?: number; lng?: number } | undefined;
          const lat = center?.lat ?? (h.lat as number | undefined);
          const lng = center?.lng ?? (h.lng as number | undefined);
          const intensity = (h.intensity as number | undefined) ?? (h.count as number | undefined) ?? 1;
          return {
            center: center ?? (lat && lng ? { lat, lng } : undefined),
            lat: lat ?? 0,
            lng: lng ?? 0,
            intensity,
            radius: (h.radius as number | undefined) ?? (intensity ? Math.min(150 + intensity * 0.8, 2500) : 150),
          } as BackendHotspot;
        });
        if (fromBackend.length > 0) {
          hs = fromBackend;
          retryCount.current.hotspots = 0;
        }
      } catch (err) {
        console.warn("Backend hotspots unavailable, using fallback:", err);
        newErrors.hotspots = true;
        retryCount.current.hotspots++;
      }

      // If backend didn't provide hotspots, generate mock hotspots and normalize them
      if (hs.length === 0) {
        try {
          const { generateMockCrimeIncidents, generateMockHotspots } = await import('../../services/mockData');
          const { predictHotspots } = await import('../../services/predictionService');
          const incidents = generateMockCrimeIncidents(500);
          const now = new Date();
          const predicted = predictHotspots(incidents, now.getHours(), now.getDay());
          const mockHotspots = generateMockHotspots(incidents);
          const allRaw: RawHotspot[] = [...predicted.slice(0, 3), ...mockHotspots];

          const normalized = allRaw.map((h: RawHotspot, idx: number) => {
            const lat = h.centerLat ?? h.latitude ?? h.center?.lat ?? h.lat ?? 0;
            const lng = h.centerLng ?? h.longitude ?? h.center?.lng ?? h.lng ?? 0;
            const intensity = h.riskScore ?? (h.severity === 'critical' ? 100 : h.severity === 'high' ? 75 : h.severity === 'medium' ? 50 : 20);
            const radius = h.radiusMeters ?? h.radius ?? 150;
            return {
              cluster_id: idx, // Use numeric index for cluster_id
              center: { lat, lng },
              lat,
              lng,
              intensity,
              count: Math.round(intensity),
              radius,
            } as BackendHotspot;
          });
          hs = normalized;
          // set alerts from mocks if backend alerts missing
          try {
            const mockAlerts = (await import('../../services/mockData')).generateMockAlerts();
            setAlertsCount(mockAlerts.length);
          } catch (e) {
            console.warn('Could not load mock alerts:', e);
          }
        } catch (e) {
          console.warn('Mock data generation failed:', e);
          // final fallback - empty
          hs = [];
        }
      }

      setHotspots(hs);

      // 2) City risk
      try {
        const rJson = await safeFetch("http://127.0.0.1:8000/api/cityRisk");
        const risk = rJson.data?.risk_index ?? rJson.risk_index ?? 0;
        setCityRisk(Math.round(risk));
        retryCount.current.cityRisk = 0;
      } catch (err) {
        console.warn("City risk fetch failed:", err);
        newErrors.cityRisk = true;
        retryCount.current.cityRisk++;
        if (cityRisk === 0) setCityRisk(0); // Keep existing value if already set
      }

      // 3) Alerts count (prefer backend, already attempted above when using mocks)
      try {
        const aJson = await safeFetch("http://127.0.0.1:8000/riskScores");
        if (Array.isArray(aJson.risk_scores)) {
          setAlertsCount(aJson.risk_scores.length);
          retryCount.current.alerts = 0;
        }
      } catch (err) {
        console.warn("Alerts fetch failed:", err);
        newErrors.alerts = true;
        retryCount.current.alerts++;
        if (typeof alertsCount !== 'number') setAlertsCount('Live');
      }

      setErrors(newErrors);
      
      if (firstLoad.current) {
        setInitialLoading(false);
        firstLoad.current = false;
      }
      
      if (isManualRefresh) {
        setRefreshing(false);
      }
    }
    load();

    // refresh periodically
    const iv = setInterval(() => load(false), 25000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualRefresh = () => {
    if (!refreshing) {
      setRefreshing(true);
      window.location.reload();
    }
  };

  const riskColor = (val: number) => {
    if (val >= 75) return "text-red-500";
    if (val >= 50) return "text-orange-400";
    if (val >= 25) return "text-yellow-400";
    return "text-green-400";
  };

  return (
    <div className="min-h-screen bg-[#071026] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center font-bold text-lg">
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-sm text-gray-400">Welcome back</p>
            <p className="font-semibold">{user?.fullName || 'User'}</p>
            {user?.email && <p className="text-xs text-gray-500">{user.email}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {(errors.hotspots || errors.cityRisk || errors.alerts) && (
            <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 px-3 py-2 rounded-md">
              <AlertTriangle className="w-4 h-4" />
              <span>Using fallback data</span>
            </div>
          )}
          <button 
            onClick={handleManualRefresh} 
            disabled={refreshing}
            className="flex items-center gap-2 bg-white/6 px-3 py-2 rounded-md hover:bg-white/10 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
          <button onClick={() => logout?.()} className="flex items-center gap-2 bg-white/6 px-3 py-2 rounded-md hover:bg-white/10 transition">
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          {/* City Safety Index */}
          <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-md">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-[#FFC107]" />
              <div>
                <p className="text-sm text-gray-300">City Safety Index</p>
                {initialLoading ? (
                  <div className="h-8 w-24 bg-gray-700 rounded animate-pulse" />
                ) : (
                  <p className={`text-3xl font-bold ${riskColor(cityRisk)}`}>{cityRisk}</p>
                )}
              </div>
            </div>
          </div>

          {/* Active Hotspots */}
          <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-md">
            <div className="flex items-center gap-3">
              <MapPin className="w-8 h-8 text-[#FF8C00]" />
              <div>
                <p className="text-sm text-gray-400">Active Hotspots</p>
                {initialLoading ? (
                  <div className="h-8 w-24 bg-gray-700 rounded animate-pulse" />
                ) : (
                  <p className="text-3xl font-bold">{hotspots.length}</p>
                )}
              </div>
            </div>
          </div>

          {/* Alerts Count */}
          <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-md">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-[#DC3545]" />
              <div>
                <p className="text-sm text-gray-400">Alerts</p>
                {initialLoading ? (
                  <div className="h-8 w-24 bg-gray-700 rounded animate-pulse" />
                ) : (
                  <p className="text-3xl font-bold">{alertsCount}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#071026] rounded-lg border border-gray-700">
          {/* Tabs */}
          <div className="flex gap-2 px-6 py-4 border-b border-white/8">
            <button onClick={() => setActiveTab("map")} className={`px-4 py-2 rounded-full transition ${activeTab === "map" ? "bg-white/10 text-white" : "text-gray-300"}`}><MapPin className="inline w-4 h-4 mr-2" /> Safety Map</button>
            <button onClick={() => setActiveTab("routes")} className={`px-4 py-2 rounded-full transition ${activeTab === "routes" ? "bg-white/10 text-white" : "text-gray-300"}`}><Navigation className="inline w-4 h-4 mr-2" /> Safe Routes</button>
            <button onClick={() => setActiveTab("alerts")} className={`px-4 py-2 rounded-full transition ${activeTab === "alerts" ? "bg-white/10 text-white" : "text-gray-300"}`}><Bell className="inline w-4 h-4 mr-2" /> Alerts</button>
          </div>

          <div className="p-6">
            {activeTab === "map" && (
              hotspots.length === 0 && !initialLoading ? (
                <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                  <MapPin className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No hotspot data available</p>
                  <p className="text-sm mt-2">Try refreshing or check backend connectivity</p>
                </div>
              ) : (
                <CrimeMap hotspots={hotspots} userLocation={userLocation} zoom={12} />
              )
            )}
            {activeTab === "routes" && (
              <SafeRoutes
                userLocation={userLocation}
                hotspots={hotspots.map((h) => ({
                  lat: h.center?.lat ?? h.lat ?? 0,
                  lng: h.center?.lng ?? h.lng ?? 0,
                  radius: h.radius ?? 150,
                  intensity: h.intensity ?? h.count ?? 1,
                }))}
              />
            )}
            {activeTab === "alerts" && <SafetyAlerts />}
          </div>
        </div>
      </div>

      {/* Global SOS Button and Chat Widget */}
      <SOSButton />
      <ChatWidget />
    </div>
  );
}