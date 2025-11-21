// frontend/src/components/Citizen/SafeRoutes.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  DirectionsRenderer,
  useLoadScript,
  Circle,
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

  const data = await res.json();
  // Expect data.route.points
  if (!res.ok || !data.route || !Array.isArray(data.route.points)) {
    throw new Error("Backend A* route failed: " + (data.detail || "No points array returned"));
  }
  return data.route.points as RoutePoint[];
}


export default function SafeRoutes({ userLocation }: SafeRoutesProps) {
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

  const [safeRoute, setSafeRoute] = useState<RoutePoint[]>([]);
  const [googleRoute, setGoogleRoute] = useState<google.maps.DirectionsResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // --- FETCH HOTSPOTS (FOR MAP MARKERS) ---
  useEffect(() => {
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
  }, []);

  // --- ROUTING HANDLER (Main Logic) ---
  const handleGoClick = async () => {
    if (!originName || !destinationName) {
      alert("Please enter both start and destination.");
      return;
    }
    setLoadingRoute(true);
    setSafeRoute([]);
    setGoogleRoute(null);
    setOriginPos(null);
    setDestPos(null);

    try {
      // 1. Geocode inputs to coordinates
      const [oCoords, dCoords] = await Promise.all([
        geocodePlace(originName, isLoaded),
        geocodePlace(destinationName, isLoaded),
      ]);
      setOriginPos(oCoords);
      setDestPos(dCoords);

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

      // 4. Call Backend Safe Route (A* path)
      const backendPoints = await callBackendSafeRoute(oCoords, dCoords);
      setSafeRoute(backendPoints.length > 0 ? backendPoints : safestGooglePath);

      // 5. Fit map bounds
      if (mapRef.current) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(new google.maps.LatLng(oCoords.lat, oCoords.lng));
        bounds.extend(new google.maps.LatLng(dCoords.lat, dCoords.lng));
        mapRef.current.fitBounds(bounds, 60);
      }

    } catch (err: any) {
      console.error("Routing flow error:", err);
      alert("Routing Error: " + (err.message || "Failed to compute route"));
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
      <div className="flex gap-4 mb-4">
        <input
          className="p-2 rounded bg-gray-800 text-white w-full"
          placeholder="Start place (e.g., MG Road, Bangalore)"
          value={originName}
          onChange={(e) => setOriginName(e.target.value)}
        />
        <input
          className="p-2 rounded bg-gray-800 text-white w-full"
          placeholder="Destination place (e.g., Koramangala Forum Mall)"
          value={destinationName}
          onChange={(e) => setDestinationName(e.target.value)}
        />
        <button
          onClick={handleGoClick}
          disabled={loadingRoute}
          className={`px-4 py-2 font-bold rounded ${loadingRoute ? "bg-gray-500 text-white" : "bg-[#00BFFF] text-black"}`}
        >
          {loadingRoute ? "Calculating..." : "GO"}
        </button>
      </div>
       <div className="mb-4">
          <p className="text-gray-400">Note: Green path is the backend's ML-driven safest route (A*).</p>
      </div>

      <GoogleMap
        zoom={13}
        center={{ lat: userLocation[0], lng: userLocation[1] }}
        mapContainerStyle={mapContainerStyle}
        onLoad={(map) => { mapRef.current = map; }}
        options={mapOptions}
      >
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