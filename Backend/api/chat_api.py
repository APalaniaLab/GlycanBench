"""
Modular Chat API - Main Entry Point

This module provides a clean interface to the modularized chat API.
All functionality has been organized into separate modules for better maintainability.
"""

# Import the main router from the modular structure
from .chat.router import chat_api

# Export the router for use in main.py
__all__ = ["chat_api"]