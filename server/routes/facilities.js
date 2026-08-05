const express = require('express')
const router = express.Router()
const CampFacility = require('../models/CampFacility')
const Camp = require('../models/Camp')

// Get all facilities (optionally filter by campId or kind)
router.get('/', async (req, res) => {
    try {
        const filter = {}
        if (req.query.campId) filter.campId = req.query.campId
        if (req.query.kind) filter.kind = req.query.kind

        const facilities = await CampFacility.find(filter)
            .populate('campId', 'name location locationId')
            .sort({ kind: 1, name: 1 })

        res.json(facilities)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

// Get single facility
router.get('/:id', getFacility, (req, res) => {
    res.json(res.facility)
})

// Create facility
router.post('/', async (req, res) => {
    try {
        const camp = await Camp.findById(req.body.campId)
        if (!camp) return res.status(404).json({ message: 'Camp not found' })

        const facility = new CampFacility({
            campId: req.body.campId,
            kind: req.body.kind,
            name: req.body.name,
            capacity: req.body.capacity || 0,
            description: req.body.description,
            openingHours: req.body.openingHours,
            status: req.body.status || 'active',
        })

        const newFacility = await facility.save()
        res.status(201).json(newFacility)
    } catch (err) {
        res.status(400).json({ message: err.message })
    }
})

// Update facility
router.patch('/:id', getFacility, async (req, res) => {
    const fields = ['kind', 'name', 'capacity', 'description', 'openingHours', 'status']
    fields.forEach((f) => {
        if (req.body[f] != null) res.facility[f] = req.body[f]
    })

    try {
        const updated = await res.facility.save()
        res.json(updated)
    } catch (err) {
        res.status(400).json({ message: err.message })
    }
})

// Delete facility
router.delete('/:id', getFacility, async (req, res) => {
    try {
        await res.facility.deleteOne()
        res.json({ message: 'Facility deleted successfully' })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

async function getFacility(req, res, next) {
    let facility
    try {
        facility = await CampFacility.findById(req.params.id).populate('campId', 'name location locationId')
        if (!facility) return res.status(404).json({ message: 'Facility not found' })
    } catch (err) {
        return res.status(500).json({ message: err.message })
    }
    res.facility = facility
    next()
}

module.exports = router
