const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const mongoose = require('mongoose')
const { authenticate, guardCollection } = require('./lib/access')
// Load models before any scoped middleware resolves references.
for (const model of [
    'Location',
    'Camp',
    'Building',
    'Room',
    'Employee',
    'RoomAssignment',
    'CampFacility',
    'User',
])
    require(`./models/${model}`)
function createApp(options = {}) {
    const app = express()
    app.locals.jwtSecret = options.jwtSecret || process.env.JWT_SECRET
    if (!app.locals.jwtSecret) throw new Error('JWT_SECRET must be configured.')
    app.use(helmet())
    app.use(cors())
    app.use(express.json({ limit: '2mb' }))
    app.use('/api', require('./routes/auth'))
    app.use('/api', authenticate)
    for (const collection of [
        'locations',
        'camps',
        'buildings',
        'rooms',
        'employees',
        'assignments',
        'facilities',
    ]) {
        // Older clients used PUT for edits; preserve that path without generic unchecked writes.
        app.use(
            `/api/${collection}`,
            (req, res, next) => {
                if (req.method === 'PUT' && collection !== 'assignments')
                    req.method = 'PATCH'
                next()
            },
            guardCollection(collection),
            require(`./routes/${collection}`),
        )
    }
    app.use('/api/users', require('./routes/users'))
    app.use('/api/settings', require('./routes/settings'))
    app.use('/api/reports', require('./routes/reports'))
    app.get('/health', (req, res) =>
        res.json({
            status: 'OK',
            database:
                mongoose.connection.readyState === 1
                    ? 'Connected'
                    : 'Disconnected',
        }),
    )
    app.use((req, res) =>
        res.status(404).json({ message: 'Endpoint not found.' }),
    )
    app.use((error, req, res, next) => {
        const status =
            error.status ||
            (error.code === 11000
                ? 409
                : ['ValidationError', 'CastError'].includes(error.name)
                  ? 400
                  : 500)
        const message =
            error.code === 11000
                ? 'A record with these unique details already exists.'
                : status === 500
                  ? 'The request could not be completed. Please try again.'
                  : error.message
        if (status === 500) console.error(error)
        res.status(status).json({ message, error: message })
    })
    return app
}
module.exports = { createApp }
