#!/usr/bin/env python3
"""
Diagnostic script to test GlycanBench API endpoints
Run this on the backend server to verify all endpoints are working
"""

import requests
import json
import sys

BASE_URL = "http://localhost:5000"

def test_health():
    """Test the health check endpoint"""
    print("🔍 Testing health check endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_draw():
    """Test the draw endpoint"""
    print("\n🔍 Testing /api/draw endpoint...")
    try:
        payload = {"glycan": "Man(a1-2)Man"}
        response = requests.post(f"{BASE_URL}/api/draw", json=payload)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: Image data received (length: {len(data.get('image', ''))})")
            return True
        else:
            print(f"   Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_convert():
    """Test the convert endpoint"""
    print("\n🔍 Testing /api/convert endpoint...")
    try:
        payload = {
            "glycan": "Man(a1-2)Man",
            "input_format": "iupac"
        }
        response = requests.post(f"{BASE_URL}/api/convert", json=payload)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   IUPAC: {data.get('iupac', 'N/A')}")
            print(f"   SMILES: {data.get('smiles', 'N/A')[:50]}...")
            return True
        else:
            print(f"   Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_visualize():
    """Test the visualize endpoint"""
    print("\n🔍 Testing /api/visualize endpoint...")
    try:
        payload = {"iupac": "Man(a1-2)Man"}
        response = requests.post(f"{BASE_URL}/api/visualize", json=payload)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: MolBlock data received (length: {len(data.get('molBlock', ''))})")
            return True
        else:
            print(f"   Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_docs():
    """Test if API docs are accessible"""
    print("\n🔍 Testing API documentation...")
    try:
        response = requests.get(f"{BASE_URL}/docs")
        print(f"   Status: {response.status_code}")
        print(f"   Docs accessible: {'Yes' if response.status_code == 200 else 'No'}")
        return response.status_code == 200
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def main():
    """Run all diagnostic tests"""
    print("=" * 60)
    print("GlycanBench API Diagnostic Tool")
    print("=" * 60)
    print(f"Testing backend at: {BASE_URL}")
    print()
    
    tests = [
        ("Health Check", test_health),
        ("Draw API", test_draw),
        ("Convert API", test_convert),
        ("Visualize API", test_visualize),
        ("API Docs", test_docs)
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Unexpected error in {name}: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Backend is working correctly.")
        print("\nNext steps:")
        print("1. Verify nginx is proxying correctly")
        print("2. Test from production URL: https://glycanbench.sastra.edu/api/")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")
        print("\nTroubleshooting:")
        print("1. Ensure the backend server is running: python start_server.py")
        print("2. Check if port 5000 is accessible: netstat -tulpn | grep 5000")
        print("3. Review backend logs for errors")
        return 1

if __name__ == "__main__":
    sys.exit(main())
