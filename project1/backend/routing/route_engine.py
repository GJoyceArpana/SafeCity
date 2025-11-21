# backend/routing/route_engine.py

import math
import json
from heapq import heappush, heappop
from typing import List, Tuple, Dict, Any

# ---------------------------
# CONFIG
# ---------------------------
GRID_STEP = 0.001   # each step in degrees (~111m at equator). Tune for perf/quality.
HOTSPOT_FILE = "data/hotspots.json"


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
    GOAL_THRESHOLD_M = 25.0

    while open_heap:
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
# Main compute function
# ---------------------------
def compute_safe_path(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> Dict[str, Any]:
    hotspots = load_hotspots()

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
    avoided = sum(1 for h in hotspots if float(h.get("intensity", h.get("count", 0))) > 100)

    risk_score = min(100, int(avoided * 10))  # map to 0-100, adjust later

    return {
        "polyline": poly,
        "points": path_points,
        "risk_score": risk_score,
        "avoided_hotspots": avoided,
    }
