const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet())
app.use(cors())
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME
})
.then(() => {
    console.log('✅ Connected to MongoDB Atlas')
    console.log(`📊 Database: ${process.env.DB_NAME}`)
})
.catch((error) => {
    console.error('❌ MongoDB connection error:', error)
    process.exit(1)
})

// Generic Schema for flexible collections
const createGenericSchema = () => {
    return new mongoose.Schema({}, { 
        strict: false, 
        timestamps: true,
        collection: 'dynamic' // This will be overridden
    })
}

// Generic CRUD routes
app.get('/api/:collection', async (req, res) => {
    try {
        const { collection } = req.params
        const { page = 1, limit = 10, sort, filter } = req.query

        const Model = mongoose.model(collection, createGenericSchema(), collection)
        
        const pageNum = parseInt(page)
        const limitNum = parseInt(limit)
        const skip = (pageNum - 1) * limitNum

        let query = {}
        if (filter) {
            try {
                query = JSON.parse(filter)
            } catch (e) {
                return res.status(400).json({ error: 'Invalid filter format' })
            }
        }

        let sortObj = { createdAt: -1 }
        if (sort) {
            try {
                sortObj = JSON.parse(sort)
            } catch (e) {
                // Keep default sort
            }
        }

        const data = await Model.find(query)
            .sort(sortObj)
            .skip(skip)
            .limit(limitNum)
            .lean()

        const total = await Model.countDocuments(query)
        const totalPages = Math.ceil(total / limitNum)

        res.json({
            data,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages
        })
    } catch (error) {
        console.error(`Error fetching ${req.params.collection}:`, error)
        res.status(500).json({ error: error.message })
    }
})

app.get('/api/:collection/count', async (req, res) => {
    try {
        const { collection } = req.params
        const { filter } = req.query

        const Model = mongoose.model(collection, createGenericSchema(), collection)
        
        let query = {}
        if (filter) {
            try {
                query = JSON.parse(filter)
            } catch (e) {
                return res.status(400).json({ error: 'Invalid filter format' })
            }
        }

        const count = await Model.countDocuments(query)
        res.json({ count })
    } catch (error) {
        console.error(`Error counting ${req.params.collection}:`, error)
        res.status(500).json({ error: error.message })
    }
})

app.get('/api/:collection/:id', async (req, res) => {
    try {
        const { collection, id } = req.params
        const Model = mongoose.model(collection, createGenericSchema(), collection)
        
        const document = await Model.findById(id).lean()
        if (!document) {
            return res.status(404).json({ error: 'Document not found' })
        }

        res.json(document)
    } catch (error) {
        console.error(`Error fetching ${req.params.collection} by ID:`, error)
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid ID format' })
        }
        res.status(500).json({ error: error.message })
    }
})

app.post('/api/:collection', async (req, res) => {
    try {
        const { collection } = req.params
        const Model = mongoose.model(collection, createGenericSchema(), collection)
        
        const document = new Model(req.body)
        const savedDocument = await document.save()
        
        res.status(201).json(savedDocument.toObject())
    } catch (error) {
        console.error(`Error creating ${req.params.collection}:`, error)
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message })
        }
        res.status(500).json({ error: error.message })
    }
})

app.put('/api/:collection/:id', async (req, res) => {
    try {
        const { collection, id } = req.params
        const Model = mongoose.model(collection, createGenericSchema(), collection)
        
        const updatedDocument = await Model.findByIdAndUpdate(
            id,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).lean()

        if (!updatedDocument) {
            return res.status(404).json({ error: 'Document not found' })
        }

        res.json(updatedDocument)
    } catch (error) {
        console.error(`Error updating ${req.params.collection}:`, error)
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid ID format' })
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message })
        }
        res.status(500).json({ error: error.message })
    }
})

app.delete('/api/:collection/:id', async (req, res) => {
    try {
        const { collection, id } = req.params
        const Model = mongoose.model(collection, createGenericSchema(), collection)
        
        const deletedDocument = await Model.findByIdAndDelete(id)
        if (!deletedDocument) {
            return res.status(404).json({ error: 'Document not found' })
        }

        res.json({ message: 'Document deleted successfully' })
    } catch (error) {
        console.error(`Error deleting ${req.params.collection}:`, error)
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid ID format' })
        }
        res.status(500).json({ error: error.message })
    }
})

app.delete('/api/:collection', async (req, res) => {
    try {
        const { collection } = req.params
        const { filter } = req.body
        const Model = mongoose.model(collection, createGenericSchema(), collection)
        
        const result = await Model.deleteMany(filter || {})
        res.json({ deletedCount: result.deletedCount })
    } catch (error) {
        console.error(`Error deleting multiple ${req.params.collection}:`, error)
        res.status(500).json({ error: error.message })
    }
})

app.post('/api/:collection/aggregate', async (req, res) => {
    try {
        const { collection } = req.params
        const { pipeline } = req.body
        const Model = mongoose.model(collection, createGenericSchema(), collection)
        
        const result = await Model.aggregate(pipeline)
        res.json(result)
    } catch (error) {
        console.error(`Error aggregating ${req.params.collection}:`, error)
        res.status(500).json({ error: error.message })
    }
})

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    })
})

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' })
})

// Error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error)
    res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
    console.log(`🚀 CampWise Server running on port ${PORT}`)
    console.log(`📍 Health check: http://localhost:${PORT}/health`)
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`)
})
