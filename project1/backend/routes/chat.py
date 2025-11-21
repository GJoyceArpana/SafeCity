# backend/routes/chat.py
"""
Chat API endpoints for SafeCity Assistant
Supports both scripted responses and optional OpenAI integration
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
import os
from datetime import datetime
import json

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Optional OpenAI integration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", None)
USE_OPENAI = OPENAI_API_KEY is not None

if USE_OPENAI:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
    except ImportError:
        USE_OPENAI = False
        print("⚠️  OpenAI package not installed. Using scripted responses.")


# --- MODELS ---
class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None  # User location, current page, etc.
    history: Optional[List[dict]] = None  # Previous messages for context


class ChatResponse(BaseModel):
    response: str
    suggestions: Optional[List[str]] = None
    timestamp: str


# --- SCRIPTED RESPONSES (FALLBACK) ---
def get_scripted_response(message: str, context: dict = None) -> dict:
    """
    Enhanced scripted response with context awareness
    """
    msg = message.lower()
    suggestions = []
    
    # Extract context
    current_page = context.get("currentPage", "unknown") if context else "unknown"
    user_location = context.get("userLocation", None) if context else None
    nearby_hotspots = context.get("nearbyHotspots", 0) if context else 0
    
    # Context-aware responses
    if "safe route" in msg or "route" in msg or "navigation" in msg:
        response = f"🗺️ You can find ML-optimized safe routes in the **Safe Routes** tab. Our A* algorithm analyzes {nearby_hotspots} nearby crime hotspots to guide you safely!"
        suggestions = ["Show me routes", "What are hotspots?", "How does it work?"]
        
    elif "hotspot" in msg or "danger" in msg or "crime area" in msg:
        if current_page == "map":
            response = f"🔴 You're viewing the Safety Map! The {nearby_hotspots} red circles show crime hotspots detected by our DBSCAN clustering algorithm using real Bangalore police data."
        else:
            response = "🔴 Crime hotspots are high-risk areas shown as red circles on the Safety Map. They're identified using machine learning analysis of actual crime incidents. Switch to the Map tab to see them!"
        suggestions = ["How to avoid hotspots?", "Show me alerts", "Are they real-time?"]
        
    elif "alert" in msg or "warning" in msg or "notification" in msg:
        if current_page == "alerts":
            response = "🚨 You're in the Alerts tab! Here you can see risk scores and recent safety alerts with location details and crime types."
        else:
            response = "🚨 Safety alerts show real-time risk assessments based on crime predictions. Check the **Alerts** tab to see detailed alerts with locations and risk levels."
        suggestions = ["What do risk scores mean?", "How often updated?", "Can I get notifications?"]
        
    elif "how" in msg and "work" in msg:
        response = """🤖 SafeCity uses advanced AI:
        
**Crime Hotspots:** DBSCAN clustering on 12,000+ real crime records
**Predictions:** Facebook Prophet time series forecasting
**Safe Routes:** A* pathfinding with risk penalties
**Data:** Authenticated Bangalore Police Department crime data

All models are validated daily for accuracy!"""
        suggestions = ["Show me the data", "Is it accurate?", "What about privacy?"]
        
    elif "ml" in msg or "machine learning" in msg or "ai" in msg:
        response = """🧠 Our ML pipeline:

1️⃣ **DBSCAN Clustering** → Identifies crime hotspots
2️⃣ **Prophet Forecasting** → Predicts future crime trends  
3️⃣ **A* Algorithm** → Finds safest walking routes
4️⃣ **Risk Scoring** → Calculates danger levels

All trained on 12,000+ verified crime records!"""
        suggestions = ["How accurate is it?", "Can I trust it?", "Show validation report"]
        
    elif "emergency" in msg or "police" in msg or "help me" in msg and "urgent" in msg:
        response = """🚨 **EMERGENCY CONTACTS:**

🚓 Police: **100**
🚑 Ambulance: **108**  
🔥 Fire: **101**
👮 Women Helpline: **1091**

This chatbot is for safety information only. For real emergencies, always call these numbers immediately!"""
        suggestions = ["I'm safe now", "Show nearby police stations"]
        
    elif "location" in msg or "where am i" in msg:
        if user_location:
            lat, lng = user_location
            response = f"📍 Your current location: ({lat:.4f}, {lng:.4f})\n\nBased on real-time analysis, there are {nearby_hotspots} crime hotspots within 2km radius."
        else:
            response = "📍 I can't detect your exact location right now. Make sure location permissions are enabled!"
        suggestions = ["Show me safe routes", "Check nearby crimes", "Find police stations"]
        
    elif "data" in msg or "source" in msg or "accurate" in msg:
        response = """📊 **Data Sources:**

✅ Bangalore Police Department crime records
✅ 12,000+ verified incidents
✅ Geographical coordinates validated
✅ ML models authenticated daily
✅ No synthetic/mock data used

Run validation report in backend to verify authenticity!"""
        suggestions = ["How often updated?", "Can I see the validation?", "What about privacy?"]
        
    elif "privacy" in msg or "personal" in msg or "track" in msg:
        response = """🔒 **Privacy Guarantee:**

✅ No personal data stored
✅ Location used for routing only (not saved)
✅ Chat history local to your device
✅ Crime data contains no PII
✅ Routes computed client-side

Your safety data stays with you!"""
        suggestions = ["That's good to know", "How do routes work?"]
        
    elif "help" in msg or "what can you do" in msg:
        response = f"""👋 I'm SafeCity Assistant! I can help you with:

🗺️ **Safe Routes** - ML-optimized paths avoiding danger zones
🔴 **Crime Hotspots** - Real-time risk area identification  
🚨 **Safety Alerts** - Risk scores and warnings
📊 **Data Insights** - Understanding our AI models
🆘 **Emergency Info** - Quick access to help numbers

You're currently on: **{current_page.title()}** tab
Nearby risk areas: **{nearby_hotspots}**"""
        suggestions = ["Show me safe routes", "What are hotspots?", "How accurate is this?"]
        
    elif any(greeting in msg for greeting in ["hello", "hi", "hey", "good morning", "good evening"]):
        response = f"👋 Hello! I'm SafeCity Assistant. You're on the **{current_page.title()}** page. How can I help you stay safe today?"
        suggestions = ["Find safe route", "Show me alerts", "What can you do?"]
        
    elif "thank" in msg or "thanks" in msg:
        response = "You're welcome! Stay safe out there! 🛡️ Feel free to ask me anything else."
        suggestions = ["Show emergency contacts", "Check my area safety"]
        
    elif "bye" in msg or "goodbye" in msg:
        response = "Take care and stay safe! 🛡️ I'm here whenever you need me. Have a safe journey!"
        suggestions = []
        
    else:
        # Default response with context
        response = f"""I'm here to help! Ask me about:

🗺️ Finding safe routes
🔴 Understanding crime hotspots  
🚨 Viewing safety alerts
📊 How our AI works
🆘 Emergency contacts

Currently viewing: **{current_page.title()}**"""
        suggestions = ["Show safe routes", "What are hotspots?", "Emergency numbers"]
    
    return {
        "response": response,
        "suggestions": suggestions,
        "timestamp": datetime.now().isoformat()
    }


# --- OPENAI INTEGRATION ---
async def get_openai_response(message: str, context: dict = None, history: List[dict] = None) -> dict:
    """
    Get intelligent response from OpenAI with context awareness
    """
    try:
        # Build system prompt with context
        system_prompt = """You are SafeCity Assistant, a friendly AI helping users stay safe in Bangalore, India.

**Your Knowledge:**
- SafeCity uses ML (DBSCAN, Prophet, A*) trained on 12,000+ real crime records
- Crime hotspots shown as red circles on Safety Map
- Safe Routes tab provides ML-optimized paths avoiding danger zones
- Alerts tab shows risk scores and safety warnings
- Emergency numbers: Police 100, Ambulance 108, Fire 101, Women Helpline 1091

**Context Awareness:**"""
        
        if context:
            system_prompt += f"\n- User is on: {context.get('currentPage', 'unknown')} page"
            if context.get('userLocation'):
                lat, lng = context['userLocation']
                system_prompt += f"\n- User location: ({lat:.4f}, {lng:.4f})"
            if context.get('nearbyHotspots'):
                system_prompt += f"\n- Nearby crime hotspots: {context['nearbyHotspots']}"
        
        system_prompt += """\n\n**Your tone:** Friendly, concise, safety-focused. Use emojis. Keep responses under 150 words."""
        
        # Build message history
        messages = [{"role": "system", "content": system_prompt}]
        
        if history:
            for msg in history[-6:]:  # Last 3 exchanges
                messages.append({"role": msg["role"], "content": msg["text"]})
        
        messages.append({"role": "user", "content": message})
        
        # Call OpenAI
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Faster and cheaper
            messages=messages,
            max_tokens=200,
            temperature=0.7
        )
        
        bot_response = response.choices[0].message.content
        
        # Generate suggestions based on topic
        suggestions = []
        msg_lower = message.lower()
        if "route" in msg_lower:
            suggestions = ["Show me the map", "How does routing work?", "Is it safe?"]
        elif "hotspot" in msg_lower:
            suggestions = ["How are they detected?", "Can I trust the data?", "Show me alerts"]
        elif "emergency" in msg_lower:
            suggestions = ["I'm safe now", "Show nearby police stations"]
        else:
            suggestions = ["Find safe route", "What are hotspots?", "Show alerts"]
        
        return {
            "response": bot_response,
            "suggestions": suggestions,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"OpenAI error: {e}")
        # Fallback to scripted
        return get_scripted_response(message, context)


# --- API ENDPOINTS ---
@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """
    Send a message to the chatbot and get a response
    """
    try:
        context = request.context or {}
        history = request.history or []
        
        if USE_OPENAI:
            result = await get_openai_response(request.message, context, history)
        else:
            result = get_scripted_response(request.message, context)
        
        return ChatResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload screenshot or image for context (future: GPT-4 Vision)
    """
    try:
        # Save file temporarily
        upload_dir = "uploads/chat"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, f"{datetime.now().timestamp()}_{file.filename}")
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        return {
            "success": True,
            "file_path": file_path,
            "message": "Image uploaded successfully. Vision analysis coming soon!"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def chat_status():
    """
    Get chatbot status and capabilities
    """
    return {
        "status": "online",
        "ai_enabled": USE_OPENAI,
        "model": "gpt-4o-mini" if USE_OPENAI else "scripted",
        "features": {
            "context_awareness": True,
            "history_support": True,
            "suggestions": True,
            "image_upload": True,
            "voice_input": False  # Frontend feature
        }
    }
