// frontend/src/components/Map/CrimeMap.tsx
import React from "react";
import {
  GoogleMap,
  Marker,
  HeatmapLayer,
  useLoadScript,
} from "@react-google-maps/api";

// --------------------------------------------
// FIX GLOBAL google TYPE for TypeScript
// --------------------------------------------
declare global {
  interface Window {
    google: typeof google | undefined;
  }
}

// --------------------------------------------
// BACKEND HOTSPOT TYPE
// --------------------------------------------
export interface BackendHotspot {
  cluster_id?: number;

  // Accept both formats returned by your Python backend
  lat?: number;
  lng?: number;
  center?: { lat: number; lng: number };

  intensity?: number;
  count?: number;

  radius?: number;
}

interface CrimeMapProps {
  hotspots: BackendHotspot[];
  userLocation: [number, number];
  zoom?: number;
}

// --------------------------------------------
// MAP CONTAINER
// --------------------------------------------
const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "520px",
  borderRadius: "12px",
};

// --------------------------------------------
// DARK MAP THEME (Google typed)
// --------------------------------------------
const darkMapTheme: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0b1220" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#ffffff" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1220" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1d2a44" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0a1a2b" }],
  },
];

// --------------------------------------------
// HEATMAP GRADIENT
// --------------------------------------------
const heatmapGradient = [
  "rgba(0,0,0,0)",
  "rgba(0,255,255,1)",
  "rgba(0,170,255,1)",
  "rgba(0,120,255,1)",
  "rgba(255,200,0,1)",
  "rgba(255,100,0,1)",
  "rgba(255,0,0,1)",
];

// --------------------------------------------
// MAIN COMPONENT
// --------------------------------------------
export function CrimeMap({ hotspots, userLocation, zoom = 12 }: CrimeMapProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["visualization"],
  });

  if (loadError) {
    return <div className="p-4 text-red-500">❌ Failed to load Google Maps</div>;
  }

  if (!isLoaded) {
    return <div className="p-4 text-gray-300">⏳ Loading map…</div>;
  }

  // --------------------------------------------
  // NORMALIZE HOTSPOT DATA FOR GOOGLE HEATMAP
  // --------------------------------------------
  const heatmapData: google.maps.visualization.WeightedLocation[] =
    hotspots.map((h) => {
      const lat = h.center?.lat ?? h.lat ?? 0;
      const lng = h.center?.lng ?? h.lng ?? 0;

      // Choose intensity or fall back to count
      const raw = h.intensity ?? h.count ?? 1;

      // Weight scaling ensures visible hotspots
      const weight = Math.max(5, Math.min(250, raw * 0.8));

      return {
        location: new google.maps.LatLng(lat, lng),
        weight,
      };
    });

  return (
    <GoogleMap
      zoom={zoom}
      center={{ lat: userLocation[0], lng: userLocation[1] }}
      mapContainerStyle={containerStyle}
      options={{
        styles: darkMapTheme,
        disableDefaultUI: true,
        zoomControl: true,
        fullscreenControl: false,
      }}
    >
      {/* USER MARKER */}
      <Marker
        position={{ lat: userLocation[0], lng: userLocation[1] }}
        icon={{
          url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
          scaledSize: new google.maps.Size(36, 36),
        }}
      />

      {/* HEATMAP LAYER */}
      {heatmapData.length > 0 && (
        <HeatmapLayer
          data={heatmapData}
          options={{
            radius: 40,
            opacity: 0.85,
            gradient: heatmapGradient,
          }}
        />
      )}
    </GoogleMap>
  );
}
