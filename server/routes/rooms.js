const express = require('express')
const router = express.Router()
const Room = require('../models/Room')
const Building = require('../models/Building')
const {
    HttpError,
    handle,
    resolveRoomPlacement,
    findRoomNumberConflicts,
} = require('../validators/hierarchy')

const POPULATE = [
    { path: 'camp', select: 'name location locationId' },
    { path: 'buildingId', select: 'name type floors' },
]

/**
 * Expands a starting room number into `count` sequential numbers, preserving
 * any non-numeric prefix and zero padding: "101" → 101,102,…; "A-01" → A-01,A-02,…
 */
function generateRoomNumbers(startNumber, count) {
    const raw = String(startNumber ?? '').trim()
    const match = raw.match(/^(.*?)(\d+)$/)
    if (!match) {
        throw new HttpError(400, `"${raw}" must end in a number so a sequence can be generated from it.`)
    }
    const [, prefix, digits] = match
    const start = parseInt(digits, 10)
    const width = digits.length

    return Array.from({ length: count }, (_, i) => `${prefix}${String(start + i).padStart(width, '0')}`)
}

// Get all rooms (optionally filter by campId, buildingId, floor or status)
router.get(
    '/',
    handle(async (req, res) => {
        const filter = {}
        if (req.query.campId) filter.camp = req.query.campId
        if (req.query.buildingId) filter.buildingId = req.query.buildingId
        if (req.query.floor) filter.floor = parseInt(req.query.floor, 10)
        if (req.query.status) filter.status = req.query.status

        const rooms = await Room.find(filter).populate(POPULATE).sort({ floor: 1, roomNumber: 1 })
        res.json(rooms)
    }),
)

// Get rooms by camp (legacy path kept for backward compat)
router.get(
    '/camp/:campId',
    handle(async (req, res) => {
        const rooms = await Room.find({ camp: req.params.campId }).populate(POPULATE).sort({ floor: 1, roomNumber: 1 })
        res.json(rooms)
    }),
)

// Get rooms by building
router.get(
    '/building/:buildingId',
    handle(async (req, res) => {
        const rooms = await Room.find({ buildingId: req.params.buildingId })
            .populate(POPULATE)
            .sort({ floor: 1, roomNumber: 1 })
        res.json(rooms)
    }),
)

/**
 * Bulk-generate rooms for a building, one spec per floor.
 *
 * Body: {
 *   buildingId,
 *   floors: [{ floor, count, startNumber, type, capacity, price?, amenities? }]
 * }
 *
 * Validates every floor and every generated number before inserting anything,
 * so the request either creates all rooms or none — hand-entering 30 rooms
 * through the single-room form was the alternative.
 */
router.post(
    '/bulk',
    handle(async (req, res) => {
        const specs = Array.isArray(req.body.floors) ? req.body.floors : []
        if (specs.length === 0) throw new HttpError(400, 'Provide at least one floor specification.')

        const building = await Building.findById(req.body.buildingId)
        if (!building) throw new HttpError(404, 'Building not found')

        const planned = []
        const seen = new Set()

        for (const spec of specs) {
            const count = Number(spec.count ?? 0)
            if (!Number.isInteger(count) || count < 1) {
                throw new HttpError(400, `Floor ${spec.floor}: room count must be 1 or more.`)
            }
            if (count > 500) {
                throw new HttpError(400, `Floor ${spec.floor}: cannot generate more than 500 rooms at once.`)
            }
            if (!spec.type) throw new HttpError(400, `Floor ${spec.floor}: room type is required.`)
            const capacity = Number(spec.capacity ?? 0)
            if (!Number.isInteger(capacity) || capacity < 1) {
                throw new HttpError(400, `Floor ${spec.floor}: capacity must be 1 or more.`)
            }

            // Reuses the same floor-bounds check as single-room creation.
            const { campId, floor } = await resolveRoomPlacement({
                buildingId: building._id,
                floor: spec.floor,
            })

            for (const roomNumber of generateRoomNumbers(spec.startNumber, count)) {
                const key = roomNumber.toLowerCase()
                if (seen.has(key)) {
                    throw new HttpError(400, `Room number "${roomNumber}" appears twice in this request.`)
                }
                seen.add(key)
                planned.push({
                    camp: campId,
                    buildingId: building._id,
                    floor,
                    roomNumber,
                    type: spec.type,
                    capacity,
                    price: spec.price ?? 0,
                    amenities: Array.isArray(spec.amenities) ? spec.amenities : [],
                    status: 'available',
                })
            }
        }

        const conflicts = await findRoomNumberConflicts(
            building._id,
            planned.map((p) => p.roomNumber),
        )
        if (conflicts.length > 0) {
            throw new HttpError(
                409,
                `These room numbers already exist in "${building.name}": ${conflicts.join(', ')}. Nothing was created.`,
            )
        }

        const created = await Room.insertMany(planned)
        res.status(201).json({ created: created.length, rooms: created })
    }),
)

// Get single room
router.get(
    '/:id',
    handle(async (req, res) => {
        const room = await Room.findById(req.params.id).populate(POPULATE)
        if (!room) throw new HttpError(404, 'Cannot find room')
        res.json(room)
    }),
)

// Create room
router.post(
    '/',
    handle(async (req, res) => {
        // camp is derived from the building, never taken from the request body,
        // so a room can never sit in one camp while its building sits in another.
        const { campId, floor } = await resolveRoomPlacement({
            buildingId: req.body.buildingId,
            floor: req.body.floor,
        })

        const room = new Room({
            camp: campId,
            buildingId: req.body.buildingId,
            floor,
            roomNumber: req.body.roomNumber,
            type: req.body.type,
            capacity: req.body.capacity,
            price: req.body.price ?? 0,
            amenities: req.body.amenities || [],
            status: req.body.status || 'available',
            images: req.body.images || [],
            description: req.body.description || '',
        })

        const newRoom = await room.save()
        await newRoom.populate(POPULATE)
        res.status(201).json(newRoom)
    }),
)

// Update room
router.patch(
    '/:id',
    handle(async (req, res) => {
        const room = await Room.findById(req.params.id)
        if (!room) throw new HttpError(404, 'Cannot find room')

        // Any change to placement is re-validated through the same helper as
        // creation, and re-derives camp. Previously PATCH assigned buildingId
        // blind, which allowed a room to be moved into another camp's building.
        const movingBuilding = req.body.buildingId != null && String(req.body.buildingId) !== String(room.buildingId)
        const movingFloor = req.body.floor != null && Number(req.body.floor) !== room.floor

        if (movingBuilding || movingFloor) {
            const { campId, floor } = await resolveRoomPlacement({
                buildingId: movingBuilding ? req.body.buildingId : room.buildingId,
                floor: movingFloor ? req.body.floor : room.floor,
            })
            room.buildingId = movingBuilding ? req.body.buildingId : room.buildingId
            room.camp = campId
            room.floor = floor
        }

        const fields = ['roomNumber', 'type', 'capacity', 'price', 'amenities', 'status', 'images', 'description']
        fields.forEach((f) => {
            if (req.body[f] != null) room[f] = req.body[f]
        })

        // Accepts the retired boolean from older clients and maps it forward.
        if (req.body.status == null && req.body.isAvailable != null) {
            room.status = req.body.isAvailable ? 'available' : 'occupied'
        }

        room.updatedAt = Date.now()

        const updatedRoom = await room.save()
        await updatedRoom.populate(POPULATE)
        res.json(updatedRoom)
    }),
)

// Delete room
router.delete(
    '/:id',
    handle(async (req, res) => {
        const room = await Room.findById(req.params.id)
        if (!room) throw new HttpError(404, 'Cannot find room')
        await room.deleteOne()
        res.json({ message: 'Room deleted' })
    }),
)

module.exports = router
