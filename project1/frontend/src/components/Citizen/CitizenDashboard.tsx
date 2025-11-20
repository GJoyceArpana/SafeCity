import { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, Shield, Navigation, Bell, LogOut } from 'lucide-react';
import { CrimeMap } from '../Map/CrimeMap';
import { SafetyAlerts } from './SafetyAlerts';
import { SafeRoutes } from './SafeRoutes';
import { generateMockCrimeIncidents, generateMockHotspots, generateMockAlerts } from '../../services/mockData';
import { predictHotspots, calculateRiskForLocation } from '../../services/predictionService';
import { useAuth } from '../../context/AuthContext';
import { CrimeHotspot, SafetyAlert } from '../../types';

type Tab = 'map' | 'routes' | 'alerts';

export function CitizenDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [hotspots, setHotspots] = useState<CrimeHotspot[]>([]);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number]>([19.0760, 72.8777]);
  const [currentRisk, setCurrentRisk] = useState<'low' | 'moderate' | 'high' | 'critical'>('low');
  const [sosActive, setSosActive] = useState(false);

  useEffect(() => {
    const incidents = generateMockCrimeIncidents(500);
    const now = new Date();
    const predicted = predictHotspots(incidents, now.getHours(), now.getDay());
    const mockHotspots = generateMockHotspots(incidents);

    const allHotspots = [...predicted.slice(0, 3), ...mockHotspots];
    setHotspots(allHotspots);
    setAlerts(generateMockAlerts());

    const { riskLevel } = calculateRiskForLocation(userLocation[0], userLocation[1], allHotspots);
    setCurrentRisk(riskLevel);
  }, []);

  const handleSOSActivation = () => {
    setSosActive(true);
    setTimeout(() => {
      alert('SOS sent! Emergency services have been notified of your location.');
      setSosActive(false);
    }, 1000);
  };

  const riskColors = {
    low: { bg: 'bg-[#28A745]', text: 'text-[#28A745]', border: 'border-[#28A745]' },
    moderate: { bg: 'bg-[#FFC107]', text: 'text-[#FFC107]', border: 'border-[#FFC107]' },
    high: { bg: 'bg-[#FF8C00]', text: 'text-[#FF8C00]', border: 'border-[#FF8C00]' },
    critical: { bg: 'bg-[#DC3545]', text: 'text-[#DC3545]', border: 'border-[#DC3545]' }
  };

  const filteredHotspots = hotspots.filter(h => h.riskLevel === 'high' || h.riskLevel === 'critical');

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
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-3 gap-6 mb-6">
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

        <div className="bg-[#1B263B] rounded-lg border border-gray-700 overflow-hidden mb-6">
          <div className="border-b border-gray-700">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'map'
                      ? 'bg-[#00BFFF] text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#1A1A2E]'
                  }`}
                >
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Safety Map
                </button>
                <button
                  onClick={() => setActiveTab('routes')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'routes'
                      ? 'bg-[#00BFFF] text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#1A1A2E]'
                  }`}
                >
                  <Navigation className="w-4 h-4 inline mr-2" />
                  Safe Routes
                </button>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'alerts'
                      ? 'bg-[#00BFFF] text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#1A1A2E]'
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
                  sosActive
                    ? 'bg-[#DC3545] text-white animate-pulse'
                    : 'bg-[#DC3545] hover:bg-[#C82333] text-white'
                } disabled:cursor-not-allowed`}
              >
                {sosActive ? 'SENDING SOS...' : 'SOS EMERGENCY'}
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'map' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Safety Heatmap</h2>
                  <p className="text-sm text-gray-400">
                    Showing high-risk areas to avoid
                  </p>
                </div>
                <div className="h-[600px]">
                  <CrimeMap
                    hotspots={filteredHotspots}
                    userLocation={userLocation}
                  />
                </div>
                <div className="mt-4 flex gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#FF8C00]"></div>
                    <span className="text-gray-300">High Risk Area</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#DC3545]"></div>
                    <span className="text-gray-300">Critical Risk - Avoid</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#00BFFF]"></div>
                    <span className="text-gray-300">Your Location</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'routes' && <SafeRoutes hotspots={filteredHotspots} userLocation={userLocation} />}
            {activeTab === 'alerts' && <SafetyAlerts alerts={alerts} />}
          </div>
        </div>

        <div className="bg-[#1B263B] rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Safety Tips</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#1A1A2E] rounded-lg border border-gray-700">
              <Shield className="w-6 h-6 text-[#00BFFF] mb-2" />
              <h4 className="font-semibold text-white mb-1">Stay Alert</h4>
              <p className="text-sm text-gray-400">Be aware of your surroundings, especially in high-risk zones.</p>
            </div>
            <div className="p-4 bg-[#1A1A2E] rounded-lg border border-gray-700">
              <Navigation className="w-6 h-6 text-[#28A745] mb-2" />
              <h4 className="font-semibold text-white mb-1">Use Safe Routes</h4>
              <p className="text-sm text-gray-400">Always plan your journey using recommended safe routes.</p>
            </div>
            <div className="p-4 bg-[#1A1A2E] rounded-lg border border-gray-700">
              <Bell className="w-6 h-6 text-[#FFC107] mb-2" />
              <h4 className="font-semibold text-white mb-1">Enable Alerts</h4>
              <p className="text-sm text-gray-400">Keep notifications on to receive real-time safety alerts.</p>
            </div>
            <div className="p-4 bg-[#1A1A2E] rounded-lg border border-gray-700">
              <AlertTriangle className="w-6 h-6 text-[#DC3545] mb-2" />
              <h4 className="font-semibold text-white mb-1">Emergency Contact</h4>
              <p className="text-sm text-gray-400">Use the SOS button in case of emergencies.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
