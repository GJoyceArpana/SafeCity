from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/api", tags=["sos"])


class SOSRequest(BaseModel):
    userId: str
    userEmail: Optional[str] = None
    userName: Optional[str] = None
    lat: float
    lng: float
    batteryLevel: int
    timestamp: str
    nearbyHotspots: List[dict] = []
    riskIndex: float = 0.0


@router.post("/sos")
async def handle_sos(sos_data: SOSRequest):
    """
    Handle emergency SOS requests from citizens
    - Log the SOS alert
    - Calculate nearby hotspots and risk
    - Notify police dashboard (placeholder)
    - Return success response
    """
    try:
        print(f"\n🚨 === EMERGENCY SOS RECEIVED ===")
        print(f"👤 User: {sos_data.userName} ({sos_data.userEmail})")
        print(f"📍 Location: {sos_data.lat}, {sos_data.lng}")
        print(f"🔋 Battery: {sos_data.batteryLevel}%")
        print(f"⏰ Time: {sos_data.timestamp}")
        print(f"================================\n")

        # TODO: Calculate nearby crime hotspots
        # TODO: Calculate risk index for location
        # TODO: Store SOS in database
        # TODO: Send real-time notification to police dashboard
        # TODO: Send SMS/Email to emergency contacts

        return {
            "status": "success",
            "message": "SOS received. Emergency services have been notified.",
            "sosId": f"SOS-{int(datetime.now().timestamp())}",
            "estimatedResponseTime": "5-10 minutes",
            "nearbyOfficers": 3,
            "priority": "HIGH"
        }

    except Exception as e:
        print(f"❌ SOS Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process SOS request")
