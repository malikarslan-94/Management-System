const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet())
app.use(cors())
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Log API requests (frontend/MCP → backend)
app.use('/api', (req, res, next) => {
    console.log('[API]', req.method, req.path)
    next()
})

// MongoDB Connection
mongoose
    .connect(process.env.MONGODB_URI, {
        dbName: process.env.DB_NAME,
    })
    .then(() => {
        console.log('✅ Connected to MongoDB Atlas')
        console.log(`📊 Database: ${process.env.DB_NAME}`)
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error)
        process.exit(1)
    })

// Import models
const Camp = require('./models/Camp')
const Room = require('./models/Room')
const User = require('./models/User')
const Employee = require('./models/Employee')
const RoomAssignment = require('./models/RoomAssignment')
const Location = require('./models/Location')
const Building = require('./models/Building')
const CampFacility = require('./models/CampFacility')

// Authentication Middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '')
        if (!token) {
            return res
                .status(401)
                .json({ error: 'No token, authorization denied' })
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-secret-key',
        )
        const user = await User.findById(decoded.userId)

        if (!user) {
            return res.status(401).json({ error: 'Token is not valid' })
        }

        req.user = user
        next()
    } catch (error) {
        console.error('Authentication error:', error)
        res.status(401).json({ error: 'Token is not valid' })
    }
}

// Map collection names to models
const modelMap = {
    camps: Camp,
    rooms: Room,
    users: User,
    employees: Employee,
    assignments: RoomAssignment,
    locations: Location,
    buildings: Building,
    facilities: CampFacility,
}

// Specific routes (register before generic handlers to ensure they take precedence)
const locationsRouter = require('./routes/locations')
const campsRouter = require('./routes/camps')
const buildingsRouter = require('./routes/buildings')
const facilitiesRouter = require('./routes/facilities')
const roomsRouter = require('./routes/rooms')
const usersRouter = require('./routes/users')
const employeesRouter = require('./routes/employees')
const assignmentsRouter = require('./routes/assignments')

app.use('/api/locations', locationsRouter)
app.use('/api/camps', campsRouter)
app.use('/api/buildings', buildingsRouter)
app.use('/api/facilities', facilitiesRouter)
app.use('/api/rooms', roomsRouter)
app.use('/api/users', usersRouter)
app.use('/api/employees', employeesRouter)
app.use('/api/assignments', assignmentsRouter)

// Debug: Log route registration
console.log(
    '✅ Registered routes: /api/locations, /api/camps, /api/buildings, /api/facilities, /api/rooms, /api/users, /api/employees, /api/assignments',
)

// Auth Routes
app.post('/api/sign-up', async (req, res) => {
    try {
        const { name, email, password } = req.body

        // Check if user exists
        let user = await User.findOne({ email })
        if (user) {
            return res.status(400).json({ error: 'User already exists' })
        }

        // Create new user
        user = new User({
            name,
            email,
            password,
            role: 'admin', // First user will be admin
        })

        await user.save()

        // Create JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' },
        )

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        })
    } catch (error) {
        console.error('Sign up error:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

app.post('/api/sign-in', async (req, res) => {
    try {
        const { user, password } = req.body

        // Check if user exists by name
        const foundUser = await User.findOne({ name: user })
        if (!foundUser) {
            return res.status(400).json({ error: 'Invalid credentials' })
        }

        // Check password
        const isMatch = await foundUser.comparePassword(password)
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' })
        }

        // Create JWT token
        const token = jwt.sign(
            { userId: foundUser._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' },
        )

        res.json({
            token,
            user: {
                id: foundUser._id,
                name: foundUser.name,
                role: foundUser.role,
            },
        })
    } catch (error) {
        console.error('Sign in error:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

// CRUD routes
app.get('/api/:collection', async (req, res) => {
    try {
        const { collection } = req.params
        const { page = 1, limit = 10, sort, filter } = req.query

        const Model = modelMap[collection]
        if (!Model) {
            return res.status(404).json({ error: 'Collection not found' })
        }

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
            totalPages,
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

        const Model = mongoose.model(
            collection,
            createGenericSchema(),
            collection,
        )

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
        const Model = modelMap[collection]
        if (!Model) {
            return res.status(404).json({ error: 'Collection not found' })
        }

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

        // Skip generic handler for routes with specific handlers
        const specificRoutes = ['camps', 'rooms', 'users', 'employees']
        if (specificRoutes.includes(collection)) {
            // This should not happen if routes are registered correctly
            console.warn(
                `⚠️  POST /api/${collection} hit generic handler - specific route should have handled this`,
            )
            return res.status(404).json({
                error: 'Route handled by specific handler',
                message: `Please use the specific /api/${collection} route handler`,
            })
        }

        const Model = modelMap[collection]
        if (!Model) {
            return res.status(404).json({ error: 'Collection not found' })
        }

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
        const Model = modelMap[collection]
        if (!Model) {
            return res.status(404).json({ error: 'Collection not found' })
        }

        const updatedDocument = await Model.findByIdAndUpdate(
            id,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true },
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

app.patch('/api/:collection/:id', async (req, res) => {
    try {
        const { collection, id } = req.params
        const Model = modelMap[collection]
        if (!Model) {
            return res.status(404).json({ error: 'Collection not found' })
        }

        const updatedDocument = await Model.findByIdAndUpdate(
            id,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true },
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
        const Model = modelMap[collection]
        if (!Model) {
            return res.status(404).json({ error: 'Collection not found' })
        }

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
        const Model = mongoose.model(
            collection,
            createGenericSchema(),
            collection,
        )

        const result = await Model.deleteMany(filter || {})
        res.json({ deletedCount: result.deletedCount })
    } catch (error) {
        console.error(
            `Error deleting multiple ${req.params.collection}:`,
            error,
        )
        res.status(500).json({ error: error.message })
    }
})

app.post('/api/:collection/aggregate', async (req, res) => {
    try {
        const { collection } = req.params
        const { pipeline } = req.body
        const Model = mongoose.model(
            collection,
            createGenericSchema(),
            collection,
        )

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
        database:
            mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
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
