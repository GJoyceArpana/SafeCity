import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CrimeIncident, CrimeHotspot } from '../../types';

interface AnalyticsChartsProps {
  incidents: CrimeIncident[];
  hotspots: CrimeHotspot[];
}

const COLORS = {
  violent: '#FF4136',
  property: '#FF8C00',
  disorder: '#8A2BE2',
  traffic: '#4A90E2',
  other: '#B0BEC5'
};

export function AnalyticsCharts({ incidents, hotspots }: AnalyticsChartsProps) {
  const crimeTypeData = Object.entries(
    incidents.reduce((acc, inc) => {
      acc[inc.incidentType] = (acc[inc.incidentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const severityData = Object.entries(
    incidents.reduce((acc, inc) => {
      acc[inc.severity] = (acc[inc.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const count = incidents.filter(inc => inc.hourOfDay === hour).length;
    return { hour: `${hour}:00`, incidents: count };
  });

  const dailyData = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
    const count = incidents.filter(inc => inc.dayOfWeek === index).length;
    return { day, incidents: count };
  });

  const monthlyData = Array.from({ length: 12 }, (_, month) => {
    const count = incidents.filter(inc => inc.occurredAt.getMonth() === month).length;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return { month: monthNames[month], incidents: count };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#1A1A2E] rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Crime Types Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={crimeTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {crimeTypeData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1B263B', border: '1px solid #374151', color: '#F0F0F0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1A1A2E] rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Severity Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={severityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#B0BEC5" />
              <YAxis stroke="#B0BEC5" />
              <Tooltip contentStyle={{ backgroundColor: '#1B263B', border: '1px solid #374151', color: '#F0F0F0' }} />
              <Bar dataKey="value" fill="#00BFFF" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#1A1A2E] rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Hourly Crime Pattern</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="hour" stroke="#B0BEC5" />
            <YAxis stroke="#B0BEC5" />
            <Tooltip contentStyle={{ backgroundColor: '#1B263B', border: '1px solid #374151', color: '#F0F0F0' }} />
            <Legend />
            <Line type="monotone" dataKey="incidents" stroke="#00BFFF" strokeWidth={2} dot={{ fill: '#00BFFF' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#1A1A2E] rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Day of Week Pattern</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#B0BEC5" />
              <YAxis stroke="#B0BEC5" />
              <Tooltip contentStyle={{ backgroundColor: '#1B263B', border: '1px solid #374151', color: '#F0F0F0' }} />
              <Bar dataKey="incidents" fill="#28A745" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1A1A2E] rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#B0BEC5" />
              <YAxis stroke="#B0BEC5" />
              <Tooltip contentStyle={{ backgroundColor: '#1B263B', border: '1px solid #374151', color: '#F0F0F0' }} />
              <Line type="monotone" dataKey="incidents" stroke="#FF8C00" strokeWidth={2} dot={{ fill: '#FF8C00' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#1A1A2E] rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Hotspot Risk Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="pb-3 text-sm font-semibold text-gray-400">Location</th>
                <th className="pb-3 text-sm font-semibold text-gray-400">Risk Level</th>
                <th className="pb-3 text-sm font-semibold text-gray-400">Risk Score</th>
                <th className="pb-3 text-sm font-semibold text-gray-400">Confidence</th>
                <th className="pb-3 text-sm font-semibold text-gray-400">Historical Crimes</th>
                <th className="pb-3 text-sm font-semibold text-gray-400">Predicted Types</th>
              </tr>
            </thead>
            <tbody>
              {hotspots.slice(0, 10).map((hotspot) => (
                <tr key={hotspot.id} className="border-b border-gray-800">
                  <td className="py-3 text-sm text-gray-300">
                    {hotspot.centerLat.toFixed(4)}, {hotspot.centerLng.toFixed(4)}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      hotspot.riskLevel === 'critical' ? 'bg-[#DC3545] text-white' :
                      hotspot.riskLevel === 'high' ? 'bg-[#FF8C00] text-white' :
                      hotspot.riskLevel === 'moderate' ? 'bg-[#FFC107] text-gray-900' :
                      'bg-[#28A745] text-white'
                    }`}>
                      {hotspot.riskLevel.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-gray-300">{hotspot.riskScore}/100</td>
                  <td className="py-3 text-sm text-gray-300">{(hotspot.confidence * 100).toFixed(0)}%</td>
                  <td className="py-3 text-sm text-gray-300">{hotspot.factors.historicalCrimes}</td>
                  <td className="py-3 text-sm text-gray-300">
                    {hotspot.predictedCrimeTypes.slice(0, 2).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
