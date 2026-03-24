/**
 * Sanitize user input to prevent injection attacks
 */
class InputSanitizer {
    /**
     * Sanitize user message
     */
    static sanitize(message) {
        if (typeof message !== 'string') {
            return ''
        }

        // Remove potential script tags and dangerous characters
        let sanitized = message
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim()

        // Limit length
        const maxLength = 2000
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength)
        }

        return sanitized
    }

    /**
     * Validate session ID format
     */
    static validateSessionId(sessionId) {
        if (!sessionId || typeof sessionId !== 'string') {
            return false
        }

        // Allow alphanumeric, hyphens, and underscores
        return /^[a-zA-Z0-9_-]+$/.test(sessionId)
    }

    /**
     * Generate safe session ID
     */
    static generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
}

module.exports = InputSanitizer

