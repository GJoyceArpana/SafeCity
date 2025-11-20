import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CrimeHotspot, CrimeIncident } from '../../types';

interface CrimeMapProps {
  hotspots: CrimeHotspot[];
  incidents?: CrimeIncident[];
  center?: [number, number];
  zoom?: number;
  showIncidents?: boolean;
  onLocationClick?: (lat: number, lng: number) => void;
  userLocation?: [number, number];
}

const riskColors = {
  low: '#28A745',
  moderate: '#FFC107',
  high: '#FF8C00',
  critical: '#DC3545'
};

export function CrimeMap({
  hotspots,
  incidents = [],
  center = [19.0760, 72.8777],
  zoom = 12,
  showIncidents = false,
  onLocationClick,
  userLocation
}: CrimeMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Layer[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      attributionControl: false
    }).setView(center, zoom);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    if (onLocationClick) {
      map.on('click', (e) => {
        onLocationClick(e.latlng.lat, e.latlng.lng);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach(marker => {
      mapRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    hotspots.forEach(hotspot => {
      const circle = L.circle([hotspot.centerLat, hotspot.centerLng], {
        color: riskColors[hotspot.riskLevel],
        fillColor: riskColors[hotspot.riskLevel],
        fillOpacity: 0.35,
        radius: hotspot.radiusMeters,
        weight: 2
      }).addTo(mapRef.current!);

      const popupContent = `
        <div style="color: #1A1A2E; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; text-transform: uppercase; color: ${riskColors[hotspot.riskLevel]};">
            ${hotspot.riskLevel} Risk
          </h3>
          <div style="font-size: 12px; line-height: 1.6;">
            <p style="margin: 4px 0;"><strong>Risk Score:</strong> ${hotspot.riskScore}/100</p>
            <p style="margin: 4px 0;"><strong>Confidence:</strong> ${(hotspot.confidence * 100).toFixed(0)}%</p>
            <p style="margin: 4px 0;"><strong>Active Until:</strong> ${hotspot.activeUntil.toLocaleTimeString()}</p>
            <p style="margin: 4px 0;"><strong>Predicted Types:</strong><br/>
              ${hotspot.predictedCrimeTypes.map(t => `<span style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px; margin: 2px; display: inline-block;">${t}</span>`).join('')}
            </p>
            <p style="margin: 8px 0 4px 0; font-weight: bold;">Contributing Factors:</p>
            <p style="margin: 2px 0; font-size: 11px;">Historical Crimes: ${hotspot.factors.historicalCrimes}</p>
          </div>
        </div>
      `;

      circle.bindPopup(popupContent);
      markersRef.current.push(circle);

      const marker = L.circleMarker([hotspot.centerLat, hotspot.centerLng], {
        radius: 8,
        fillColor: riskColors[hotspot.riskLevel],
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 1
      }).addTo(mapRef.current!);

      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });

    if (showIncidents && incidents.length > 0) {
      const incidentColors = {
        violent: '#FF4136',
        property: '#FF8C00',
        disorder: '#8A2BE2',
        traffic: '#4A90E2',
        other: '#B0BEC5'
      };

      incidents.forEach(incident => {
        const marker = L.circleMarker([incident.latitude, incident.longitude], {
          radius: 4,
          fillColor: incidentColors[incident.incidentType],
          color: '#fff',
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.6
        }).addTo(mapRef.current!);

        const popupContent = `
          <div style="color: #1A1A2E; min-width: 180px; font-size: 12px;">
            <h4 style="margin: 0 0 6px 0; text-transform: capitalize;">${incident.incidentType} Crime</h4>
            <p style="margin: 2px 0;"><strong>Severity:</strong> ${incident.severity}</p>
            <p style="margin: 2px 0;"><strong>Date:</strong> ${incident.occurredAt.toLocaleDateString()}</p>
            <p style="margin: 2px 0;"><strong>Time:</strong> ${incident.occurredAt.toLocaleTimeString()}</p>
            ${incident.locationDescription ? `<p style="margin: 2px 0;"><strong>Location:</strong> ${incident.locationDescription}</p>` : ''}
          </div>
        `;

        marker.bindPopup(popupContent);
        markersRef.current.push(marker);
      });
    }

    if (userLocation) {
      const userMarker = L.marker(userLocation, {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: `<div style="
            width: 20px;
            height: 20px;
            background: #00BFFF;
            border: 3px solid #fff;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(0, 191, 255, 0.8);
          "></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      }).addTo(mapRef.current!);

      markersRef.current.push(userMarker);
    }
  }, [hotspots, incidents, showIncidents, userLocation]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg overflow-hidden shadow-xl"
      style={{ minHeight: '400px' }}
    />
  );
}
