#!/usr/bin/env python3
"""
Test script to verify the GlycomicsChat endpoint is working after fixes
"""

import requests
import json
import sys

def test_endpoint():
    """Test the GlycomicsChat endpoint"""
    base_url = "http://127.0.0.1:5000"
    endpoint = f"{base_url}/api/GlycomicsChat"
    
    # Test data
    test_request = {
        "message": "What are glycans?",
        "use_literature": True,
        "use_databases": False,
        "use_pubmed": False,
        "use_arxiv": False,
        "use_glycan_db": False,
        "use_structure_analysis": False,
        "use_synthesis": False
    }
    
    print("🧪 Testing GlycomicsChat endpoint...")
    print(f"📍 URL: {endpoint}")
    print(f"📝 Request: {json.dumps(test_request, indent=2)}")
    
    try:
        # Test OPTIONS request first (CORS preflight)
        print("\n1️⃣ Testing OPTIONS request (CORS preflight)...")
        options_response = requests.options(endpoint)
        print(f"   Status: {options_response.status_code}")
        print(f"   Headers: {dict(options_response.headers)}")
        
        # Test POST request
        print("\n2️⃣ Testing POST request...")
        response = requests.post(
            endpoint,
            json=test_request,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ SUCCESS: Endpoint is working!")
            response_data = response.json()
            print(f"   Reply length: {len(response_data.get('reply', ''))}")
            print(f"   Tools used: {response_data.get('tools_used', [])}")
            print(f"   Processing time: {response_data.get('processing_time', 0):.2f}s")
            print(f"   Confidence: {response_data.get('confidence', 'unknown')}")
            return True
        else:
            print(f"❌ FAILED: Status {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ FAILED: Cannot connect to server")
        print("   Make sure the server is running with: python start_server.py")
        return False
    except requests.exceptions.Timeout:
        print("❌ FAILED: Request timed out")
        return False
    except Exception as e:
        print(f"❌ FAILED: Unexpected error: {str(e)}")
        return False

def test_health_endpoint():
    """Test the health endpoint"""
    base_url = "http://127.0.0.1:5000"
    endpoint = f"{base_url}/api/health"
    
    print("\n🏥 Testing health endpoint...")
    try:
        response = requests.get(endpoint, timeout=10)
        if response.status_code == 200:
            print("✅ Health endpoint working")
            health_data = response.json()
            print(f"   Status: {health_data.get('status')}")
            print(f"   Services: {health_data.get('services', {})}")
            return True
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health endpoint error: {str(e)}")
        return False

def test_categories_endpoint():
    """Test the categories endpoint"""
    base_url = "http://127.0.0.1:5000"
    endpoint = f"{base_url}/api/tools/categories"
    
    print("\n📂 Testing categories endpoint...")
    try:
        response = requests.get(endpoint, timeout=10)
        if response.status_code == 200:
            print("✅ Categories endpoint working")
            categories_data = response.json()
            categories = categories_data.get('categories', {})
            print(f"   Available categories: {list(categories.keys())}")
            return True
        else:
            print(f"❌ Categories endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Categories endpoint error: {str(e)}")
        return False

if __name__ == "__main__":
    print("🔧 GlycomicsChat Endpoint Fix Test")
    print("=" * 50)
    
    # Test all endpoints
    health_ok = test_health_endpoint()
    categories_ok = test_categories_endpoint()
    chat_ok = test_endpoint()
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"   Health endpoint: {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"   Categories endpoint: {'✅ PASS' if categories_ok else '❌ FAIL'}")
    print(f"   Chat endpoint: {'✅ PASS' if chat_ok else '❌ FAIL'}")
    
    if all([health_ok, categories_ok, chat_ok]):
        print("\n🎉 ALL TESTS PASSED! The 404 issue has been fixed.")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed. Server may need to be restarted.")
        print("   Try: Ctrl+C to stop server, then 'python start_server.py'")
        sys.exit(1)