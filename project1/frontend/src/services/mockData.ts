import { CrimeIncident, CrimeHotspot, PatrolPlan, SafetyAlert, SOSRequest } from '../types';

const MUMBAI_CENTER = { lat: 19.0760, lng: 72.8777 };

const incidentTypes = ['violent', 'property', 'disorder', 'traffic', 'other'] as const;
const severities = ['low', 'medium', 'high', 'critical'] as const;
const weatherConditions = ['clear', 'rain', 'cloudy', 'fog'];

function generateRandomLocation(center: { lat: number; lng: number }, radiusKm: number) {
  const radiusInDegrees = radiusKm / 111;
  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);

  return {
    lat: center.lat + x,
    lng: center.lng + y
  };
}

export function generateMockCrimeIncidents(count: number = 500): CrimeIncident[] {
  const incidents: CrimeIncident[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const occurredAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    occurredAt.setHours(Math.floor(Math.random() * 24));
    occurredAt.setMinutes(Math.floor(Math.random() * 60));

    const location = generateRandomLocation(MUMBAI_CENTER, 15);

    incidents.push({
      id: `incident-${i}`,
      incidentType: incidentTypes[Math.floor(Math.random() * incidentTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      latitude: location.lat,
      longitude: location.lng,
      locationDescription: `Location ${i}`,
      occurredAt,
      reportedAt: new Date(occurredAt.getTime() + Math.random() * 3600000),
      weatherCondition: weatherConditions[Math.floor(Math.random() * weatherConditions.length)],
      temperature: 20 + Math.random() * 15,
      dayOfWeek: occurredAt.getDay(),
      hourOfDay: occurredAt.getHours(),
      arrestMade: Math.random() > 0.7
    });
  }

  return incidents;
}

export function generateMockHotspots(incidents: CrimeIncident[]): CrimeHotspot[] {
  const hotspots: CrimeHotspot[] = [];
  const now = new Date();

  const clusterCenters = [
    { lat: 19.0760, lng: 72.8777 },
    { lat: 19.1136, lng: 72.8697 },
    { lat: 19.0330, lng: 72.8560 },
    { lat: 19.0896, lng: 72.9150 },
    { lat: 19.0520, lng: 72.8330 }
  ];

  clusterCenters.forEach((center, i) => {
    const riskScore = 30 + Math.random() * 70;
    let riskLevel: 'low' | 'moderate' | 'high' | 'critical';

    if (riskScore < 40) riskLevel = 'low';
    else if (riskScore < 60) riskLevel = 'moderate';
    else if (riskScore < 80) riskLevel = 'high';
    else riskLevel = 'critical';

    const activeFrom = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
    const activeUntil = new Date(activeFrom.getTime() + (6 + Math.random() * 18) * 60 * 60 * 1000);

    hotspots.push({
      id: `hotspot-${i}`,
      centerLat: center.lat,
      centerLng: center.lng,
      radiusMeters: 300 + Math.random() * 700,
      riskScore,
      riskLevel,
      predictedCrimeTypes: incidentTypes.slice(0, 2 + Math.floor(Math.random() * 3)),
      activeFrom,
      activeUntil,
      confidence: 0.6 + Math.random() * 0.35,
      factors: {
        historicalCrimes: Math.floor(Math.random() * 50) + 10,
        weatherImpact: Math.random(),
        timeOfDay: Math.random(),
        dayOfWeek: Math.random()
      }
    });
  });

  return hotspots;
}

export function generateMockPatrolPlans(): PatrolPlan[] {
  const plans: PatrolPlan[] = [];
  const now = new Date();
  const officers = [
    { id: 'off-1', name: 'Officer Singh' },
    { id: 'off-2', name: 'Officer Patel' },
    { id: 'off-3', name: 'Officer Kumar' },
    { id: 'off-4', name: 'Officer Sharma' }
  ];

  officers.forEach((officer, i) => {
    const start = new Date(now.getTime() + i * 4 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);

    plans.push({
      id: `patrol-${i}`,
      officerId: officer.id,
      officerName: officer.name,
      hotspotId: `hotspot-${i % 5}`,
      patrolStart: start,
      patrolEnd: end,
      status: i === 0 ? 'active' : 'pending',
      route: [],
      notes: `Patrol area ${i + 1}`
    });
  });

  return plans;
}

export function generateMockAlerts(): SafetyAlert[] {
  const now = new Date();

  return [
    {
      id: 'alert-1',
      alertType: 'hotspot_warning',
      severity: 'danger',
      title: 'High Crime Risk Area',
      message: 'Elevated crime activity detected in South Mumbai. Avoid late night travel.',
      latitude: 19.0760,
      longitude: 72.8777,
      radiusMeters: 1000,
      activeFrom: now,
      activeUntil: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      targetAudience: 'all'
    },
    {
      id: 'alert-2',
      alertType: 'patrol_update',
      severity: 'info',
      title: 'Increased Patrol',
      message: 'Additional patrol units deployed in Bandra area.',
      latitude: 19.0596,
      longitude: 72.8295,
      radiusMeters: 2000,
      activeFrom: now,
      activeUntil: new Date(now.getTime() + 6 * 60 * 60 * 1000),
      targetAudience: 'all'
    }
  ];
}

export function generateMockSOSRequests(): SOSRequest[] {
  const now = new Date();

  return [
    {
      id: 'sos-1',
      userId: 'user-1',
      userName: 'Priya Sharma',
      latitude: 19.0760,
      longitude: 72.8777,
      status: 'pending',
      priority: 'critical',
      description: 'Suspicious activity nearby',
      createdAt: new Date(now.getTime() - 5 * 60 * 1000)
    },
    {
      id: 'sos-2',
      userId: 'user-2',
      userName: 'Raj Kumar',
      latitude: 19.0520,
      longitude: 72.8330,
      status: 'dispatched',
      priority: 'high',
      description: 'Vehicle breakdown in unsafe area',
      respondedBy: 'Officer Singh',
      responseTime: new Date(now.getTime() - 3 * 60 * 1000),
      createdAt: new Date(now.getTime() - 8 * 60 * 1000)
    }
  ];
}
