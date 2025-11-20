import { Clock, MapPin, User, CheckCircle, XCircle } from 'lucide-react';
import { PatrolPlan, CrimeHotspot } from '../../types';

interface PatrolManagementProps {
  plans: PatrolPlan[];
  hotspots: CrimeHotspot[];
}

export function PatrolManagement({ plans, hotspots }: PatrolManagementProps) {
  const statusColors = {
    pending: 'bg-[#FFC107] text-gray-900',
    active: 'bg-[#28A745] text-white',
    completed: 'bg-[#4A90E2] text-white',
    cancelled: 'bg-gray-600 text-white'
  };

  const statusIcons = {
    pending: Clock,
    active: MapPin,
    completed: CheckCircle,
    cancelled: XCircle
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Patrol Management</h2>
        <button className="px-4 py-2 bg-[#00BFFF] hover:bg-[#0099CC] text-white rounded-lg font-medium transition-colors">
          Create New Patrol
        </button>
      </div>

      <div className="grid gap-4">
        {plans.map((plan) => {
          const StatusIcon = statusIcons[plan.status];
          const hotspot = hotspots.find(h => h.id === plan.hotspotId);

          return (
            <div key={plan.id} className="bg-[#1A1A2E] rounded-lg p-6 border border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#00BFFF] bg-opacity-20 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-[#00BFFF]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{plan.officerName}</h3>
                    <p className="text-sm text-gray-400">Patrol ID: {plan.id}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${statusColors[plan.status]}`}>
                  <StatusIcon className="w-3 h-3" />
                  {plan.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Patrol Start</p>
                  <p className="text-white font-medium">{plan.patrolStart.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Patrol End</p>
                  <p className="text-white font-medium">{plan.patrolEnd.toLocaleString()}</p>
                </div>
              </div>

              {hotspot && (
                <div className="bg-[#1B263B] rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-white">Target Hotspot</p>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      hotspot.riskLevel === 'critical' ? 'bg-[#DC3545] text-white' :
                      hotspot.riskLevel === 'high' ? 'bg-[#FF8C00] text-white' :
                      hotspot.riskLevel === 'moderate' ? 'bg-[#FFC107] text-gray-900' :
                      'bg-[#28A745] text-white'
                    }`}>
                      {hotspot.riskLevel.toUpperCase()} RISK
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 mb-1">Location</p>
                      <p className="text-white">{hotspot.centerLat.toFixed(4)}, {hotspot.centerLng.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Risk Score</p>
                      <p className="text-white font-semibold">{hotspot.riskScore}/100</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Radius</p>
                      <p className="text-white">{hotspot.radiusMeters}m</p>
                    </div>
                  </div>
                </div>
              )}

              {plan.notes && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-1">Notes</p>
                  <p className="text-white">{plan.notes}</p>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button className="flex-1 px-4 py-2 bg-[#28A745] hover:bg-[#218838] text-white rounded-lg text-sm font-medium transition-colors">
                  View Details
                </button>
                <button className="flex-1 px-4 py-2 bg-[#4A90E2] hover:bg-[#3A7BC8] text-white rounded-lg text-sm font-medium transition-colors">
                  Update Status
                </button>
                {plan.status === 'pending' && (
                  <button className="px-4 py-2 bg-[#DC3545] hover:bg-[#C82333] text-white rounded-lg text-sm font-medium transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
