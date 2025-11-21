# backend/main.py

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hashlib
import time
import os
from typing import Optional

# ML service
from api.services import ml_service

# Routers
from routing.safe_route_api import router as safe_route_router
from city_risk.city_risk_api import router as city_risk_router

app = FastAPI(title="SafeCity Backend")

# -----------------------------------
# CORS SETTINGS
# -----------------------------------
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

# -----------------------------------
# FIREBASE INITIALIZATION
# -----------------------------------

try:
    from firebase_admin import credentials, firestore, initialize_app

    cred_path = "serviceAccountKey.json"

    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_app = initialize_app(cred)
        db = firestore.client()
        users_ref = db.collection("users")
    else:
        print("WARNING: serviceAccountKey.json missing — auth endpoints disabled.")
        users_ref = None
except Exception:
    users_ref = None
    print("Firebase not available — Auth disabled.")


# -----------------------------------
# MODELS
# -----------------------------------

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


# -----------------------------------
# AUTH ENDPOINTS
# -----------------------------------

@app.post("/api/signup")
def signup(data: SignupModel):
    if users_ref is None:
        raise HTTPException(500, "Auth service not configured")

    email = data.email.lower()
    user_doc = users_ref.document(email).get()

    if user_doc.exists:
        raise HTTPException(400, "Email already registered.")

    hashed_password = hashlib.sha256(data.password.encode()).hexdigest()

    users_ref.document(email).set({
        "id": f"user-{int(time.time())}",
        "fullName": data.fullName,
        "phone": data.phone,
        "email": data.email,
        "password": hashed_password,
        "role": data.role,
        "createdAt": firestore.SERVER_TIMESTAMP
    })

    return {"status": "success", "message": "Signup successful"}


@app.post("/api/login")
def login(data: LoginModel):
    if users_ref is None:
        raise HTTPException(500, "Auth service not configured")

    email = data.email.lower()
    user_doc = users_ref.document(email).get()

    if not user_doc.exists:
        raise HTTPException(401, "User does not exist.")

    user = user_doc.to_dict()

    hashed_password = hashlib.sha256(data.password.encode()).hexdigest()

    if user["password"] != hashed_password:
        raise HTTPException(401, "Invalid password.")

    if user["role"] != data.role:
        raise HTTPException(401, "Invalid role.")

    return {
        "status": "success",
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "fullName": user["fullName"],
            "email": user["email"],
            "role": user["role"],
            "phone": user["phone"]
        }
    }


# -----------------------------------
# ML ENDPOINTS
# -----------------------------------

@app.get("/getHeatmap")
def get_heatmap():
    hotspots = ml_service.get_heatmap()
    return {"status": "success", "hotspots": hotspots}


@app.get("/predict")
def predict(ward: Optional[str] = None):
    pred = ml_service.get_predictions(ward)
    return {"status": "success", "prediction": pred}


@app.get("/riskScores")
def risk_scores():
    rs = ml_service.get_risk_scores()
    return {"status": "success", "risk_scores": rs}


# -----------------------------------
# ROUTERS
# -----------------------------------

# /api/routing/safeRoute
app.include_router(safe_route_router, prefix="/api")

# /api/cityRisk
app.include_router(city_risk_router)

# -----------------------------------
# HEALTH CHECK
# -----------------------------------

@app.get("/ping")
def ping():
    return {"status": "ok", "message": "Server is running 🚀"}
