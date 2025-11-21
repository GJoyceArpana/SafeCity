# backend/main.py
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

app = FastAPI(title="SafeCity Backend")

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
# Assuming these parts are correct and use the 'users_ref' variable.
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

class SignupModel(BaseModel):
    fullName: str
    phone: str
    email: str
    password: str
    role: str

class LoginModel(BaseModel):
    email: str
    password: str
    role: str

# Example: Signup Endpoint (rest of Auth omitted for brevity)
@app.post("/api/signup")
def signup(data: SignupModel):
    if not users_ref:
        raise HTTPException(500, "Auth service not configured")
    # ... (rest of implementation)
    return {"status": "success", "message": "Signup successful"}


# --- ML ENDPOINTS (using corrected imports) ---

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
app.include_router(safe_route_router, prefix="/api") # /api/routing/safeRoute
app.include_router(city_risk_router, prefix="/api")  # /api/cityRisk

# --- HEALTH CHECK ---
@app.get("/ping")
def ping():
    return {"status": "ok", "message": "Server is running 🚀"}