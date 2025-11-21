# backend/routing/route_engine.py

import math
import json
import os
import requests
from heapq import heappush, heappop
from typing import List, Tuple, Dict, Any, Optional

# ---------------------------
# CONFIG
# ---------------------------
GRID_STEP = 0.001   # each step in degrees (~111m at equator). Tune for perf/quality.
HOTSPOT_FILE = "data/hotspots.json"
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")  # Set this in environment
USE_GOOGLE_DIRECTIONS = True  # Toggle to use Google Maps API vs grid-based A*

# Debug logging
print(f"🔑 Google Maps API Key configured: {bool(GOOGLE_MAPS_API_KEY)}")
print(f"🗺️  Using Google Directions: {USE_GOOGLE_DIRECTIONS}")


# ---------------------------
# LOAD HOTSPOTS
# ---------------------------
def load_hotspots(path: str = HOTSPOT_FILE):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        # If file missing or invalid, return empty list
        return []


# ---------------------------
# Haversine distance (meters)
# ---------------------------
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000.0  # meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------
# RISK PENALTY (per-point)
# ---------------------------
def risk_penalty_for_point(lat: float, lng: float, hotspots: List[Dict[str, Any]]) -> float:
    """
    Returns penalty weight for being near hotspot(s).
    Hotspot format assumed: { "lat":..., "lng":..., "intensity": ..., "radius": meters OR degrees }
    This function uses a distance-based check and intensity thresholds.
    """
    penalty = 0.0
    for h in hotspots:
        try:
            hlat = float(h.get("lat", h.get("center", {}).get("lat", 0)))
            hlng = float(h.get("lng", h.get("center", {}).get("lng", 0)))
        except Exception:
            continue

        # compute distance in meters
        dist = haversine(lat, lng, hlat, hlng)

        # determine radius: prefer explicit radius (meters), else derive from intensity
        rad = h.get("radius")
        if rad is None:
            # approximate: bigger intensity -> larger radius (meters)
            intensity = float(h.get("intensity", h.get("count", 0)))
            rad = min(150 + intensity * 0.8, 2500)  # meters
        else:
            rad = float(rad)

        if dist <= rad:
            intensity = float(h.get("intensity", h.get("count", 0)))
            if intensity > 200:
                penalty += 30
            elif intensity > 100:
                penalty += 15
            elif intensity > 40:
                penalty += 5
            else:
                penalty += 1
    return penalty


# ---------------------------
# A* Search helpers
# ---------------------------
def get_grid_neighbors(cx: float, cy: float, step: float = GRID_STEP):
    # 4-connected neighbors
    return [
        (round(cx + step, 6), cy),
        (round(cx - step, 6), cy),
        (cx, round(cy + step, 6)),
        (cx, round(cy - step, 6)),
    ]


def a_star(start: Tuple[float, float], end: Tuple[float, float], hotspots: List[Dict[str, Any]]):
    """
    Runs A* on implicit grid (no full pre-generated node list). Stops when a node within threshold meters of end found.
    This approach keeps memory low and faster for small distances.
    """
    sx, sy = start
    ex, ey = end

    start_node = (round(sx, 6), round(sy, 6))
    target_node = (round(ex, 6), round(ey, 6))

    open_heap = []
    heappush(open_heap, (0.0, start_node))
    came_from = {}
    gscore = {start_node: 0.0}
    visited = set()

    # goal threshold (meters) - when we come within this distance of target we stop
    # Must be larger than grid step in meters (~111m for 0.001°) so that some grid
    # node can actually satisfy the condition.
    GOAL_THRESHOLD_M = 250.0

    # hard safety cap on how many nodes we expand to avoid unbounded search
    MAX_EXPANSIONS = 50000
    expansions = 0

    while open_heap:
        expansions += 1
        if expansions > MAX_EXPANSIONS:
            # give up, let caller fall back to straight-line route
            return []
        _, current = heappop(open_heap)
        if current in visited:
            continue
        visited.add(current)

        # check goal proximity
        if haversine(current[0], current[1], ex, ey) <= GOAL_THRESHOLD_M:
            # reconstruct path using current as endpoint (we'll append exact end point later)
            path = reconstruct_path(came_from, current)
            # append exact end coordinate for smooth polyline
            path.append({"lat": ex, "lng": ey})
            return path

        # expand neighbors
        neighbors = get_grid_neighbors(current[0], current[1], GRID_STEP)
        for n in neighbors:
            nx, ny = n
            base_dist = haversine(current[0], current[1], nx, ny)
            penalty = risk_penalty_for_point(nx, ny, hotspots)
            tentative_g = gscore[current] + base_dist + penalty

            if (nx, ny) not in gscore or tentative_g < gscore[(nx, ny)]:
                gscore[(nx, ny)] = tentative_g
                # heuristic = straight-line meters to target
                heuristic = haversine(nx, ny, ex, ey)
                f = tentative_g + heuristic
                heappush(open_heap, (f, (nx, ny)))
                came_from[(nx, ny)] = current

    # if we exhausted search, return empty
    return []


def reconstruct_path(came_from: Dict[Tuple[float, float], Tuple[float, float]], current: Tuple[float, float]):
    path = []
    node = current
    path.append({"lat": node[0], "lng": node[1]})
    while node in came_from:
        node = came_from[node]
        path.append({"lat": node[0], "lng": node[1]})
    path.reverse()
    return path


# ---------------------------
# Polyline encoder (Google polyline algorithm)
# ---------------------------
def encode_polyline(points: List[Dict[str, float]]) -> str:
    result = []
    prev_lat = 0
    prev_lng = 0

    for p in points:
        lat = int(round(p["lat"] * 1e5))
        lng = int(round(p["lng"] * 1e5))

        d_lat = lat - prev_lat
        d_lng = lng - prev_lng

        for value in (d_lat, d_lng):
            v = ~(value << 1) if value < 0 else (value << 1)
            while v >= 0x20:
                result.append(chr((0x20 | (v & 0x1f)) + 63))
                v >>= 5
            result.append(chr(v + 63))

        prev_lat = lat
        prev_lng = lng

    return "".join(result)


# ---------------------------
# Google Maps Directions API Integration
# ---------------------------
def get_google_directions_routes(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> List[Dict[str, Any]]:
    """
    Fetch multiple route alternatives from Google Maps Directions API.
    Returns list of routes with their decoded polylines.
    """
    if not GOOGLE_MAPS_API_KEY:
        print("⚠️  No Google Maps API key - falling back to grid A*")
        return []
    
    try:
        url = "https://maps.googleapis.com/maps/api/directions/json"
        params = {
            "origin": f"{start_lat},{start_lng}",
            "destination": f"{end_lat},{end_lng}",
            "alternatives": "true",  # Request multiple routes
            "mode": "driving",
            "key": GOOGLE_MAPS_API_KEY
        }
        
        print(f"🌐 Calling Google Directions API: {start_lat},{start_lng} → {end_lat},{end_lng}")
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ Google API HTTP error: {response.status_code}")
            return []
        
        data = response.json()
        
        if data.get("status") != "OK":
            print(f"❌ Google API error: {data.get('status')} - {data.get('error_message', '')}")
            return []
        
        print(f"✅ Got {len(data.get('routes', []))} routes from Google")
        routes = []
        for route in data.get("routes", []):
            # Decode the overview polyline
            encoded_polyline = route["overview_polyline"]["points"]
            decoded_points = decode_polyline(encoded_polyline)
            
            # Get distance and duration
            leg = route["legs"][0] if route.get("legs") else {}
            distance_meters = leg.get("distance", {}).get("value", 0)
            duration_seconds = leg.get("duration", {}).get("value", 0)
            
            routes.append({
                "points": decoded_points,
                "distance": distance_meters,
                "duration": duration_seconds,
                "encoded_polyline": encoded_polyline
            })
        
        return routes
    except Exception as e:
        print(f"Google Directions API error: {e}")
        return []


def decode_polyline(encoded: str) -> List[Dict[str, float]]:
    """
    Decode Google Maps encoded polyline to list of {lat, lng} points.
    """
    points = []
    index = 0
    lat = 0
    lng = 0
    
    while index < len(encoded):
        # Decode latitude
        result = 0
        shift = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1f) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += dlat
        
        # Decode longitude
        result = 0
        shift = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1f) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += dlng
        
        points.append({
            "lat": lat / 1e5,
            "lng": lng / 1e5
        })
    
    return points


def calculate_route_risk(points: List[Dict[str, float]], hotspots: List[Dict[str, Any]]) -> Tuple[float, int]:
    """
    Calculate risk score for a route based on proximity to hotspots.
    Returns (risk_score, avoided_hotspots_count).
    """
    total_risk = 0.0
    high_risk_hotspots_avoided = 0
    
    for point in points:
        lat = point["lat"]
        lng = point["lng"]
        
        for h in hotspots:
            try:
                hlat = float(h.get("lat", h.get("center", {}).get("lat", 0)))
                hlng = float(h.get("lng", h.get("center", {}).get("lng", 0)))
            except Exception:
                continue
            
            dist = haversine(lat, lng, hlat, hlng)
            intensity = float(h.get("intensity", h.get("count", 0)))
            
            # Determine radius
            rad = h.get("radius")
            if rad is None:
                rad = min(150 + intensity * 0.8, 2500)
            else:
                rad = float(rad)
            
            # Check if route passes through hotspot
            if dist <= rad:
                if intensity > 200:
                    total_risk += 30
                    high_risk_hotspots_avoided += 1
                elif intensity > 100:
                    total_risk += 15
                    high_risk_hotspots_avoided += 1
                elif intensity > 40:
                    total_risk += 5
                else:
                    total_risk += 1
    
    # Normalize risk score (0-100)
    risk_score = min(100, int(total_risk / max(len(points), 1) * 10))
    
    return risk_score, high_risk_hotspots_avoided


# ---------------------------
# Main compute function
# ---------------------------
def compute_safe_path(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> Dict[str, Any]:
    hotspots = load_hotspots()
    
    print(f"\n🛣️  Computing safe route: ({start_lat}, {start_lng}) → ({end_lat}, {end_lng})")

    # Try Google Maps Directions API first (gets real road routes)
    if USE_GOOGLE_DIRECTIONS and GOOGLE_MAPS_API_KEY:
        google_routes = get_google_directions_routes(start_lat, start_lng, end_lat, end_lng)
        
        if google_routes:
            print(f"📊 Scoring {len(google_routes)} routes based on crime hotspots...")
            # Score each route based on crime hotspots
            scored_routes = []
            for i, route in enumerate(google_routes):
                risk_score, avoided = calculate_route_risk(route["points"], hotspots)
                print(f"   Route {i+1}: {len(route['points'])} points, risk={risk_score}, avoided={avoided} hotspots")
                scored_routes.append({
                    "points": route["points"],
                    "encoded_polyline": route["encoded_polyline"],
                    "risk_score": risk_score,
                    "avoided_hotspots": avoided,
                    "distance": route["distance"],
                    "duration": route["duration"]
                })
            
            # Sort by risk score (lowest first = safest)
            scored_routes.sort(key=lambda r: r["risk_score"])
            
            # Return the safest route
            if scored_routes:
                best_route = scored_routes[0]
                print(f"✅ Returning safest route (risk={best_route['risk_score']}) with {len(best_route['points'])} waypoints\n")
                return {
                    "polyline": best_route["encoded_polyline"],
                    "points": best_route["points"],
                    "risk_score": best_route["risk_score"],
                    "avoided_hotspots": best_route["avoided_hotspots"],
                    "distance": best_route["distance"],
                    "duration": best_route["duration"],
                    "alternatives": scored_routes[1:3]  # Include next 2 alternatives
                }
    
    # Fallback to grid-based A* if Google Maps unavailable
    print("⚠️  Falling back to grid-based A* algorithm...")
    start = (round(start_lat, 6), round(start_lng, 6))
    end = (round(end_lat, 6), round(end_lng, 6))

    try:
        path_points = a_star(start, end, hotspots)
    except Exception as e:
        # fallback straight line path
        path_points = [
            {"lat": start_lat, "lng": start_lng},
            {"lat": end_lat, "lng": end_lng},
        ]

    # if path empty, return fallback straight line
    if not path_points:
        path_points = [
            {"lat": start_lat, "lng": start_lng},
            {"lat": end_lat, "lng": end_lng},
        ]

    # compute encoded polyline
    poly = encode_polyline(path_points)

    # basic risk estimate (placeholder): count hotspots with high intensity near route
    risk_score, avoided = calculate_route_risk(path_points, hotspots)

    return {
        "polyline": poly,
        "points": path_points,
        "risk_score": risk_score,
        "avoided_hotspots": avoided,
    }
