"""
Main chat API router
"""
import logging
import traceback
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, status

from .models import ChatRequest, ChatResponse, GlycanData
from .config import ErrorCode
from .glycan_utils import validate_glycan_accession, glytoucan_lookup, extract_glycan_data
from .tools import safe_pubmed_search, safe_arxiv_search, TOOL_CAPABILITIES, intelligent_tool_selection
from .llm import assistant_chain, clean_output
from .capabilities import detect_tool_capability_query

# ==================================================
# Question Analysis for Better Accuracy
# ==================================================
def analyze_question_type(message: str) -> str:
    """Analyze the question type to provide better context for accurate responses"""
    message_lower = message.lower()
    
    # Identify question categories for targeted responses
    if any(word in message_lower for word in ['mechanism', 'how does', 'how do', 'process', 'pathway']):
        return "Mechanistic inquiry requiring detailed molecular explanations"
    elif any(word in message_lower for word in ['structure', 'composition', 'linkage', 'branching']):
        return "Structural analysis requiring precise molecular details"
    elif any(word in message_lower for word in ['function', 'role', 'biological', 'significance']):
        return "Functional inquiry requiring biological context and significance"
    elif any(word in message_lower for word in ['latest', 'recent', 'advances', 'new', 'current']):
        return "Current research inquiry requiring up-to-date information and recent findings"
    elif any(word in message_lower for word in ['method', 'technique', 'analysis', 'detection']):
        return "Methodological inquiry requiring technical details and applications"
    elif any(word in message_lower for word in ['disease', 'cancer', 'therapeutic', 'clinical']):
        return "Clinical/biomedical inquiry requiring disease context and therapeutic relevance"
    elif any(word in message_lower for word in ['synthesis', 'biosynthesis', 'enzyme', 'transferase']):
        return "Biosynthetic inquiry requiring enzyme mechanisms and pathway details"
    else:
        return "General glycomics inquiry requiring comprehensive scientific explanation"

def enhance_evidence_integration(message: str, pubmed_result: str = "", arxiv_result: str = "") -> str:
    """Enhance evidence integration with better context and analysis"""
    enhanced_context = ""
    
    if pubmed_result and "temporarily unavailable" not in pubmed_result:
        enhanced_context += f"\n\nPEER-REVIEWED LITERATURE EVIDENCE:\n{pubmed_result}\n"
        enhanced_context += "INSTRUCTION: Integrate the above peer-reviewed findings with established glycobiology knowledge. Highlight key experimental results, methodologies, and conclusions."
    
    if arxiv_result and "temporarily unavailable" not in arxiv_result:
        enhanced_context += f"\n\nPREPRINT/COMPUTATIONAL EVIDENCE:\n{arxiv_result}\n"
        enhanced_context += "INSTRUCTION: Consider the above preprint/computational findings as supplementary evidence. Focus on novel methods, theoretical insights, and emerging approaches."
    
    if enhanced_context:
        enhanced_context += "\n\nEVIDENCE SYNTHESIS REQUIREMENT: Synthesize external evidence with established glycobiology principles to provide the most accurate and comprehensive response possible."
    
    return enhanced_context

def calculate_response_confidence(reply: str, tools_used: List[str], original_question: str) -> str:
    """Calculate confidence score based on response quality indicators"""
    confidence_score = 0
    
    # Length and detail indicators
    if len(reply) > 500:
        confidence_score += 1
    if len(reply) > 1500:
        confidence_score += 1
    
    # Scientific terminology indicators
    scientific_terms = [
        'enzyme', 'protein', 'pathway', 'mechanism', 'structure', 'function',
        'glycan', 'monosaccharide', 'linkage', 'biosynthesis', 'transferase',
        'molecular', 'cellular', 'biological', 'chemical', 'reaction'
    ]
    term_count = sum(1 for term in scientific_terms if term.lower() in reply.lower())
    if term_count >= 5:
        confidence_score += 2
    elif term_count >= 3:
        confidence_score += 1
    
    # Specific details indicators
    if any(indicator in reply.lower() for indicator in ['α', 'β', 'glcnac', 'galnac', 'neu5ac', 'man', 'gal', 'glc']):
        confidence_score += 1
    
    # External evidence usage
    if tools_used:
        confidence_score += len(tools_used)
    
    # Quantitative information indicators
    if any(indicator in reply for indicator in ['%', 'mM', 'μM', 'kDa', 'nm', 'pH', 'temperature']):
        confidence_score += 1
    
    # Uncertainty acknowledgment (good scientific practice)
    if any(phrase in reply.lower() for phrase in ['not fully understood', 'requires further', 'limited evidence', 'unclear']):
        confidence_score += 1
    
    # Convert score to confidence level
    if confidence_score >= 7:
        return "high"
    elif confidence_score >= 4:
        return "medium"
    else:
        return "low"

# ==================================================
# Logging Configuration
# ==================================================
logger = logging.getLogger(__name__)

# ==================================================
# FastAPI Router
# ==================================================
chat_api = APIRouter(tags=["Glycomics Chat"])

# ==================================================
# Main Chat Endpoint
# ==================================================
@chat_api.post("/api/GlycomicsChat", response_model=ChatResponse)
def glycomics_chat(request: ChatRequest):
    """Enhanced glycomics chat endpoint with intelligent tool selection"""
    
    start_time = datetime.now()
    tools_used = []
    
    try:
        message = request.message.strip()
        logger.info(f"Processing message: {message[:100]}...")
        
        # Initialize response data
        glycan_data = GlycanData()
        confidence = "medium"
        
        # Check for tool capability queries first - but ONLY when NOT using intelligent selection
        use_literature = getattr(request, 'use_literature', False)
        use_databases = getattr(request, 'use_databases', False)
        
        # CRITICAL: Never check for capability queries when using intelligent selection
        # This prevents research questions from being misidentified as capability queries
        if not (use_literature or use_databases):
            capability_response = detect_tool_capability_query(message, request)
            if capability_response:
                logger.info(f"Detected tool capability query: {message}")
                processing_time = (datetime.now() - start_time).total_seconds()
                
                # Determine which tools were referenced
                tools_referenced = []
                if request.use_pubmed:
                    tools_referenced.append("PubMed")
                if request.use_arxiv:
                    tools_referenced.append("ArXiv")
                if request.use_glycan_db:
                    tools_referenced.append("GlyTouCan Database")
                if request.use_structure_analysis:
                    tools_referenced.append("Structure Analysis")
                if request.use_synthesis:
                    tools_referenced.append("Synthesis Pathways")
                
                return ChatResponse(
                    reply=capability_response,
                    tools_used=tools_referenced,
                    processing_time=processing_time,
                    confidence="high"
                )
        
        # Intelligent tool selection based on query analysis
        # Check if user selected categories instead of individual tools
        if use_literature or use_databases:
            # Use intelligent selection
            tool_selection = intelligent_tool_selection(message, use_literature, use_databases)
            
            # Override individual tool settings with intelligent selection
            request.use_pubmed = tool_selection['use_pubmed']
            request.use_arxiv = tool_selection['use_arxiv'] 
            request.use_glycan_db = tool_selection['use_glycan_db']
            request.use_structure_analysis = tool_selection['use_structure_analysis']
            request.use_synthesis = tool_selection['use_synthesis']
            
            logger.info(f"Intelligent tool selection: {tool_selection['reasoning']}")
            
            # FORCE tool usage when categories are selected
            if use_literature and not (request.use_pubmed or request.use_arxiv):
                # Default to PubMed if no literature tools selected
                request.use_pubmed = True
                logger.info("Forcing PubMed usage for Literature category")
            
            if use_databases and not (request.use_glycan_db or request.use_structure_analysis or request.use_synthesis):
                # Default to structure analysis if no database tools selected
                request.use_structure_analysis = True
                logger.info("Forcing Structure Analysis usage for Databases category")
        
        # Validate and process glycan identifiers
        validation = validate_glycan_accession(message)
        
        if validation["is_valid"] and validation["type"] == "glytoucan":
            logger.info(f"Processing GlyTouCan accession: {message}")
            
            try:
                # Fetch glycan data
                glycan_json = glytoucan_lookup(message)
                
                # Check if this is a fallback response
                if glycan_json.get('fallback', False):
                    logger.warning(f"Using fallback for GlyTouCan accession: {message}")
                    augmented_input = (
                        f"GlyTouCan accession {message} was provided but detailed structural data is temporarily unavailable.\n\n"
                        f"Accession: {message}\n\n"
                        "Please provide a comprehensive analysis based on the accession format and general glycobiology knowledge:\n"
                        "1. Explain what GlyTouCan accessions represent\n"
                        "2. Discuss general glycan structure principles\n"
                        "3. Describe typical analytical approaches for glycan characterization\n"
                        "4. Suggest alternative resources for structural information\n"
                        "Note that specific structural data is temporarily unavailable due to database connectivity issues."
                    )
                    confidence = "low"
                    tools_used.append("GlyTouCan Database (Limited)")
                else:
                    # Normal processing with full data
                    glycan_data = extract_glycan_data(glycan_json)
                    tools_used.append("GlyTouCan Database")
                    confidence = "high"
                    
                    # Create enhanced prompt for accession
                    augmented_input = (
                        "Validated GlyTouCan glycan accession with complete structural data.\n\n"
                        f"Accession: {glycan_data.accession or message}\n"
                        f"WURCS: {glycan_data.wurcs or 'Not available'}\n"
                        f"IUPAC: {glycan_data.iupac or 'Not available'}\n"
                        f"Mass: {glycan_data.mass or 'Not available'}\n"
                        f"Formula: {glycan_data.formula or 'Not available'}\n\n"
                        "Provide a comprehensive analysis including:\n"
                        "1. Glycan structure and classification\n"
                        "2. Monosaccharide composition and linkages\n"
                        "3. Structural features and branching patterns\n"
                        "4. Biological significance and potential functions\n"
                        "5. Biosynthetic pathways if known\n"
                        "Use only the provided structural data and established glycobiology knowledge."
                    )
                
                # Auto-enable relevant tools
                request.use_glycan_db = True
                request.use_structure_analysis = True
                
            except Exception as e:
                logger.error(f"Error processing GlyTouCan accession {message}: {str(e)}")
                augmented_input = (
                    f"The GlyTouCan accession {message} could not be processed due to database connectivity issues. "
                    "Please provide general information about GlyTouCan accessions and glycan structure analysis methods. "
                    "Explain what this type of identifier represents and how glycan structures are typically characterized."
                )
                confidence = "low"
        
        elif validation["is_valid"] and validation["type"] == "wurcs":
            logger.info("Processing WURCS structure")
            glycan_data.wurcs = message
            tools_used.append("WURCS Parser")
            confidence = "high"
            
            augmented_input = (
                f"WURCS glycan structure provided:\n\n"
                f"WURCS: {message}\n\n"
                "Analyze this WURCS structure and explain:\n"
                "1. The glycan composition and linkage patterns\n"
                "2. Structural features and branching\n"
                "3. Potential biological roles\n"
                "4. Related glycan families or classes\n"
                "Use established glycobiology knowledge for interpretation."
            )
            
            request.use_structure_analysis = True
        
        else:
            # Regular glycomics question - enhance with context analysis
            question_type = analyze_question_type(message)
            augmented_input = f"Glycomics/Glycobiology Research Question:\n{message}\n\nQuestion Analysis: {question_type}\n"
        
        # Enhanced external tool results integration
        pubmed_result = ""
        arxiv_result = ""
        
        if request.use_pubmed:
            logger.info("Searching PubMed...")
            pubmed_result = safe_pubmed_search(message)
            if "temporarily unavailable" not in pubmed_result:
                tools_used.append("PubMed")
        
        if request.use_arxiv:
            logger.info("Searching ArXiv...")
            arxiv_result = safe_arxiv_search(message)
            if "temporarily unavailable" not in arxiv_result:
                tools_used.append("ArXiv")
        
        # Add enhanced evidence integration
        evidence_context = enhance_evidence_integration(message, pubmed_result, arxiv_result)
        augmented_input += evidence_context
        
        # Add comprehensive final instruction for accuracy
        augmented_input += (
            "\n\nACCURACY REQUIREMENTS:\n"
            "1. Provide the most scientifically accurate response possible\n"
            "2. Use precise terminology and specific molecular details\n"
            "3. Include quantitative information when available\n"
            "4. Explain mechanisms at the molecular level\n"
            "5. Connect molecular details to biological significance\n"
            "6. Acknowledge uncertainties or limitations when appropriate\n"
            "7. Focus on established scientific knowledge and provided evidence\n\n"
            "If the question is outside glycomics/glycobiology, respond with the standard rejection message."
        )
        
        # Enhanced response generation with confidence scoring
        try:
            logger.info("Generating enhanced LLM response...")
            raw_response = assistant_chain.invoke({"user_message": augmented_input})
            reply = clean_output(raw_response)
            
            # Better handling of empty responses
            if not reply or len(reply.strip()) < 10:
                logger.warning("Empty or very short response from LLM, retrying with simplified prompt")
                # Retry with simplified prompt
                simplified_input = f"Question: {message}\n\nProvide a comprehensive scientific answer about this glycomics/glycobiology topic."
                raw_response = assistant_chain.invoke({"user_message": simplified_input})
                reply = clean_output(raw_response)
                
                if not reply or len(reply.strip()) < 10:
                    raise ValueError("LLM consistently returning empty responses")
            
            # Calculate enhanced confidence score
            confidence = calculate_response_confidence(reply, tools_used, message)
                
        except Exception as e:
            logger.error(f"LLM generation error: {str(e)}")
            # Provide a fallback response instead of failing
            if "Empty response" in str(e) or "consistently returning empty" in str(e):
                reply = "I apologize, but I'm having difficulty generating a response for this query. This may be due to the complexity of the question or temporary processing issues. Please try rephrasing your question or contact support if the issue persists."
                confidence = "low"
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to generate response from language model"
                )
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Build response
        response = ChatResponse(
            reply=reply,
            accession=glycan_data.accession,
            wurcs=glycan_data.wurcs,
            iupac=glycan_data.iupac,
            glycoct=glycan_data.glycoct,
            mass=glycan_data.mass,
            formula=glycan_data.formula,
            tools_used=tools_used,
            processing_time=processing_time,
            confidence=confidence
        )
        
        logger.info(f"Successfully processed request in {processing_time:.2f}s")
        return response
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in glycomics_chat: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your request"
        )

# ==================================================
# Additional Endpoints
# ==================================================
@chat_api.get("/api/tools/capabilities")
def get_tool_capabilities():
    """Get information about available research tools"""
    return {
        "tools": TOOL_CAPABILITIES,
        "timestamp": datetime.now().isoformat()
    }

@chat_api.get("/api/tools/capabilities/examples")
def get_tool_examples():
    """Get example questions for all tools"""
    examples = {}
    for tool_id, tool_info in TOOL_CAPABILITIES.items():
        examples[tool_id] = {
            "name": tool_info["name"],
            "examples": tool_info["examples"]
        }
    return {
        "examples": examples,
        "timestamp": datetime.now().isoformat()
    }

@chat_api.get("/api/tools/categories")
def get_tool_categories():
    """Get tools organized by categories"""
    from .tools import LITERATURE_TOOLS, DATABASE_TOOLS
    
    return {
        "categories": {
            "Literature": {
                "description": "Search and access scientific literature and research papers",
                "tools": LITERATURE_TOOLS
            },
            "Databases": {
                "description": "Query glycan databases and analyze structural information",
                "tools": DATABASE_TOOLS
            }
        },
        "timestamp": datetime.now().isoformat()
    }

@chat_api.get("/api/tools/categories/{category_name}")
def get_tools_by_category(category_name: str):
    """Get tools for a specific category"""
    from .tools import LITERATURE_TOOLS, DATABASE_TOOLS
    
    categories = {
        "literature": {
            "name": "Literature",
            "description": "Search and access scientific literature and research papers",
            "tools": LITERATURE_TOOLS
        },
        "databases": {
            "name": "Databases", 
            "description": "Query glycan databases and analyze structural information",
            "tools": DATABASE_TOOLS
        }
    }
    
    category_key = category_name.lower()
    if category_key not in categories:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category '{category_name}' not found. Available categories: Literature, Databases"
        )
    
    return {
        "category": categories[category_key],
        "timestamp": datetime.now().isoformat()
    }

@chat_api.post("/api/tools/capabilities/{tool_name}")
def get_specific_tool_capability(tool_name: str):
    """Get detailed information about a specific tool"""
    if tool_name not in TOOL_CAPABILITIES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool '{tool_name}' not found"
        )
    
    tool_info = TOOL_CAPABILITIES[tool_name]
    return {
        "tool": tool_name,
        "info": tool_info,
        "timestamp": datetime.now().isoformat()
    }

@chat_api.post("/api/test-capability-query")
def test_capability_query(request: ChatRequest):
    """Test endpoint to demonstrate tool capability responses"""
    try:
        # Simulate a capability query
        capability_response = detect_tool_capability_query(request.message, request)
        
        if capability_response:
            return {
                "detected_as_capability_query": True,
                "response": capability_response,
                "tools_referenced": {
                    "pubmed": request.use_pubmed,
                    "arxiv": request.use_arxiv,
                    "glycan_db": request.use_glycan_db,
                    "structure_analysis": request.use_structure_analysis,
                    "synthesis": request.use_synthesis
                }
            }
        else:
            return {
                "detected_as_capability_query": False,
                "message": "This query was not detected as a tool capability question"
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test error: {str(e)}"
        )

@chat_api.post("/api/test-intelligent-selection")
def test_intelligent_selection(request: dict):
    """Test endpoint for intelligent tool selection"""
    try:
        query = request.get('query', '')
        use_literature = request.get('use_literature', False)
        use_databases = request.get('use_databases', False)
        
        if not query:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query is required"
            )
        
        result = intelligent_tool_selection(query, use_literature, use_databases)
        
        return {
            "query": query,
            "categories_selected": {
                "literature": use_literature,
                "databases": use_databases
            },
            "intelligent_selection": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test error: {str(e)}"
        )

@chat_api.get("/api/health")
def health():
    """Enhanced health check with service status"""
    try:
        # Test LLM connectivity
        test_response = assistant_chain.invoke({"user_message": "Test"})
        llm_status = "healthy" if test_response else "degraded"
    except:
        llm_status = "unhealthy"
    
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "llm": llm_status,
            "glytoucan_api": "available"  # Could add actual test
        }
    }

@chat_api.post("/api/validate-accession")
def validate_accession_endpoint(accession: str):
    """Endpoint to validate glycan accessions"""
    try:
        validation = validate_glycan_accession(accession)
        return {
            "accession": accession,
            "validation": validation,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation error: {str(e)}"
        )

@chat_api.get("/api/test-tools")
def test_external_tools():
    """Test external tool connectivity"""
    results = {}
    
    # Test PubMed
    pubmed_result = safe_pubmed_search("glycan")
    results["pubmed"] = {
        "status": "healthy" if "temporarily unavailable" not in pubmed_result else "degraded",
        "sample_length": len(pubmed_result)
    }
    
    # Test ArXiv
    arxiv_result = safe_arxiv_search("glycomics")
    results["arxiv"] = {
        "status": "healthy" if "temporarily unavailable" not in arxiv_result else "degraded",
        "sample_length": len(arxiv_result)
    }
    
    return {
        "timestamp": datetime.now().isoformat(),
        "tools": results
    }