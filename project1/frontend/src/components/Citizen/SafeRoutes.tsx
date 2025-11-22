// frontend/src/components/Citizen/SafeRoutes.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  DirectionsRenderer,
  useLoadScript,
} from "@react-google-maps/api";

// --- TYPES ---
interface Hotspot {
  lat: number;
  lng: number;
  radius: number;
  intensity: number;
}
interface RoutePoint {
  lat: number;
  lng: number;
}
interface SafeRoutesProps {
  userLocation: [number, number];
  // optional external hotspots provided by parent (normalized to Hotspot shape)
  hotspots?: Hotspot[];
}
interface BackendRouteResponse {
  polyline: string;
  points: RoutePoint[];
  risk_score: number;
  avoided_hotspots: number;
}

const mapOptions: google.maps.MapOptions = { disableDefaultUI: false, zoomControl: true };
const mapContainerStyle = { width: "100%", height: "550px", borderRadius: "10px" };

// --- HELPER: Geocode Place Name to LatLng ---
async function geocodePlace(place: string, isLoaded: boolean): Promise<RoutePoint> {
  if (!isLoaded || !window.google) throw new Error("Maps API not loaded");
  return new Promise<RoutePoint>((resolve, reject) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: place, componentRestrictions: { country: 'IN' } }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else {
        reject(new Error(`Geocode failed for '${place}': ${status}`));
      }
    });
  });
}

// --- HELPER: Call Backend A* SafeRoute ---
async function callBackendSafeRoute(start: RoutePoint, end: RoutePoint): Promise<RoutePoint[]> {
  const [sLat, sLng] = [start.lat, start.lng];
  const [eLat, eLng] = [end.lat, end.lng];

  const res = await fetch("http://127.0.0.1:8000/api/routing/safeRoute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start: [sLat, sLng], end: [eLat, eLng] }),
  });

  const data = await res.json().catch(() => ({}));
  // Accept multiple possible backend shapes:
  // 1) { route: { points: [{lat, lng}, ...] } }
  // 2) { route: { points: [[lat, lng], ...] } }
  const pts = data?.route?.points;
  if (!res.ok || !pts || !Array.isArray(pts)) {
    throw new Error("Backend A* route failed: " + (data?.detail || "No points array returned"));
  }

  // If backend returns arrays like [lat, lng], convert to objects
  if (pts.length > 0 && Array.isArray(pts[0])) {
    return pts.map((p: any) => ({ lat: Number(p[0]), lng: Number(p[1]) }));
  }

  // If backend returns objects with lat/lng already
  if (pts.length === 0) return [];
  if (typeof pts[0] === "object" && ("lat" in pts[0] || "latitude" in pts[0])) {
    return pts.map((p: any) => ({ lat: Number(p.lat ?? p.latitude), lng: Number(p.lng ?? p.longitude) }));
  }

  throw new Error("Backend A* route returned unknown points format");
}


export default function SafeRoutes({ userLocation, hotspots: externalHotspots }: SafeRoutesProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["geometry", "places"], // Need 'places' for better geocoding/autocomplete
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [originName, setOriginName] = useState<string>("");
  const [destinationName, setDestinationName] = useState<string>("");

  const [originPos, setOriginPos] = useState<RoutePoint | null>(null);
  const [destPos, setDestPos] = useState<RoutePoint | null>(null);
  const [userCurrentLocation, setUserCurrentLocation] = useState<RoutePoint | null>(null);
  const [locationError, setLocationError] = useState<string>("");

  const [safeRoute, setSafeRoute] = useState<RoutePoint[]>([]);
  const [googleRoute, setGoogleRoute] = useState<google.maps.DirectionsResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Get user's current location on component mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserCurrentLocation(userLoc);
          setLocationError("");
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError("Unable to get your location. Please enable location services.");
          // Fallback to Bangalore center
          setUserCurrentLocation({ lat: 12.9716, lng: 77.5946 });
        }
      );
    } else {
      setLocationError("Geolocation not supported by your browser.");
      setUserCurrentLocation({ lat: 12.9716, lng: 77.5946 });
    }
  }, []);

  // Advanced path smoothing: Removes grid artifacts and creates realistic curved routes
  function smoothPath(points: RoutePoint[]): RoutePoint[] {
    if (!points || points.length < 2) return points;

    // Stage 1: Simplify path by removing redundant collinear points
    const simplified: RoutePoint[] = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      // Calculate angle change
      const angle1 = Math.atan2(curr.lat - prev.lat, curr.lng - prev.lng);
      const angle2 = Math.atan2(next.lat - curr.lat, next.lng - curr.lng);
      const angleDiff = Math.abs(angle1 - angle2);
      
      // Keep point if there's a significant direction change (> 5 degrees)
      if (angleDiff > 0.087) { // ~5 degrees in radians
        simplified.push(curr);
      }
    }
    simplified.push(points[points.length - 1]);

    // Stage 2: Apply Catmull-Rom spline for smooth curves
    function catmullRom(p0: RoutePoint, p1: RoutePoint, p2: RoutePoint, p3: RoutePoint, t: number): RoutePoint {
      const t2 = t * t;
      const t3 = t2 * t;
      
      const lat = 0.5 * (
        (2 * p1.lat) +
        (-p0.lat + p2.lat) * t +
        (2 * p0.lat - 5 * p1.lat + 4 * p2.lat - p3.lat) * t2 +
        (-p0.lat + 3 * p1.lat - 3 * p2.lat + p3.lat) * t3
      );
      
      const lng = 0.5 * (
        (2 * p1.lng) +
        (-p0.lng + p2.lng) * t +
        (2 * p0.lng - 5 * p1.lng + 4 * p2.lng - p3.lng) * t2 +
        (-p0.lng + 3 * p1.lng - 3 * p2.lng + p3.lng) * t3
      );
      
      return { lat, lng };
    }

    const splinePoints: RoutePoint[] = [];
    const segmentPoints = 10; // Points per segment for smoothness

    for (let i = 0; i < simplified.length - 1; i++) {
      const p0 = simplified[Math.max(0, i - 1)];
      const p1 = simplified[i];
      const p2 = simplified[i + 1];
      const p3 = simplified[Math.min(simplified.length - 1, i + 2)];

      for (let j = 0; j < segmentPoints; j++) {
        const t = j / segmentPoints;
        splinePoints.push(catmullRom(p0, p1, p2, p3, t));
      }
    }
    splinePoints.push(simplified[simplified.length - 1]);

    // Stage 3: Final Chaikin smoothing for extra polish (fewer iterations since spline already smooth)
    let smoothed = splinePoints;
    const iterations = 1;
    for (let it = 0; it < iterations; it++) {
      const next: RoutePoint[] = [];
      next.push(smoothed[0]);
      for (let i = 0; i < smoothed.length - 1; i++) {
        const p = smoothed[i];
        const q = smoothed[i + 1];
        const Qa = { lat: 0.75 * p.lat + 0.25 * q.lat, lng: 0.75 * p.lng + 0.25 * q.lng };
        const Rb = { lat: 0.25 * p.lat + 0.75 * q.lat, lng: 0.25 * p.lng + 0.75 * q.lng };
        next.push(Qa);
        next.push(Rb);
      }
      next.push(smoothed[smoothed.length - 1]);
      smoothed = next;
    }

    return smoothed;
  }

  // --- FETCH HOTSPOTS (FOR MAP MARKERS) --- 
  useEffect(() => {
    if (externalHotspots && externalHotspots.length > 0) {
      // Accept hotspots provided by parent (already normalized or mock-structured)
      const formatted: Hotspot[] = externalHotspots.map((h: any) => ({
        lat: (h.center?.lat ?? h.lat ?? h.centerLat ?? h.center?.lat ?? 0) as number,
        lng: (h.center?.lng ?? h.lng ?? h.centerLng ?? h.center?.lng ?? 0) as number,
        radius: (h.radius ?? h.radiusMeters ?? 150) as number,
        intensity: (h.intensity ?? h.count ?? h.riskScore ?? 1) as number,
      }));
      setHotspots(formatted);
      return;
    }

    fetch("http://127.0.0.1:8000/getHeatmap")
      .then((r) => r.json())
      .then((data) => {
        const raw: any[] = data.hotspots || [];
        const formatted: Hotspot[] = raw.map((h) => ({
          lat: (h.center?.lat ?? h.lat ?? 0) as number,
          lng: (h.center?.lng ?? h.lng ?? 0) as number,
          radius: (h.radius as number) ?? 150,
          intensity: (h.intensity ?? h.count ?? 1) as number,
        }));
        setHotspots(formatted);
      })
      .catch((err) => console.error("Hotspot Fetch Error:", err));
  }, [externalHotspots]);
  

  // --- ROUTING HANDLER (Main Logic) ---
  const handleGoClick = async () => {
    if (!originName || !destinationName) {
      alert("Please enter both start and destination.");
      return;
    }
    setLoadingRoute(true);
    setSafeRoute([]);
    setGoogleRoute(null);

    try {
      // 1. Geocode inputs to coordinates (or use stored originPos if "Use my location" was clicked)
      let oCoords: RoutePoint;
      let dCoords: RoutePoint;

      // Check if origin is already set (from "Use my current location" button)
      if (originPos && originName === "My Current Location") {
        oCoords = originPos;
      } else {
        oCoords = await geocodePlace(originName, isLoaded);
        setOriginPos(oCoords);
      }

      // Always geocode destination
      dCoords = await geocodePlace(destinationName, isLoaded);
      setDestPos(dCoords);

      console.log(`📍 Route from: ${oCoords.lat}, ${oCoords.lng} to ${dCoords.lat}, ${dCoords.lng}`);

      // Validate distance (A* algorithm works best for local routes < 50km)
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(oCoords.lat, oCoords.lng),
        new google.maps.LatLng(dCoords.lat, dCoords.lng)
      );
      const distanceKm = distance / 1000;
      console.log(`📏 Distance: ${distanceKm.toFixed(2)} km`);

      if (distanceKm > 100) {
        alert(`⚠️ Distance is ${distanceKm.toFixed(0)}km.\n\nSafeCity is optimized for local routes (< 100km).\nFor long distances, only Google Maps route will be available.`);
      }

      // 2. Fetch Google Directions (for recommended route and alternatives)
      const directionsService = new google.maps.DirectionsService();
      const googleResult = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsService.route(
          {
            origin: new google.maps.LatLng(oCoords.lat, oCoords.lng),
            destination: new google.maps.LatLng(dCoords.lat, dCoords.lng),
            travelMode: google.maps.TravelMode.WALKING,
            provideRouteAlternatives: true, // Crucial for multi-route display
          },
          (result, status) => {
            if (status === "OK" && result) resolve(result);
            else reject(new Error(`Google Directions failed: ${status}`));
          }
        );
      });
      setGoogleRoute(googleResult);

      // 3. Score Google alternatives against hotspots and find the safest
      let safestGooglePath: RoutePoint[] = [];
      if (googleResult.routes.length > 0) {
        const scoredRoutes = googleResult.routes.map(route => {
            // Get path points from DirectionsResult overview polyline
            const pathPoints = route.overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));
            // Score the path based on hotspot proximity (using a simplified frontend score)
            const score = scorePath(pathPoints, hotspots);
            return { route, score, pathPoints };
        });

        scoredRoutes.sort((a, b) => a.score - b.score); // Safest is lowest score
        safestGooglePath = scoredRoutes[0].pathPoints;
      }

      // 4. Call Backend Safe Route (A* path) with fallback to safest Google route
      let backendPoints: RoutePoint[] = [];
      
      // Only call backend A* for local routes (< 50km)
      if (distanceKm <= 50) {
        try {
          backendPoints = await callBackendSafeRoute(oCoords, dCoords);
        } catch (err) {
          console.error("Backend safe route failed, falling back to safest Google route:", err);
        }
      } else {
        console.log(`⏩ Skipping backend A* (distance ${distanceKm.toFixed(0)}km > 50km limit)`);
      }
      
      // Smooth whichever path we will render
      const chosen = backendPoints && backendPoints.length > 1 ? backendPoints : safestGooglePath;
      console.log(`🛣️ Route chosen: ${backendPoints.length > 1 ? 'Backend A*' : 'Google Fallback'} with ${chosen.length} waypoints`);
      const smoothed = smoothPath(chosen || []);
      console.log(`✨ After smoothing: ${smoothed.length} points`);
      setSafeRoute(smoothed);

      // 5. Fit map bounds
      if (mapRef.current && oCoords && dCoords) {
        try {
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(new google.maps.LatLng(oCoords.lat, oCoords.lng));
          bounds.extend(new google.maps.LatLng(dCoords.lat, dCoords.lng));
          mapRef.current.fitBounds(bounds);
        } catch (boundsErr) {
          console.warn("Could not fit bounds, using default zoom:", boundsErr);
        }
      }

    } catch (err: unknown) {
      console.error("Routing flow error:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to compute route";
      alert(`Route Calculation Error\n\n${errorMsg}\n\nPlease try again or choose different locations.`);
    } finally {
      setLoadingRoute(false);
    }
  };

  function scorePath(path: RoutePoint[], hotspots: Hotspot[]) {
    let score = 0;
    const defaultRadius = 150;
    for (const p of path) {
        for (const h of hotspots) {
            const rad = h.radius ?? defaultRadius;
            const d = google.maps.geometry.spherical.computeDistanceBetween(
                new google.maps.LatLng(p.lat, p.lng),
                new google.maps.LatLng(h.lat, h.lng)
            );
            if (d < rad) {
                score += (h.intensity ?? 1);
            }
        }
    }
    return score;
}

  if (loadError) return <div className="p-4 text-red-500">Google Maps failed to load.</div>;
  if (!isLoaded) return <div className="p-4">Loading map...</div>;

  return (
    <div>
      {/* Location Status */}
      {locationError && (
        <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-600 rounded text-yellow-200 text-sm">
          ⚠️ {locationError}
        </div>
      )}
      {userCurrentLocation && !locationError && (
        <div className="mb-3 p-2 bg-green-900/30 border border-green-600 rounded text-green-200 text-sm">
          📍 Current location: {userCurrentLocation.lat.toFixed(4)}, {userCurrentLocation.lng.toFixed(4)}
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <input
            className="p-2 rounded bg-gray-800 text-white w-full"
            placeholder="Start place (e.g., MG Road, Bangalore)"
            value={originName}
            onChange={(e) => {
              setOriginName(e.target.value);
              // Clear originPos if user manually edits the field
              if (e.target.value !== "My Current Location") {
                setOriginPos(null);
              }
            }}
          />
          <button
            onClick={() => {
              if (userCurrentLocation) {
                setOriginPos(userCurrentLocation);
                setOriginName("My Current Location");
              }
            }}
            disabled={!userCurrentLocation}
            className="mt-1 text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-600"
          >
            📍 Use my current location
          </button>
        </div>
        <input
          className="p-2 rounded bg-gray-800 text-white flex-1"
          placeholder="Destination place (e.g., Koramangala Forum Mall)"
          value={destinationName}
          onChange={(e) => setDestinationName(e.target.value)}
        />
        <button
          onClick={handleGoClick}
          disabled={loadingRoute || !isLoaded}
          title={!isLoaded ? "Map is still loading" : undefined}
          className={`px-4 py-2 font-bold rounded ${loadingRoute || !isLoaded ? "bg-gray-500 text-white" : "bg-[#00BFFF] text-black"}`}
        >
          {loadingRoute ? "Calculating..." : !isLoaded ? "Loading…" : "GO"}
        </button>
      </div>
       <div className="mb-4">
          <p className="text-gray-400 text-sm">
            <span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>
            <strong>Green path:</strong> ML-optimized safe route (A* algorithm avoiding crime hotspots)
          </p>
          <p className="text-gray-400 text-sm mt-1">
            <span className="inline-block w-3 h-3 bg-blue-400 rounded mr-2"></span>
            <strong>Blue path:</strong> Google's recommended walking route
          </p>
      </div>

      <GoogleMap
        zoom={13}
        center={userCurrentLocation || { lat: userLocation[0], lng: userLocation[1] }}
        mapContainerStyle={mapContainerStyle}
        onLoad={(map) => { mapRef.current = map; }}
        options={mapOptions}
      >
        {/* User's Current Location Marker */}
        {userCurrentLocation && (
          <Marker
            position={userCurrentLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeWeight: 2,
            }}
            title="Your Location"
          />
        )}

        {/* Origin / Dest Markers */}
        {originPos && <Marker position={originPos} label="A" />}
        {destPos && <Marker position={destPos} label="B" />}

        {/* GOOGLE ROUTE (Blue - Recommended) */}
        {googleRoute && (
          <DirectionsRenderer
            directions={googleRoute}
            options={{
              polylineOptions: { strokeColor: "#00BFFF", strokeOpacity: 0.7, strokeWeight: 4 },
              suppressMarkers: true,
            }}
          />
        )}

        {/* SAFE ROUTE (Green - Our ML Route) */}
        {safeRoute.length > 1 && (
          <Polyline
            path={safeRoute}
            options={{
              strokeColor: "#28A745",
              strokeOpacity: 1,
              strokeWeight: 6,
              zIndex: 10,
            }}
          />
        )}

        {/* DANGER HOTSPOTS (Markers) */}
        {hotspots.map((h, i) => (
          <Marker
            key={i}
            position={{ lat: h.lat, lng: h.lng }}
            icon={{
              url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
              scaledSize: new google.maps.Size(36, 36),
            }}
          />
        ))}
      </GoogleMap>
    </div>
  );
}