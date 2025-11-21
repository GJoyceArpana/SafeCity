import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mic, MicOff, Paperclip } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
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

export function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'bot',
      text: 'Hi! I\'m SafeCity Assistant 🤖. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load chat history from localStorage
  useEffect(() => {
    if (user?.email) {
      const storageKey = `safecity_chat_history_${user.email.replace(/[@.]/g, '_')}`;
      const savedMessages = localStorage.getItem(storageKey);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          const restored = parsed.map((msg: any) => ({
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
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file);
    } else {
      alert('Please select an image file');
    }
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all chat history?')) {
      const storageKey = `safecity_chat_history_${user?.email?.replace(/[@.]/g, '_')}`;
      localStorage.removeItem(storageKey);
      setMessages([
        {
          role: 'bot',
          text: 'Hi! I\'m SafeCity Assistant 🤖. How can I help you today?',
          timestamp: new Date(),
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

  const getFallbackResponse = (userMessage: string): string => {
    const msg = userMessage.toLowerCase();

    if (msg.includes('safe route') || msg.includes('route') || msg.includes('navigation')) {
      return 'You can check the Safe Routes tab for ML-powered safest paths that avoid crime hotspots! 🗺️';
    }
    
    if (msg.includes('hotspot') || msg.includes('danger') || msg.includes('crime')) {
      return 'Avoid high-intensity hotspots shown as red circles on the Safety Map. Our AI analyzes real crime data to identify these areas. 🔴';
    }
    
    if (msg.includes('alert') || msg.includes('warning') || msg.includes('notification')) {
      return 'You can view recent safety alerts in the Alerts tab. They show risk scores and locations based on real-time analysis. 🚨';
    }
    
    if (msg.includes('help') || msg.includes('what can you do')) {
      return 'I can help you with:\n• Finding safe routes 🗺️\n• Understanding crime hotspots 🔴\n• Viewing safety alerts 🚨\n• General safety tips 🛡️\n\nJust ask me anything!';
    }
    
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
      return 'Hello! How can I assist you with your safety today? 👋';
    }
    
    if (msg.includes('thank') || msg.includes('thanks')) {
      return 'You\'re welcome! Stay safe out there! 🛡️';
    }
    
    if (msg.includes('police') || msg.includes('emergency')) {
      return 'For emergencies, always call 100 (Police) or 108 (Ambulance) immediately. This assistant is for safety information only. 🚨';
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
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setUploadedFile(null); // Clear uploaded file

    // Get bot response from backend
    try {
      const botText = await sendMessageToBackend(messageText);
      
      const botResponse: ChatMessage = {
        role: 'bot',
        text: botText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error('Error getting bot response:', error);
      const fallbackResponse: ChatMessage = {
        role: 'bot',
        text: getFallbackResponse(messageText),
        timestamp: new Date(),
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
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    msg.role === 'user'
                      ? 'bg-[#00BFFF] text-white'
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
            {/* File Upload Preview */}
            {uploadedFile && (
              <div className="mb-2 flex items-center gap-2 p-2 bg-gray-800 rounded text-xs text-gray-300">
                <span>📎 {uploadedFile.name}</span>
                <button onClick={() => setUploadedFile(null)} className="ml-auto text-red-400 hover:text-red-300">
                  ✕
                </button>
              </div>
            )}
            
            <div className="flex gap-2 items-end">
              {/* File Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition border border-gray-600"
                title="Upload image"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
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
                disabled={!inputValue.trim() && !uploadedFile}
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
