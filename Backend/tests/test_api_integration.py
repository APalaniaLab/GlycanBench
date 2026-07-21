#!/usr/bin/env python3
"""
Test script for comprehensive API integration in chat system
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.chat.api_integration import (
    analyze_query_for_apis, 
    extract_glycan_sequences,
    extract_parameters,
    process_query_with_apis,
    get_all_api_info,
    get_api_examples
)

async def test_query_analysis():
    """Test query analysis for API detection"""
    print("🔍 Testing Query Analysis for API Detection")
    print("=" * 50)
    
    test_queries = [
        "Calculate molecular descriptors for glucose",
        "Convert Gal(b1-4)Glc to SMILES format", 
        "Get biological insights about this glycan",
        "Predict immunogenicity of this structure",
        "Validate this glycan sequence"
    ]
    
    for query in test_queries:
        print(f"\nQuery: '{query}'")
        matches = analyze_query_for_apis(query)
        if matches:
            print(f"  Detected APIs: {[(name, f'{conf:.1f}') for name, conf in matches[:3]]}")
        else:
            print("  No APIs detected")

def test_sequence_extraction():
    """Test glycan sequence extraction"""
    print("\n🧬 Testing Glycan Sequence Extraction")
    print("=" * 50)
    
    test_queries = [
        "Analyze Gal(b1-4)GlcNAc(b1-2)Man structure",
        "Process GlyTouCan accession G12345AB",
        "Convert this SMILES: COC1C(O)C(O)C(O)C(O)C1O",
        "Study the glycan Neu5Ac(a2-3)Gal(b1-4)Glc"
    ]
    
    for query in test_queries:
        print(f"\nQuery: '{query}'")
        sequences = extract_glycan_sequences(query)
        if sequences:
            print(f"  Extracted sequences: {sequences}")
        else:
            print("  No sequences found")

def test_parameter_extraction():
    """Test parameter extraction for specific APIs"""
    print("\n⚙️ Testing Parameter Extraction")
    print("=" * 50)
    
    test_cases = [
        ("convert", "Convert Gal(b1-4)Glc to SMILES format"),
        ("descriptor", "Calculate molecular descriptors for glucose"),
        ("insight", "Get biological insights about this glycan"),
        ("model_predict", "Predict immunogenicity of this structure")
    ]
    
    for api_name, query in test_cases:
        print(f"\nAPI: {api_name}, Query: '{query}'")
        params = extract_parameters(query, api_name)
        if params:
            print(f"  Extracted parameters: {params}")
        else:
            print("  No parameters extracted")

async def test_full_integration():
    """Test full API integration"""
    print("\n🚀 Testing Full API Integration")
    print("=" * 50)
    
    test_queries = [
        "Calculate descriptors for glucose",
        "Convert Gal(b1-4)Glc to SMILES",
        "Get insights about this glycan"
    ]
    
    for query in test_queries:
        print(f"\nTesting query: '{query}'")
        try:
            results = await process_query_with_apis(query)
            print(f"  APIs detected: {len(results['apis_detected'])}")
            print(f"  Results: {len(results['results'])}")
            
            for result in results['results']:
                api_name = result['api_name']
                success = result['result']['success']
                print(f"    {api_name}: {'✅ Success' if success else '❌ Failed'}")
                if not success:
                    print(f"      Error: {result['result']['error']}")
                
        except Exception as e:
            print(f"  ❌ Error: {str(e)}")

def test_api_info():
    """Test API information functions"""
    print("\n📋 Testing API Information Functions")
    print("=" * 50)
    
    # Test get_all_api_info
    api_info = get_all_api_info()
    print(f"Total APIs: {api_info['total_apis']}")
    print(f"Categories: {list(api_info['categories'].keys())}")
    
    # Test get_api_examples
    examples = get_api_examples()
    print(f"APIs with examples: {len(examples)}")
    
    # Show a few examples
    for api_name, api_examples in list(examples.items())[:3]:
        print(f"\n{api_name} examples:")
        for example in api_examples[:2]:
            print(f"  - {example}")

async def main():
    """Run all tests"""
    print("🧪 GlycanBench API Integration Test Suite")
    print("=" * 60)
    
    # Test query analysis
    await test_query_analysis()
    
    # Test sequence extraction
    test_sequence_extraction()
    
    # Test parameter extraction
    test_parameter_extraction()
    
    # Test API information
    test_api_info()
    
    # Test full integration (requires server to be running)
    print("\n⚠️  Note: Full integration tests require the server to be running")
    print("Start the server with: python start_server.py")
    
    try:
        await test_full_integration()
    except Exception as e:
        print(f"❌ Full integration test failed (server may not be running): {str(e)}")
    
    print("\n✅ Test suite completed!")

if __name__ == "__main__":
    asyncio.run(main())