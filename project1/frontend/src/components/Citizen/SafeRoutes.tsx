import { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  DirectionsRenderer,
  useLoadScript,
} from "@react-google-maps/api";

interface Hotspot {
  lat: number;
  lng: number;
  radius: number;
  intensity: number;
}

interface RawHotspot {
  center?: { lat?: number; lng?: number };
  lat?: number;
  lng?: number;
  radius?: number;
  intensity?: number;
  count?: number;
}

interface RoutePoint {
  lat: number;
  lng: number;
}

interface SafeRoutesProps {
  userLocation: [number, number];
}

export default function SafeRoutes({ userLocation }: SafeRoutesProps) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["geometry"],
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");

  const [safeRoute, setSafeRoute] = useState<RoutePoint[]>([]);
  const [googleRoute, setGoogleRoute] =
    useState<google.maps.DirectionsResult | null>(null);

  // -------------------------------
  // FETCH HOTSPOTS
  // -------------------------------
  useEffect(() => {
    fetch("http://127.0.0.1:8000/getHeatmap")
      .then((r) => r.json())
      .then((data) => {
        if (!data.hotspots) return;

        const formatted: Hotspot[] = data.hotspots.map((h: RawHotspot) => ({
          lat: h.center?.lat ?? h.lat ?? 0,
          lng: h.center?.lng ?? h.lng ?? 0,
          radius: h.radius ?? 150,
          intensity: h.intensity ?? h.count ?? 1,
        }));

        setHotspots(formatted);
      })
      .catch((err) => console.error("Hotspot Fetch Error:", err));
  }, []);

  // -------------------------------
  // HANDLE SAFE ROUTE (backend A*)
  // -------------------------------
  const fetchSafeRoute = async () => {
    try {
      const startSplit = origin.split(",").map(Number);
      const endSplit = destination.split(",").map(Number);

      const res = await fetch("http://127.0.0.1:8000/api/routing/safeRoute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: startSplit,
          end: endSplit,
        }),
      });

      const data = await res.json();
      if (!data.points) {
        alert("No safe route found");
        return;
      }

      setSafeRoute(data.points);
    } catch (err) {
      console.error(err);
      alert("Safe route calculation failed.");
    }
  };

  // -------------------------------
  // GOOGLE MAPS DIRECTIONS ROUTE
  // -------------------------------
  const fetchGoogleRoute = () => {
    if (!origin || !destination) return;

    const dirService = new google.maps.DirectionsService();

    dirService.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          setGoogleRoute(result);
        } else {
          console.error("Google Directions Error:", status);
        }
      }
    );
  };

  if (!isLoaded) return <div className="p-4">Loading map...</div>;

  return (
    <div>
      {/* Input Section */}
      <div className="flex gap-4 mb-4">
        <input
          className="p-2 rounded bg-gray-800 text-white w-full"
          placeholder="Start (lat,lng)"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        />
        <input
          className="p-2 rounded bg-gray-800 text-white w-full"
          placeholder="Destination (lat,lng)"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />

        <button
          onClick={() => {
            fetchSafeRoute();
            fetchGoogleRoute();
          }}
          className="px-4 py-2 bg-blue-500 rounded text-white"
        >
          GO
        </button>
      </div>

      {/* MAP */}
      <GoogleMap
        zoom={13}
        center={{ lat: userLocation[0], lng: userLocation[1] }}
        mapContainerStyle={{ width: "100%", height: "550px", borderRadius: "10px" }}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeId: "roadmap",
        }}
      >
        {/* User Location */}
        <Marker
          position={{
            lat: userLocation[0],
            lng: userLocation[1],
          }}
        />

        {/* Google Maps Suggested Route */}
        {googleRoute && (
          <DirectionsRenderer
            directions={googleRoute}
            options={{
              polylineOptions: {
                strokeColor: "#00BFFF",
                strokeOpacity: 0.9,
                strokeWeight: 5,
              },
            }}
          />
        )}

        {/* SAFE ROUTE (our backend A* path) */}
        {safeRoute.length > 1 && (
          <Polyline
            path={safeRoute.map((p) => ({ lat: p.lat, lng: p.lng }))}
            options={{
              strokeColor: "#00FF00",
              strokeOpacity: 1,
              strokeWeight: 6,
            }}
          />
        )}

        {/* DANGER HOTSPOTS */}
        {hotspots.map((h, i) => (
          <Marker
            key={i}
            position={{ lat: h.lat, lng: h.lng }}
            icon={{
              url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
              scaledSize: new google.maps.Size(40, 40),
            }}
          />
        ))}
      </GoogleMap>
    </div>
  );
}
