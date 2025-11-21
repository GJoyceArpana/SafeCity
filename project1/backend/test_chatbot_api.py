"""
SafeCity Chatbot - API Testing Script

This script tests all chatbot endpoints to verify functionality.
Run this after starting the backend server.

Usage:
    python test_chatbot_api.py
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
CHAT_ENDPOINT = f"{BASE_URL}/api/chat/message"
UPLOAD_ENDPOINT = f"{BASE_URL}/api/chat/upload-image"
STATUS_ENDPOINT = f"{BASE_URL}/api/chat/status"

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test(name, status, details=""):
    """Print test result with color"""
    symbol = "✅" if status else "❌"
    color = GREEN if status else RED
    print(f"{symbol} {color}{name}{RESET}")
    if details:
        print(f"   {details}\n")

def test_status_endpoint():
    """Test GET /api/chat/status"""
    print(f"\n{BLUE}Testing Status Endpoint...{RESET}")
    try:
        response = requests.get(STATUS_ENDPOINT)
        if response.status_code == 200:
            data = response.json()
            print_test(
                "Status endpoint accessible",
                True,
                f"Status: {data.get('status')}, AI: {data.get('ai_available')}"
            )
            return True
        else:
            print_test("Status endpoint failed", False, f"Status code: {response.status_code}")
            return False
    except Exception as e:
        print_test("Status endpoint error", False, str(e))
        return False

def test_chat_scripted():
    """Test chat with scripted response"""
    print(f"\n{BLUE}Testing Scripted Responses...{RESET}")
    
    test_cases = [
        {
            "name": "Safe route query",
            "message": "How do I find a safe route?",
            "context": {"currentPage": "routes", "userLocation": [12.9716, 77.5946]},
            "expected_keywords": ["route", "safe"]
        },
        {
            "name": "Hotspot query",
            "message": "What are crime hotspots?",
            "context": {"currentPage": "map", "nearbyHotspots": 3},
            "expected_keywords": ["hotspot", "crime"]
        },
        {
            "name": "Emergency query",
            "message": "Emergency help",
            "context": {},
            "expected_keywords": ["100", "emergency"]
        }
    ]
    
    for test in test_cases:
        try:
            payload = {
                "message": test["message"],
                "context": test["context"],
                "history": []
            }
            
            response = requests.post(CHAT_ENDPOINT, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                response_text = data.get("response", "").lower()
                
                # Check if expected keywords are in response
                has_keywords = any(keyword.lower() in response_text for keyword in test["expected_keywords"])
                
                print_test(
                    test["name"],
                    has_keywords,
                    f"Response: {data.get('response')[:100]}..."
                )
            else:
                print_test(test["name"], False, f"Status code: {response.status_code}")
        except Exception as e:
            print_test(test["name"], False, str(e))

def test_chat_with_history():
    """Test chat with conversation history"""
    print(f"\n{BLUE}Testing Chat History Context...{RESET}")
    
    try:
        # Simulate a conversation
        history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi! How can I help?"}
        ]
        
        payload = {
            "message": "Tell me more about that",
            "context": {},
            "history": history
        }
        
        response = requests.post(CHAT_ENDPOINT, json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print_test(
                "Chat with history",
                True,
                f"Response: {data.get('response')[:100]}..."
            )
        else:
            print_test("Chat with history", False, f"Status code: {response.status_code}")
    except Exception as e:
        print_test("Chat with history", False, str(e))

def test_context_awareness():
    """Test context-aware responses"""
    print(f"\n{BLUE}Testing Context Awareness...{RESET}")
    
    # Test different page contexts
    contexts = [
        {
            "name": "Routes page context",
            "message": "Help me",
            "context": {"currentPage": "routes", "userLocation": [12.9716, 77.5946]}
        },
        {
            "name": "Map page context",
            "message": "Show me information",
            "context": {"currentPage": "map", "nearbyHotspots": 5}
        },
        {
            "name": "Alerts page context",
            "message": "What should I know?",
            "context": {"currentPage": "alerts"}
        }
    ]
    
    for test in contexts:
        try:
            payload = {
                "message": test["message"],
                "context": test["context"],
                "history": []
            }
            
            response = requests.post(CHAT_ENDPOINT, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                print_test(
                    test["name"],
                    True,
                    f"Response: {data.get('response')[:80]}..."
                )
            else:
                print_test(test["name"], False, f"Status code: {response.status_code}")
        except Exception as e:
            print_test(test["name"], False, str(e))

def test_response_format():
    """Test response format and structure"""
    print(f"\n{BLUE}Testing Response Format...{RESET}")
    
    try:
        payload = {
            "message": "Test message",
            "context": {},
            "history": []
        }
        
        response = requests.post(CHAT_ENDPOINT, json=payload)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            has_response = "response" in data
            has_timestamp = "timestamp" in data
            has_suggestions = "suggestions" in data
            
            all_fields = has_response and has_timestamp
            
            print_test(
                "Response structure",
                all_fields,
                f"Fields present: response={has_response}, timestamp={has_timestamp}, suggestions={has_suggestions}"
            )
            
            # Check data types
            if has_response:
                response_valid = isinstance(data["response"], str) and len(data["response"]) > 0
                print_test("Response is non-empty string", response_valid)
            
            if has_suggestions:
                suggestions_valid = isinstance(data["suggestions"], list)
                print_test("Suggestions is array", suggestions_valid)
        else:
            print_test("Response format", False, f"Status code: {response.status_code}")
    except Exception as e:
        print_test("Response format", False, str(e))

def test_error_handling():
    """Test error handling with invalid inputs"""
    print(f"\n{BLUE}Testing Error Handling...{RESET}")
    
    # Test empty message
    try:
        payload = {"message": "", "context": {}, "history": []}
        response = requests.post(CHAT_ENDPOINT, json=payload)
        # Should still return 200 with a response or 422 validation error
        print_test(
            "Empty message handling",
            response.status_code in [200, 422],
            f"Status: {response.status_code}"
        )
    except Exception as e:
        print_test("Empty message handling", False, str(e))
    
    # Test invalid JSON
    try:
        response = requests.post(CHAT_ENDPOINT, data="invalid json")
        print_test(
            "Invalid JSON handling",
            response.status_code == 422,
            f"Status: {response.status_code}"
        )
    except Exception as e:
        print_test("Invalid JSON handling", False, str(e))

def print_summary():
    """Print test summary"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Test Summary{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    print(f"{YELLOW}Endpoints tested:{RESET}")
    print(f"  • GET  /api/chat/status")
    print(f"  • POST /api/chat/message")
    print(f"\n{YELLOW}Test categories:{RESET}")
    print(f"  • Status endpoint availability")
    print(f"  • Scripted responses (3 scenarios)")
    print(f"  • Conversation history context")
    print(f"  • Context awareness (3 page contexts)")
    print(f"  • Response format validation")
    print(f"  • Error handling (2 error cases)")
    print(f"\n{GREEN}✅ All tests completed!{RESET}")
    print(f"\n{YELLOW}Note:{RESET} If 'ai_available' is true, OpenAI integration is working.")
    print(f"       If false, the chatbot is using scripted responses (still functional).\n")

def main():
    """Run all tests"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}SafeCity Chatbot API Test Suite{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    print(f"Testing backend at: {BASE_URL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Check if server is running
    try:
        requests.get(BASE_URL, timeout=2)
    except:
        print(f"{RED}❌ Error: Backend server is not running!{RESET}")
        print(f"{YELLOW}Please start the backend first:{RESET}")
        print(f"  cd project1/backend")
        print(f"  uvicorn main:app --reload\n")
        return
    
    # Run all tests
    test_status_endpoint()
    test_chat_scripted()
    test_chat_with_history()
    test_context_awareness()
    test_response_format()
    test_error_handling()
    
    # Print summary
    print_summary()

if __name__ == "__main__":
    main()
