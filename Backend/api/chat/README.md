# Chat API Modular Structure

This directory contains the modularized chat API components, organized for better maintainability and separation of concerns.

## Module Structure

```
Backend/api/chat/
├── __init__.py              # Package initialization
├── README.md               # This documentation
├── config.py               # Configuration and constants
├── models.py               # Pydantic models and data structures
├── tools.py                # External research tools integration
├── glycan_utils.py         # Glycan-specific utilities and GlyTouCan API
├── llm.py                  # LLM configuration and prompt management
├── capabilities.py         # Tool capability detection and responses
└── router.py               # Main FastAPI router with endpoints
```

## Module Descriptions

### `config.py`
- Environment configuration (API keys, timeouts)
- Constants and enums (GlycanFormat, ErrorCode)
- API endpoints and patterns
- Centralized configuration management

### `models.py`
- Pydantic models for request/response validation
- Data structures (ChatRequest, ChatResponse, GlycanData)
- Input validation and sanitization
- Type definitions

### `tools.py`
- External research tools integration
- PubMed and ArXiv search functionality
- Tool capability descriptions
- Safe API call wrappers with error handling

### `glycan_utils.py`
- Glycan identifier validation and classification
- GlyTouCan API integration
- Glycan data extraction and processing
- Format conversion utilities

### `llm.py`
- Language model configuration and initialization
- System prompt management
- Response processing and cleaning
- LLM chain setup

### `capabilities.py`
- Tool capability query detection
- Dynamic response generation based on selected tools
- Pattern matching for user queries
- Contextual help responses

### `router.py`
- Main FastAPI router with all endpoints
- Request processing and orchestration
- Error handling and logging
- Health checks and monitoring endpoints

## Benefits of Modular Structure

### 1. **Separation of Concerns**
Each module has a single, well-defined responsibility:
- Configuration is centralized
- Models are isolated from business logic
- External integrations are contained
- LLM management is separate from API logic

### 2. **Maintainability**
- Easier to locate and modify specific functionality
- Reduced risk of breaking changes
- Clear dependencies between modules
- Simplified testing and debugging

### 3. **Reusability**
- Components can be imported and used independently
- Utilities can be shared across different parts of the application
- Easy to extend with new tools or capabilities

### 4. **Testability**
- Each module can be unit tested in isolation
- Mock dependencies easily for testing
- Clear interfaces between components

### 5. **Scalability**
- Easy to add new research tools
- Simple to extend with new endpoints
- Modular structure supports team development

## Usage

The main entry point remains the same:

```python
from Backend.api.chat_api import chat_api
```

This imports the router from the modular structure while maintaining backward compatibility.

## Adding New Features

### Adding a New Research Tool

1. **Update `tools.py`**:
   - Add tool description to `TOOL_CAPABILITIES`
   - Implement safe search function
   - Add error handling

2. **Update `models.py`**:
   - Add new boolean field to `ChatRequest` if needed

3. **Update `router.py`**:
   - Add tool integration in the main endpoint
   - Handle tool-specific logic

### Adding New Endpoints

1. **Add endpoint to `router.py`**
2. **Import necessary utilities from other modules**
3. **Follow existing patterns for error handling**

### Modifying Configuration

1. **Update `config.py`** for new constants or settings
2. **Import in relevant modules as needed**

## Migration Notes

The modular structure maintains full backward compatibility. All existing functionality works exactly the same, but the code is now organized into logical modules for better maintainability.

## Error Handling

Each module implements appropriate error handling:
- **Network errors** in `glycan_utils.py` and `tools.py`
- **Validation errors** in `models.py`
- **LLM errors** in `llm.py`
- **HTTP errors** in `router.py`

All errors are properly logged and converted to appropriate HTTP responses.