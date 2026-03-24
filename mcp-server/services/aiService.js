const OpenAI = require('openai')

class AIService {
    constructor() {
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not set in environment variables')
        }

        this.client = new OpenAI({ apiKey })
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
        this.maxTokens = 1000
    }

    /**
     * Analyze user intent and determine which API to call
     */
    async analyzeIntent(userMessage, conversationHistory = []) {
        try {
            const systemPrompt = `You are an AI assistant that helps users interact with a CampWise management system.

Available API endpoints:
- GET /api/camps - Get all camps
- GET /api/camps/:id - Get a specific camp
- GET /api/rooms - Get all rooms
- GET /api/rooms/:id - Get a specific room
- GET /api/employees - Get all employees
- GET /api/employees/:id - Get a specific employee
- GET /api/assignments - Get room assignments
- POST /api/employees - Create employee
- PATCH /api/employees/:id - Update employee
- DELETE /api/employees/:id - Delete employee

Analyze the user's message and determine:
1. The intent (what they want to do)
2. The API endpoint to call
3. HTTP method (GET, POST, PATCH, DELETE)
4. Any parameters needed (ID, filters, etc.)
5. Request body if needed

Respond ONLY with valid JSON in this exact format:
{
  "intent": "get_employees|get_employee|create_employee|update_employee|delete_employee|get_camps|get_camp|get_rooms|get_room|get_assignments|general_query|unknown",
  "confidence": 0.0-1.0,
  "apiEndpoint": "/api/employees",
  "method": "GET|POST|PATCH|DELETE",
  "parameters": {
    "id": "optional_id",
    "query": {},
    "body": {}
  },
  "reasoning": "brief explanation"
}

If the intent is unclear or not related to the system, use "general_query" or "unknown".`

            const messages = [
                { role: 'system', content: systemPrompt },
                ...conversationHistory.slice(-5).map((m) => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: m.content,
                })),
                { role: 'user', content: userMessage },
            ]

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages,
                temperature: 0.3,
                max_tokens: this.maxTokens,
                response_format: { type: 'json_object' },
            })

            const content = JSON.parse(response.choices[0].message.content)
            return {
                ...content,
                duration: 0,
            }
        } catch (error) {
            throw new Error(`Failed to analyze intent: ${error.message}`)
        }
    }

    /**
     * Format API response into human-friendly message
     */
    async formatResponse(apiResponse, intent, userMessage) {
        try {
            const systemPrompt = `You are a helpful assistant that converts API responses into natural, human-friendly messages.

Rules:
- Never expose raw JSON or technical details
- Never mention API endpoints or internal structure
- Use natural language
- Be concise but informative
- If data is empty, explain that clearly
- If there are multiple items, summarize them
- Format numbers and dates naturally
- Be friendly and professional

Convert the following API response into a clear, helpful message for the user.`

            const messages = [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: `User asked: "${userMessage}"

API Response:
${JSON.stringify(apiResponse, null, 2)}

Convert this into a natural, helpful response.`,
                },
            ]

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages,
                temperature: 0.7,
                max_tokens: 500,
            })

            return response.choices[0].message.content.trim()
        } catch (error) {
            return this.fallbackFormat(apiResponse, intent)
        }
    }

    /**
     * Fallback formatter when AI fails
     */
    fallbackFormat(apiResponse, intent) {
        if (Array.isArray(apiResponse.data)) {
            const count = apiResponse.data.length
            if (count === 0) {
                return "I couldn't find any results matching your request."
            }
            return `I found ${count} result${count > 1 ? 's' : ''}.`
        }

        if (apiResponse.data) {
            return 'Here is the information you requested.'
        }

        if (apiResponse.message) {
            return apiResponse.message
        }

        return 'The operation completed successfully.'
    }
}

module.exports = new AIService()
