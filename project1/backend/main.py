from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hashlib
import time
import os
from typing import Optional

# CORRECTED IMPORTS: Path now includes 'api' for ml_service, and all modules are loaded.
from api.services.ml_service import get_heatmap, get_predictions, get_risk_scores
from routing.safe_route_api import router as safe_route_router
from city_risk.city_risk_api import router as city_risk_router
from routes.chat import router as chat_router
from routes.sos import router as sos_router

# ML Data Validation
from ml_data_validator import validate_ml_data_sources

app = FastAPI(title="SafeCity Backend")

# --- VALIDATE ML MODELS ON STARTUP ---
@app.on_event("startup")
async def startup_event():
    """Validate ML data sources on server startup"""
    print("\n🔍 Validating ML model data sources...")
    try:
        validation_report = validate_ml_data_sources()
        if validation_report['all_authenticated']:
            print("✅ Server startup complete - All ML models authenticated\n")
        else:
            print("⚠️  Server started with validation warnings\n")
    except Exception as e:
        print(f"⚠️  ML validation skipped: {e}\n")

# --- CORS SETTINGS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Firebase Initialization & Auth Endpoints (Using stubs) ---
try:
    from firebase_admin import credentials, firestore, initialize_app
    cred_path = "serviceAccountKey.json"
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_app = initialize_app(cred)
        db = firestore.client()
        users_ref = db.collection("users")
    else:
        users_ref = None
except Exception:
    users_ref = None


# ---------- MODELS ----------
class SignupModel(BaseModel):
    fullName: str
    phone: str
    email: str
    password: str
    role: str
    badgeNumber: Optional[str] = None
    department: Optional[str] = None


class LoginModel(BaseModel):
    email: str
    password: str
    role: str


# ---------- SIGNUP ----------
@app.post("/api/signup")
def signup(data: SignupModel):
    if not users_ref:
        raise HTTPException(500, "Auth service not configured")

    # Check if user already exists
    existing = users_ref.where("email", "==", data.email).limit(1).stream()
    if list(existing):
        raise HTTPException(400, "User already exists")

    # Create user document
    user_doc = {
        "fullName": data.fullName,
        "phone": data.phone,
        "email": data.email,
        "password": data.password,     # (later: replace with hashing)
        "role": data.role,
        "created_at": time.time()
    }
    
    # Add police-specific fields if role is police
    if data.role == "police":
        user_doc["badgeNumber"] = data.badgeNumber or "N/A"
        user_doc["department"] = data.department or "General"
    
    users_ref.add(user_doc)

    return {"status": "success", "message": "Signup successful"}


# ---------- LOGIN (NEWLY ADDED) ----------
@app.post("/api/login")
def login(data: LoginModel):
    if not users_ref:
        raise HTTPException(500, "Auth service not configured")

    # Check if user exists
    user_query = users_ref.where("email", "==", data.email).limit(1).stream()
    user_docs = list(user_query)

    if not user_docs:
        raise HTTPException(401, "Invalid email or password")

    user_data = user_docs[0].to_dict()

    # Verify password
    if user_data["password"] != data.password:
        raise HTTPException(401, "Invalid email or password")

    # Build user response with all available fields
    user_response = {
        "id": user_docs[0].id,
        "fullName": user_data["fullName"],
        "email": user_data["email"],
        "role": user_data["role"],
        "phone": user_data.get("phone")
    }
    
    # Add police-specific fields if role is police
    if user_data["role"] == "police":
        user_response["badgeNumber"] = user_data.get("badgeNumber", "N/A")
        user_response["department"] = user_data.get("department", "General")

    # Success
    return {
        "status": "success",
        "message": "Login successful",
        "user": user_response
    }


# --- ML ENDPOINTS ---
@app.get("/getHeatmap")
def get_heatmap_route():
    hotspots = get_heatmap()
    return {"status": "success", "hotspots": hotspots}


@app.get("/predict")
def predict_route(ward: Optional[str] = None):
    pred = get_predictions(ward)
    return {"status": "success", "prediction": pred}


@app.get("/riskScores")
def risk_scores_route():
    rs = get_risk_scores()
    return {"status": "success", "risk_scores": rs}


# --- ROUTERS ---
app.include_router(safe_route_router, prefix="/api")  # /api/routing/safeRoute
app.include_router(city_risk_router, prefix="/api")   # /api/cityRisk
app.include_router(chat_router)                       # /api/chat
app.include_router(sos_router)                        # /api/sos


# --- HEALTH CHECK ---
@app.get("/ping")
def ping():
    return {"status": "ok", "message": "Server is running 🚀"}
