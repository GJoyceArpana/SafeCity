from fastapi import APIRouter, HTTPException
from .city_risk_engine import compute_city_risk_index

# Prefix MUST match your frontend request: /api/cityRisk
router = APIRouter(prefix="/api", tags=["City Risk"])


@router.get("/cityRisk")
def get_city_risk():
    """
    Returns the computed real-time city safety index.
    """
    try:
        risk_data = compute_city_risk_index()

        return {
            "status": "success",
            "data": risk_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
