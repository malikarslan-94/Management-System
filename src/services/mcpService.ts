import { getAccessToken } from './authToken'
import axios from 'axios'

const MCP_API_URL = import.meta.env.VITE_MCP_API_URL || 'http://localhost:3002'

export interface MCPSession {
    sessionId?: string
}

export interface MCPChatRequest {
    message: string
    sessionId?: string
    authToken?: string
}

export interface MCPChatResponse {
    success: boolean
    message: string
    metadata?: {
        intent: string
        confidence: number
        sessionId: string
        apiDuration?: number
        totalDuration?: number
    }
}

class MCPService {
    private baseURL: string
    private sessionId: string | null = null

    constructor() {
        this.baseURL = MCP_API_URL
    }

    /**
     * Get or create session ID
     */
    private getSessionId(): string {
        if (!this.sessionId) {
            // Try to get from localStorage
            const stored = localStorage.getItem('mcp_session_id')
            if (stored) {
                this.sessionId = stored
            } else {
                // Generate new session ID
                this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                localStorage.setItem('mcp_session_id', this.sessionId)
            }
        }
        return this.sessionId
    }

    /**
     * Get auth token from localStorage or Redux store
     */
    private getAuthToken(): string | undefined {
        // Try to get from localStorage (common pattern)
        const token = getAccessToken()
        return token || undefined
    }

    /**
     * Send message to MCP server
     */
    async sendMessage(message: string): Promise<string> {
        try {
            console.log('[FE→MCP] POST /mcp/chat')
            const sessionId = this.getSessionId()
            const authToken = this.getAuthToken()

            const response = await axios.post<MCPChatResponse>(
                `${this.baseURL}/mcp/chat`,
                {
                    message,
                    sessionId,
                    authToken,
                },
                {
                    timeout: 30000, // 30 second timeout
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            )

            if (response.data.success) {
                console.log('[FE←MCP] success')
                if (response.data.metadata?.sessionId) {
                    this.sessionId = response.data.metadata.sessionId
                    localStorage.setItem('mcp_session_id', this.sessionId)
                }
                const msg = response.data.message
                return typeof msg === 'string' && msg.trim() ? msg : 'Done.'
            } else {
                console.log('[FE←MCP] success=false')
                const msg = response.data.message
                throw new Error(typeof msg === 'string' && msg.trim() ? msg : 'Failed to get response')
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    console.log('[FE←MCP] error', error.response.status)
                    const data = error.response.data
                    let errorMessage =
                        (typeof data === 'object' && data !== null && typeof data.message === 'string'
                            ? data.message
                            : typeof data === 'string'
                              ? data
                              : null) || `Server error: ${error.response.status}`
                    if (!errorMessage.trim()) errorMessage = `Server error: ${error.response.status}`
                    throw new Error(errorMessage)
                } else if (error.request) {
                    // Request made but no response
                    throw new Error(
                        'Unable to connect to AI service. Please check your connection.',
                    )
                } else {
                    // Error in request setup
                    throw new Error('Failed to send message. Please try again.')
                }
            }
            throw error
        }
    }

    /**
     * Clear session
     */
    clearSession() {
        this.sessionId = null
        localStorage.removeItem('mcp_session_id')
    }

    /**
     * Get current session ID
     */
    getCurrentSessionId(): string | null {
        return this.sessionId || this.getSessionId()
    }
}

export default new MCPService()

