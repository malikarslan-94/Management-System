const axios = require('axios')
const logger = require('../utils/logger')

class APIDiscovery {
    constructor() {
        this.baseURL = process.env.BACKEND_API_URL || 'http://localhost:3001'
        this.timeout = parseInt(process.env.BACKEND_API_TIMEOUT || '10000')

        // Cache of available endpoints (discovered dynamically)
        this.endpointsCache = null
        this.cacheExpiry = 5 * 60 * 1000 // 5 minutes
        this.lastCacheUpdate = 0
    }

    /**
     * Discover available API endpoints from backend
     */
    async discoverEndpoints() {
        const now = Date.now()

        // Return cached endpoints if still valid
        if (
            this.endpointsCache &&
            now - this.lastCacheUpdate < this.cacheExpiry
        ) {
            return this.endpointsCache
        }

        try {
            // Try to get health endpoint to verify backend is available
            await axios.get(`${this.baseURL}/health`, {
                timeout: 3000,
            })

            // Known endpoints based on server.js structure
            const endpoints = {
                collections: ['camps', 'rooms', 'employees', 'users', 'assignments'],
                routes: {
                    camps: {
                        GET: ['/', '/:id'],
                        POST: ['/'],
                        PATCH: ['/:id'],
                        DELETE: ['/:id'],
                    },
                    rooms: {
                        GET: ['/', '/:id'],
                        POST: ['/'],
                        PATCH: ['/:id'],
                        DELETE: ['/:id'],
                    },
                    employees: {
                        GET: ['/', '/:id'],
                        POST: ['/'],
                        PATCH: ['/:id'],
                        DELETE: ['/:id'],
                    },
                    assignments: {
                        GET: ['/', '/:id'],
                    },
                },
            }

            this.endpointsCache = endpoints
            this.lastCacheUpdate = now

            logger.info('API endpoints discovered', {
                collections: endpoints.collections.length,
            })

            return endpoints
        } catch (error) {
            logger.warn('Failed to discover endpoints, using defaults', {
                error: error.message,
            })

            // Return default endpoints even if discovery fails
            return {
                collections: ['camps', 'rooms', 'employees', 'users', 'assignments'],
                routes: {},
            }
        }
    }

    /**
     * Call backend API based on intent analysis
     */
    async callAPI(intentAnalysis, authToken = null) {
        const startTime = Date.now()
        const { apiEndpoint, method, parameters } = intentAnalysis

        try {
            // Build URL
            let url = `${this.baseURL}${apiEndpoint}`

            // Replace :id parameter if present
            if (parameters?.id) {
                url = url.replace(':id', parameters.id)
            }

            // Prepare request config
            const config = {
                method: method || 'GET',
                url,
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json',
                },
            }

            // Add auth token if provided
            if (authToken) {
                config.headers.Authorization = `Bearer ${authToken}`
            }

            // Add query parameters for GET requests
            if (method === 'GET' && parameters?.query) {
                config.params = parameters.query
            }

            // Add body for POST/PATCH requests
            if (['POST', 'PATCH', 'PUT'].includes(method) && parameters?.body) {
                config.data = parameters.body
            }

            console.log('[MCP→API]', config.method, config.url)

            const response = await axios(config)
            const duration = Date.now() - startTime

            console.log('[MCP←API]', response.status, config.url)

            return {
                success: true,
                data: response.data,
                status: response.status,
                duration,
            }
        } catch (error) {
            const duration = Date.now() - startTime

            console.log('[MCP←API] fail', error.response?.status || 'no response', apiEndpoint)

            // Handle different error types
            if (error.response) {
                // API responded with error status
                return {
                    success: false,
                    error: error.response.data?.error || error.response.data?.message || 'API request failed',
                    status: error.response.status,
                    duration,
                }
            } else if (error.request) {
                // Request made but no response
                return {
                    success: false,
                    error: 'Backend API is not responding',
                    duration,
                }
            } else {
                // Error in request setup
                return {
                    success: false,
                    error: error.message,
                    duration,
                }
            }
        }
    }

    /**
     * Validate API endpoint exists
     */
    async validateEndpoint(apiEndpoint, method) {
        const endpoints = await this.discoverEndpoints()

        // Extract collection from endpoint (e.g., /api/employees -> employees)
        const match = apiEndpoint.match(/\/api\/([^\/]+)/)
        if (!match) {
            return false
        }

        const collection = match[1]
        return endpoints.collections.includes(collection)
    }
}

module.exports = new APIDiscovery()

