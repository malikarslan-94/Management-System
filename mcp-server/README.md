# MCP Server - AI Chat Orchestration

Model Control Plane server for orchestrating AI-powered chat interactions with the CampWise backend API.

## Architecture

```
Frontend (AskAIWidget)
    ↓
POST /mcp/chat
    ↓
MCP Server
    ↓
AI Intent Analysis
    ↓
Backend API Discovery
    ↓
Call Backend API
    ↓
AI Response Formatting
    ↓
Return to Frontend
```

## Features

- **AI Intent Analysis**: Uses Google Gemini to understand user queries and determine which API to call
- **Dynamic API Discovery**: Automatically discovers available backend endpoints
- **Conversation Memory**: Maintains context across multiple messages
- **Response Formatting**: Converts raw API responses into human-friendly messages
- **Error Handling**: Graceful fallbacks and error messages
- **Logging**: Comprehensive logging for debugging and monitoring
- **Security**: Input sanitization and validation

## Setup

1. Install dependencies:
```bash
cd mcp-server
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Set required environment variables:
- `GEMINI_API_KEY`: Your Google Gemini API key ([Get one](https://aistudio.google.com/apikey))
- `BACKEND_API_URL`: Backend API URL (default: http://localhost:3001)
- `PORT`: MCP server port (default: 3002)
- `GEMINI_MODEL`: (optional) Gemini model name (default: gemini-1.5-flash)

4. Start the server:
```bash
npm start
# or for development
npm run dev
```

## API Endpoints

### POST /mcp/chat

Main chat endpoint.

**Request:**
```json
{
  "message": "Show me all employees",
  "sessionId": "optional_session_id",
  "authToken": "optional_jwt_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "I found 15 employees in the system...",
  "metadata": {
    "intent": "get_employees",
    "confidence": 0.95,
    "sessionId": "session_123",
    "apiDuration": 234,
    "totalDuration": 1234
  }
}
```

### GET /mcp/chat/session/:sessionId

Get conversation history for a session.

### DELETE /mcp/chat/session/:sessionId

Clear conversation history for a session.

### GET /mcp/health

Health check endpoint.

## Environment Variables

- `PORT`: Server port (default: 3002)
- `BACKEND_API_URL`: Backend API base URL
- `BACKEND_API_TIMEOUT`: API request timeout in ms (default: 10000)
- `GEMINI_API_KEY`: Google Gemini API key (required)
- `GEMINI_MODEL`: Gemini model to use (default: gemini-1.5-flash)
- `SESSION_TIMEOUT`: Session timeout in ms (default: 3600000)
- `MAX_CONVERSATION_HISTORY`: Max messages per session (default: 20)
- `LOG_LEVEL`: Logging level (error|warn|info|debug)

## Supported Intents

- `get_employees`: Get all employees
- `get_employee`: Get specific employee by ID
- `create_employee`: Create new employee
- `update_employee`: Update employee
- `delete_employee`: Delete employee
- `get_camps`: Get all camps
- `get_camp`: Get specific camp
- `get_rooms`: Get all rooms
- `get_room`: Get specific room
- `get_assignments`: Get room assignments
- `general_query`: General questions
- `unknown`: Unclear intent

## Security

- Input sanitization to prevent injection attacks
- Session ID validation
- Request timeout handling
- Error message sanitization (no internal details exposed)

## Production Considerations

- Replace in-memory session storage with Redis
- Add rate limiting
- Add authentication middleware
- Set up monitoring and alerting
- Configure CORS properly
- Use environment-specific configurations

