export type UserRole = 'police' | 'citizen';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  badgeNumber?: string;
  department?: string;
}

export interface CrimeIncident {
  id: string;
  incidentType: 'violent' | 'property' | 'disorder' | 'traffic' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  latitude: number;
  longitude: number;
  locationDescription: string;
  occurredAt: Date;
  reportedAt: Date;
  weatherCondition?: string;
  temperature?: number;
  dayOfWeek: number;
  hourOfDay: number;
  arrestMade: boolean;
}

export interface CrimeHotspot {
  id: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  riskScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  predictedCrimeTypes: string[];
  activeFrom: Date;
  activeUntil: Date;
  confidence: number;
  factors: {
    historicalCrimes: number;
    weatherImpact: number;
    timeOfDay: number;
    dayOfWeek: number;
  };
}

export interface PatrolPlan {
  id: string;
  officerId: string;
  officerName: string;
  hotspotId?: string;
  patrolStart: Date;
  patrolEnd: Date;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  route: Array<{ lat: number; lng: number }>;
  notes?: string;
}

export interface SafetyAlert {
  id: string;
  alertType: 'hotspot_warning' | 'sos' | 'patrol_update' | 'general';
  severity: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  latitude?: number;
  longitude?: number;
  radiusMeters: number;
  activeFrom: Date;
  activeUntil: Date;
  targetAudience: 'all' | 'police' | 'citizens';
}

export interface SOSRequest {
  id: string;
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'dispatched' | 'resolved' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  respondedBy?: string;
  responseTime?: Date;
  resolvedAt?: Date;
  createdAt: Date;
}
