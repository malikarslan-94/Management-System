const logger = require('../utils/logger')

class ConversationMemory {
    constructor() {
        // In-memory storage (use Redis in production)
        this.sessions = new Map()
        this.maxHistory = parseInt(process.env.MAX_CONVERSATION_HISTORY || '20')
        this.sessionTimeout = parseInt(process.env.SESSION_TIMEOUT || '3600000') // 1 hour

        // Cleanup expired sessions every 10 minutes
        setInterval(() => this.cleanupExpiredSessions(), 10 * 60 * 1000)
    }

    /**
     * Get or create session
     */
    getSession(sessionId) {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                id: sessionId,
                createdAt: Date.now(),
                lastAccess: Date.now(),
                messages: [],
            })
        }

        const session = this.sessions.get(sessionId)
        session.lastAccess = Date.now()

        return session
    }

    /**
     * Add message to session
     */
    addMessage(sessionId, role, content) {
        const session = this.getSession(sessionId)

        session.messages.push({
            role, // 'user' or 'assistant'
            content,
            timestamp: Date.now(),
        })

        // Keep only last N messages
        if (session.messages.length > this.maxHistory) {
            session.messages = session.messages.slice(-this.maxHistory)
        }

        logger.debug('Message added to session', {
            sessionId,
            role,
            messageCount: session.messages.length,
        })

        return session
    }

    /**
     * Get conversation history for AI context
     */
    getHistory(sessionId, maxMessages = 10) {
        const session = this.getSession(sessionId)
        return session.messages.slice(-maxMessages)
    }

    /**
     * Clear session
     */
    clearSession(sessionId) {
        this.sessions.delete(sessionId)
        logger.debug('Session cleared', { sessionId })
    }

    /**
     * Cleanup expired sessions
     */
    cleanupExpiredSessions() {
        const now = Date.now()
        let cleaned = 0

        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastAccess > this.sessionTimeout) {
                this.sessions.delete(sessionId)
                cleaned++
            }
        }

        if (cleaned > 0) {
            logger.info('Cleaned up expired sessions', { count: cleaned })
        }
    }

    /**
     * Get session stats
     */
    getStats() {
        return {
            activeSessions: this.sessions.size,
            totalMessages: Array.from(this.sessions.values()).reduce(
                (sum, session) => sum + session.messages.length,
                0,
            ),
        }
    }
}

module.exports = new ConversationMemory()

