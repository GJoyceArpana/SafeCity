import { useState, useEffect } from 'react';
import { AlertTriangle, Users, TrendingUp, MapPin, Clock, FileText, LogOut, Bell } from 'lucide-react';
import { CrimeMap } from '../Map/CrimeMap';
import { AnalyticsCharts } from './AnalyticsCharts';
import { PatrolManagement } from './PatrolManagement';
import { SOSMonitor } from './SOSMonitor';
import { generateMockCrimeIncidents, generateMockHotspots, generateMockPatrolPlans, generateMockSOSRequests } from '../../services/mockData';
import { predictHotspots } from '../../services/predictionService';
import { useAuth } from '../../context/AuthContext';
import { CrimeHotspot, CrimeIncident } from '../../types';

type Tab = 'map' | 'analytics' | 'patrols' | 'sos';

interface SOSAlert {
  alertId: string;
  userId: string;
  userEmail: string;
  userName: string;
  location: {
    lat: number;
    lng: number;
  };
  battery: number;
  nearbyHotspots: number;
  cityRisk: number;
  message: string;
  timestamp: string;
  serverTimestamp?: string;
  status: string;
  responded: boolean;
}

export function PoliceDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [incidents, setIncidents] = useState<CrimeIncident[]>([]);
  const [hotspots, setHotspots] = useState<CrimeHotspot[]>([]);
  const [showIncidents, setShowIncidents] = useState(false);
  const [sosAlerts, setSOSAlerts] = useState<SOSAlert[]>([]);
  const [lastAlertId, setLastAlertId] = useState<string>('');
  const [hasNewAlerts, setHasNewAlerts] = useState(false);

  useEffect(() => {
    const mockIncidents = generateMockCrimeIncidents(500);
    setIncidents(mockIncidents);

    const now = new Date();
    const predicted = predictHotspots(mockIncidents, now.getHours(), now.getDay());
    const mockHotspots = generateMockHotspots(mockIncidents);

    setHotspots([...predicted.slice(0, 3), ...mockHotspots]);
  }, []);

  // Fetch SOS alerts every 10 seconds
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/police/getAlerts');
        const data = await response.json();
        
        if (data.alerts && data.alerts.length > 0) {
          setSOSAlerts(data.alerts);
          
          // Check if there's a new alert
          const latestAlertId = data.alerts[0].alertId;
          if (lastAlertId && latestAlertId !== lastAlertId) {
            setHasNewAlerts(true);
            // Play notification sound if available
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => console.log('Could not play sound'));
          }
          setLastAlertId(latestAlertId);
        }
      } catch (error) {
        console.error('Error fetching SOS alerts:', error);
      }
    };

    // Initial fetch
    fetchAlerts();

    // Poll every 10 seconds
    const interval = setInterval(fetchAlerts, 10000);

    return () => clearInterval(interval);
  }, [lastAlertId]);

  // Clear new alerts badge when viewing SOS tab
  useEffect(() => {
    if (activeTab === 'sos') {
      setHasNewAlerts(false);
    }
  }, [activeTab]);

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
                  className={`px-4 py-2 rounded-lg font-medium transition-colors relative ${
                    activeTab === 'sos'
                      ? 'bg-[#00BFFF] text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#1A1A2E]'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  SOS Monitor
                  {hasNewAlerts && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-ping"></span>
                  )}
                  {hasNewAlerts && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full"></span>
                  )}
                  {sosAlerts.length > 0 && (
                    <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {sosAlerts.length}
                    </span>
                  )}
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
            {activeTab === 'sos' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Bell className="w-6 h-6 text-red-500" />
                    Live SOS Alerts
                  </h2>
                  <p className="text-gray-400 text-sm">Real-time emergency alerts from citizens</p>
                </div>

                {sosAlerts.length === 0 ? (
                  <div className="bg-[#1A1A2E] rounded-lg p-12 text-center">
                    <AlertTriangle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No active SOS alerts</p>
                    <p className="text-gray-500 text-sm mt-2">All clear - monitoring for emergencies</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sosAlerts.map((alert) => (
                      <div
                        key={alert.alertId}
                        className="bg-[#1A1A2E] rounded-lg p-6 border-l-4 border-red-600 hover:bg-[#1A1A2E]/80 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h3 className="text-white font-semibold">{alert.userName}</h3>
                                <p className="text-gray-400 text-sm">{alert.userEmail}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                alert.cityRisk > 70 ? 'bg-red-600 text-white' :
                                alert.cityRisk > 50 ? 'bg-orange-600 text-white' :
                                'bg-yellow-600 text-white'
                              }`}>
                                Risk: {alert.cityRisk.toFixed(1)}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-gray-500 text-xs mb-1">Location</p>
                                <p className="text-white text-sm font-mono">
                                  📍 {alert.location.lat.toFixed(6)}, {alert.location.lng.toFixed(6)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs mb-1">Time</p>
                                <p className="text-white text-sm">
                                  {new Date(alert.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs mb-1">Battery</p>
                                <p className={`text-sm font-medium ${
                                  alert.battery > 20 ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  🔋 {alert.battery}%
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs mb-1">Nearby Hotspots</p>
                                <p className="text-white text-sm">
                                  🔴 {alert.nearbyHotspots} within 500m
                                </p>
                              </div>
                            </div>

                            <div className="bg-[#1B263B] rounded-lg p-3">
                              <p className="text-gray-400 text-sm">{alert.message}</p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              onClick={() => {
                                // Open location in map
                                window.open(
                                  `https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`,
                                  '_blank'
                                );
                              }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              Open Map
                            </button>
                            <button
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              Respond
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Also show legacy SOS Monitor */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-white mb-4">Historical SOS Requests</h3>
                  <SOSMonitor requests={generateMockSOSRequests()} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
