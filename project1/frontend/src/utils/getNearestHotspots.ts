// frontend/src/utils/getNearestHotspots.ts

interface Hotspot {
  lat: number;
  lng: number;
  riskScore?: number;
  crimeCount?: number;
}

interface HotspotDistance {
  hotspot: Hotspot;
  distance: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of point 1
 * @param lng1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lng2 - Longitude of point 2
 * @returns Distance in meters
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Get hotspots within a specified radius
 * @param userLat - User's latitude
 * @param userLng - User's longitude
 * @param hotspots - Array of hotspot objects
 * @param radiusMeters - Radius in meters (default: 500m)
 * @returns Count of hotspots within radius
 */
export function getNearestHotspotsCount(
  userLat: number,
  userLng: number,
  hotspots: Hotspot[],
  radiusMeters: number = 500
): number {
  return hotspots.filter((hotspot) => {
    const distance = haversineDistance(userLat, userLng, hotspot.lat, hotspot.lng);
    return distance <= radiusMeters;
  }).length;
}

/**
 * Get detailed list of nearby hotspots with distances
 * @param userLat - User's latitude
 * @param userLng - User's longitude
 * @param hotspots - Array of hotspot objects
 * @param radiusMeters - Radius in meters (default: 500m)
 * @param limit - Maximum number of hotspots to return (default: 10)
 * @returns Array of hotspots with distances, sorted by proximity
 */
export function getNearestHotspots(
  userLat: number,
  userLng: number,
  hotspots: Hotspot[],
  radiusMeters: number = 500,
  limit: number = 10
): HotspotDistance[] {
  const hotspotsWithDistance: HotspotDistance[] = hotspots
    .map((hotspot) => ({
      hotspot,
      distance: haversineDistance(userLat, userLng, hotspot.lat, hotspot.lng),
    }))
    .filter((item) => item.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  return hotspotsWithDistance;
}

/**
 * Format distance for display
 * @param meters - Distance in meters
 * @returns Formatted string (e.g., "250m" or "1.2km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Calculate total risk score from nearby hotspots
 * @param userLat - User's latitude
 * @param userLng - User's longitude
 * @param hotspots - Array of hotspot objects with riskScore
 * @param radiusMeters - Radius in meters (default: 500m)
 * @returns Total risk score (sum of all nearby hotspot risks)
 */
export function calculateProximityRisk(
  userLat: number,
  userLng: number,
  hotspots: Hotspot[],
  radiusMeters: number = 500
): number {
  const nearbyHotspots = getNearestHotspots(userLat, userLng, hotspots, radiusMeters);
  
  return nearbyHotspots.reduce((total, item) => {
    const riskScore = item.hotspot.riskScore || item.hotspot.crimeCount || 0;
    // Weight risk by proximity (closer = more dangerous)
    const proximityFactor = 1 - (item.distance / radiusMeters);
    return total + (riskScore * proximityFactor);
  }, 0);
}

/**
 * Get the closest hotspot to user location
 * @param userLat - User's latitude
 * @param userLng - User's longitude
 * @param hotspots - Array of hotspot objects
 * @returns Closest hotspot with distance, or null if no hotspots
 */
export function getClosestHotspot(
  userLat: number,
  userLng: number,
  hotspots: Hotspot[]
): HotspotDistance | null {
  if (hotspots.length === 0) return null;

  const hotspotsWithDistance = hotspots.map((hotspot) => ({
    hotspot,
    distance: haversineDistance(userLat, userLng, hotspot.lat, hotspot.lng),
  }));

  return hotspotsWithDistance.reduce((closest, current) =>
    current.distance < closest.distance ? current : closest
  );
}
