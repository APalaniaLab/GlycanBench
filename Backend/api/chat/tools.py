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
# Intelligent Tool Selection Based on User Query
# ==================================================

def analyze_query_for_literature_tools(query: str) -> list[str]:
    """
    Analyze user query to determine which literature tools to use
    Returns list of tool IDs to activate
    """
    query_lower = query.lower()
    selected_tools = []
    
    # Always use PubMed for literature searches as it's the primary source
    selected_tools.append('pubmed')
    
    # Keywords that suggest ArXiv (computational, theoretical, preprints)
    arxiv_keywords = [
        'computational', 'algorithm', 'machine learning', 'deep learning', 'ai',
        'bioinformatics', 'modeling', 'simulation', 'theoretical', 'method',
        'tool', 'software', 'database', 'prediction', 'classification',
        'neural network', 'model', 'framework', 'approach', 'technique',
        'preprint', 'latest', 'cutting-edge', 'novel method', 'new approach'
    ]
    
    # Check for ArXiv indicators  
    arxiv_score = sum(1 for keyword in arxiv_keywords if keyword in query_lower)
    
    # Add ArXiv if computational aspects are mentioned
    if arxiv_score > 0:
        selected_tools.append('arxiv')
    
    return selected_tools

def analyze_query_for_database_tools(query: str) -> list[str]:
    """
    Analyze user query to determine which database tools to use
    Returns list of tool IDs to activate
    """
    query_lower = query.lower()
    selected_tools = []
    
    # Keywords that suggest Glycan Database
    glycan_db_keywords = [
        'glytoucan', 'accession', 'g00', 'g01', 'g02', 'g03', 'g04', 'g05',
        'wurcs', 'iupac', 'glycoct', 'mass', 'formula', 'molecular weight',
        'database', 'lookup', 'search database', 'find structure', 'structure id',
        'glycan id', 'identifier', 'registry', 'repository'
    ]
    
    # Keywords that suggest Structure Analysis
    structure_keywords = [
        'structure', 'analyze', 'composition', 'linkage', 'branching', 'branch',
        'monosaccharide', 'residue', 'anomeric', 'stereochemistry', 'conformation',
        'topology', 'connectivity', 'bond', 'glycosidic', 'reducing end',
        'non-reducing', 'terminal', 'internal', 'core', 'antenna', 'arm'
    ]
    
    # Keywords that suggest Synthesis Pathways
    synthesis_keywords = [
        'synthesis', 'biosynthesis', 'pathway', 'enzyme', 'glycosyltransferase',
        'transferase', 'mechanism', 'reaction', 'substrate', 'donor', 'acceptor',
        'regulation', 'expression', 'activity', 'kinetics', 'specificity',
        'er', 'golgi', 'processing', 'modification', 'maturation', 'assembly'
    ]
    
    # Calculate scores
    glycan_db_score = sum(1 for keyword in glycan_db_keywords if keyword in query_lower)
    structure_score = sum(1 for keyword in structure_keywords if keyword in query_lower)
    synthesis_score = sum(1 for keyword in synthesis_keywords if keyword in query_lower)
    
    # Check for specific accession patterns
    import re
    if re.search(r'G\d{5}[A-Z]{2}', query):
        glycan_db_score += 5  # Strong indicator for GlyTouCan
    
    # Always include structure analysis as it's the most general
    selected_tools.append('structure_analysis')
    
    # Add specific tools based on scores
    if glycan_db_score > 0:
        selected_tools.append('glycan_db')
    
    if synthesis_score > 0:
        selected_tools.append('synthesis')
    
    # If no specific indicators, add synthesis for comprehensive coverage
    if glycan_db_score == 0 and synthesis_score == 0:
        selected_tools.append('synthesis')
    
    return selected_tools

def intelligent_tool_selection(query: str, use_literature: bool = False, use_databases: bool = False) -> dict:
    """
    Intelligently select specific tools based on user query and category preferences
    
    Args:
        query: User's question/prompt
        use_literature: Whether user selected Literature category
        use_databases: Whether user selected Databases category
        
    Returns:
        Dictionary with specific tool selections
    """
    result = {
        'use_pubmed': False,
        'use_arxiv': False,
        'use_glycan_db': False,
        'use_structure_analysis': False,
        'use_synthesis': False,
        'selected_tools': [],
        'reasoning': []
    }
    
    if use_literature:
        literature_tools = analyze_query_for_literature_tools(query)
        result['use_pubmed'] = 'pubmed' in literature_tools
        result['use_arxiv'] = 'arxiv' in literature_tools
        result['selected_tools'].extend(literature_tools)
        result['reasoning'].append(f"Literature tools selected: {', '.join(literature_tools)}")
    
    if use_databases:
        database_tools = analyze_query_for_database_tools(query)
        result['use_glycan_db'] = 'glycan_db' in database_tools
        result['use_structure_analysis'] = 'structure_analysis' in database_tools
        result['use_synthesis'] = 'synthesis' in database_tools
        result['selected_tools'].extend(database_tools)
        result['reasoning'].append(f"Database tools selected: {', '.join(database_tools)}")
    
    return result

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