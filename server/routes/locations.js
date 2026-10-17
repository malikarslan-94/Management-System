const { scope } = require('../lib/access')
const express = require('express')
const router = express.Router()
const Location = require('../models/Location')
const Camp = require('../models/Camp')
const Room = require('../models/Room')
const { HttpError, handle, assertNoChildren } = require('../validators/hierarchy')

/** Live camp/room counts per location, in two queries rather than one per row. */
async function attachCounts(locations, req) {
    if (locations.length === 0) return []
    const ids = locations.map((l) => l._id)

    const camps = await Camp.find({ ...scope(req, '_id'), locationId: { $in: ids } }).select('_id locationId')
    const campIds = camps.map((c) => c._id)

    const roomCounts = await Room.aggregate([
        { $match: { camp: { $in: campIds } } },
        { $group: { _id: '$camp', count: { $sum: 1 } } },
    ])
    const roomsByCamp = new Map(roomCounts.map((r) => [String(r._id), r.count]))

    const perLocation = new Map()
    for (const camp of camps) {
        const key = String(camp.locationId)
        const entry = perLocation.get(key) || { campCount: 0, roomCount: 0 }
        entry.campCount += 1
        entry.roomCount += roomsByCamp.get(String(camp._id)) || 0
        perLocation.set(key, entry)
    }

    return locations.map((loc) => ({
        ...loc.toObject(),
        ...(perLocation.get(String(loc._id)) || { campCount: 0, roomCount: 0 }),
    }))
}

// Get all locations (with live camp + room counts)
router.get(
    '/',
    handle(async (req, res) => {
        const camps = await Camp.find(scope(req, '_id')).select('locationId')
        const locations = await Location.find(req.user.role === 'admin' ? {} : { _id: { $in: camps.map(c => c.locationId) } }).sort({ name: 1 })
        res.json(await attachCounts(locations, req))
    }),
)

// Get single location
router.get(
    '/:id',
    handle(async (req, res) => {
        const location = await Location.findById(req.params.id)
        if (!location) throw new HttpError(404, 'Location not found')
        const [withCounts] = await attachCounts([location], req)
        res.json(withCounts)
    }),
)

// Get all camps for a location
router.get(
    '/:id/camps',
    handle(async (req, res) => {
        const camps = await Camp.find({ ...scope(req, '_id'), locationId: req.params.id })
            .populate('locationId', 'name city address')
            .sort({ name: 1 })
        res.json(camps)
    }),
)

// Create location
router.post(
    '/',
    handle(async (req, res) => {
        const name = String(req.body.name || '').trim()
        if (!name) throw new HttpError(400, 'Location name is required')

        // Names are unique-indexed, but a case-insensitive pre-check gives a
        // clearer message than a duplicate-key error for "dammam" vs "Dammam".
        const clash = await Location.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
        if (clash) throw new HttpError(409, `A location named "${clash.name}" already exists.`)

        const location = new Location({
            name,
            city: req.body.city,
            address: req.body.address,
            description: req.body.description,
            image: req.body.image || '',
            coordinates: req.body.coordinates,
            status: req.body.status || 'active',
        })

        const newLocation = await location.save()
        res.status(201).json({ ...newLocation.toObject(), campCount: 0, roomCount: 0 })
    }),
)

// Update location
router.patch(
    '/:id',
    handle(async (req, res) => {
        const location = await Location.findById(req.params.id)
        if (!location) throw new HttpError(404, 'Location not found')

        const renaming = req.body.name != null && String(req.body.name).trim() !== location.name

        const fields = ['name', 'city', 'address', 'description', 'image', 'coordinates', 'status']
        fields.forEach((f) => {
            if (req.body[f] != null) location[f] = req.body[f]
        })

        const updated = await location.save()

        // Camps carry a denormalized copy of the location name for legacy
        // clients; keep it in step so a rename cannot split one location in two.
        if (renaming) {
            await Camp.updateMany({ locationId: updated._id }, { location: updated.name })
        }

        const [withCounts] = await attachCounts([updated], req)
        res.json(withCounts)
    }),
)

// Delete location (blocked while camps exist)
router.delete(
    '/:id',
    handle(async (req, res) => {
        const location = await Location.findById(req.params.id)
        if (!location) throw new HttpError(404, 'Location not found')

        await assertNoChildren(
            'location',
            Camp,
            { locationId: location._id },
            'camp',
            'Please reassign or delete those camps first.',
        )

        await location.deleteOne()
        res.json({ message: 'Location deleted successfully' })
    }),
)

module.exports = router
