import { AlertTriangle, Info, Shield, Clock } from 'lucide-react';
import { SafetyAlert } from '../../types';

interface SafetyAlertsProps {
  alerts: SafetyAlert[];
}

export function SafetyAlerts({ alerts }: SafetyAlertsProps) {
  const severityConfig = {
    info: {
      icon: Info,
      bg: 'bg-[#4A90E2]',
      border: 'border-[#4A90E2]',
      text: 'text-[#4A90E2]'
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-[#FFC107]',
      border: 'border-[#FFC107]',
      text: 'text-[#FFC107]'
    },
    danger: {
      icon: Shield,
      bg: 'bg-[#DC3545]',
      border: 'border-[#DC3545]',
      text: 'text-[#DC3545]'
    }
  };

  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { danger: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Safety Alerts</h2>
        <p className="text-sm text-gray-400">{alerts.length} active alerts</p>
      </div>

      {sortedAlerts.length === 0 ? (
        <div className="bg-[#1A1A2E] rounded-lg p-12 border border-gray-700 text-center">
          <Shield className="w-16 h-16 text-[#28A745] mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">All Clear</h3>
          <p className="text-gray-400">No active safety alerts in your area</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAlerts.map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;
            const timeRemaining = Math.floor((alert.activeUntil.getTime() - Date.now()) / (1000 * 60 * 60));

            return (
              <div
                key={alert.id}
                className={`bg-[#1A1A2E] rounded-lg p-6 border-2 ${config.border}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${config.bg} bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${config.text}`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">{alert.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${config.bg} ${alert.severity === 'warning' ? 'text-gray-900' : 'text-white'}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                      {alert.latitude && alert.longitude && (
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Location</p>
                          <p className="text-sm text-white font-mono">
                            {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                          </p>
                        </div>
                      )}
                    </div>

                    <p className="text-gray-300 mb-4">{alert.message}</p>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400">
                          Active for {timeRemaining > 0 ? `${timeRemaining} more hours` : 'less than 1 hour'}
                        </span>
                      </div>
                      {alert.radiusMeters && (
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-400">
                            Affected area: {alert.radiusMeters}m radius
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button className="px-4 py-2 bg-[#00BFFF] hover:bg-[#0099CC] text-white rounded-lg text-sm font-medium transition-colors">
                        View on Map
                      </button>
                      <button className="px-4 py-2 bg-[#1B263B] hover:bg-[#1A1A2E] text-white border border-gray-700 rounded-lg text-sm font-medium transition-colors">
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-[#1A1A2E] rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Alert Settings</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-[#1B263B] rounded-lg border border-gray-700 cursor-pointer hover:bg-opacity-80 transition-colors">
            <span className="text-white">Push Notifications</span>
            <input type="checkbox" defaultChecked className="w-5 h-5" />
          </label>
          <label className="flex items-center justify-between p-3 bg-[#1B263B] rounded-lg border border-gray-700 cursor-pointer hover:bg-opacity-80 transition-colors">
            <span className="text-white">Email Alerts</span>
            <input type="checkbox" className="w-5 h-5" />
          </label>
          <label className="flex items-center justify-between p-3 bg-[#1B263B] rounded-lg border border-gray-700 cursor-pointer hover:bg-opacity-80 transition-colors">
            <span className="text-white">SMS Notifications</span>
            <input type="checkbox" className="w-5 h-5" />
          </label>
        </div>
      </div>
    </div>
  );
}
