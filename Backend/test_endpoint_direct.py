#!/usr/bin/env python3
"""
Direct test of the GlycomicsChat endpoint
"""
import requests
import json

def test_glycomics_chat():
    """Test the main chat endpoint directly"""
    url = "http://127.0.0.1:5000/api/GlycomicsChat"
    
    # Test the exact query from the user
    payload = {
        "message": "Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc convert into WURCS",
        "use_literature": False,
        "use_databases": False,
        "use_pubmed": False,
        "use_arxiv": False,
        "use_glycan_db": False,
        "use_structure_analysis": False,
        "use_synthesis": False
    }
    
    print("🧪 Testing GlycomicsChat Endpoint")
    print("=" * 50)
    print(f"URL: {url}")
    print(f"Query: {payload['message']}")
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success!")
            print(f"Reply length: {len(data.get('reply', ''))}")
            print(f"Tools used: {data.get('tools_used', [])}")
            print(f"Processing time: {data.get('processing_time', 0):.2f}s")
            print(f"Confidence: {data.get('confidence', 'unknown')}")
            
            # Show first 200 chars of reply
            reply = data.get('reply', '')
            if reply:
                print(f"Reply preview: {reply[:200]}...")
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection error - server may not be running")
    except requests.exceptions.Timeout:
        print("❌ Request timeout")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_simple_endpoint():
    """Test a simple endpoint to verify server is running"""
    try:
        response = requests.get("http://127.0.0.1:5000/")
        print(f"\n✅ Server is running: {response.json()}")
    except Exception as e:
        print(f"\n❌ Server not accessible: {e}")

if __name__ == "__main__":
    test_simple_endpoint()
    test_glycomics_chat()