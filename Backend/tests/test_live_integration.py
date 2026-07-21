#!/usr/bin/env python3
"""
Test live API integration with running server
"""
import requests
import json

def test_chat_with_api_integration():
    """Test chat endpoint with API integration"""
    url = "http://127.0.0.1:5000/api/GlycomicsChat"
    
    # Test queries that should trigger different APIs
    test_queries = [
        {
            "query": "Calculate molecular descriptors for glucose",
            "expected_apis": ["descriptor"]
        },
        {
            "query": "Convert Gal(b1-4)Glc to SMILES format",
            "expected_apis": ["convert"]
        },
        {
            "query": "Get biological insights about this glycan",
            "expected_apis": ["insight"]
        },
        {
            "query": "Predict immunogenicity of this structure",
            "expected_apis": ["model_predict"]
        },
        {
            "query": "What are the latest advances in N-linked glycosylation?",
            "expected_apis": [],  # Should use literature tools
            "use_literature": True
        }
    ]
    
    print("🧪 Testing Live API Integration")
    print("=" * 50)
    
    for i, test_case in enumerate(test_queries, 1):
        print(f"\n{i}. Testing: '{test_case['query']}'")
        
        payload = {
            "message": test_case["query"],
            "use_literature": test_case.get("use_literature", False),
            "use_databases": test_case.get("use_databases", False),
            "use_pubmed": False,
            "use_arxiv": False,
            "use_glycan_db": False,
            "use_structure_analysis": False,
            "use_synthesis": False
        }
        
        try:
            response = requests.post(url, json=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Success!")
                print(f"   📝 Response length: {len(data.get('reply', ''))}")
                print(f"   🔧 Tools used: {data.get('tools_used', [])}")
                print(f"   ⏱️  Processing time: {data.get('processing_time', 0):.2f}s")
                print(f"   🎯 Confidence: {data.get('confidence', 'unknown')}")
                
                # Check if expected APIs were detected (would be in tools_used with "API:" prefix)
                api_tools = [tool for tool in data.get('tools_used', []) if tool.startswith('API:')]
                if api_tools:
                    print(f"   🚀 API tools detected: {api_tools}")
                
            else:
                print(f"   ❌ Error: HTTP {response.status_code}")
                print(f"   📄 Response: {response.text[:200]}...")
                
        except requests.exceptions.Timeout:
            print(f"   ⏰ Timeout after 30 seconds")
        except requests.exceptions.ConnectionError:
            print(f"   🔌 Connection error - is server running?")
        except Exception as e:
            print(f"   💥 Error: {str(e)}")

def test_api_endpoints():
    """Test the new API integration endpoints"""
    base_url = "http://127.0.0.1:5000/api"
    
    endpoints = [
        ("GET", "/all-apis", "Get all API information"),
        ("GET", "/api-examples", "Get API examples"),
        ("GET", "/api-status", "Check API status")
    ]
    
    print("\n🔧 Testing API Integration Endpoints")
    print("=" * 50)
    
    for method, endpoint, description in endpoints:
        print(f"\n{method} {endpoint} - {description}")
        
        try:
            if method == "GET":
                response = requests.get(f"{base_url}{endpoint}", timeout=10)
            else:
                response = requests.post(f"{base_url}{endpoint}", json={}, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Success!")
                
                if endpoint == "/all-apis":
                    print(f"   📊 Total APIs: {data.get('total_apis', 0)}")
                    print(f"   📂 Categories: {len(data.get('categories', {}))}")
                elif endpoint == "/api-examples":
                    print(f"   📝 APIs with examples: {len(data)}")
                elif endpoint == "/api-status":
                    healthy = data.get('healthy_apis', 0)
                    total = data.get('total_apis', 0)
                    print(f"   💚 Healthy APIs: {healthy}/{total}")
                    
            else:
                print(f"   ❌ Error: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"   💥 Error: {str(e)}")

def test_detect_apis():
    """Test API detection endpoint"""
    url = "http://127.0.0.1:5000/api/detect-apis"
    
    test_queries = [
        "Calculate descriptors for glucose",
        "Convert IUPAC to SMILES",
        "Get biological insights",
        "Predict immunogenicity"
    ]
    
    print("\n🔍 Testing API Detection")
    print("=" * 50)
    
    for query in test_queries:
        print(f"\nQuery: '{query}'")
        
        try:
            response = requests.post(url, json={"query": query}, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                detected = data.get('detected_apis', [])
                print(f"   🎯 Detected {len(detected)} APIs:")
                for api in detected[:3]:  # Show top 3
                    print(f"      - {api['name']} (confidence: {api['confidence']:.1f})")
            else:
                print(f"   ❌ Error: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"   💥 Error: {str(e)}")

if __name__ == "__main__":
    print("🚀 GlycanBench Live API Integration Test")
    print("=" * 60)
    print("Make sure the server is running: python start_server.py")
    print()
    
    # Test main chat functionality
    test_chat_with_api_integration()
    
    # Test API integration endpoints
    test_api_endpoints()
    
    # Test API detection
    test_detect_apis()
    
    print("\n✅ Live integration tests completed!")