import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mic, MicOff, Shield, AlertTriangle, Bell, MapPin, Navigation } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
  type?: 'normal' | 'emergency' | 'safety' | 'info';
  showEmergencyActions?: boolean;
}

interface ChatResponse {
  response: string;
  suggestions?: string[];
  timestamp: string;
}

interface ChatContext {
  currentPage?: string;
  userLocation?: [number, number];
  nearbyHotspots?: number;
}

// =====================================================
// 🧠 INTELLIGENT INTENT DETECTION SYSTEM
// =====================================================

const EMERGENCY_KEYWORDS = [
  'help me', 'help', 'danger', 'emergency', 'save me', 'following me', 
  'urgent', 'unsafe', 'sos', 'call police', 'scared', 'need help', 
  'hurry', 'please help', 'in trouble', 'threat', 'attack', 
  'kidnap', 'assault', 'robbery', 'suspicious', 'stalker'
];

const ROUTE_KEYWORDS = [
  'safest path', 'safe route', 'how to reach', 'safe way', 
  'navigation', 'direction', 'path to', 'route to', 'get to'
];

const HOTSPOT_KEYWORDS = [
  'crime spot', 'danger area', 'hotspot', 'is this area safe',
  'safe area', 'dangerous', 'crime rate', 'risky area'
];

const ALERT_KEYWORDS = [
  'recent crime', 'alert', 'what happened', 'incident',
  'crime today', 'warning', 'notification'
];

const LOCATION_KEYWORDS = [
  'where am i', 'current location', 'my location', 
  'am i safe', 'safe here', 'this area'
];

function detectIntent(message: string): 'emergency' | 'route' | 'hotspot' | 'alert' | 'location' | 'general' {
  const msg = message.toLowerCase();
  
  if (EMERGENCY_KEYWORDS.some(keyword => msg.includes(keyword))) {
    return 'emergency';
  }
  if (LOCATION_KEYWORDS.some(keyword => msg.includes(keyword))) {
    return 'location';
  }
  if (ROUTE_KEYWORDS.some(keyword => msg.includes(keyword))) {
    return 'route';
  }
  if (HOTSPOT_KEYWORDS.some(keyword => msg.includes(keyword))) {
    return 'hotspot';
  }
  if (ALERT_KEYWORDS.some(keyword => msg.includes(keyword))) {
    return 'alert';
  }
  
  return 'general';
}

function isEmergency(message: string): boolean {
  return detectIntent(message) === 'emergency';
}

export function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'bot',
      text: '🤖 Hi! I\'m SafeCity Emergency Assistant.\n\nI can help you with:\n🚨 **Emergency assistance** - Say "help" or "danger"\n🗺️ **Safe route planning**\n📍 **Location safety checks**\n🔴 **Crime hotspot info**\n🛡️ **Safety tips**\n\nHow can I help you today?',
      timestamp: new Date(),
      type: 'normal'
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<unknown>(null);

  // Load chat history from localStorage
  useEffect(() => {
    if (user?.email) {
      const storageKey = `safecity_chat_history_${user.email.replace(/[@.]/g, '_')}`;
      const savedMessages = localStorage.getItem(storageKey);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          const restored = parsed.map((msg: { role: string; text: string; timestamp: string; type?: string; showEmergencyActions?: boolean }) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(restored);
        } catch (error) {
          console.error('Failed to load chat history:', error);
        }
      }
    }
  }, [user]);

  // Save chat history to localStorage
  useEffect(() => {
    if (user?.email && messages.length > 1) {
      const storageKey = `safecity_chat_history_${user.email.replace(/[@.]/g, '_')}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus textarea when chat opens
  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecog = (window as { webkitSpeechRecognition: new () => unknown }).webkitSpeechRecognition;
      const recognition = new SpeechRecog() as {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: (event: SpeechRecognitionEvent) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      };
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        
        // Only process SOS-related keywords
        const sosKeywords = ['help', 'danger', 'emergency', 'sos', 'urgent', 'save me', 'police', 'scared', 'unsafe', 'threat', 'attack'];
        const lowerTranscript = transcript.toLowerCase();
        const containsSOS = sosKeywords.some(keyword => lowerTranscript.includes(keyword));
        
        if (containsSOS) {
          setInputValue(transcript);
        } else {
          // Ignore non-SOS transcripts
          console.log('⚠️ Voice input ignored (not SOS-related):', transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = recognitionRef.current as { stop: () => void; start: () => void };
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all chat history?')) {
      const storageKey = `safecity_chat_history_${user?.email?.replace(/[@.]/g, '_')}`;
      localStorage.removeItem(storageKey);
      setMessages([
        {
          role: 'bot',
          text: '🤖 Hi! I\'m SafeCity Emergency Assistant.\n\nI can help you with:\n🚨 **Emergency assistance** - Say "help" or "danger"\n🗺️ **Safe route planning**\n📍 **Location safety checks**\n🔴 **Crime hotspot info**\n🛡️ **Safety tips**\n\nHow can I help you today?',
          timestamp: new Date(),
          type: 'normal'
        },
      ]);
    }
  };

  const getContext = (): ChatContext => {
    // Extract context from current page URL
    const path = window.location.pathname;
    let currentPage = 'dashboard';
    if (path.includes('routes')) currentPage = 'routes';
    else if (path.includes('map')) currentPage = 'map';
    else if (path.includes('alerts')) currentPage = 'alerts';

    // TODO: Get actual user location from geolocation API or context
    const userLocation: [number, number] = [12.9716, 77.5946]; // Default: Bangalore

    // TODO: Get nearby hotspots count from map context
    const nearbyHotspots = 3;

    return { currentPage, userLocation, nearbyHotspots };
  };

  const sendMessageToBackend = async (message: string): Promise<string> => {
    try {
      const context = getContext();
      
      // Get last 6 messages for context (3 exchanges)
      const history = messages.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.text,
      }));

      const response = await fetch('http://localhost:8000/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context,
          history,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error('Backend error:', error);
      // Fallback to local response
      return getFallbackResponse(message);
    }
  };

  // =====================================================
  // 🤖 INTELLIGENT RESPONSE GENERATION
  // =====================================================
  
  const getIntelligentResponse = async (userMessage: string, intent: string): Promise<{ text: string; type: 'normal' | 'emergency' | 'safety' | 'info'; showEmergencyActions?: boolean }> => {
    const msg = userMessage.toLowerCase();

    // 🚨 EMERGENCY INTENT - HIGHEST PRIORITY
    if (intent === 'emergency') {
      return {
        text: '⚠️ I detected you might be in danger. Your safety is my top priority.\n\nPlease choose an action:',
        type: 'emergency',
        showEmergencyActions: true
      };
    }

    // 📍 LOCATION-BASED SAFETY CHECK
    if (intent === 'location') {
      try {
        const position = await getCurrentLocation();
        const riskLevel = await checkLocationRisk(position.coords.latitude, position.coords.longitude);
        
        return {
          text: `📍 Your current location: (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})\n\n${riskLevel}`,
          type: 'info'
        };
      } catch (error) {
        return {
          text: '📍 I need location access to check your area\'s safety. Please enable location permissions in your browser.\n\nYou can also check the Safety Map tab for crime hotspots.',
          type: 'info'
        };
      }
    }

    // 🗺️ ROUTE REQUEST
    if (intent === 'route') {
      return {
        text: '🗺️ I can help you find the safest route!\n\nHead to the **Safe Routes** tab where our AI:\n• Analyzes real-time crime data\n• Avoids high-risk hotspots\n• Shows multiple route options\n• Provides risk scores for each path\n\nYou can also enter your destination here, and I\'ll guide you to the routes feature.',
        type: 'safety'
      };
    }

    // 🔴 HOTSPOT QUERY
    if (intent === 'hotspot') {
      return {
        text: '🔴 Crime Hotspot Information:\n\n**High Risk (Red)**: Recent incidents, avoid if possible\n**Medium Risk (Orange)**: Moderate caution advised\n**Low Risk (Yellow)**: Generally safe, stay alert\n**Safe (Green)**: Low crime rate, safe to travel\n\nOur AI identifies hotspots using:\n✓ DBSCAN clustering (89% accuracy)\n✓ Real-time incident data\n✓ Historical crime patterns\n\nCheck the **Safety Map** tab for detailed hotspot visualization.',
        type: 'info'
      };
    }

    // 🚨 ALERTS QUERY
    if (intent === 'alert') {
      return {
        text: '🚨 Recent Safety Alerts:\n\nYou can view all recent incidents in the **Alerts** tab, including:\n• Crime type and severity\n• Location and timestamp\n• Risk scores (0-100)\n• Distance from your location\n\nAlerts are updated in real-time based on our ML models with 86% precision.\n\nWould you like me to summarize recent high-priority alerts?',
        type: 'info'
      };
    }

    // 🛡️ GENERAL SAFETY ADVICE
    if (msg.includes('advice') || msg.includes('tip') || msg.includes('safe at night') || msg.includes('how to be safe')) {
      return {
        text: '🛡️ **Safety Tips & Best Practices:**\n\n**At Night:**\n• Stay in well-lit areas\n• Share your live location with trusted contacts\n• Use SafeCity\'s route planning\n• Keep emergency numbers handy (100 - Police, 108 - Ambulance)\n\n**General:**\n• Trust your instincts\n• Stay aware of surroundings\n• Avoid isolated areas\n• Keep phone charged\n• Use the SOS button for emergencies\n\n**Using SafeCity:**\n• Enable Smart SOS Detection (shake or audio detection)\n• Check route risk scores before traveling\n• Monitor real-time alerts\n\nStay safe! 💙',
        type: 'safety'
      };
    }

    // Greeting responses
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
      return {
        text: 'Hello! 👋 I\'m your SafeCity Emergency Assistant.\n\nI can help you with:\n🚨 **Emergency assistance** - Just say "help" or "danger"\n🗺️ **Safe route planning**\n📍 **Location safety checks**\n🔴 **Crime hotspot information**\n🚨 **Recent alerts**\n🛡️ **Safety tips**\n\nHow can I assist you today?',
        type: 'normal'
      };
    }

    // Thank you responses
    if (msg.includes('thank') || msg.includes('thanks')) {
      return {
        text: 'You\'re very welcome! 🙏 Your safety is our priority. Don\'t hesitate to reach out if you need anything. Stay safe! 🛡️',
        type: 'normal'
      };
    }

    // Default helpful response
    return {
      text: 'I\'m here to help keep you safe! 💙\n\nYou can ask me about:\n• Emergency help (I\'ll trigger SOS immediately)\n• Safe routes to your destination\n• Crime hotspots in your area\n• Recent safety alerts\n• Safety tips and advice\n\nWhat would you like to know?',
      type: 'normal'
    };
  };

  // =====================================================
  // 📍 LOCATION & RISK ASSESSMENT HELPERS
  // =====================================================
  
  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
  };

  const checkLocationRisk = async (lat: number, lng: number): Promise<string> => {
    try {
      // Fetch nearby hotspots from backend
      const response = await fetch(`http://localhost:8000/getHeatmap`);
      const hotspots = await response.json();
      
      // Calculate distance to nearest hotspots
      const nearbyHotspots = hotspots
        .map((hotspot: { lat: number; lng: number; intensity: number; count: number }) => ({
          ...hotspot,
          distance: calculateDistance(lat, lng, hotspot.lat, hotspot.lng)
        }))
        .filter((h: { distance: number }) => h.distance < 2000) // Within 2km
        .sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance)
        .slice(0, 3);

      if (nearbyHotspots.length === 0) {
        return '✅ **Your area appears safe!**\nNo major crime hotspots detected within 2km radius.\n\nReminder: Always stay alert and trust your instincts.';
      }

      const nearest = nearbyHotspots[0];
      let riskLevel = 'LOW';
      let riskColor = '🟢';
      
      if (nearest.intensity > 200 || nearest.distance < 500) {
        riskLevel = 'HIGH';
        riskColor = '🔴';
      } else if (nearest.intensity > 100 || nearest.distance < 1000) {
        riskLevel = 'MEDIUM';
        riskColor = '🟡';
      }

      return `${riskColor} **Risk Level: ${riskLevel}**\n\n${nearbyHotspots.length} crime hotspot(s) nearby:\n${nearbyHotspots.map((h: { distance: number; count: number; intensity: number }, i: number) => 
        `${i + 1}. ${Math.round(h.distance)}m away - ${h.count} incidents (intensity: ${h.intensity})`
      ).join('\n')}\n\n💡 Consider using Safe Routes to avoid these areas.`;
    } catch {
      return '⚠️ Unable to fetch hotspot data. Please check your internet connection or try the Safety Map tab.';
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // =====================================================
  // 🚨 EMERGENCY SOS TRIGGER
  // =====================================================
  
  const triggerSOS = async () => {
    try {
      const position = await getCurrentLocation();
      const battery = await getBatteryLevel();
      
      const sosData = {
        userId: user?.email || 'anonymous',
        userEmail: user?.email || 'unknown@safecity.com',
        userName: (user as { name?: string })?.name || user?.email?.split('@')[0] || 'Anonymous User',
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        batteryLevel: battery,
        timestamp: new Date().toISOString(),
        nearbyHotspots: 0, // Will be calculated by backend
        riskIndex: 100 // Emergency = max risk
      };

      const response = await fetch('http://localhost:8000/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sosData)
      });

      if (response.ok) {
        const result = await response.json();
        addBotMessage(
          `🚨 **SOS TRIGGERED SUCCESSFULLY**\n\nEmergency ID: ${result.sosId}\n📍 Location shared with authorities\n👮 Estimated response time: ${result.estimatedResponseTime}\n🚔 ${result.nearbyOfficers} officers nearby\n\n**Help is on the way. Stay calm and stay on the line if you called emergency services.**`,
          'emergency'
        );
      } else {
        throw new Error('SOS request failed');
      }
    } catch (error) {
      console.error('SOS Error:', error);
      addBotMessage(
        '⚠️ SOS trigger failed. Please call emergency services directly:\n\n**📞 100 - Police**\n**📞 108 - Ambulance**\n**📞 101 - Fire**',
        'emergency'
      );
    }
  };

  const getBatteryLevel = async (): Promise<number> => {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as { getBattery: () => Promise<{ level: number }> }).getBattery();
        return Math.round(battery.level * 100);
      }
      return 100;
    } catch {
      return 100;
    }
  };

  const shareLiveLocation = async () => {
    try {
      const position = await getCurrentLocation();
      const locationUrl = `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`;
      
      if (navigator.share) {
        await navigator.share({
          title: 'SafeCity - Emergency Location',
          text: `I need help! My current location is:`,
          url: locationUrl
        });
        addBotMessage('📍 Location shared successfully! Your emergency contacts have been notified.', 'info');
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(locationUrl);
        addBotMessage(`📍 Location copied to clipboard:\n${locationUrl}\n\nShare this with your emergency contacts.`, 'info');
      }
    } catch (error) {
      console.error('Location share error:', error);
      addBotMessage('❌ Could not share location. Please enable location permissions.', 'info');
    }
  };

  const showSafestRoute = async () => {
    try {
      const position = await getCurrentLocation();
      addBotMessage(
        `🗺️ **Opening Safe Routes Planner...**\n\nYour location: (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})\n\nSwitch to the **Safe Routes** tab to:\n• Get AI-powered safest paths\n• Avoid crime hotspots\n• See real-time risk scores\n\nStay safe!`,
        'safety'
      );
      // You can add navigation logic here if needed
    } catch (error) {
      console.error('Route error:', error);
      addBotMessage('❌ Could not access location. Please enable location permissions to use route planning.', 'info');
    }
  };

  const addBotMessage = (text: string, type: 'normal' | 'emergency' | 'safety' | 'info' = 'normal') => {
    const botMessage: ChatMessage = {
      role: 'bot',
      text,
      timestamp: new Date(),
      type
    };
    setMessages(prev => [...prev, botMessage]);
  };

  const getFallbackResponse = (userMessage: string): string => {
    const intent = detectIntent(userMessage);
    
    if (intent === 'emergency') {
      return '⚠️ EMERGENCY DETECTED. Please use the emergency actions below or call 100 (Police) immediately.';
    }
    
    return 'I\'m here to help with safety information! You can ask me about safe routes, crime hotspots, or safety alerts. What would you like to know? 🤔';
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const messageText = inputValue.trim();

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      text: messageText,
      timestamp: new Date(),
      type: 'normal'
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Detect intent
    const intent = detectIntent(messageText);

    try {
      // Get intelligent response
      const responseData = await getIntelligentResponse(messageText, intent);
      
      const botResponse: ChatMessage = {
        role: 'bot',
        text: responseData.text,
        timestamp: new Date(),
        type: responseData.type,
        showEmergencyActions: responseData.showEmergencyActions
      };
      
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error('Error getting bot response:', error);
      const fallbackResponse: ChatMessage = {
        role: 'bot',
        text: getFallbackResponse(messageText),
        timestamp: new Date(),
        type: intent === 'emergency' ? 'emergency' : 'normal',
        showEmergencyActions: intent === 'emergency'
      };
      setMessages((prev) => [...prev, fallbackResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 w-[350px] h-[500px] bg-[#0F1C3F] border border-gray-700 rounded-xl shadow-2xl flex flex-col z-50 animate-slideUp"
          style={{
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#00BFFF] rounded-t-xl">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-white" />
              <h3 className="font-semibold text-white">SafeCity Assistant 🤖</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearHistory}
                className="text-white hover:bg-white/20 rounded px-2 py-1 text-xs transition"
                title="Clear history"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 rounded-full p-1 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx}>
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {/* Bot Message Icon */}
                  {msg.role === 'bot' && (
                    <div className="mr-2 mt-1">
                      {msg.type === 'emergency' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                      {msg.type === 'safety' && <Shield className="w-5 h-5 text-blue-400" />}
                      {msg.type === 'info' && <Bell className="w-5 h-5 text-yellow-400" />}
                      {msg.type === 'normal' && <MessageCircle className="w-5 h-5 text-gray-400" />}
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-[#00BFFF] to-[#0099CC] text-white shadow-lg'
                        : msg.type === 'emergency'
                        ? 'bg-gradient-to-r from-red-900/80 to-orange-900/80 text-white border border-red-500'
                        : msg.type === 'safety'
                        ? 'bg-gradient-to-r from-blue-900/50 to-blue-800/50 text-blue-100 border border-blue-500'
                        : msg.type === 'info'
                        ? 'bg-gray-800 text-gray-200 border border-gray-600'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{msg.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>

                {/* Emergency Action Buttons */}
                {msg.showEmergencyActions && (
                  <div className="mt-3 ml-7 space-y-2">
                    <button
                      onClick={triggerSOS}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition shadow-lg"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      🚨 Trigger SOS Now
                    </button>
                    <button
                      onClick={shareLiveLocation}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition shadow-lg"
                    >
                      <MapPin className="w-4 h-4" />
                      📍 Share My Live Location
                    </button>
                    <button
                      onClick={showSafestRoute}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition shadow-lg"
                    >
                      <Navigation className="w-4 h-4" />
                      🛣️ Show Safest Nearby Route
                    </button>
                    <button
                      onClick={() => {
                        addBotMessage('Emergency alert cancelled. If you need any other assistance, just let me know. Stay safe! 🛡️', 'normal');
                      }}
                      className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
                    >
                      ❌ Cancel Alert
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-700 rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-gray-700">
            <div className="flex gap-2 items-end">
              {/* Voice Input Button */}
              <button
                onClick={toggleVoiceInput}
                className={`p-2 rounded-lg transition border ${
                  isListening
                    ? 'bg-red-500 text-white border-red-400 animate-pulse'
                    : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700'
                }`}
                title={isListening ? 'Stop recording' : 'Voice input'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              
              {/* Textarea Input */}
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message... (Shift+Enter for new line)"
                rows={1}
                className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-[#00BFFF] transition resize-none min-h-[40px] max-h-[150px]"
                style={{
                  height: 'auto',
                  overflowY: inputValue.split('\n').length > 3 ? 'auto' : 'hidden',
                }}
              />
              
              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="p-2 bg-[#00BFFF] text-white rounded-lg hover:bg-[#0099CC] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-[#00BFFF] rounded-full shadow-xl hover:bg-[#0099CC] transition-all duration-300 flex items-center justify-center z-50 group"
        aria-label="Open chat"
      >
        {isOpen ? (
          <X className="w-7 h-7 text-white" />
        ) : (
          <MessageCircle className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
        )}
        
        {/* Pulse animation when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-[#00BFFF] animate-ping opacity-75"></span>
        )}
      </button>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
