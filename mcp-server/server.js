const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
require('dotenv').config()

const chatRouter = require('./routes/chat')
const healthRouter = require('./routes/health')

const app = express()
const PORT = process.env.PORT || 3002

// Middleware
app.use(helmet())
app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    }),
)
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/mcp/chat', chatRouter)
app.use('/mcp/health', healthRouter)

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
    })
})

// Error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error)
    res.status(500).json({
        success: false,
        message: 'Internal server error',
    })
})

app.listen(PORT, () => {
    console.log(`🚀 MCP Server running on port ${PORT}`)
    console.log(`📍 Health check: http://localhost:${PORT}/mcp/health`)
    console.log(`🔗 Chat endpoint: http://localhost:${PORT}/mcp/chat`)
})

module.exports = app

