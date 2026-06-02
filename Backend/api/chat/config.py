"""
Configuration and constants for the chat API
"""
import os
from enum import Enum
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ==================================================
# Environment Configuration
# ==================================================
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not set")

os.environ["LANGCHAIN_TRACING_V2"] = "false"

# ==================================================
# API Configuration
# ==================================================
GLYTOUCAN_API_BASE = "https://glytoucan.org/glycans"
GLYTOUCAN_API_FALLBACK = "https://api.glycosmos.org/glycan"
REQUEST_TIMEOUT = 30
MAX_MESSAGE_LENGTH = 5000
MAX_TOOL_RESULTS_LENGTH = 10000

# ==================================================
# Enums
# ==================================================
class GlycanFormat(str, Enum):
    WURCS = "wurcs"
    IUPAC_CONDENSED = "iupac_condensed"
    IUPAC_EXTENDED = "iupac_extended"
    GLYCOCT = "glycoct"

class ErrorCode(str, Enum):
    INVALID_INPUT = "INVALID_INPUT"
    ACCESSION_NOT_FOUND = "ACCESSION_NOT_FOUND"
    API_UNAVAILABLE = "API_UNAVAILABLE"
    TOOL_ERROR = "TOOL_ERROR"
    LLM_ERROR = "LLM_ERROR"
    RATE_LIMIT = "RATE_LIMIT"

# ==================================================
# Constants
# ==================================================
# Glycan accession patterns
GLYCAN_PATTERNS = {
    "glytoucan": r"^G\d{5}[A-Z]{2}$",
    "wurcs": r"^WURCS=2\.0\/\d+,\d+,\d+\/.*",
    "iupac": r"^[A-Za-z0-9\(\)\[\]\-\>\α\β\,\;\:]+$"
}