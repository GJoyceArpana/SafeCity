import { CrimeIncident, CrimeHotspot } from '../types';

interface ClusterPoint {
  lat: number;
  lng: number;
  incidents: CrimeIncident[];
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function performDBSCAN(incidents: CrimeIncident[], epsilon: number = 0.5, minPoints: number = 10): ClusterPoint[] {
  const clusters: ClusterPoint[] = [];
  const visited = new Set<string>();
  const clustered = new Set<string>();

  incidents.forEach(incident => {
    if (visited.has(incident.id)) return;
    visited.add(incident.id);

    const neighbors = incidents.filter(other =>
      calculateDistance(incident.latitude, incident.longitude, other.latitude, other.longitude) <= epsilon
    );

    if (neighbors.length >= minPoints) {
      const clusterIncidents: CrimeIncident[] = [];
      const queue = [...neighbors];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (clustered.has(current.id)) continue;
        clustered.add(current.id);
        clusterIncidents.push(current);

        const currentNeighbors = incidents.filter(other =>
          calculateDistance(current.latitude, current.longitude, other.latitude, other.longitude) <= epsilon
        );

        if (currentNeighbors.length >= minPoints) {
          currentNeighbors.forEach(n => {
            if (!visited.has(n.id)) {
              visited.add(n.id);
              queue.push(n);
            }
          });
        }
      }

      if (clusterIncidents.length > 0) {
        const avgLat = clusterIncidents.reduce((sum, i) => sum + i.latitude, 0) / clusterIncidents.length;
        const avgLng = clusterIncidents.reduce((sum, i) => sum + i.longitude, 0) / clusterIncidents.length;

        clusters.push({
          lat: avgLat,
          lng: avgLng,
          incidents: clusterIncidents
        });
      }
    }
  });

  return clusters;
}

export function predictHotspots(incidents: CrimeIncident[], currentHour: number, currentDay: number): CrimeHotspot[] {
  const recentIncidents = incidents.filter(incident => {
    const daysDiff = (Date.now() - incident.occurredAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
  });

  const clusters = performDBSCAN(recentIncidents, 0.5, 8);

  return clusters.map((cluster, index) => {
    const severityScores = {
      low: 10,
      medium: 30,
      high: 60,
      critical: 100
    };

    const baseRiskScore = cluster.incidents.reduce((sum, inc) =>
      sum + severityScores[inc.severity], 0
    ) / cluster.incidents.length;

    const timeMatchScore = cluster.incidents.filter(inc =>
      Math.abs(inc.hourOfDay - currentHour) <= 2
    ).length / cluster.incidents.length;

    const dayMatchScore = cluster.incidents.filter(inc =>
      inc.dayOfWeek === currentDay
    ).length / cluster.incidents.length;

    const weatherImpactScore = cluster.incidents.filter(inc =>
      inc.weatherCondition === 'rain' || inc.weatherCondition === 'fog'
    ).length / cluster.incidents.length;

    const finalRiskScore = Math.min(100,
      baseRiskScore * 0.5 +
      timeMatchScore * 25 +
      dayMatchScore * 15 +
      weatherImpactScore * 10
    );

    let riskLevel: 'low' | 'moderate' | 'high' | 'critical';
    if (finalRiskScore < 40) riskLevel = 'low';
    else if (finalRiskScore < 60) riskLevel = 'moderate';
    else if (finalRiskScore < 80) riskLevel = 'high';
    else riskLevel = 'critical';

    const crimeTypeCounts = cluster.incidents.reduce((acc, inc) => {
      acc[inc.incidentType] = (acc[inc.incidentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const predictedTypes = Object.entries(crimeTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    const now = new Date();
    const activeFrom = new Date(now.getTime());
    const activeUntil = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    return {
      id: `predicted-hotspot-${index}`,
      centerLat: cluster.lat,
      centerLng: cluster.lng,
      radiusMeters: 500,
      riskScore: Math.round(finalRiskScore),
      riskLevel,
      predictedCrimeTypes: predictedTypes,
      activeFrom,
      activeUntil,
      confidence: 0.7 + (cluster.incidents.length / 100) * 0.3,
      factors: {
        historicalCrimes: cluster.incidents.length,
        weatherImpact: weatherImpactScore,
        timeOfDay: timeMatchScore,
        dayOfWeek: dayMatchScore
      }
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
}

export function calculateRiskForLocation(
  lat: number,
  lng: number,
  hotspots: CrimeHotspot[]
): { riskLevel: 'low' | 'moderate' | 'high' | 'critical'; nearestHotspot?: CrimeHotspot } {
  let maxRisk = 0;
  let nearestHotspot: CrimeHotspot | undefined;

  hotspots.forEach(hotspot => {
    const distance = calculateDistance(lat, lng, hotspot.centerLat, hotspot.centerLng);
    const radiusKm = hotspot.radiusMeters / 1000;

    if (distance <= radiusKm) {
      const decay = 1 - (distance / radiusKm);
      const effectiveRisk = hotspot.riskScore * decay;

      if (effectiveRisk > maxRisk) {
        maxRisk = effectiveRisk;
        nearestHotspot = hotspot;
      }
    }
  });

  let riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  if (maxRisk < 40) riskLevel = 'low';
  else if (maxRisk < 60) riskLevel = 'moderate';
  else if (maxRisk < 80) riskLevel = 'high';
  else riskLevel = 'critical';

  return { riskLevel, nearestHotspot };
}
