const express = require('express')
const router = express.Router()
const Camp = require('../models/Camp')
const Room = require('../models/Room')

// Get all camps
router.get('/', async (req, res) => {
    try {
        const camps = await Camp.find()
        res.json(camps)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

// Get single camp
router.get('/:id', getCamp, (req, res) => {
    res.json(res.camp)
})

// Create camp
router.post('/', async (req, res) => {
    const camp = new Camp({
        name: req.body.name,
        location: req.body.location,
        description: req.body.description,
        price: req.body.price,
        image: req.body.image || '',
        rating: req.body.rating || 0,
    })

    try {
        const newCamp = await camp.save()
        res.status(201).json(newCamp)
    } catch (err) {
        res.status(400).json({ message: err.message })
    }
})

// Update camp
router.patch('/:id', getCamp, async (req, res) => {
    if (req.body.name != null) {
        res.camp.name = req.body.name
    }
    if (req.body.location != null) {
        res.camp.location = req.body.location
    }
    if (req.body.description != null) {
        res.camp.description = req.body.description
    }
    if (req.body.price != null) {
        res.camp.price = req.body.price
    }
    if (req.body.image != null) {
        res.camp.image = req.body.image
    }
    if (req.body.rating != null) {
        res.camp.rating = req.body.rating
    }
    res.camp.updatedAt = Date.now()

    try {
        const updatedCamp = await res.camp.save()
        res.json(updatedCamp)
    } catch (err) {
        res.status(400).json({ message: err.message })
    }
})

// Delete camp
router.delete('/:id', getCamp, async (req, res) => {
    try {
        // Check if camp has any rooms
        const roomsCount = await Room.countDocuments({ camp: req.params.id })

        if (roomsCount > 0) {
            return res.status(400).json({
                message: `Cannot delete camp. It has ${roomsCount} room(s) associated with it. Please delete all rooms first.`,
            })
        }

        await res.camp.remove()
        res.json({ message: 'Camp deleted successfully' })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

// Middleware to get camp by ID
async function getCamp(req, res, next) {
    let camp
    try {
        camp = await Camp.findById(req.params.id)
        if (camp == null) {
            return res.status(404).json({ message: 'Cannot find camp' })
        }
    } catch (err) {
        return res.status(500).json({ message: err.message })
    }

    res.camp = camp
    next()
}

module.exports = router
