const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'MCP Server',
        version: '1.0.0',
    })
})

module.exports = router

