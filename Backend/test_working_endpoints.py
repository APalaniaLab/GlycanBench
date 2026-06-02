#!/usr/bin/env python3
"""
Test the working endpoints to verify API integration
"""
import requests
import json

def test_working_endpoints():
    """Test endpoints that are currently working"""
    base_url = "http://127.0.0.1:5000"
    
    print("🧪 Testing Working Endpoints")
    print("=" * 40)
    
    # Test tools categories
    try:
        response = requests.get(f"{base_url}/api/tools/categories")
        if response.status_code == 200:
            data = response.json()
            print("✅ Tools Categories:")
            print(f"   Categories: {list(data['categories'].keys())}")
            
            # Check if Literature and Databases are there
            if 'Literature' in data['categories'] and 'Databases' in data['categories']:
                print("   ✅ Literature and Databases categories found")
                
                lit_tools = data['categories']['Literature']['tools']
                db_tools = data['categories']['Databases']['tools']
                print(f"   📚 Literature tools: {list(lit_tools.keys())}")
                print(f"   🗄️  Database tools: {list(db_tools.keys())}")
            else:
                print("   ❌ Expected categories not found")
        else:
            print(f"❌ Tools categories failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing tools categories: {e}")
    
    # Test tools capabilities
    try:
        response = requests.get(f"{base_url}/api/tools/capabilities")
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ Tools Capabilities:")
            print(f"   Total tools: {len(data['tools'])}")
            
            # Show a few tools
            for tool_name in list(data['tools'].keys())[:3]:
                tool_info = data['tools'][tool_name]
                print(f"   - {tool_name}: {tool_info['name']}")
        else:
            print(f"❌ Tools capabilities failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing tools capabilities: {e}")
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/api/health")
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ Health Check:")
            print(f"   Status: {data['status']}")
            print(f"   Services: {data.get('services', {})}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing health: {e}")

def test_new_api_endpoints():
    """Test the new API integration endpoints"""
    base_url = "http://127.0.0.1:5000"
    
    print(f"\n🚀 Testing New API Integration Endpoints")
    print("=" * 50)
    
    # Test the new endpoints we added
    new_endpoints = [
        ("/api/all-apis", "GET"),
        ("/api/api-examples", "GET"),
        ("/api/detect-apis", "POST"),
        ("/api/api-status", "GET")
    ]
    
    for endpoint, method in new_endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{base_url}{endpoint}")
            else:
                response = requests.post(f"{base_url}{endpoint}", json={"query": "test"})
            
            if response.status_code == 200:
                print(f"✅ {endpoint}: Working")
                if endpoint == "/api/all-apis":
                    data = response.json()
                    print(f"   Total APIs: {data.get('total_apis', 0)}")
                elif endpoint == "/api/api-examples":
                    data = response.json()
                    print(f"   APIs with examples: {len(data)}")
                elif endpoint == "/api/detect-apis":
                    data = response.json()
                    detected = data.get('detected_apis', [])
                    print(f"   Detected APIs: {len(detected)}")
            else:
                print(f"❌ {endpoint}: {response.status_code}")
                print(f"   Response: {response.text[:100]}")
        except Exception as e:
            print(f"❌ {endpoint}: Error - {e}")

if __name__ == "__main__":
    test_working_endpoints()
    test_new_api_endpoints()