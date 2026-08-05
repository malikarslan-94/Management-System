const express = require('express')
const mongoose = require('mongoose')
const router = express.Router()
const Camp = require('../models/Camp')
const Room = require('../models/Room')
const Building = require('../models/Building')
const {
    HttpError,
    handle,
    requireLocation,
    assertNoChildren,
} = require('../validators/hierarchy')

/**
 * Live child counts for a set of camps, in two queries rather than one per camp.
 * Stored totalRooms/occupiedRooms fields were removed because nothing kept them
 * in sync; these are computed on read instead.
 */
async function attachCounts(camps) {
    if (camps.length === 0) return []
    const ids = camps.map((c) => c._id)

    const [buildingCounts, roomCounts] = await Promise.all([
        Building.aggregate([{ $match: { campId: { $in: ids } } }, { $group: { _id: '$campId', count: { $sum: 1 } } }]),
        Room.aggregate([
            { $match: { camp: { $in: ids } } },
            { $group: { _id: { camp: '$camp', status: '$status' }, count: { $sum: 1 } } },
        ]),
    ])

    const buildingsByCamp = new Map(buildingCounts.map((b) => [String(b._id), b.count]))
    const roomsByCamp = new Map()
    for (const r of roomCounts) {
        const key = String(r._id.camp)
        const entry = roomsByCamp.get(key) || { total: 0, available: 0, occupied: 0, maintenance: 0, cleaning: 0 }
        entry.total += r.count
        if (r._id.status) entry[r._id.status] = (entry[r._id.status] || 0) + r.count
        roomsByCamp.set(key, entry)
    }

    return camps.map((camp) => {
        const key = String(camp._id)
        const rooms = roomsByCamp.get(key) || { total: 0, available: 0, occupied: 0, maintenance: 0, cleaning: 0 }
        return {
            ...camp.toObject(),
            buildingCount: buildingsByCamp.get(key) || 0,
            totalRooms: rooms.total,
            availableRooms: rooms.available,
            occupiedRooms: rooms.occupied,
            maintenanceRooms: rooms.maintenance,
            cleaningRooms: rooms.cleaning,
        }
    })
}

/**
 * Runs `work` inside a transaction when the deployment supports one (Atlas and
 * any replica set), otherwise falls back to sequential writes with a
 * compensating delete. Without this, a failure partway through creating a camp
 * and its buildings leaves an unusable half-built camp.
 */
async function atomically(work, compensate) {
    let session
    try {
        session = await mongoose.startSession()
        session.startTransaction()
        const result = await work(session)
        await session.commitTransaction()
        return result
    } catch (err) {
        if (session?.inTransaction()) await session.abortTransaction().catch(() => {})

        const unsupported =
            err.code === 20 ||
            err.codeName === 'IllegalOperation' ||
            /Transaction numbers are only allowed on a replica set|transactions are not supported/i.test(err.message || '')

        if (!unsupported) throw err

        // Standalone mongod: no transactions available, so emulate.
        return compensate()
    } finally {
        session?.endSession()
    }
}

// Get all camps (optionally filter by locationId), with live child counts
router.get(
    '/',
    handle(async (req, res) => {
        const filter = {}
        if (req.query.locationId) filter.locationId = req.query.locationId

        const camps = await Camp.find(filter).populate('locationId', 'name city address').sort({ name: 1 })
        res.json(await attachCounts(camps))
    }),
)

// Get single camp
router.get(
    '/:id',
    handle(async (req, res) => {
        const camp = await Camp.findById(req.params.id).populate('locationId', 'name city address')
        if (!camp) throw new HttpError(404, 'Cannot find camp')
        const [withCounts] = await attachCounts([camp])
        res.json(withCounts)
    }),
)

// Get a camp's buildings
router.get(
    '/:id/buildings',
    handle(async (req, res) => {
        const buildings = await Building.find({ campId: req.params.id }).sort({ name: 1 })
        const withCounts = await Promise.all(
            buildings.map(async (b) => ({
                ...b.toObject(),
                roomCount: await Room.countDocuments({ buildingId: b._id }),
            })),
        )
        res.json(withCounts)
    }),
)

/**
 * Create a camp, optionally with its buildings in the same request.
 *
 * Body: { locationId, name, description?, price?, buildings?: [{ name, type?, floors?, description? }] }
 *
 * Accepting the buildings inline is what removes the old dead end where a
 * freshly created camp had no building and therefore could not accept rooms.
 * For a camp that *is* a single building, send one entry named after the camp.
 */
router.post(
    '/',
    handle(async (req, res) => {
        const location = await requireLocation(req.body.locationId)

        const buildingSpecs = Array.isArray(req.body.buildings) ? req.body.buildings : []
        const named = buildingSpecs.filter((b) => b && String(b.name || '').trim())

        const seen = new Set()
        for (const b of named) {
            const key = String(b.name).trim().toLowerCase()
            if (seen.has(key)) throw new HttpError(400, `Duplicate building name "${String(b.name).trim()}" in this request.`)
            seen.add(key)
            const floors = Number(b.floors ?? 1)
            if (!Number.isInteger(floors) || floors < 1) {
                throw new HttpError(400, `Building "${String(b.name).trim()}" has an invalid floor count.`)
            }
        }

        const campFields = {
            name: String(req.body.name || '').trim(),
            locationId: location._id,
            // Denormalized label kept in step with the real parent.
            location: location.name,
            description: req.body.description || '',
            price: req.body.price ?? 0,
            image: req.body.image || '',
            rating: req.body.rating || 0,
            status: req.body.status || 'active',
        }
        if (!campFields.name) throw new HttpError(400, 'Camp name is required')

        const buildingDocs = named.map((b) => ({
            name: String(b.name).trim(),
            type: b.type || 'residential',
            floors: Number(b.floors ?? 1),
            description: b.description || '',
            status: 'active',
        }))

        const create = async (session) => {
            const opts = session ? { session } : {}
            const [camp] = await Camp.create([campFields], opts)
            if (buildingDocs.length > 0) {
                await Building.create(
                    buildingDocs.map((b) => ({ ...b, campId: camp._id })),
                    opts,
                )
            }
            return camp
        }

        const camp = await atomically(
            (session) => create(session),
            async () => {
                // No-transaction fallback: create, then undo the camp if the
                // buildings fail, so we never leave a camp with no building.
                const camp = await Camp.create(campFields)
                try {
                    if (buildingDocs.length > 0) {
                        await Building.create(buildingDocs.map((b) => ({ ...b, campId: camp._id })))
                    }
                } catch (err) {
                    await Camp.findByIdAndDelete(camp._id)
                    throw err
                }
                return camp
            },
        )

        await camp.populate('locationId', 'name city address')
        const [withCounts] = await attachCounts([camp])
        res.status(201).json(withCounts)
    }),
)

// Update camp
router.patch(
    '/:id',
    handle(async (req, res) => {
        const camp = await Camp.findById(req.params.id)
        if (!camp) throw new HttpError(404, 'Cannot find camp')

        // Moving a camp to another location re-syncs the denormalized label.
        if (req.body.locationId != null && String(req.body.locationId) !== String(camp.locationId)) {
            const location = await requireLocation(req.body.locationId)
            camp.locationId = location._id
            camp.location = location.name
        }

        const fields = ['name', 'description', 'price', 'image', 'rating', 'status']
        fields.forEach((f) => {
            if (req.body[f] != null) camp[f] = req.body[f]
        })
        camp.updatedAt = Date.now()

        const updated = await camp.save()
        await updated.populate('locationId', 'name city address')
        const [withCounts] = await attachCounts([updated])
        res.json(withCounts)
    }),
)

// Delete camp — blocked while it still has buildings or rooms
router.delete(
    '/:id',
    handle(async (req, res) => {
        const camp = await Camp.findById(req.params.id)
        if (!camp) throw new HttpError(404, 'Cannot find camp')

        // Rooms first: the more specific message is the more useful one.
        await assertNoChildren('camp', Room, { camp: camp._id }, 'room', 'Please delete its rooms first.')
        // Previously missing — a camp with buildings but no rooms deleted
        // cleanly and orphaned every building under it.
        await assertNoChildren('camp', Building, { campId: camp._id }, 'building', 'Please delete its buildings first.')

        await camp.deleteOne()
        res.json({ message: 'Camp deleted successfully' })
    }),
)

module.exports = router
