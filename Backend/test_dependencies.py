#!/usr/bin/env python3
"""
Dependency verification script for GlycanBench Backend
Tests all required dependencies for the modular chat API
"""

import sys
import importlib
from typing import List, Tuple

def test_dependency(module_name: str, package_name: str = None) -> Tuple[bool, str]:
    """Test if a dependency can be imported"""
    try:
        importlib.import_module(module_name)
        return True, f"✅ {package_name or module_name}: OK"
    except ImportError as e:
        return False, f"❌ {package_name or module_name}: MISSING - {e}"
    except Exception as e:
        return False, f"⚠️  {package_name or module_name}: WARNING - {e}"

def main():
    """Run dependency tests"""
    print("🧪 Testing GlycanBench Backend Dependencies...")
    print("=" * 50)
    
    # Define dependencies to test
    dependencies = [
        # Core web framework
        ("fastapi", "FastAPI"),
        ("uvicorn", "Uvicorn"),
        ("pydantic", "Pydantic"),
        
        # HTTP client
        ("httpx", "HTTPX"),
        
        # Environment
        ("dotenv", "python-dotenv"),
        
        # LangChain ecosystem
        ("langchain_groq", "LangChain Groq"),
        ("langchain_community", "LangChain Community"),
        ("langchain_core", "LangChain Core"),
        
        # Scientific computing
        ("numpy", "NumPy"),
        ("pandas", "Pandas"),
        
        # Bioinformatics
        ("glycowork", "GlycoWork"),
        ("glypy", "GlyPy"),
        ("Bio", "BioPython"),
        
        # Chemistry
        ("rdkit", "RDKit"),
        
        # Machine learning
        ("torch", "PyTorch"),
        ("torch_geometric", "PyTorch Geometric"),
        
        # Utilities
        ("requests", "Requests"),
    ]
    
    # Test each dependency
    results = []
    for module_name, package_name in dependencies:
        success, message = test_dependency(module_name, package_name)
        results.append((success, message))
        print(message)
    
    print("\n" + "=" * 50)
    
    # Test chat API modules
    print("🔧 Testing Chat API Modules...")
    
    chat_modules = [
        ("api.chat.config", "Chat Config"),
        ("api.chat.models", "Chat Models"),
        ("api.chat.tools", "Chat Tools"),
        ("api.chat.glycan_utils", "Glycan Utils"),
        ("api.chat.llm", "LLM Integration"),
        ("api.chat.capabilities", "Capabilities"),
        ("api.chat.router", "Chat Router"),
    ]
    
    for module_name, description in chat_modules:
        success, message = test_dependency(module_name, description)
        results.append((success, message))
        print(message)
    
    # Summary
    print("\n" + "=" * 50)
    total_tests = len(results)
    passed_tests = sum(1 for success, _ in results if success)
    failed_tests = total_tests - passed_tests
    
    print(f"📊 Test Summary:")
    print(f"   Total: {total_tests}")
    print(f"   Passed: {passed_tests}")
    print(f"   Failed: {failed_tests}")
    
    if failed_tests == 0:
        print("\n🎉 All dependencies are available!")
        print("✅ Backend is ready to run!")
        return 0
    else:
        print(f"\n❌ {failed_tests} dependencies are missing!")
        print("💡 Run: pip install -r requirements.txt")
        return 1

if __name__ == "__main__":
    sys.exit(main())