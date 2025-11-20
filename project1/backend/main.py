from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from firebase_admin import credentials, firestore, initialize_app
import hashlib, time, os
from typing import Optional

# ML service
from api.services import ml_service

app = FastAPI()

# -------------------------
# CORS SETTINGS
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# FIREBASE INITIALIZATION
# -------------------------
cred_path = "serviceAccountKey.json"

if not os.path.exists(cred_path):
    print("WARNING: serviceAccountKey.json missing — auth endpoints will fail.")
else:
    cred = credentials.Certificate(cred_path)
    firebase_app = initialize_app(cred)
    db = firestore.client()
    users_ref = db.collection("users")

# -------------------------
# Pydantic Models
# -------------------------
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

# -------------------------
# SIGNUP ENDPOINT
# -------------------------
@app.post("/api/signup")
def signup(data: SignupModel):
    email = data.email.lower()

    # check if exists
    user_doc = users_ref.document(email).get()
    if user_doc.exists:
        raise HTTPException(
            status_code=400,
            detail="Email already registered, please login."
        )

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

# -------------------------
# LOGIN ENDPOINT
# -------------------------
@app.post("/api/login")
def login(data: LoginModel):
    email = data.email.lower()

    user_doc = users_ref.document(email).get()
    if not user_doc.exists:
        raise HTTPException(status_code=401, detail="User does not exist.")

    user = user_doc.to_dict()

    hashed_password = hashlib.sha256(data.password.encode()).hexdigest()
    if user["password"] != hashed_password:
        raise HTTPException(status_code=401, detail="Invalid password.")

    if user["role"] != data.role:
        raise HTTPException(status_code=401, detail="Invalid role selected.")

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

# -------------------------
# ML ENDPOINTS
# -------------------------

@app.get("/getHeatmap")
def get_heatmap():
    """Returns DBSCAN hotspot clusters."""
    hotspots = ml_service.get_heatmap()
    return {"status": "success", "hotspots": hotspots}

@app.get("/predict")
def predict(ward: Optional[str] = Query(None, description="Ward name")):
    """
    Returns prediction for a specific ward.
    If no ward is given → returns full ward predictions.
    """
    pred = ml_service.get_predictions(ward)
    return {"status": "success", "prediction": pred}

@app.get("/riskScores")
def risk_scores():
    """Returns risk score sample dataset."""
    rs = ml_service.get_risk_scores()
    return {"status": "success", "risk_scores": rs}

# -------------------------
# HEALTH CHECK
# -------------------------
@app.get("/ping")
def ping():
    return {"status": "ok", "message": "Server is running 🚀"}
