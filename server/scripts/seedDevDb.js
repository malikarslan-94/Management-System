/**
 * Seed script for the dev DB (campwise_dev).
 * Run against MONGODB_URI_DEV only — never against production.
 *
 * Usage:
 *   node server/scripts/seedDevDb.js
 *
 * It reads MONGODB_URI_DEV from .env. If that var is missing it will abort.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

const mongoose = require('mongoose')

// Safety guard — refuse to run against prod DB
const uri = process.env.MONGODB_URI_DEV
if (!uri) {
    console.error('ERROR: MONGODB_URI_DEV is not set in .env. Aborting.')
    process.exit(1)
}
if (uri.includes('management_system') || uri.includes('Campwise_dev')) {
    console.error('ERROR: MONGODB_URI_DEV points to a protected DB. Aborting.')
    process.exit(1)
}

// Load models
const Location = require('../models/Location')
const Camp = require('../models/Camp')
const Building = require('../models/Building')
const CampFacility = require('../models/CampFacility')
const Room = require('../models/Room')
const Employee = require('../models/Employee')

async function seed() {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    console.log('Connected to dev DB:', mongoose.connection.name)

    // Wipe existing seed data
    await Promise.all([
        Location.deleteMany({}),
        Camp.deleteMany({}),
        Building.deleteMany({}),
        CampFacility.deleteMany({}),
        Room.deleteMany({}),
    ])
    console.log('Cleared existing data')

    // ─── Locations ───────────────────────────────────────────────────────────
    const [riyadh, jeddah] = await Location.insertMany([
        { name: 'Riyadh North', city: 'Riyadh', address: 'King Fahd Road, North District', status: 'active' },
        { name: 'Jeddah Industrial', city: 'Jeddah', address: 'Industrial Zone 3, Jeddah', status: 'active' },
    ])
    console.log('Locations created:', riyadh.name, jeddah.name)

    // ─── Camps ───────────────────────────────────────────────────────────────
    const [alphaRiyadh, betaRiyadh, gammaJeddah] = await Camp.insertMany([
        {
            name: 'Alpha Camp',
            locationId: riyadh._id,
            location: 'Riyadh North',
            description: 'Primary residential camp for Riyadh North workers',
            price: 1500,
            status: 'active',
            totalRooms: 0,
            occupiedRooms: 0,
        },
        {
            name: 'Beta Camp',
            locationId: riyadh._id,
            location: 'Riyadh North',
            description: 'Secondary camp for overflow workers',
            price: 1200,
            status: 'active',
            totalRooms: 0,
            occupiedRooms: 0,
        },
        {
            name: 'Gamma Camp',
            locationId: jeddah._id,
            location: 'Jeddah Industrial',
            description: 'Main camp for Jeddah Industrial Zone',
            price: 1800,
            status: 'active',
            totalRooms: 0,
            occupiedRooms: 0,
        },
    ])
    console.log('Camps created:', alphaRiyadh.name, betaRiyadh.name, gammaJeddah.name)

    // ─── Buildings ────────────────────────────────────────────────────────────
    const [blockA, blockB, blockC, blockD] = await Building.insertMany([
        { campId: alphaRiyadh._id, name: 'Block A', type: 'residential', floors: 3, status: 'active' },
        { campId: alphaRiyadh._id, name: 'Block B', type: 'residential', floors: 2, status: 'active' },
        { campId: betaRiyadh._id, name: 'Block C', type: 'residential', floors: 2, status: 'active' },
        { campId: gammaJeddah._id, name: 'Block D', type: 'residential', floors: 4, status: 'active' },
    ])
    console.log('Buildings created:', blockA.name, blockB.name, blockC.name, blockD.name)

    // ─── Facilities ───────────────────────────────────────────────────────────
    await CampFacility.insertMany([
        { campId: alphaRiyadh._id, kind: 'mosque', name: 'Al-Noor Mosque', capacity: 300, status: 'active' },
        { campId: alphaRiyadh._id, kind: 'mess', name: 'Main Dining Hall', capacity: 200, openingHours: '06:00 - 22:00', status: 'active' },
        { campId: alphaRiyadh._id, kind: 'playing_area', name: 'Football Ground', capacity: 50, status: 'active' },
        { campId: alphaRiyadh._id, kind: 'recreation_center', name: 'Recreation Hall', capacity: 100, openingHours: '14:00 - 23:00', status: 'active' },

        { campId: betaRiyadh._id, kind: 'mosque', name: 'Beta Mosque', capacity: 150, status: 'active' },
        { campId: betaRiyadh._id, kind: 'mess', name: 'Beta Dining', capacity: 120, openingHours: '06:00 - 21:00', status: 'active' },

        { campId: gammaJeddah._id, kind: 'mosque', name: 'Gamma Mosque', capacity: 250, status: 'active' },
        { campId: gammaJeddah._id, kind: 'mess', name: 'Gamma Dining Hall', capacity: 180, openingHours: '05:30 - 22:30', status: 'active' },
        { campId: gammaJeddah._id, kind: 'playing_area', name: 'Cricket Ground', capacity: 40, status: 'active' },
        { campId: gammaJeddah._id, kind: 'laundry', name: 'Laundry Centre', capacity: 0, openingHours: '08:00 - 20:00', status: 'active' },
    ])
    console.log('Facilities created')

    // ─── Rooms ────────────────────────────────────────────────────────────────
    const roomDefs = [
        // Block A — Alpha Camp
        { camp: alphaRiyadh._id, buildingId: blockA._id, roomNumber: 'A-101', type: 'single', capacity: 1, price: 800, status: 'available' },
        { camp: alphaRiyadh._id, buildingId: blockA._id, roomNumber: 'A-102', type: 'double', capacity: 2, price: 1500, status: 'available' },
        { camp: alphaRiyadh._id, buildingId: blockA._id, roomNumber: 'A-103', type: 'double', capacity: 2, price: 1500, status: 'occupied' },
        { camp: alphaRiyadh._id, buildingId: blockA._id, roomNumber: 'A-201', type: 'single', capacity: 1, price: 800, status: 'available' },
        { camp: alphaRiyadh._id, buildingId: blockA._id, roomNumber: 'A-202', type: 'suite', capacity: 4, price: 2800, status: 'available' },
        // Block B — Alpha Camp
        { camp: alphaRiyadh._id, buildingId: blockB._id, roomNumber: 'B-101', type: 'double', capacity: 2, price: 1500, status: 'available' },
        { camp: alphaRiyadh._id, buildingId: blockB._id, roomNumber: 'B-102', type: 'double', capacity: 2, price: 1500, status: 'occupied' },
        { camp: alphaRiyadh._id, buildingId: blockB._id, roomNumber: 'B-103', type: 'single', capacity: 1, price: 800, status: 'available' },
        // Block C — Beta Camp
        { camp: betaRiyadh._id, buildingId: blockC._id, roomNumber: 'C-101', type: 'single', capacity: 1, price: 700, status: 'available' },
        { camp: betaRiyadh._id, buildingId: blockC._id, roomNumber: 'C-102', type: 'double', capacity: 2, price: 1200, status: 'available' },
        { camp: betaRiyadh._id, buildingId: blockC._id, roomNumber: 'C-103', type: 'family', capacity: 4, price: 2000, status: 'occupied' },
        // Block D — Gamma Camp
        { camp: gammaJeddah._id, buildingId: blockD._id, roomNumber: 'D-101', type: 'single', capacity: 1, price: 900, status: 'available' },
        { camp: gammaJeddah._id, buildingId: blockD._id, roomNumber: 'D-102', type: 'double', capacity: 2, price: 1800, status: 'available' },
        { camp: gammaJeddah._id, buildingId: blockD._id, roomNumber: 'D-103', type: 'double', capacity: 2, price: 1800, status: 'occupied' },
        { camp: gammaJeddah._id, buildingId: blockD._id, roomNumber: 'D-201', type: 'suite', capacity: 3, price: 3000, status: 'available' },
    ]

    // Floor comes from the leading digit of the room number (A-201 → floor 2),
    // which is how these numbers are laid out.
    const withFloors = roomDefs.map((r) => ({
        ...r,
        floor: parseInt(r.roomNumber.match(/(\d)\d\d$/)?.[1] || '1', 10),
    }))

    const rooms = await Room.insertMany(withFloors)
    console.log(`Rooms created: ${rooms.length}`)
    // No camp room totals to write — camps expose live counts from the API.

    console.log('\n✅ Dev DB seeded successfully!')
    console.log('Summary:')
    console.log('  Locations:', await Location.countDocuments())
    console.log('  Camps    :', await Camp.countDocuments())
    console.log('  Buildings:', await Building.countDocuments())
    console.log('  Facilities:', await CampFacility.countDocuments())
    console.log('  Rooms    :', await Room.countDocuments())

    await mongoose.disconnect()
}

seed().catch((err) => {
    console.error('Seed failed:', err)
    mongoose.disconnect()
    process.exit(1)
})
