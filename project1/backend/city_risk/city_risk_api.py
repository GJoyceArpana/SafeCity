from fastapi import APIRouter, HTTPException
from .city_risk_engine import compute_city_risk_index

# Router without prefix; main app mounts it at /api so final path is /api/cityRisk
router = APIRouter(tags=["City Risk"])


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
