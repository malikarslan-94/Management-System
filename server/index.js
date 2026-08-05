require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const path = require('path')
const Location = require('./models/Location')
const Camp = require('./models/Camp')
const Building = require('./models/Building')
const Room = require('./models/Room')

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// MongoDB Connection
mongoose
    .connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(async () => {
        console.log('Connected to MongoDB Atlas')
        console.log('Connected to DB:', mongoose.connection.name)
        console.log('DB Host:', mongoose.connection.host)
        console.log(
            'DB Collections:',
            (await mongoose.connection.db.listCollections().toArray()).map(
                (c) => c.name,
            ),
        )
        await seedInitialData()
    })
    .catch((err) => console.error('MongoDB connection error:', err))

// Routes
app.use('/api/locations', require('./routes/locations'))
app.use('/api/camps', require('./routes/camps'))
app.use('/api/buildings', require('./routes/buildings'))
app.use('/api/facilities', require('./routes/facilities'))
app.use('/api/rooms', require('./routes/rooms'))
app.use('/api/users', require('./routes/users'))
app.use('/api/employees', require('./routes/employees'))
app.use('/api/assignments', require('./routes/assignments'))

// Basic route for testing
app.get('/api/health', (req, res) => {
    res.json({
        status: 'Server is running',
        database: 'Connected to MongoDB Atlas',
    })
})

// Test users route
app.get('/api/test-users', async (req, res) => {
    try {
        const users = await User.find({}, '-password -__v')
        res.json(users)
    } catch (error) {
        console.error('Test users error:', error)
        res.status(500).json({ error: 'Failed to fetch test users' })
    }
})

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../dist')))
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../../dist', 'index.html'))
    })
}

// Seed initial data
async function seedInitialData() {
    try {
        // Check if we already have data
        const campCount = await Camp.countDocuments()
        if (campCount === 0) {
            console.log('Seeding initial data...')

            // Locations first — a camp cannot exist without one.
            const [loc1, loc2] = await Promise.all([
                Location.findOneAndUpdate(
                    { name: 'Swat Valley' },
                    { name: 'Swat Valley', status: 'active' },
                    { upsert: true, new: true },
                ),
                Location.findOneAndUpdate(
                    { name: 'Naran' },
                    { name: 'Naran', status: 'active' },
                    { upsert: true, new: true },
                ),
            ])

            // Create sample camps
            const camp1 = new Camp({
                name: 'Mountain View Camp',
                locationId: loc1._id,
                location: loc1.name,
                description: 'Beautiful camp with stunning mountain views',
                price: 5000,
                image: 'https://example.com/mountain-view.jpg',
                rating: 4.5,
            })

            const camp2 = new Camp({
                name: 'Lakeside Retreat',
                locationId: loc2._id,
                location: loc2.name,
                description: 'Peaceful camp by the lake',
                price: 4500,
                image: 'https://example.com/lake-view.jpg',
                rating: 4.2,
            })

            const [savedCamp1, savedCamp2] = await Promise.all([
                camp1.save(),
                camp2.save(),
            ])

            // One building per camp: these samples are single-block camps.
            const [block1, block2] = await Promise.all([
                Building.create({
                    campId: savedCamp1._id,
                    name: 'Mountain View Camp',
                    type: 'residential',
                    floors: 2,
                }),
                Building.create({
                    campId: savedCamp2._id,
                    name: 'Lakeside Retreat',
                    type: 'residential',
                    floors: 1,
                }),
            ])

            // Create sample rooms
            const room1 = new Room({
                camp: savedCamp1._id,
                buildingId: block1._id,
                floor: 1,
                roomNumber: 'MV-101',
                type: 'double',
                capacity: 2,
                price: 2500,
                amenities: ['AC', 'TV', 'WiFi', 'Bathroom'],
                status: 'available',
                description: 'Cozy double room with mountain view',
            })

            const room2 = new Room({
                camp: savedCamp2._id,
                buildingId: block2._id,
                floor: 1,
                roomNumber: 'LR-201',
                type: 'family',
                capacity: 4,
                price: 4500,
                amenities: ['AC', 'TV', 'WiFi', 'Bathroom', 'Kitchen'],
                status: 'available',
                description: 'Spacious family room with lake view',
            })

            await Promise.all([room1.save(), room2.save()])
            console.log('Initial data seeded successfully')
        }
    } catch (error) {
        console.error('Error seeding initial data:', error)
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
