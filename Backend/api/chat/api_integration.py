"""
Comprehensive API integration for chat system
Detects user queries and routes them to appropriate APIs
"""
import logging
import re
import httpx
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

# ==================================================
# API Endpoint Mappings - Core APIs Only
# ==================================================

API_ENDPOINTS = {
    # Format Conversion
    "convert": {
        "endpoint": "/api/convert",
        "method": "POST",
        "description": "Convert between glycan formats (IUPAC, SMILES, GlycoCT, WURCS)",
        "keywords": ["convert", "format", "iupac", "smiles", "glycoct", "wurcs", "transformation"],
        "examples": ["Convert IUPAC to SMILES", "Transform to WURCS", "Format conversion", "Change format"]
    },
    
    # Molecular Descriptors
    "descriptor": {
        "endpoint": "/api/descriptor",
        "method": "POST",
        "description": "Calculate molecular descriptors and properties",
        "keywords": ["descriptor", "properties", "molecular weight", "formula", "fingerprint", "molecular properties"],
        "examples": ["Calculate descriptors", "Molecular properties", "Get molecular weight", "Chemical properties"]
    },
    
    # Glycan Insights
    "insight": {
        "endpoint": "/api/glycan_insight",
        "method": "POST",
        "description": "Get biological insights about glycan structures",
        "keywords": ["insight", "biological", "species", "disease", "motif", "cell line", "occurrence"],
        "examples": ["Get glycan insights", "Biological information", "Where is this found", "Disease associations"]
    },
    
    # ML Model Predictions
    "model_validate": {
        "endpoint": "/api/validate",
        "method": "POST",
        "description": "Validate glycan sequence for ML model analysis",
        "keywords": ["validate", "validation", "check sequence", "verify", "sequence validation"],
        "examples": ["Validate this sequence", "Check if valid", "Verify glycan", "Sequence validation"]
    },
    
    "model_predict": {
        "endpoint": "/api/predict",
        "method": "POST",
        "description": "Predict immunogenicity of glycan structures using ML models",
        "keywords": ["predict", "immunogenic", "immunogenicity", "machine learning", "ml", "prediction"],
        "examples": ["Predict immunogenicity", "Is this immunogenic", "ML prediction", "Immunogenic potential"]
    }
}

# ==================================================
# Query Analysis Functions
# ==================================================

def analyze_query_for_apis(query: str) -> List[Tuple[str, float]]:
    """
    Analyze user query and return ranked list of relevant APIs
    Returns list of (api_name, confidence_score) tuples
    """
    query_lower = query.lower()
    api_matches = []
    
    for api_name, api_info in API_ENDPOINTS.items():
        score = 0.0
        
        # Check for exact keyword matches
        for keyword in api_info["keywords"]:
            if keyword.lower() in query_lower:
                score += 2.0
        
        # Check for partial matches
        for keyword in api_info["keywords"]:
            words = keyword.lower().split()
            if len(words) > 1:
                # Multi-word keyword
                if all(word in query_lower for word in words):
                    score += 1.5
            else:
                # Single word - check for partial matches
                if any(word in query_lower for word in [keyword.lower()]):
                    score += 1.0
        
        # Boost score for specific patterns
        if api_name == "characterize" and any(word in query_lower for word in ["analyze", "properties", "characteristics"]):
            score += 1.0
        elif api_name == "cluster" and any(word in query_lower for word in ["group", "similar", "classification"]):
            score += 1.0
        elif api_name == "compare" and any(word in query_lower for word in ["difference", "versus", "vs", "between"]):
            score += 1.0
        elif api_name == "convert" and any(word in query_lower for word in ["to", "into", "format"]):
            score += 1.0
        elif api_name == "model_predict" and any(word in query_lower for word in ["immune", "response", "antigenic"]):
            score += 1.0
        
        if score > 0:
            api_matches.append((api_name, score))
    
    # Sort by confidence score (descending)
    api_matches.sort(key=lambda x: x[1], reverse=True)
    return api_matches

def extract_glycan_sequences(query: str) -> List[str]:
    """Extract potential glycan sequences from user query"""
    sequences = []
    
    # Pattern for IUPAC sequences (simplified)
    iupac_pattern = r'[A-Za-z]+\([ab]\d+-\d+\)[A-Za-z]+(?:\([ab]\d+-\d+\)[A-Za-z]+)*'
    sequences.extend(re.findall(iupac_pattern, query))
    
    # Pattern for GlyTouCan accessions
    glytoucan_pattern = r'G\d{5}[A-Z]{2}'
    sequences.extend(re.findall(glytoucan_pattern, query))
    
    # Pattern for SMILES (basic)
    smiles_pattern = r'[CON\[\]()=\-+#@/\\0-9]{10,}'
    potential_smiles = re.findall(smiles_pattern, query)
    sequences.extend([s for s in potential_smiles if len(s) > 15])  # Filter short matches
    
    return sequences

def extract_parameters(query: str, api_name: str) -> Dict[str, Any]:
    """Extract parameters for specific API calls from user query"""
    params = {}
    
    if api_name == "convert":
        # Extract input format and glycan sequence
        if "iupac" in query.lower():
            params["input_format"] = "iupac"
        elif "smiles" in query.lower():
            params["input_format"] = "smiles"
        elif "glycoct" in query.lower():
            params["input_format"] = "glycoct"
        elif "wurcs" in query.lower():
            params["input_format"] = "wurcs"
        else:
            params["input_format"] = "iupac"  # Default assumption
    
    elif api_name == "descriptor":
        # Extract format for descriptor calculation
        if "iupac" in query.lower():
            params["format"] = "IUPAC"
        elif "smiles" in query.lower():
            params["format"] = "SMILES"
        else:
            params["format"] = "IUPAC"  # Default assumption
        
        # Check for fingerprint and similarity options
        if "fingerprint" in query.lower():
            params["include_fingerprints"] = True
        if "similarity" in query.lower() or "compare" in query.lower():
            params["include_similarities"] = True
    
    elif api_name == "insight":
        # Extract glycan sequence or identifier for insights
        # The userInput parameter will be set from extracted sequences
        pass
    
    elif api_name in ["model_validate", "model_predict"]:
        # Extract glycan sequence for model analysis
        # The sequence parameter will be set from extracted sequences
        pass
    
    return params

# ==================================================
# API Call Functions
# ==================================================

async def make_api_call(api_name: str, params: Dict[str, Any], base_url: str = "http://127.0.0.1:5000") -> Dict[str, Any]:
    """
    Make API call to specified endpoint
    """
    if api_name not in API_ENDPOINTS:
        raise ValueError(f"Unknown API: {api_name}")
    
    api_info = API_ENDPOINTS[api_name]
    url = f"{base_url}{api_info['endpoint']}"
    method = api_info["method"]
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if method == "GET":
                response = await client.get(url, params=params)
            elif method == "POST":
                response = await client.post(url, json=params)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response.raise_for_status()
            return {
                "success": True,
                "data": response.json(),
                "api_used": api_name,
                "endpoint": api_info["endpoint"]
            }
    
    except httpx.TimeoutException:
        logger.error(f"Timeout calling {api_name} API")
        return {
            "success": False,
            "error": f"Timeout calling {api_name} API",
            "api_used": api_name
        }
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error calling {api_name} API: {e.response.status_code}")
        return {
            "success": False,
            "error": f"HTTP {e.response.status_code} error from {api_name} API",
            "api_used": api_name
        }
    except Exception as e:
        logger.error(f"Error calling {api_name} API: {str(e)}")
        return {
            "success": False,
            "error": f"Error calling {api_name} API: {str(e)}",
            "api_used": api_name
        }

def format_api_response(api_result: Dict[str, Any], query: str) -> str:
    """
    Format API response for display in chat
    """
    if not api_result.get("success"):
        return f"API Error: {api_result.get('error', 'Unknown error')}"
    
    api_name = api_result.get("api_used")
    data = api_result.get("data", {})
    
    if api_name == "convert":
        result = "Format conversion results:\n"
        if data.get("iupac"):
            result += f"- IUPAC: {data['iupac']}\n"
        if data.get("smiles"):
            result += f"- SMILES: {data['smiles']}\n"
        if data.get("glycoct"):
            result += f"- GlycoCT: {data['glycoct']}\n"
        if data.get("wurcs"):
            result += f"- WURCS: {data['wurcs']}\n"
        return result
    
    elif api_name == "descriptor":
        props = data.get("Properties", {})
        result = "Molecular descriptors calculated:\n"
        result += f"- Molecular Weight: {props.get('Molecular_Weight', 'N/A')}\n"
        result += f"- Formula: {props.get('Molecular_Formula', 'N/A')}\n"
        result += f"- Heavy Atoms: {props.get('Heavy_Atom_Count', 'N/A')}\n"
        result += f"- H-Bond Donors: {props.get('H_Bond_Donors', 'N/A')}\n"
        result += f"- H-Bond Acceptors: {props.get('H_Bond_Acceptors', 'N/A')}\n"
        result += f"- TPSA: {props.get('TPSA', 'N/A')}\n"
        result += f"- LogP: {props.get('LogP', 'N/A')}\n"
        return result
    
    elif api_name == "insight":
        result = f"Glycan insights for {data.get('analyzed_glycan_sequence', 'sequence')}:\n"
        result += f"- Class: {data.get('glycan_class', 'Unknown')}\n"
        if data.get("species"):
            species_list = data['species'][:5]  # Show first 5 species
            result += f"- Found in species: {', '.join(species_list)}\n"
        if data.get("motifs"):
            motifs_list = data['motifs'][:3]  # Show first 3 motifs
            result += f"- Contains motifs: {', '.join(motifs_list)}\n"
        if data.get("glytoucan_id") != "Not Found":
            result += f"- GlyTouCan ID: {data['glytoucan_id']}\n"
        if data.get("diseases"):
            result += f"- Disease associations: {len(data['diseases'])} found\n"
        if data.get("cell_lines"):
            result += f"- Cell line expressions: {len(data['cell_lines'])} found\n"
        return result
    
    elif api_name == "model_validate":
        if data.get("valid"):
            result = "Glycan sequence validation: ✅ Valid\n"
            if data.get("unknown_sugars"):
                result += f"- Unknown sugars detected: {len(data['unknown_sugars'])}\n"
            if data.get("unknown_bonds"):
                result += f"- Unknown bonds detected: {len(data['unknown_bonds'])}\n"
        else:
            result = f"Glycan sequence validation: ❌ Invalid\n"
            if data.get("reason"):
                result += f"- Reason: {data['reason']}\n"
        return result
    
    elif api_name == "model_predict":
        prediction = data.get("prediction", "Unknown")
        score = data.get("score", 0)
        result = f"Immunogenicity prediction: {prediction} (confidence: {score:.3f})\n"
        
        # Add ensemble statistics if available
        ensemble_stats = data.get("ensemble_stats", {})
        if ensemble_stats:
            result += f"- Models used: {ensemble_stats.get('num_models', 'N/A')}\n"
            result += f"- Mean score: {ensemble_stats.get('mean', 0):.3f}\n"
            result += f"- Score range: {ensemble_stats.get('min', 0):.3f} - {ensemble_stats.get('max', 0):.3f}\n"
        
        if data.get("motifs_detected"):
            result += f"- Detected motifs: {', '.join(data['motifs_detected'])}\n"
        
        if data.get("unknown_sugars") or data.get("unknown_bonds"):
            result += "- Note: Unknown components detected in sequence\n"
        
        return result
    
    else:
        return f"API call to {api_name} completed successfully. Results available in detailed view."

# ==================================================
# Main Integration Function
# ==================================================

async def process_query_with_apis(query: str, base_url: str = "http://127.0.0.1:5000") -> Dict[str, Any]:
    """
    Main function to process user query and make appropriate API calls
    """
    # Analyze query for relevant APIs
    api_matches = analyze_query_for_apis(query)
    
    if not api_matches:
        return {
            "apis_detected": [],
            "results": [],
            "message": "No specific API functionality detected in query."
        }
    
    # Take top 2 most relevant APIs to avoid overwhelming response
    top_apis = api_matches[:2]
    results = []
    
    for api_name, confidence in top_apis:
        if confidence < 1.0:  # Skip low-confidence matches
            continue
            
        # Extract sequences and parameters
        sequences = extract_glycan_sequences(query)
        params = extract_parameters(query, api_name)
        
        # Add sequences to parameters if needed
        if sequences and api_name in ["convert", "descriptor", "insight", "model_validate", "model_predict"]:
            if api_name == "convert":
                params["glycan"] = sequences[0]
                # input_format should already be set by extract_parameters
            elif api_name == "descriptor":
                params["data"] = sequences[0]
                # format should already be set by extract_parameters
            elif api_name == "insight":
                params["userInput"] = sequences[0]
            elif api_name in ["model_validate", "model_predict"]:
                params["sequence"] = sequences[0]
        
        # Make API call
        result = await make_api_call(api_name, params, base_url)
        results.append({
            "api_name": api_name,
            "confidence": confidence,
            "result": result,
            "formatted_response": format_api_response(result, query)
        })
    
    return {
        "apis_detected": [{"name": name, "confidence": conf} for name, conf in top_apis],
        "results": results,
        "message": f"Detected {len(top_apis)} relevant API(s) for your query."
    }

# ==================================================
# API Information Functions
# ==================================================

def get_all_api_info() -> Dict[str, Any]:
    """Get information about all available APIs"""
    return {
        "total_apis": len(API_ENDPOINTS),
        "apis": API_ENDPOINTS,
        "categories": {
            "Conversion": ["convert"],
            "Analysis": ["descriptor", "insight"],
            "Machine Learning": ["model_validate", "model_predict"]
        }
    }

def get_api_examples() -> Dict[str, List[str]]:
    """Get example queries for all APIs"""
    examples = {}
    for api_name, api_info in API_ENDPOINTS.items():
        examples[api_name] = api_info["examples"]
    return examples