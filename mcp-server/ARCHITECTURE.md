# MCP Server Architecture

## Overview

The MCP (Model Control Plane) server acts as an orchestration layer between the frontend chat interface and the backend API. It uses AI to understand user intent, dynamically discover and call appropriate backend APIs, and format responses into natural language.

## Components

### 1. Server (`server.js`)

Main Express server that:
- Sets up middleware (CORS, helmet, morgan)
- Registers routes
- Handles errors
- Starts HTTP server

### 2. Chat Route (`routes/chat.js`)

Main orchestration endpoint that:
- Receives user messages
- Manages conversation sessions
- Coordinates AI services
- Returns formatted responses

**Flow:**
1. Receive and sanitize user message
2. Get/create session
3. Analyze intent with AI
4. Validate API endpoint
5. Call backend API
6. Format response with AI
7. Return to frontend

### 3. AI Service (`services/aiService.js`)

Handles all AI interactions:
- **Intent Analysis**: Understands user queries and determines which API to call
- **Response Formatting**: Converts raw API responses to human-friendly text
- **Fallback Formatting**: Simple formatter when AI fails

Uses OpenAI GPT models with structured JSON responses.

### 4. API Discovery (`services/apiDiscovery.js`)

Discovers and calls backend APIs:
- **Endpoint Discovery**: Dynamically discovers available endpoints
- **API Calling**: Makes HTTP requests to backend
- **Error Handling**: Handles timeouts, network errors, API errors

### 5. Conversation Memory (`services/conversationMemory.js`)

Manages conversation context:
- **Session Management**: Creates and tracks sessions
- **Message History**: Stores conversation history
- **Context Window**: Provides recent messages to AI
- **Cleanup**: Removes expired sessions

Currently uses in-memory storage (Redis recommended for production).

### 6. Utilities

- **Logger** (`utils/logger.js`): Structured logging with levels
- **Input Sanitizer** (`utils/inputSanitizer.js`): Sanitizes user input to prevent attacks

## Data Flow

```
User Message
    ↓
Input Sanitization
    ↓
Session Management
    ↓
AI Intent Analysis
    ├─► Intent: "get_employees"
    ├─► API: "/api/employees"
    ├─► Method: "GET"
    └─► Confidence: 0.95
    ↓
API Validation
    ↓
Backend API Call
    ├─► GET http://localhost:3001/api/employees
    └─► Response: { data: [...], total: 15 }
    ↓
AI Response Formatting
    └─► "I found 15 employees in the system..."
    ↓
Return to Frontend
```

## Intent Types

The AI can detect these intents:

- `get_employees` - List all employees
- `get_employee` - Get specific employee
- `create_employee` - Create new employee
- `update_employee` - Update employee
- `delete_employee` - Delete employee
- `get_camps` - List all camps
- `get_camp` - Get specific camp
- `get_rooms` - List all rooms
- `get_room` - Get specific room
- `get_assignments` - Get room assignments
- `general_query` - General questions
- `unknown` - Unclear intent

## Error Handling

The system handles errors at multiple levels:

1. **Input Validation**: Rejects invalid/malicious input
2. **AI Failures**: Falls back to simple responses
3. **API Failures**: Returns user-friendly error messages
4. **Network Errors**: Handles timeouts and connection issues
5. **Unknown Intents**: Provides helpful guidance

## Security Features

- Input sanitization (XSS prevention)
- Session ID validation
- Request timeouts
- Error message sanitization (no internal details)
- CORS configuration
- Helmet security headers

## Scalability Considerations

### Current Limitations

- In-memory session storage (not distributed)
- No rate limiting
- No authentication
- Single instance only

### Production Recommendations

- **Redis** for session storage
- **Rate Limiting** (e.g., express-rate-limit)
- **Authentication** middleware
- **Load Balancing** for multiple instances
- **Monitoring** (e.g., Prometheus, DataDog)
- **Logging** aggregation (e.g., ELK stack)

## Performance

- **Intent Analysis**: ~1-2 seconds (OpenAI API)
- **API Call**: ~100-500ms (backend)
- **Response Formatting**: ~1-2 seconds (OpenAI API)
- **Total**: ~2-4 seconds per request

Optimization opportunities:
- Cache common queries
- Batch API calls
- Use streaming for long responses
- Parallel processing where possible

## Testing

Test the MCP server:

```bash
# Health check
curl http://localhost:3002/mcp/health

# Chat request
curl -X POST http://localhost:3002/mcp/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me all employees"
  }'
```

## Monitoring

Key metrics to monitor:
- Request rate
- Response times
- Error rates
- AI API costs
- Session counts
- Intent distribution

