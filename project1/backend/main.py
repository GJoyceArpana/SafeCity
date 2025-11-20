from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from firebase_admin import credentials, firestore, initialize_app
import hashlib
import time

app = FastAPI()

# CORS (Allow frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
#  FIREBASE INITIALIZATION
# ---------------------------

cred = credentials.Certificate("serviceAccountKey.json")  # file in backend folder
firebase_app = initialize_app(cred)
db = firestore.client()
users_ref = db.collection("users")


# ---------------------------
#  MODELS
# ---------------------------

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


# ---------------------------
#  SIGNUP API
# ---------------------------

@app.post("/api/signup")
def signup(data: SignupModel):
    email = data.email.lower()

    # Check if user exists
    existing = users_ref.document(email).get()
    if existing.exists:
        raise HTTPException(status_code=400, detail="Email already registered. Please login.")

    # Hash password for safety
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


# ---------------------------
#  LOGIN API
# ---------------------------

@app.post("/api/login")
def login(data: LoginModel):
    email = data.email.lower()

    user_doc = users_ref.document(email).get()
    if not user_doc.exists:
        raise HTTPException(status_code=401, detail="User does not exist.")

    user = user_doc.to_dict()

    # Compare password hash
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
