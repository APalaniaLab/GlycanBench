"""
Pydantic models for the chat API
"""
import re
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, validator
from .config import MAX_MESSAGE_LENGTH, ErrorCode

# ==================================================
# Request Models
# ==================================================
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_LENGTH)
    
    # Individual tool selection (backward compatibility)
    use_pubmed: bool = Field(default=False)
    use_arxiv: bool = Field(default=False)
    use_glycan_db: bool = Field(default=False)
    use_structure_analysis: bool = Field(default=False)
    use_synthesis: bool = Field(default=False)
    
    # Category-based selection (new intelligent mode)
    use_literature: bool = Field(default=False, description="Enable Literature category with intelligent tool selection")
    use_databases: bool = Field(default=False, description="Enable Databases category with intelligent tool selection")
    
    @validator('message')
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        
        # Check for potential injection attempts
        suspicious_patterns = [
            r'<script.*?>.*?</script>',
            r'javascript:',
            r'data:text/html',
            r'vbscript:',
            r'onload\s*=',
            r'onerror\s*='
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError("Invalid characters detected in message")
        
        return v.strip()

# ==================================================
# Data Models
# ==================================================
class GlycanData(BaseModel):
    accession: Optional[str] = None
    wurcs: Optional[str] = None
    iupac: Optional[str] = None
    glycoct: Optional[str] = None
    mass: Optional[float] = None
    formula: Optional[str] = None

# ==================================================
# Response Models
# ==================================================
class ChatResponse(BaseModel):
    reply: str
    accession: Optional[str] = None
    wurcs: Optional[str] = None
    iupac: Optional[str] = None
    glycoct: Optional[str] = None
    mass: Optional[float] = None
    formula: Optional[str] = None
    tools_used: List[str] = Field(default_factory=list)
    processing_time: Optional[float] = None
    confidence: Optional[str] = None

class ErrorResponse(BaseModel):
    error: str
    error_code: ErrorCode
    details: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)