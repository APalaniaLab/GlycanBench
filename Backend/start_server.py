#!/usr/bin/env python3
"""
Startup script for FastAPI GlycanBench backend
"""

import os
import uvicorn

# Fix OpenMP library conflict
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from main import app

if __name__ == "__main__":
    print("🚀 Starting GlycanBench FastAPI server...")
    print("📍 Server will be available at: http://127.0.0.1:5000")
    print("📖 API documentation at: http://127.0.0.1:5000/docs")
    print("🔧 Alternative docs at: http://127.0.0.1:5000/redoc")
    
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=5000,
        reload=False,  # Disable auto-reload to prevent crashes
        log_level="info"
    )