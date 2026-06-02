"""
Tool capability detection and response generation
"""
from typing import Optional, List
from .models import ChatRequest
from .tools import TOOL_CAPABILITIES

# ==================================================
# Capability Detection and Response Generation
# ==================================================
def detect_tool_capability_query(message: str, request: ChatRequest) -> Optional[str]:
    """Detect if user is asking about tool capabilities - ULTRA STRICT detection only"""
    message_lower = message.lower().strip()
    
    # ULTRA specific capability queries only - must be asking about the tools themselves
    # These are the ONLY patterns that should trigger capability responses
    ultra_strict_capability_patterns = [
        "what can you do",
        "what do you do", 
        "what are your capabilities",
        "what tools do you have",
        "what can you help with",
        "what features do you have",
        "how can you help me",
        "what can this tool do",
        "what does this do",
        "help me understand what you do",
        "what is this for"
    ]
    
    # CRITICAL: Only trigger if the message is EXACTLY asking about capabilities
    # Must be a very short query (< 30 chars) and match patterns EXACTLY
    if len(message_lower) <= 30:
        for pattern in ultra_strict_capability_patterns:
            if message_lower == pattern or message_lower == pattern + "?":
                # Determine which tools are enabled
                enabled_tools = []
                if request.use_pubmed:
                    enabled_tools.append("pubmed")
                if request.use_arxiv:
                    enabled_tools.append("arxiv")
                if request.use_glycan_db:
                    enabled_tools.append("glycan_db")
                if request.use_structure_analysis:
                    enabled_tools.append("structure_analysis")
                if request.use_synthesis:
                    enabled_tools.append("synthesis")
                
                # If specific tools are enabled, focus on those
                if enabled_tools:
                    return generate_tool_capabilities_response(enabled_tools)
                else:
                    # Provide general overview of all tools
                    return generate_tool_capabilities_response(list(TOOL_CAPABILITIES.keys()))
    
    # CRITICAL: Do NOT trigger on ANY research questions
    # These are strong indicators that this is a research question, not a capability query
    research_indicators = [
        "what are", "what is", "how do", "how does", "explain", "describe", "tell me about",
        "advances", "latest", "recent", "new", "novel", "current", "state-of-the-art",
        "mechanism", "pathway", "synthesis", "analysis", "structure", "function",
        "glycan", "glycoprotein", "carbohydrate", "monosaccharide", "oligosaccharide",
        "enzyme", "protein", "biological", "chemical", "molecular", "cellular",
        "research", "study", "studies", "paper", "literature", "publication",
        "method", "technique", "approach", "process", "procedure", "protocol"
    ]
    
    # If the message contains ANY research terms, do NOT treat as capability query
    if any(term in message_lower for term in research_indicators):
        return None
    
    # If the message is longer than 30 characters, it's likely a research question
    if len(message_lower) > 30:
        return None
    
    return None

def generate_tool_capabilities_response(tool_keys: List[str]) -> str:
    """Generate a comprehensive response about tool capabilities"""
    
    if not tool_keys:
        return "I specialize in glycomics and glycobiology research with access to various research tools."
    
    response_parts = []
    
    if len(tool_keys) == 1:
        # Single tool detailed response
        tool_key = tool_keys[0]
        tool_info = TOOL_CAPABILITIES.get(tool_key, {})
        
        response_parts.append(f"With {tool_info.get('name', 'this tool')}, {tool_info.get('description', 'I can assist with glycomics research.')}")
        
        examples = tool_info.get('examples', [])
        if examples:
            response_parts.append("\nFor example, I can:")
            for example in examples[:3]:  # Limit to 3 examples
                response_parts.append(f"- {example}")
    
    else:
        # Multiple tools overview
        response_parts.append("I have access to several research tools to enhance glycomics and glycobiology research:")
        
        for tool_key in tool_keys:
            tool_info = TOOL_CAPABILITIES.get(tool_key, {})
            name = tool_info.get('name', tool_key.title())
            desc = tool_info.get('description', 'Research tool for glycomics.')
            
            # Shortened description for multi-tool response
            short_desc = desc.split('.')[0] + '.' if '.' in desc else desc
            response_parts.append(f"\n{name}: {short_desc}")
    
    response_parts.append("\n\nAll tools are specifically designed to support glycomics and glycobiology research, providing evidence-based information from reliable scientific sources.")
    
    return "".join(response_parts)