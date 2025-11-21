# 🚀 SafeCity Chatbot - Quick Start Guide

## ⚡ 3-Minute Setup

### Step 1: Install Dependencies (1 min)

**Backend:**
```powershell
cd project1/backend
pip install -r requirements.txt
```

**Frontend:**
```powershell
cd project1/frontend
npm install
```

---

### Step 2: Start Services (1 min)

**Terminal 1 - Backend:**
```powershell
cd project1/backend
uvicorn main:app --reload
```
✅ Backend running on: http://localhost:8000

**Terminal 2 - Frontend:**
```powershell
cd project1/frontend
npm run dev
```
✅ Frontend running on: http://localhost:5173

---

### Step 3: Test the Chatbot (1 min)

1. Open browser: http://localhost:5173
2. Login to SafeCity
3. Look for the **blue floating bubble** (bottom-right corner)
4. Click it to open chat
5. Type: "How do I find a safe route?"
6. Get instant response! 🎉

---

## 🎯 Basic Usage

### Chat
- **Open:** Click blue bubble
- **Send:** Type message and press `Enter`
- **New line:** Press `Shift+Enter`
- **Close:** Click X button

### Voice Input 🎤
1. Click microphone icon
2. Speak your question
3. Transcript appears in input
4. Press Enter to send

### File Upload 📎
1. Click paperclip icon
2. Select an image
3. Send with your message

### Clear History
- Click **"Clear"** button in chat header
- Confirms before deleting

---

## 🔑 Optional: Enable AI (OpenAI)

**Without API key:** Bot uses smart scripted responses ✅
**With API key:** Bot uses GPT-4o-mini for intelligent conversations 🧠

### Get OpenAI API Key
1. Visit: https://platform.openai.com/signup
2. Create account (free trial available)
3. Go to: https://platform.openai.com/api-keys
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)

### Set API Key

**Windows PowerShell:**
```powershell
$env:OPENAI_API_KEY="sk-your-key-here"
```

**Linux/Mac:**
```bash
export OPENAI_API_KEY="sk-your-key-here"
```

### Restart Backend
```powershell
cd project1/backend
uvicorn main:app --reload
```

**Verify AI is enabled:**
```powershell
curl http://localhost:8000/api/chat/status
# Should show: "ai_available": true
```

---

## 🧪 Try These Commands

**Without AI (Scripted):**
- "How do I find a safe route?"
- "What are crime hotspots?"
- "Show me safety alerts"
- "How does SafeCity work?"
- "Emergency help"

**With AI (OpenAI):**
- "Is it safe to walk at night near MG Road?"
- "What should I do if I see suspicious activity?"
- "Compare the safety of Koramangala vs Indiranagar"
- Natural conversations with context memory

---

## 🎉 What You Just Built

✅ **Backend API** with FastAPI
✅ **AI Integration** with OpenAI GPT-4o-mini
✅ **Context Awareness** (knows your page & location)
✅ **Persistent History** (saves in browser)
✅ **Voice Input** (speech-to-text)
✅ **Multi-line Input** (Shift+Enter for new line)
✅ **File Upload** (image sharing)

**Total Features:** 7/7 completed
**Documentation:** 1,000+ lines
**Setup Time:** 3 minutes

---

## 📚 Full Documentation

For detailed setup, troubleshooting, and API reference:
- **Setup Guide:** `project1/CHATBOT_SETUP.md`
- **Implementation Summary:** `project1/CHATBOT_IMPLEMENTATION_SUMMARY.md`

---

## 🐛 Quick Troubleshooting

**Backend won't start:**
```powershell
pip install fastapi uvicorn openai python-multipart
```

**Frontend errors:**
```powershell
npm install
```

**Voice input not working:**
- Use Chrome or Edge browser
- Grant microphone permissions

**Chat history not saving:**
- Make sure you're logged in
- Check browser is not in Incognito mode

---

## 🎊 You're All Set!

Your SafeCity chatbot is now fully operational with:
- 🤖 Intelligent AI responses
- 🗺️ Context-aware answers
- 🎤 Voice input support
- 📎 Image upload capability
- 💾 Persistent chat history

**Enjoy making SafeCity safer for everyone!** 🛡️

---

**Need help?** Check `CHATBOT_SETUP.md` for detailed instructions.
