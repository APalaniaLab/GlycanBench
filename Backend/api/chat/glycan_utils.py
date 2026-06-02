"""
Glycan-related utilities and GlyTouCan API integration
"""
import re
import logging
from typing import Dict, Any
import httpx
from fastapi import HTTPException, status
from .config import GLYTOUCAN_API_BASE, GLYTOUCAN_API_FALLBACK, REQUEST_TIMEOUT, GLYCAN_PATTERNS
from .models import GlycanData

logger = logging.getLogger(__name__)

# ==================================================
# Glycan Validation and Processing
# ==================================================
def validate_glycan_accession(text: str) -> Dict[str, Any]:
    """Validate and classify glycan identifiers"""
    text = text.strip().upper()
    
    result = {
        "is_valid": False,
        "type": None,
        "normalized": text,
        "confidence": "low"
    }
    
    # GlyTouCan accession
    if re.match(GLYCAN_PATTERNS["glytoucan"], text):
        result.update({
            "is_valid": True,
            "type": "glytoucan",
            "confidence": "high"
        })
    
    # WURCS format
    elif re.match(GLYCAN_PATTERNS["wurcs"], text, re.IGNORECASE):
        result.update({
            "is_valid": True,
            "type": "wurcs",
            "confidence": "high"
        })
    
    # IUPAC (basic validation)
    elif len(text) > 3 and re.match(GLYCAN_PATTERNS["iupac"], text):
        # Additional checks for common glycan terms
        glycan_terms = ["Glc", "Gal", "Man", "Fuc", "Xyl", "GlcNAc", "GalNAc", "Neu", "Sia"]
        if any(term in text for term in glycan_terms):
            result.update({
                "is_valid": True,
                "type": "iupac",
                "confidence": "medium"
            })
    
    return result

def is_glycan_accession(text: str) -> bool:
    """Legacy function for backward compatibility"""
    return validate_glycan_accession(text)["is_valid"]

# ==================================================
# GlyTouCan API Integration
# ==================================================
def glytoucan_lookup(accession: str) -> Dict[str, Any]:
    """Enhanced GlyTouCan lookup with fallback and better error handling"""
    
    # Validate accession format
    validation = validate_glycan_accession(accession)
    if not validation["is_valid"] or validation["type"] != "glytoucan":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid GlyTouCan accession format: {accession}"
        )
    
    # Try multiple API endpoints
    api_endpoints = [
        f"https://glytoucan.org/glycans/{accession}.json",
        f"https://api.glycosmos.org/glycan/{accession}",
        f"https://glytoucan.org/api/glycans/{accession}"
    ]
    
    last_error = None
    
    for i, url in enumerate(api_endpoints):
        try:
            with httpx.Client(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
                logger.info(f"Attempting GlyTouCan lookup #{i+1}: {url}")
                
                response = client.get(url, headers={
                    'Accept': 'application/json',
                    'User-Agent': 'GlycanBench/1.0'
                })
                
                if response.status_code == 404:
                    # Try next endpoint
                    continue
                elif response.status_code == 200:
                    try:
                        data = response.json()
                        logger.info(f"Successfully retrieved data for {accession} from endpoint #{i+1}")
                        return data
                    except ValueError:
                        # Try next endpoint if JSON parsing fails
                        continue
                elif response.status_code in [301, 302, 303, 307, 308]:
                    # Handle redirects manually if needed
                    redirect_url = response.headers.get('Location')
                    if redirect_url:
                        logger.info(f"Following redirect to: {redirect_url}")
                        redirect_response = client.get(redirect_url, headers={
                            'Accept': 'application/json',
                            'User-Agent': 'GlycanBench/1.0'
                        })
                        if redirect_response.status_code == 200:
                            try:
                                data = redirect_response.json()
                                logger.info(f"Successfully retrieved data after redirect")
                                return data
                            except ValueError:
                                continue
                
                last_error = f"HTTP {response.status_code}"
                
        except httpx.TimeoutException:
            last_error = "Timeout"
            logger.warning(f"Timeout for endpoint #{i+1}: {url}")
            continue
        except httpx.RequestError as e:
            last_error = f"Network error: {str(e)}"
            logger.warning(f"Network error for endpoint #{i+1}: {str(e)}")
            continue
        except Exception as e:
            last_error = f"Unexpected error: {str(e)}"
            logger.warning(f"Unexpected error for endpoint #{i+1}: {str(e)}")
            continue
    
    # If all endpoints failed, provide a graceful fallback
    logger.warning(f"All GlyTouCan endpoints failed for {accession}. Last error: {last_error}")
    
    # Return a minimal structure with the accession for processing
    return {
        "accession": accession,
        "sequences": [],
        "properties": {},
        "error": f"GlyTouCan data temporarily unavailable. Last error: {last_error}",
        "fallback": True
    }

def extract_glycan_data(glycan_json: dict) -> GlycanData:
    """Extract comprehensive glycan data from API response"""
    
    if not isinstance(glycan_json, dict):
        logger.warning("Invalid glycan JSON data received")
        return GlycanData()
    
    data = GlycanData()
    
    # Extract sequences
    sequences = glycan_json.get("sequences", [])
    if isinstance(sequences, list):
        for seq in sequences:
            if not isinstance(seq, dict):
                continue
                
            format_type = seq.get("format", "").lower()
            sequence = seq.get("sequence", "")
            
            if format_type == "wurcs" and sequence:
                data.wurcs = sequence
            elif format_type in ["iupac_condensed", "iupac"] and sequence:
                data.iupac = sequence
            elif format_type == "glycoct" and sequence:
                data.glycoct = sequence
    
    # Extract additional properties
    properties = glycan_json.get("properties", {})
    if isinstance(properties, dict):
        data.mass = properties.get("mass")
        data.formula = properties.get("formula")
    
    # Extract accession
    data.accession = glycan_json.get("accession")
    
    return data

def extract_formats(glycan_json: dict) -> dict:
    """Legacy function for backward compatibility"""
    data = extract_glycan_data(glycan_json)
    return {"wurcs": data.wurcs, "iupac": data.iupac}