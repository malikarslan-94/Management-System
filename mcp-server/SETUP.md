# MCP Server Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd mcp-server
npm install
```

### 2. Configure Environment

Create a `.env` file in the `mcp-server` directory:

```bash
# MCP Server Configuration
PORT=3002

# Backend API Configuration
BACKEND_API_URL=http://localhost:3001
BACKEND_API_TIMEOUT=10000

# Google Gemini Configuration (REQUIRED)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Session Configuration
SESSION_TIMEOUT=3600000
MAX_CONVERSATION_HISTORY=20

# Logging
LOG_LEVEL=info
```

**Important**: You must set `GEMINI_API_KEY` with a valid Google Gemini API key (from [Google AI Studio](https://aistudio.google.com/apikey)).

### 3. Start the Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### 4. Verify Installation

Check health endpoint:

```bash
curl http://localhost:3002/mcp/health
```

Expected response:
```json
{
  "success": true,
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "MCP Server",
  "version": "1.0.0"
}
```

## Frontend Configuration

Add to your frontend `.env` file (or `.env.local`):

```bash
VITE_MCP_API_URL=http://localhost:3002
```

## Testing the Integration

1. Start the backend server (port 3001)
2. Start the MCP server (port 3002)
3. Start the frontend
4. Open the AskAIWidget and try:
   - "Show me all employees"
   - "How many camps are there?"
   - "List all rooms"

## Troubleshooting

### MCP Server won't start

- Check that port 3002 is not in use
- Verify `.env` file exists and has `GEMINI_API_KEY`
- Check logs for specific error messages

### "Unable to connect to AI service"

- Verify MCP server is running on port 3002
- Check `VITE_MCP_API_URL` in frontend `.env`
- Check browser console for CORS errors

### "Backend API is not responding"

- Verify backend server is running on port 3001
- Check `BACKEND_API_URL` in MCP server `.env`
- Test backend health: `curl http://localhost:3001/health`

### Gemini API Errors

- Verify `GEMINI_API_KEY` is correct (from Google AI Studio)
- Check your quota in Google AI Studio
- Verify model name is correct (default: `gemini-1.5-flash`; other options: `gemini-1.5-pro`, `gemini-pro`)

## Architecture Overview

```
┌─────────────┐
│  Frontend   │
│ AskAIWidget │
└──────┬──────┘
       │ POST /mcp/chat
       ▼
┌─────────────────┐
│   MCP Server    │
│  (Port 3002)    │
└──────┬──────────┘
       │
       ├─► AI Intent Analysis
       │   (OpenAI)
       │
       ├─► API Discovery
       │   (Dynamic)
       │
       ├─► Backend API Call
       │   (HTTP Request)
       │
       └─► Response Formatting
           (OpenAI)
       │
       ▼
┌─────────────┐
│   Backend   │
│ (Port 3001) │
└─────────────┘
```

## Next Steps

1. **Production Deployment**:
   - Use Redis for session storage
   - Add rate limiting
   - Set up monitoring
   - Configure proper CORS

2. **Enhancements**:
   - Add streaming responses
   - Implement conversation context window
   - Add user authentication
   - Add analytics

3. **Security**:
   - Add request validation
   - Implement rate limiting per user
   - Add API key rotation
   - Set up logging aggregation

