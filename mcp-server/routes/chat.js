const express = require('express')
const router = express.Router()

const aiService = require('../services/aiService')
const apiDiscovery = require('../services/apiDiscovery')
const conversationMemory = require('../services/conversationMemory')
const InputSanitizer = require('../utils/inputSanitizer')

/**
 * POST /mcp/chat
 * Main chat endpoint that orchestrates AI intent analysis and API calls
 */
router.post('/', async (req, res) => {
    const startTime = Date.now()

    try {
        // Extract and sanitize input
        const { message, sessionId: providedSessionId, authToken } = req.body

        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Message is required',
            })
        }

        const sanitizedMessage = InputSanitizer.sanitize(message)

        if (!sanitizedMessage) {
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty',
            })
        }

        // Get or create session
        let sessionId = providedSessionId
        if (!sessionId || !InputSanitizer.validateSessionId(sessionId)) {
            sessionId = InputSanitizer.generateSessionId()
        }

        // Get conversation history
        const history = conversationMemory.getHistory(sessionId)
        const conversationContext = history.map((msg) => ({
            role: msg.role,
            content: msg.content,
        }))

        // Add user message to memory
        conversationMemory.addMessage(sessionId, 'user', sanitizedMessage)

        console.log('[MCP] received:', sanitizedMessage.slice(0, 60))
        console.log('[MCP] Step 1: analyze intent')
        let intentAnalysis
        try {
            intentAnalysis = await aiService.analyzeIntent(
                sanitizedMessage,
                conversationContext,
            )
        } catch (error) {
            console.log('[MCP] Step 1 failed:', error.message)
            const isQuota = /429|quota|rate limit|Too Many Requests/i.test(error.message)
            const userMessage = isQuota
                ? "AI quota exceeded. Please try again in a minute, or check your API key and usage."
                : 'I encountered an error understanding your request. Please try rephrasing it.'
            return res.status(200).json({
                success: false,
                message: userMessage,
            })
        }

        console.log('[MCP] Step 2: handle intent')
        if (intentAnalysis.intent === 'unknown' || intentAnalysis.confidence < 0.5) {
            const fallbackMessage =
                "I'm not sure how to help with that. I can assist you with:\n" +
                "- Viewing and managing employees\n" +
                "- Checking camp and room information\n" +
                "- Managing room assignments\n\n" +
                "Could you please rephrase your question?"

            conversationMemory.addMessage(sessionId, 'assistant', fallbackMessage)
            return res.json({
                success: true,
                message: fallbackMessage,
                metadata: {
                    intent: intentAnalysis.intent,
                    confidence: intentAnalysis.confidence,
                    sessionId,
                },
            })
        }

        if (intentAnalysis.intent === 'general_query') {
            // General question - use AI to answer directly
            const generalResponse =
                "I'm here to help you manage your CampWise system. " +
                "I can help you with employees, camps, rooms, and assignments. " +
                "What would you like to know?"

            conversationMemory.addMessage(sessionId, 'assistant', generalResponse)
            return res.json({
                success: true,
                message: generalResponse,
                metadata: {
                    intent: intentAnalysis.intent,
                    confidence: intentAnalysis.confidence,
                    sessionId,
                },
            })
        }

        console.log('[MCP] Step 3: validate endpoint')
        const isValidEndpoint = await apiDiscovery.validateEndpoint(
            intentAnalysis.apiEndpoint,
            intentAnalysis.method,
        )

        if (!isValidEndpoint) {
            const errorMessage =
                "I couldn't find the right information to answer your question. " +
                "Please try rephrasing it or ask about employees, camps, or rooms."

            conversationMemory.addMessage(sessionId, 'assistant', errorMessage)
            return res.json({
                success: false,
                message: errorMessage,
                metadata: {
                    intent: intentAnalysis.intent,
                    confidence: intentAnalysis.confidence,
                    sessionId,
                },
            })
        }

        console.log('[MCP] Step 4: call backend API')
        const apiResult = await apiDiscovery.callAPI(intentAnalysis, authToken)
        console.log('[MCP] Step 4 result:', apiResult.success ? 'ok' : 'fail')

        if (!apiResult.success) {
            const errorMessage =
                apiResult.error ||
                "I couldn't retrieve the information you requested. Please try again."

            conversationMemory.addMessage(sessionId, 'assistant', errorMessage)
            return res.json({
                success: false,
                message: errorMessage,
                metadata: {
                    intent: intentAnalysis.intent,
                    confidence: intentAnalysis.confidence,
                    sessionId,
                },
            })
        }

        console.log('[MCP] Step 5: format response')
        let formattedMessage
        try {
            formattedMessage = await aiService.formatResponse(
                apiResult.data,
                intentAnalysis.intent,
                sanitizedMessage,
            )
        } catch (error) {
            formattedMessage = aiService.fallbackFormat(
                apiResult.data,
                intentAnalysis.intent,
            )
        }

        conversationMemory.addMessage(sessionId, 'assistant', formattedMessage)
        const totalDuration = Date.now() - startTime
        console.log('[MCP] Step 6: done, response sent')
        return res.json({
            success: true,
            message: formattedMessage,
            metadata: {
                intent: intentAnalysis.intent,
                confidence: intentAnalysis.confidence,
                sessionId,
                apiDuration: apiResult.duration,
                totalDuration,
            },
        })
    } catch (error) {
        console.log('[MCP] Step failed:', error.message)
        return res.status(200).json({
            success: false,
            message: 'An unexpected error occurred. Please try again later.',
        })
    }
})

/**
 * GET /mcp/chat/session/:sessionId
 * Get conversation history for a session
 */
router.get('/session/:sessionId', (req, res) => {
    const { sessionId } = req.params

    if (!InputSanitizer.validateSessionId(sessionId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid session ID',
        })
    }

    const history = conversationMemory.getHistory(sessionId)

    return res.json({
        success: true,
        sessionId,
        messages: history,
    })
})

/**
 * DELETE /mcp/chat/session/:sessionId
 * Clear conversation history for a session
 */
router.delete('/session/:sessionId', (req, res) => {
    const { sessionId } = req.params

    if (!InputSanitizer.validateSessionId(sessionId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid session ID',
        })
    }

    conversationMemory.clearSession(sessionId)

    return res.json({
        success: true,
        message: 'Session cleared',
    })
})

module.exports = router

