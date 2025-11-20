import { AlertTriangle, Clock, MapPin, User, CheckCircle } from 'lucide-react';
import { SOSRequest } from '../../types';

interface SOSMonitorProps {
  requests: SOSRequest[];
}

export function SOSMonitor({ requests }: SOSMonitorProps) {
  const priorityColors = {
    low: 'bg-[#28A745] text-white',
    medium: 'bg-[#FFC107] text-gray-900',
    high: 'bg-[#FF8C00] text-white',
    critical: 'bg-[#DC3545] text-white'
  };

  const statusColors = {
    pending: 'bg-[#FFC107] text-gray-900',
    dispatched: 'bg-[#4A90E2] text-white',
    resolved: 'bg-[#28A745] text-white',
    cancelled: 'bg-gray-600 text-white'
  };

  const sortedRequests = [...requests].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">SOS Emergency Monitor</h2>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#DC3545] rounded-full animate-pulse"></div>
            <span className="text-gray-300">{requests.filter(r => r.status === 'pending').length} Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#4A90E2] rounded-full"></div>
            <span className="text-gray-300">{requests.filter(r => r.status === 'dispatched').length} Dispatched</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {sortedRequests.map((request) => {
          const timeSinceRequest = Math.floor((Date.now() - request.createdAt.getTime()) / 60000);

          return (
            <div key={request.id} className="bg-[#1A1A2E] rounded-lg p-6 border border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${request.priority === 'critical' ? 'bg-[#DC3545] animate-pulse' : 'bg-[#FF8C00]'} bg-opacity-20 rounded-lg flex items-center justify-center`}>
                    <AlertTriangle className={`w-6 h-6 ${request.priority === 'critical' ? 'text-[#DC3545]' : 'text-[#FF8C00]'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{request.userName}</h3>
                    <p className="text-sm text-gray-400">Request ID: {request.id}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityColors[request.priority]}`}>
                    {request.priority.toUpperCase()} PRIORITY
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[request.status]}`}>
                    {request.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {request.description && (
                <div className="mb-4 p-3 bg-[#1B263B] rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-300">{request.description}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Location</p>
                    <p className="text-sm text-white font-medium">
                      {request.latitude.toFixed(4)}, {request.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Time Elapsed</p>
                    <p className="text-sm text-white font-medium">{timeSinceRequest} min ago</p>
                  </div>
                </div>
                {request.respondedBy && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400">Responder</p>
                      <p className="text-sm text-white font-medium">{request.respondedBy}</p>
                    </div>
                  </div>
                )}
              </div>

              {request.status === 'pending' && (
                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 bg-[#00BFFF] hover:bg-[#0099CC] text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Dispatch Unit
                  </button>
                  <button className="flex-1 px-4 py-2 bg-[#28A745] hover:bg-[#218838] text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Mark Resolved
                  </button>
                </div>
              )}

              {request.status === 'dispatched' && request.responseTime && (
                <div className="flex items-center gap-2 p-3 bg-[#4A90E2] bg-opacity-20 rounded-lg border border-[#4A90E2]">
                  <Clock className="w-4 h-4 text-[#4A90E2]" />
                  <p className="text-sm text-white">
                    Unit dispatched at {request.responseTime.toLocaleTimeString()}
                  </p>
                </div>
              )}

              {request.status === 'resolved' && request.resolvedAt && (
                <div className="flex items-center gap-2 p-3 bg-[#28A745] bg-opacity-20 rounded-lg border border-[#28A745]">
                  <CheckCircle className="w-4 h-4 text-[#28A745]" />
                  <p className="text-sm text-white">
                    Resolved at {request.resolvedAt.toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
