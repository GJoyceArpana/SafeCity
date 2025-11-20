import { Navigation, MapPin, Clock, TrendingUp } from 'lucide-react';
import { CrimeHotspot } from '../../types';

interface SafeRoutesProps {
  hotspots: CrimeHotspot[];
  userLocation: [number, number];
}

interface Route {
  id: string;
  name: string;
  destination: string;
  distance: string;
  estimatedTime: string;
  safetyScore: number;
  avoidedHotspots: number;
}

export function SafeRoutes({ hotspots, userLocation }: SafeRoutesProps) {
  const mockRoutes: Route[] = [
    {
      id: 'route-1',
      name: 'Main Highway Route',
      destination: 'Bandra West',
      distance: '8.5 km',
      estimatedTime: '22 min',
      safetyScore: 95,
      avoidedHotspots: 3
    },
    {
      id: 'route-2',
      name: 'Coastal Road',
      destination: 'Bandra West',
      distance: '9.2 km',
      estimatedTime: '25 min',
      safetyScore: 88,
      avoidedHotspots: 2
    },
    {
      id: 'route-3',
      name: 'Inner City Route',
      destination: 'Bandra West',
      distance: '7.8 km',
      estimatedTime: '28 min',
      safetyScore: 72,
      avoidedHotspots: 1
    }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-[#28A745]';
    if (score >= 75) return 'text-[#FFC107]';
    return 'text-[#FF8C00]';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-[#28A745]';
    if (score >= 75) return 'bg-[#FFC107]';
    return 'bg-[#FF8C00]';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Recommended Safe Routes</h2>
        <button className="px-4 py-2 bg-[#00BFFF] hover:bg-[#0099CC] text-white rounded-lg font-medium transition-colors">
          Set Destination
        </button>
      </div>

      <div className="bg-[#1A1A2E] rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="w-5 h-5 text-[#00BFFF]" />
          <div>
            <p className="text-sm text-gray-400">Current Location</p>
            <p className="text-white font-medium">
              {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter destination address..."
            className="flex-1 px-4 py-2 bg-[#1B263B] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00BFFF] focus:border-transparent"
          />
          <button className="px-6 py-2 bg-[#28A745] hover:bg-[#218838] text-white rounded-lg font-medium transition-colors">
            Find Routes
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {mockRoutes.map((route, index) => (
          <div key={route.id} className="bg-[#1A1A2E] rounded-lg p-6 border border-gray-700 hover:border-[#00BFFF] transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${index === 0 ? 'bg-[#28A745]' : 'bg-[#00BFFF]'} bg-opacity-20 rounded-lg flex items-center justify-center`}>
                  <Navigation className={`w-6 h-6 ${index === 0 ? 'text-[#28A745]' : 'text-[#00BFFF]'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">{route.name}</h3>
                  <p className="text-sm text-gray-400">{route.destination}</p>
                  {index === 0 && (
                    <span className="inline-block mt-2 px-2 py-1 bg-[#28A745] text-white text-xs font-semibold rounded">
                      RECOMMENDED
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${getScoreColor(route.safetyScore)}`}>
                  {route.safetyScore}
                </div>
                <p className="text-xs text-gray-400">Safety Score</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Distance</p>
                  <p className="text-sm text-white font-medium">{route.distance}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Est. Time</p>
                  <p className="text-sm text-white font-medium">{route.estimatedTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Avoided Risks</p>
                  <p className="text-sm text-white font-medium">{route.avoidedHotspots} hotspots</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Safety Rating</span>
                <span className="text-xs text-gray-400">{route.safetyScore}%</span>
              </div>
              <div className="w-full bg-[#1B263B] rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getScoreBg(route.safetyScore)}`}
                  style={{ width: `${route.safetyScore}%` }}
                ></div>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 px-4 py-2 bg-[#00BFFF] hover:bg-[#0099CC] text-white rounded-lg text-sm font-medium transition-colors">
                Start Navigation
              </button>
              <button className="px-4 py-2 bg-[#1B263B] hover:bg-[#1A1A2E] text-white border border-gray-700 rounded-lg text-sm font-medium transition-colors">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#1A1A2E] rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Route Safety Features</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#28A745] bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Navigation className="w-4 h-4 text-[#28A745]" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-1">Hotspot Avoidance</h4>
              <p className="text-xs text-gray-400">Routes avoid high-crime areas automatically</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#4A90E2] bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-[#4A90E2]" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-1">Real-time Updates</h4>
              <p className="text-xs text-gray-400">Routes adjust based on current risk levels</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#FFC107] bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-[#FFC107]" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-1">Well-lit Paths</h4>
              <p className="text-xs text-gray-400">Prioritizes well-lit, populated routes</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#00BFFF] bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-[#00BFFF]" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-1">Safety Score</h4>
              <p className="text-xs text-gray-400">AI-calculated safety rating for each route</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
