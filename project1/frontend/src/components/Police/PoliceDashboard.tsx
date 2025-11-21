import { useState, useEffect } from 'react';
import { AlertTriangle, Users, TrendingUp, MapPin, Clock, FileText, LogOut } from 'lucide-react';
import { CrimeMap } from '../Map/CrimeMap';
import { AnalyticsCharts } from './AnalyticsCharts';
import { PatrolManagement } from './PatrolManagement';
import { SOSMonitor } from './SOSMonitor';
import { generateMockCrimeIncidents, generateMockHotspots, generateMockPatrolPlans, generateMockSOSRequests } from '../../services/mockData';
import { predictHotspots } from '../../services/predictionService';
import { useAuth } from '../../context/AuthContext';
import { CrimeHotspot, CrimeIncident } from '../../types';

type Tab = 'map' | 'analytics' | 'patrols' | 'sos';

export function PoliceDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [incidents, setIncidents] = useState<CrimeIncident[]>([]);
  const [hotspots, setHotspots] = useState<CrimeHotspot[]>([]);
  const [showIncidents, setShowIncidents] = useState(false);

  useEffect(() => {
    const mockIncidents = generateMockCrimeIncidents(500);
    setIncidents(mockIncidents);

    const now = new Date();
    const predicted = predictHotspots(mockIncidents, now.getHours(), now.getDay());
    const mockHotspots = generateMockHotspots(mockIncidents);

    setHotspots([...predicted.slice(0, 3), ...mockHotspots]);
  }, []);

  const criticalHotspots = hotspots.filter(h => h.riskLevel === 'critical').length;
  const highRiskHotspots = hotspots.filter(h => h.riskLevel === 'high').length;
  const totalIncidents = incidents.length;
  const recentIncidents = incidents.filter(i => {
    const hoursDiff = (Date.now() - i.occurredAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  }).length;

  const handleGenerateReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalHotspots: hotspots.length,
        criticalAreas: criticalHotspots,
        highRiskAreas: highRiskHotspots,
        totalIncidents: totalIncidents,
        last24Hours: recentIncidents
      },
      hotspots: hotspots.map(h => ({
        location: `${h.centerLat.toFixed(4)}, ${h.centerLng.toFixed(4)}`,
        riskLevel: h.riskLevel,
        riskScore: h.riskScore,
        predictedCrimes: h.predictedCrimeTypes
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crime-report-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#1A1A2E]">
      <header className="bg-[#1B263B] border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00BFFF] rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Police Command Center</h1>
                <p className="text-sm text-gray-400">Crime Pattern Analysis & Response</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.fullName}</p>
              <p className="text-xs text-gray-400">{user?.badgeNumber} • {user?.department}</p>
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

      <div className="grid grid-cols-4 gap-6 p-6">
        <div className="bg-[#1B263B] rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#DC3545] bg-opacity-20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#DC3545]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{criticalHotspots}</p>
              <p className="text-sm text-gray-400">Critical Hotspots</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1B263B] rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#FF8C00] bg-opacity-20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#FF8C00]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{highRiskHotspots}</p>
              <p className="text-sm text-gray-400">High Risk Areas</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1B263B] rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#4A90E2] bg-opacity-20 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#4A90E2]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{recentIncidents}</p>
              <p className="text-sm text-gray-400">Last 24 Hours</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1B263B] rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#28A745] bg-opacity-20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-[#28A745]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalIncidents}</p>
              <p className="text-sm text-gray-400">Total Incidents</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="bg-[#1B263B] rounded-lg border border-gray-700 overflow-hidden">
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
                  Hotspot Map
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'analytics'
                      ? 'bg-[#00BFFF] text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#1A1A2E]'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab('patrols')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'patrols'
                      ? 'bg-[#00BFFF] text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#1A1A2E]'
                  }`}
                >
                  <Clock className="w-4 h-4 inline mr-2" />
                  Patrol Plans
                </button>
                <button
                  onClick={() => setActiveTab('sos')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'sos'
                      ? 'bg-[#00BFFF] text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#1A1A2E]'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  SOS Monitor
                </button>
              </div>
              <button
                onClick={handleGenerateReport}
                className="px-4 py-2 bg-[#28A745] hover:bg-[#218838] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Generate Report
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'map' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Crime Hotspot Map</h2>
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={showIncidents}
                      onChange={(e) => setShowIncidents(e.target.checked)}
                      className="rounded"
                    />
                    Show Historical Incidents
                  </label>
                </div>
                <div className="h-[600px]">
                  <CrimeMap
                    hotspots={hotspots}
                    userLocation={[12.9716, 77.5946]}
                    incidents={showIncidents ? incidents : []}
                    showIncidents={showIncidents}
                  />
                </div>
                <div className="mt-4 flex gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#28A745]"></div>
                    <span className="text-gray-300">Low Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#FFC107]"></div>
                    <span className="text-gray-300">Moderate Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#FF8C00]"></div>
                    <span className="text-gray-300">High Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#DC3545]"></div>
                    <span className="text-gray-300">Critical Risk</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && <AnalyticsCharts incidents={incidents} hotspots={hotspots} />}
            {activeTab === 'patrols' && <PatrolManagement plans={generateMockPatrolPlans()} hotspots={hotspots} />}
            {activeTab === 'sos' && <SOSMonitor requests={generateMockSOSRequests()} />}
          </div>
        </div>
      </div>
    </div>
  );
}
