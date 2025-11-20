import { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, Shield, Navigation, Bell, LogOut } from 'lucide-react';
import { CrimeMap } from '../Map/CrimeMap';

import SafetyAlerts from './SafetyAlerts';   // default export
import { SafeRoutes } from './SafeRoutes';  
import { useAuth } from '../../context/AuthContext';

type Tab = 'map' | 'routes' | 'alerts';

export function CitizenDashboard() {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('map');

  const [hotspots, setHotspots] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);

  const [userLocation, setUserLocation] = useState<[number, number]>([
    12.9716, 77.5946 // Bengaluru default
  ]);

  const [currentRisk, setCurrentRisk] = useState<'low' | 'moderate' | 'high' | 'critical'>('low');
  const [sosActive, setSosActive] = useState(false);

  // Fetch heatmap from backend
  const fetchHotspots = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/getHeatmap");
      const data = await res.json();
      setHotspots(data.hotspots || []);
    } catch (err) {
      console.error("Error fetching hotspots:", err);
    }
  };

  // Fetch alerts (risk scores)
  const fetchAlerts = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/riskScores");
      const data = await res.json();
      setAlerts(data.risk_scores || []);
    } catch (err) {
      console.error("Error fetching alerts:", err);
    }
  };

  // Fetch forecast for one ward
  const fetchForecast = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/predict?ward=Koramangala");
      const data = await res.json();
      setForecast(data.prediction.forecast || []);
    } catch (err) {
      console.error("Error fetching forecast:", err);
    }
  };

  // Calculate risk from hotspots
  const computeCurrentRisk = (hs: any[]) => {
    let maxIntensity = 0;

    hs.forEach((h: any) => {
      if (h.intensity > maxIntensity) maxIntensity = h.intensity;
    });

    if (maxIntensity > 200) return 'critical';
    if (maxIntensity > 100) return 'high';
    if (maxIntensity > 40) return 'moderate';
    return 'low';
  };

  useEffect(() => {
    fetchHotspots();
    fetchAlerts();
    fetchForecast();

    const interval = setInterval(() => {
      fetchHotspots();
      fetchAlerts();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hotspots.length > 0) {
      setCurrentRisk(computeCurrentRisk(hotspots));
    }
  }, [hotspots]);

  // SOS button
  const handleSOSActivation = () => {
    setSosActive(true);
    setTimeout(() => {
      alert("SOS sent! Emergency services notified.");
      setSosActive(false);
    }, 1500);
  };

  // Styling for risk labels
  const riskColors: any = {
    low: { bg: "bg-[#28A745]", text: "text-[#28A745]", border: "border-[#28A745]" },
    moderate: { bg: "bg-[#FFC107]", text: "text-[#FFC107]", border: "border-[#FFC107]" },
    high: { bg: "bg-[#FF8C00]", text: "text-[#FF8C00]", border: "border-[#FF8C00]" },
    critical: { bg: "bg-[#DC3545]", text: "text-[#DC3545]", border: "border-[#DC3545]" }
  };

  const filteredHotspots = hotspots.filter((h) => {
    const level =
      h.intensity > 200 ? "critical"
      : h.intensity > 100 ? "high"
      : h.intensity > 40 ? "moderate"
      : "low";

    return level === "high" || level === "critical";
  });

  return (
    <div className="min-h-screen bg-[#1A1A2E]">
      <header className="bg-[#1B263B] border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00BFFF] rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">SafeCity</h1>
                <p className="text-sm text-gray-400">Your Personal Safety Companion</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.fullName}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>

            <button
              onClick={logout}
              className="p-2 hover:bg-[#1A1A2E] rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        
        {/* TOP CARDS */}
        <div className="grid grid-cols-3 gap-6 mb-6">

          {/* Current Risk */}
          <div className={`rounded-lg p-6 border-2 ${riskColors[currentRisk].border} bg-[#1B263B]`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${riskColors[currentRisk].bg} bg-opacity-20 rounded-lg flex items-center justify-center`}>
                <MapPin className={`w-6 h-6 ${riskColors[currentRisk].text}`} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Current Area Risk</p>
                <p className={`text-2xl font-bold ${riskColors[currentRisk].text} uppercase`}>
                  {currentRisk}
                </p>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-[#1B263B] rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#FF8C00] bg-opacity-20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[#FF8C00]" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Active Alerts</p>
                <p className="text-2xl font-bold text-white">{alerts.length}</p>
              </div>
            </div>
          </div>

          {/* High Risk Zones */}
          <div className="bg-[#1B263B] rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#DC3545] bg-opacity-20 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#DC3545]" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Danger Zones</p>
                <p className="text-2xl font-bold text-white">{filteredHotspots.length}</p>
              </div>
            </div>
          </div>

        </div>

        {/* MAIN PANEL */}
        <div className="bg-[#1B263B] rounded-lg border border-gray-700 overflow-hidden mb-6">

          {/* TABS */}
          <div className="border-b border-gray-700">
            <div className="flex items-center justify-between px-6 py-4">

              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'map' ? 'bg-[#00BFFF] text-white' : 'text-gray-400 hover:text-white hover:bg-[#1A1A2E]'
                  }`}
                >
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Safety Map
                </button>

                <button
                  onClick={() => setActiveTab('routes')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'routes' ? 'bg-[#00BFFF] text-white' : 'text-gray-400 hover:text-white hover:bg-[#1A1A2E]'
                  }`}
                >
                  <Navigation className="w-4 h-4 inline mr-2" />
                  Safe Routes
                </button>

                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'alerts' ? 'bg-[#00BFFF] text-white' : 'text-gray-400 hover:text-white hover:bg-[#1A1A2E]'
                  }`}
                >
                  <Bell className="w-4 h-4 inline mr-2" />
                  Alerts
                </button>
              </div>

              <button
                onClick={handleSOSActivation}
                disabled={sosActive}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${
                  sosActive ? 'bg-[#DC3545] text-white animate-pulse' : 'bg-[#DC3545] hover:bg-[#C82333] text-white'
                }`}
              >
                {sosActive ? 'SENDING SOS...' : 'SOS EMERGENCY'}
              </button>

            </div>
          </div>

          {/* PANEL CONTENT */}
          <div className="p-6">
            {activeTab === 'map' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Safety Heatmap</h2>

                <div className="h-[600px]">
                  <CrimeMap hotspots={hotspots} userLocation={userLocation} />
                </div>
              </div>
            )}

            {activeTab === 'routes' && (
              <SafeRoutes hotspots={hotspots} userLocation={userLocation} />
            )}

            {activeTab === 'alerts' && <SafetyAlerts />}
          </div>

        </div>

        {/* SAFETY TIPS */}
        <div className="bg-[#1B263B] rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Safety Tips</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#1A1A2E] rounded-lg border border-gray-700">
              <Shield className="w-6 h-6 text-[#00BFFF] mb-2" />
              <h4 className="font-semibold text-white mb-1">Stay Alert</h4>
              <p className="text-sm text-gray-400">
                Be aware of your surroundings, especially in high-risk zones.
              </p>
            </div>

            <div className="p-4 bg-[#1A1A2E] rounded-lg border border-gray-700">
              <Navigation className="w-6 h-6 text-[#28A745] mb-2" />
              <h4 className="font-semibold text-white mb-1">Use Safe Routes</h4>
              <p className="text-sm text-gray-400">
                Always plan your journey using recommended safe routes.
              </p>
            </div>

            <div className="p-4 bg-[#1A1A2E] rounded-lg border border-gray-700">
              <Bell className="w-6 h-6 text-[#FFC107] mb-2" />
              <h4 className="font-semibold text-white mb-1">Enable Alerts</h4>
              <p className="text-sm text-gray-400">
                Enable notifications for real-time safety updates.
              </p>
            </div>

            <div className="p-4 bg-[#1A1A2E] rounded-lg border border-gray-700">
              <AlertTriangle className="w-6 h-6 text-[#DC3545] mb-2" />
              <h4 className="font-semibold text-white mb-1">Emergency Contacts</h4>
              <p className="text-sm text-gray-400">
                Use the SOS feature in critical situations.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
