# backend/routing/safe_route_api.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from .route_engine import compute_safe_path

router = APIRouter(prefix="/routing", tags=["routing"])

class RouteRequest(BaseModel):
    start: List[float]  # [lat, lng]
    end: List[float]    # [lat, lng]


@router.post("/safeRoute")
def safe_route(req: RouteRequest):
    start = req.start
    end = req.end

    if len(start) != 2 or len(end) != 2:
        raise HTTPException(400, "start and end must be [lat, lng]")

    try:
        # compute_safe_path handles the core logic and returns the structured result
        route = compute_safe_path(float(start[0]), float(start[1]), float(end[0]), float(end[1]))
        return {"status": "success", "route": route}
    except Exception as e:
        print("SafeRoute error:", e)
        raise HTTPException(500, detail="Route calculation failed")