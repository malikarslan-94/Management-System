const { scope } = require('../lib/access')
const express = require('express')
const router = express.Router()
const Building = require('../models/Building')
const Room = require('../models/Room')
const { HttpError, handle, requireCamp, assertNoChildren } = require('../validators/hierarchy')

/** Live room counts for a set of buildings, in one query rather than one each. */
async function attachRoomCounts(buildings) {
    if (buildings.length === 0) return []
    const ids = buildings.map((b) => b._id)

    const counts = await Room.aggregate([
        { $match: { buildingId: { $in: ids } } },
        { $group: { _id: { buildingId: '$buildingId', status: '$status' }, count: { $sum: 1 } } },
    ])

    const byBuilding = new Map()
    for (const c of counts) {
        const key = String(c._id.buildingId)
        const entry = byBuilding.get(key) || { total: 0, available: 0, occupied: 0 }
        entry.total += c.count
        if (c._id.status === 'available') entry.available += c.count
        if (c._id.status === 'occupied') entry.occupied += c.count
        byBuilding.set(key, entry)
    }

    return buildings.map((b) => {
        const rooms = byBuilding.get(String(b._id)) || { total: 0, available: 0, occupied: 0 }
        return {
            ...b.toObject(),
            roomCount: rooms.total,
            availableRooms: rooms.available,
            occupiedRooms: rooms.occupied,
        }
    })
}

// Get all buildings (optionally filter by campId)
router.get(
    '/',
    handle(async (req, res) => {
        const filter = { ...scope(req, 'campId') }
        if (req.query.campId) filter.campId = req.query.campId

        const buildings = await Building.find(filter).populate('campId', 'name location locationId').sort({ name: 1 })
        res.json(await attachRoomCounts(buildings))
    }),
)

// Get single building
router.get(
    '/:id',
    handle(async (req, res) => {
        const building = await Building.findById(req.params.id).populate('campId', 'name location locationId')
        if (!building) throw new HttpError(404, 'Building not found')
        const [withCounts] = await attachRoomCounts([building])
        res.json(withCounts)
    }),
)

// Get rooms for a building
router.get(
    '/:id/rooms',
    handle(async (req, res) => {
        const rooms = await Room.find({ buildingId: req.params.id })
            .populate('camp', 'name location')
            .populate('buildingId', 'name type floors')
            .sort({ floor: 1, roomNumber: 1 })
        res.json(rooms)
    }),
)

/**
 * Rooms grouped by floor — what the building detail view and the room
 * generator both need to show occupancy per floor.
 */
router.get(
    '/:id/floors',
    handle(async (req, res) => {
        const building = await Building.findById(req.params.id)
        if (!building) throw new HttpError(404, 'Building not found')

        const counts = await Room.aggregate([
            { $match: { buildingId: building._id } },
            { $group: { _id: '$floor', total: { $sum: 1 } } },
        ])
        const byFloor = new Map(counts.map((c) => [c._id, c.total]))

        res.json(
            Array.from({ length: building.floors }, (_, i) => ({
                floor: i + 1,
                roomCount: byFloor.get(i + 1) || 0,
            })),
        )
    }),
)

// Create building
router.post(
    '/',
    handle(async (req, res) => {
        const camp = await requireCamp(req.body.campId)

        const name = String(req.body.name || '').trim()
        if (!name) throw new HttpError(400, 'Building name is required')

        const floors = Number(req.body.floors ?? 1)
        if (!Number.isInteger(floors) || floors < 1) throw new HttpError(400, 'Floors must be a whole number of 1 or more.')

        const building = new Building({
            campId: camp._id,
            name,
            type: req.body.type || 'residential',
            floors,
            description: req.body.description,
            status: req.body.status || 'active',
        })

        const newBuilding = await building.save()
        const [withCounts] = await attachRoomCounts([newBuilding])
        res.status(201).json(withCounts)
    }),
)

// Update building
router.patch(
    '/:id',
    handle(async (req, res) => {
        const building = await Building.findById(req.params.id)
        if (!building) throw new HttpError(404, 'Building not found')

        // Shrinking a building would strand rooms on floors that no longer
        // exist, so it is blocked while any room sits above the new top floor.
        if (req.body.floors != null) {
            const floors = Number(req.body.floors)
            if (!Number.isInteger(floors) || floors < 1) {
                throw new HttpError(400, 'Floors must be a whole number of 1 or more.')
            }
            if (floors < building.floors) {
                const stranded = await Room.countDocuments({ buildingId: building._id, floor: { $gt: floors } })
                if (stranded > 0) {
                    throw new HttpError(
                        400,
                        `Cannot reduce to ${floors} floor(s): ${stranded} room(s) sit above floor ${floors}. Move or delete them first.`,
                    )
                }
            }
            building.floors = floors
        }

        const fields = ['name', 'type', 'description', 'status']
        fields.forEach((f) => {
            if (req.body[f] != null) building[f] = req.body[f]
        })

        const updated = await building.save()
        const [withCounts] = await attachRoomCounts([updated])
        res.json(withCounts)
    }),
)

// Delete building (blocked while rooms exist)
router.delete(
    '/:id',
    handle(async (req, res) => {
        const building = await Building.findById(req.params.id)
        if (!building) throw new HttpError(404, 'Building not found')

        await assertNoChildren(
            'building',
            Room,
            { buildingId: building._id },
            'room',
            'Please delete or reassign its rooms first.',
        )

        await building.deleteOne()
        res.json({ message: 'Building deleted successfully' })
    }),
)

module.exports = router
