# backend/routing/safe_route_api.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
from typing import List, Dict, Any

# import from same package
from .route_engine import compute_safe_path

router = APIRouter(prefix="/routing", tags=["routing"])


class RouteRequest(BaseModel):
    start: List[float]  # [lat, lng]
    end: List[float]    # [lat, lng]


@router.post("/safeRoute")
def safe_route(req: RouteRequest):
    """
    Computes safe path that avoids hotspots.

    Expects JSON body:
    { "start": [lat, lng], "end": [lat, lng] }

    Returns:
    {
      "status":"success",
      "route": { "polyline": "...", "points":[{lat,lng},...], "risk_score": int, "avoided_hotspots": int }
    }
    """
    # 1. Optionally fetch hotspots from ML service endpoint to ensure fresh data.
    #    The route_engine.load_hotspots already reads backend/data/hotspots.json.
    #    If you want to pull from ml endpoint uncomment below; keep in mind it adds latency.
    try:
        # Example: keep this optional; uncomment to refetch from ML service:
        # res = requests.get("http://127.0.0.1:8000/getHeatmap", timeout=2.0)
        # ml_hotspots = res.json().get("hotspots", [])
        # (you could write ml_hotspots to data/hotspots.json here if desired)
        pass
    except Exception:
        # If fetching ML service fails, proceed using local hotspots.json
        pass

    start = req.start
    end = req.end

    if len(start) != 2 or len(end) != 2:
        raise HTTPException(status_code=400, detail="start and end must be [lat, lng]")

    try:
        route = compute_safe_path(float(start[0]), float(start[1]), float(end[0]), float(end[1]))
        return {"status": "success", "route": route}
    except Exception as e:
        print("SafeRoute error:", e)
        raise HTTPException(status_code=500, detail="Route calculation failed")
