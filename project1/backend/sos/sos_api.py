# backend/sos/sos_api.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from firebase_admin import firestore
import uuid

router = APIRouter(prefix="/api", tags=["sos"])

# Get Firestore client (initialized in main.py)
def get_db():
    return firestore.client()

# =====================================================
# MODELS / SCHEMAS
# =====================================================

class SOSRequest(BaseModel):
    userId: str
    userEmail: str
    userName: str
    lat: float
    lng: float
    timestamp: str
    battery: int
    nearbyHotspots: int
    cityRisk: float
    message: Optional[str] = "Emergency - User in distress"

class SOSResponse(BaseModel):
    status: str
    alertId: str
    message: str
    estimatedResponseTime: str
    nearbyOfficers: int

class AlertResponse(BaseModel):
    alerts: List[Dict[str, Any]]
    total: int
    timestamp: str


# =====================================================
# POST /api/sos - Trigger Emergency Alert
# =====================================================

@router.post("/sos", response_model=SOSResponse)
async def trigger_sos(sos_data: SOSRequest):
    """
    Handle emergency SOS requests from citizens.
    Saves to Firestore and notifies police dashboard.
    """
    try:
        db = get_db()
        
        # Generate unique alert ID
        alert_id = str(uuid.uuid4())
        
        # Prepare SOS record
        sos_record = {
            "alertId": alert_id,
            "userId": sos_data.userId,
            "userEmail": sos_data.userEmail,
            "userName": sos_data.userName,
            "location": {
                "lat": sos_data.lat,
                "lng": sos_data.lng
            },
            "battery": sos_data.battery,
            "nearbyHotspots": sos_data.nearbyHotspots,
            "cityRisk": sos_data.cityRisk,
            "message": sos_data.message,
            "timestamp": sos_data.timestamp,
            "serverTimestamp": firestore.SERVER_TIMESTAMP,
            "status": "active",
            "responded": False,
            "respondedBy": None,
            "responseTime": None
        }
        
        # Save to sos_alerts collection
        sos_ref = db.collection("sos_alerts").document(alert_id)
        sos_ref.set(sos_record)
        
        # Also save to police_notifications collection
        police_notification = {
            **sos_record,
            "notificationId": alert_id,
            "priority": "critical",
            "acknowledged": False,
            "acknowledgedBy": None,
            "acknowledgedAt": None
        }
        
        police_ref = db.collection("police_notifications").document(alert_id)
        police_ref.set(police_notification)
        
        # Calculate estimated response (placeholder - could use real data)
        estimated_time = calculate_response_time(sos_data.nearbyHotspots, sos_data.cityRisk)
        nearby_officers = calculate_nearby_officers(sos_data.lat, sos_data.lng)
        
        print(f"🚨 SOS Alert Created: {alert_id}")
        print(f"   User: {sos_data.userName} ({sos_data.userEmail})")
        print(f"   Location: ({sos_data.lat}, {sos_data.lng})")
        print(f"   Risk: {sos_data.cityRisk} | Hotspots: {sos_data.nearbyHotspots}")
        
        return SOSResponse(
            status="success",
            alertId=alert_id,
            message="SOS alert sent successfully. Emergency services notified.",
            estimatedResponseTime=estimated_time,
            nearbyOfficers=nearby_officers
        )
        
    except Exception as e:
        print(f"❌ SOS Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process SOS: {str(e)}")


# =====================================================
# GET /api/police/getAlerts - Police Dashboard Alerts
# =====================================================

@router.get("/police/getAlerts", response_model=AlertResponse)
async def get_police_alerts(limit: int = 20):
    """
    Retrieve recent SOS alerts for police dashboard.
    Returns alerts sorted by timestamp (newest first).
    """
    try:
        db = get_db()
        
        # Query police_notifications collection
        alerts_ref = db.collection("police_notifications") \
            .order_by("serverTimestamp", direction=firestore.Query.DESCENDING) \
            .limit(limit)
        
        alerts_snapshot = alerts_ref.stream()
        
        alerts = []
        for doc in alerts_snapshot:
            alert_data = doc.to_dict()
            
            # Convert Firestore timestamp to ISO string
            if alert_data.get("serverTimestamp"):
                alert_data["serverTimestamp"] = alert_data["serverTimestamp"].isoformat()
            
            alerts.append(alert_data)
        
        print(f"📡 Police Dashboard: Retrieved {len(alerts)} alerts")
        
        return AlertResponse(
            alerts=alerts,
            total=len(alerts),
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        print(f"❌ Error fetching police alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch alerts: {str(e)}")


# =====================================================
# PATCH /api/police/acknowledgeAlert - Acknowledge Alert
# =====================================================

@router.patch("/police/acknowledgeAlert/{alert_id}")
async def acknowledge_alert(alert_id: str, officer_id: str, officer_name: str):
    """
    Mark an SOS alert as acknowledged by a police officer.
    """
    try:
        db = get_db()
        
        # Update police_notifications
        police_ref = db.collection("police_notifications").document(alert_id)
        police_ref.update({
            "acknowledged": True,
            "acknowledgedBy": officer_name,
            "acknowledgedById": officer_id,
            "acknowledgedAt": firestore.SERVER_TIMESTAMP
        })
        
        # Also update sos_alerts
        sos_ref = db.collection("sos_alerts").document(alert_id)
        sos_ref.update({
            "responded": True,
            "respondedBy": officer_name,
            "responseTime": firestore.SERVER_TIMESTAMP
        })
        
        print(f"✅ Alert {alert_id} acknowledged by {officer_name}")
        
        return {
            "status": "success",
            "message": f"Alert acknowledged by {officer_name}",
            "alertId": alert_id
        }
        
    except Exception as e:
        print(f"❌ Error acknowledging alert: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to acknowledge alert: {str(e)}")


# =====================================================
# Helper Functions
# =====================================================

def calculate_response_time(nearby_hotspots: int, city_risk: float) -> str:
    """
    Estimate emergency response time based on risk factors.
    """
    base_time = 5  # minutes
    
    # Increase time if high-risk area
    if city_risk > 70:
        base_time += 3
    elif city_risk > 50:
        base_time += 2
    
    # Increase if many nearby hotspots
    if nearby_hotspots > 3:
        base_time += 2
    elif nearby_hotspots > 1:
        base_time += 1
    
    return f"{base_time}-{base_time + 3} minutes"


def calculate_nearby_officers(lat: float, lng: float) -> int:
    """
    Calculate number of nearby officers (placeholder).
    In production, this would query officer locations.
    """
    # Placeholder logic - would integrate with officer GPS tracking
    return 3 if (lat > 12.9 and lat < 13.1) else 2
