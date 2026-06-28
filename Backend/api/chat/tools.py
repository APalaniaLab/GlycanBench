"""
External research tools integration
"""
import logging
from typing import Dict, Any
from langchain_community.tools.pubmed.tool import PubmedQueryRun
from langchain_community.utilities import ArxivAPIWrapper
from .config import MAX_TOOL_RESULTS_LENGTH

logger = logging.getLogger(__name__)

# ==================================================
# Tool Capability Descriptions - Organized by Category
# ==================================================

# Literature Tools
LITERATURE_TOOLS = {
    "pubmed": {
        "name": "PubMed",
        "category": "Literature",
        "description": "I can search PubMed's extensive database of peer-reviewed scientific literature to find relevant research papers on glycomics and glycobiology topics. This includes studies on glycan structure, function, biosynthesis, disease associations, and experimental methods.",
        "examples": [
            "Find recent papers on N-linked glycosylation in cancer",
            "Search for studies on sialic acid metabolism",
            "Look up research on glycan-protein interactions",
            "Find papers about glycosyltransferase mechanisms"
        ]
    },
    "arxiv": {
        "name": "ArXiv",
        "category": "Literature",
        "description": "I can access ArXiv preprint repository to find the latest unpublished research papers and preprints in glycomics, computational biology, and related fields. This helps you stay current with cutting-edge research before peer review.",
        "examples": [
            "Search for computational glycobiology methods",
            "Look up bioinformatics tools for glycan analysis",
            "Find theoretical studies on glycan conformations",
            "Find preprints on machine learning applications in glycomics"
        ]
    }
}

# Database Tools
DATABASE_TOOLS = {
    "synthesis": {
        "name": "Synthesis Pathways",
        "category": "Databases",
        "description": "I can explore and explain glycan biosynthetic pathways, including the enzymes involved, reaction mechanisms, and regulatory factors. I provide information about glycosyltransferases, substrate specificity, and pathway regulation.",
        "examples": [
            "Describe O-linked glycan synthesis mechanisms",
            "Detail the role of specific glycosyltransferases",
            "Analyze pathway regulation and substrate competition"
        ]
    },
    "structure_analysis": {
        "name": "Structure Analysis",
        "category": "Databases",
        "description": "I can analyze glycan structures to explain their composition, linkage patterns, branching, stereochemistry, and biological significance. I interpret structural data from various formats and provide detailed structural insights.",
        "examples": [
            "Analyze the branching pattern of a complex N-glycan",
            "Describe the monosaccharide composition of a glycan",
            "Interpret structural features and their biological roles"
        ]
    },
    "glycan_db": {
        "name": "Glycan Database",
        "category": "Databases",
        "description": "I can query the GlyTouCan glycan structure database to retrieve detailed structural information including WURCS notation, IUPAC names, molecular mass, and chemical formulas. I automatically recognize and process glycan accession numbers.",
        "examples": [
            "Look up structural data for GlyTouCan accession G12345AB",
            "Retrieve WURCS and IUPAC formats for a glycan",
            "Get molecular properties of specific glycan structures",
            "Validate and analyze glycan identifiers"
        ]
    }
}

# Combined tool capabilities (for backward compatibility)
TOOL_CAPABILITIES = {**LITERATURE_TOOLS, **DATABASE_TOOLS}

# ==================================================
# LLM-based Tool Router
# ==================================================

def _llm_route_tools(query: str, use_literature: bool, use_databases: bool) -> dict:
    """
    Use a lightweight LLM call to intelligently select which specific tools
    to activate within the chosen categories, instead of keyword scoring.

    Returns a dict of booleans keyed by tool name.
    """
    from .llm import llm  # import here to avoid circular imports

    available = []
    if use_literature:
        available += ["pubmed", "arxiv"]
    if use_databases:
        available += ["glycan_db", "structure_analysis", "synthesis"]

    if not available:
        return {
            "use_pubmed": False,
            "use_arxiv": False,
            "use_glycan_db": False,
            "use_structure_analysis": False,
            "use_synthesis": False,
            "reasoning": "No categories selected.",
        }

    tool_descriptions = {
        "pubmed": "PubMed — peer-reviewed life-science literature",
        "arxiv": "ArXiv — computational biology / bioinformatics preprints and methods",
        "glycan_db": "GlyTouCan database — structural data lookup by accession or format",
        "structure_analysis": "Structure Analysis — composition, linkage, branching, stereochemistry",
        "synthesis": "Synthesis Pathways — biosynthetic enzymes, pathways, regulation",
    }

    descriptions_block = "\n".join(
        f"- {k}: {v}" for k, v in tool_descriptions.items() if k in available
    )

    routing_prompt = (
        f"You are a tool-selection router for a glycomics research assistant.\n"
        f"Available tools:\n{descriptions_block}\n\n"
        f"User query: \"{query}\"\n\n"
        f"Select only the tools that are genuinely useful for answering this query. "
        f"Respond with ONLY a JSON object, nothing else. Example:\n"
        f'{{ "pubmed": true, "arxiv": false, "glycan_db": false, '
        f'"structure_analysis": true, "synthesis": false }}'
    )

    try:
        import json, re
        raw = llm.invoke(routing_prompt)
        # extract the content string from the AIMessage
        text = raw.content if hasattr(raw, "content") else str(raw)
        # pull out the first JSON object
        match = re.search(r"\{[^}]+\}", text, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
            result = {
                "use_pubmed": bool(parsed.get("pubmed", False)) and use_literature,
                "use_arxiv": bool(parsed.get("arxiv", False)) and use_literature,
                "use_glycan_db": bool(parsed.get("glycan_db", False)) and use_databases,
                "use_structure_analysis": bool(parsed.get("structure_analysis", False)) and use_databases,
                "use_synthesis": bool(parsed.get("synthesis", False)) and use_databases,
                "reasoning": f"LLM router selected from: {list(parsed.keys())}",
            }
            # Guarantee at least one tool is active per selected category
            if use_literature and not result["use_pubmed"] and not result["use_arxiv"]:
                result["use_pubmed"] = True
                result["reasoning"] += " | Forced PubMed as Literature fallback."
            if use_databases and not any([
                result["use_glycan_db"],
                result["use_structure_analysis"],
                result["use_synthesis"],
            ]):
                result["use_structure_analysis"] = True
                result["reasoning"] += " | Forced Structure Analysis as Databases fallback."
            return result
    except Exception as e:
        logger.warning(f"LLM router failed ({e}), falling back to keyword heuristic")

    # Fallback to keyword heuristic if LLM routing fails
    return _keyword_route_tools(query, use_literature, use_databases)


def _keyword_route_tools(query: str, use_literature: bool, use_databases: bool) -> dict:
    """Keyword-scoring fallback used when the LLM router is unavailable."""
    query_lower = query.lower()

    arxiv_keywords = [
        "computational", "algorithm", "machine learning", "deep learning", "ai",
        "bioinformatics", "modeling", "simulation", "theoretical", "method",
        "tool", "software", "database", "prediction", "classification",
        "neural network", "model", "framework", "approach", "technique",
        "preprint", "latest", "cutting-edge", "novel method", "new approach",
    ]
    glycan_db_keywords = [
        "glytoucan", "accession", "wurcs", "iupac", "glycoct", "mass", "formula",
        "molecular weight", "database", "lookup", "structure id", "glycan id",
        "identifier", "registry", "repository",
    ]
    structure_keywords = [
        "structure", "analyze", "composition", "linkage", "branching", "branch",
        "monosaccharide", "residue", "anomeric", "stereochemistry", "conformation",
        "topology", "connectivity", "bond", "glycosidic", "reducing end",
        "non-reducing", "terminal", "internal", "core", "antenna", "arm",
    ]
    synthesis_keywords = [
        "synthesis", "biosynthesis", "pathway", "enzyme", "glycosyltransferase",
        "transferase", "mechanism", "reaction", "substrate", "donor", "acceptor",
        "regulation", "expression", "activity", "kinetics", "specificity",
        "er", "golgi", "processing", "modification", "maturation", "assembly",
    ]

    import re as _re
    glycan_db_score = sum(1 for k in glycan_db_keywords if k in query_lower)
    if _re.search(r"G\d{5}[A-Z]{2}", query):
        glycan_db_score += 5

    use_arxiv = use_literature and sum(1 for k in arxiv_keywords if k in query_lower) > 0
    use_glycan_db = use_databases and glycan_db_score > 0
    use_structure = use_databases  # always include when databases selected
    use_synthesis = use_databases and sum(1 for k in synthesis_keywords if k in query_lower) > 0

    return {
        "use_pubmed": use_literature,
        "use_arxiv": use_arxiv,
        "use_glycan_db": use_glycan_db,
        "use_structure_analysis": use_structure,
        "use_synthesis": use_synthesis,
        "reasoning": "Keyword heuristic (LLM router unavailable)",
    }


# ==================================================
# Intelligent Tool Selection Based on User Query
# ==================================================

def analyze_query_for_literature_tools(query: str) -> list[str]:
    """Kept for backward compatibility — delegates to unified router."""
    r = _keyword_route_tools(query, use_literature=True, use_databases=False)
    tools = []
    if r["use_pubmed"]:
        tools.append("pubmed")
    if r["use_arxiv"]:
        tools.append("arxiv")
    return tools or ["pubmed"]


def analyze_query_for_database_tools(query: str) -> list[str]:
    """Kept for backward compatibility — delegates to unified router."""
    r = _keyword_route_tools(query, use_literature=False, use_databases=True)
    tools = []
    if r["use_structure_analysis"]:
        tools.append("structure_analysis")
    if r["use_glycan_db"]:
        tools.append("glycan_db")
    if r["use_synthesis"]:
        tools.append("synthesis")
    return tools or ["structure_analysis"]


def intelligent_tool_selection(query: str, use_literature: bool = False, use_databases: bool = False) -> dict:
    """
    Intelligently select specific tools based on user query and category preferences.
    Uses LLM routing with keyword-heuristic fallback.
    """
    r = _llm_route_tools(query, use_literature, use_databases)
    selected = []
    if r["use_pubmed"]:
        selected.append("pubmed")
    if r["use_arxiv"]:
        selected.append("arxiv")
    if r["use_glycan_db"]:
        selected.append("glycan_db")
    if r["use_structure_analysis"]:
        selected.append("structure_analysis")
    if r["use_synthesis"]:
        selected.append("synthesis")
    r["selected_tools"] = selected
    return r

# ==================================================
# External Tool Functions
# ==================================================
def safe_api_call(func, *args, **kwargs) -> Dict[str, Any]:
    """Wrapper for safe API calls with comprehensive error handling"""
    try:
        result = func(*args, **kwargs)
        return {"success": True, "data": result, "error": None}
    except Exception as e:
        logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
        return {"success": False, "data": None, "error": str(e)}

def safe_pubmed_search(query: str) -> str:
    """Enhanced PubMed search with better query processing and result formatting"""
    try:
        # Optimize query for better results
        if len(query) > 200:
            # Extract key terms for long queries
            key_terms = extract_key_terms(query)
            query = " AND ".join(key_terms[:5])  # Use top 5 key terms
        
        pubmed = PubmedQueryRun()
        result = pubmed.invoke(query)
        
        # Enhanced result processing
        if result and len(result) > 50:  # Only process if we have substantial results
            # Add context about the search
            enhanced_result = f"PubMed Search Query: {query}\n\nRelevant Publications:\n{result}"
            
            if len(enhanced_result) > MAX_TOOL_RESULTS_LENGTH:
                enhanced_result = enhanced_result[:MAX_TOOL_RESULTS_LENGTH] + "... [Results truncated - showing most relevant findings]"
            
            return enhanced_result
        else:
            return "PubMed search returned limited results for this query."
        
    except Exception as e:
        logger.error(f"PubMed search error: {str(e)}")
        return "PubMed search temporarily unavailable."

def safe_arxiv_search(query: str) -> str:
    """Enhanced ArXiv search with better query processing and result formatting"""
    try:
        # Optimize query for computational/theoretical aspects
        if len(query) > 200:
            key_terms = extract_key_terms(query)
            query = " ".join(key_terms[:5])
        
        # Add computational terms to improve ArXiv relevance
        computational_terms = ["computational", "bioinformatics", "modeling", "algorithm", "machine learning"]
        if not any(term in query.lower() for term in computational_terms):
            query += " computational OR bioinformatics OR modeling"
        
        arxiv = ArxivAPIWrapper(top_k_results=5)  # Increased results for better coverage
        result = arxiv.run(query)
        
        # Enhanced result processing
        if result and len(result) > 50:
            enhanced_result = f"ArXiv Search Query: {query}\n\nRelevant Preprints and Computational Studies:\n{result}"
            
            if len(enhanced_result) > MAX_TOOL_RESULTS_LENGTH:
                enhanced_result = enhanced_result[:MAX_TOOL_RESULTS_LENGTH] + "... [Results truncated - showing most relevant findings]"
            
            return enhanced_result
        else:
            return "ArXiv search returned limited results for this query."
        
    except Exception as e:
        logger.error(f"ArXiv search error: {str(e)}")
        return "ArXiv search temporarily unavailable."

def extract_key_terms(query: str) -> list:
    """Extract key scientific terms from a query for better search results"""
    # Common glycomics/glycobiology terms that should be prioritized
    important_terms = [
        'glycan', 'glycoprotein', 'glycolipid', 'monosaccharide', 'oligosaccharide',
        'glycosylation', 'glycosyltransferase', 'sialic acid', 'fucose', 'mannose',
        'glucose', 'galactose', 'GlcNAc', 'GalNAc', 'neuraminic acid',
        'N-linked', 'O-linked', 'biosynthesis', 'pathway', 'enzyme',
        'lectin', 'carbohydrate', 'proteoglycan', 'heparan', 'chondroitin',
        'hyaluronic', 'cancer', 'immune', 'cell surface', 'recognition'
    ]
    
    words = query.lower().split()
    key_terms = []
    
    # First, add important glycomics terms found in the query
    for word in words:
        for term in important_terms:
            if term in word or word in term:
                key_terms.append(term)
                break
    
    # Then add other significant words (longer than 3 characters, not common words)
    common_words = {'the', 'and', 'for', 'are', 'with', 'this', 'that', 'from', 'they', 'have', 'been', 'what', 'how', 'why', 'when', 'where'}
    for word in words:
        if len(word) > 3 and word not in common_words and word not in [t.lower() for t in key_terms]:
            key_terms.append(word)
    
    return key_terms[:10]  # Return top 10 terms