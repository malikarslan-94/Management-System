const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Camp = require('../models/Camp');

// Get all rooms
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.find().populate('camp', 'name location');
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get rooms by camp
router.get('/camp/:campId', async (req, res) => {
  try {
    const rooms = await Room.find({ camp: req.params.campId });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single room
router.get('/:id', getRoom, (req, res) => {
  res.json(res.room);
});

// Create room
router.post('/', async (req, res) => {
  try {
    // Check if camp exists
    const camp = await Camp.findById(req.body.camp);
    if (!camp) {
      return res.status(404).json({ message: 'Camp not found' });
    }

    const room = new Room({
      camp: req.body.camp,
      roomNumber: req.body.roomNumber,
      type: req.body.type,
      capacity: req.body.capacity,
      price: req.body.price,
      amenities: req.body.amenities || [],
      isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : true,
      images: req.body.images || [],
      description: req.body.description || ''
    });

    const newRoom = await room.save();
    res.status(201).json(newRoom);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update room
router.patch('/:id', getRoom, async (req, res) => {
  if (req.body.roomNumber != null) {
    res.room.roomNumber = req.body.roomNumber;
  }
  if (req.body.type != null) {
    res.room.type = req.body.type;
  }
  if (req.body.capacity != null) {
    res.room.capacity = req.body.capacity;
  }
  if (req.body.price != null) {
    res.room.price = req.body.price;
  }
  if (req.body.amenities != null) {
    res.room.amenities = req.body.amenities;
  }
  if (req.body.isAvailable !== undefined) {
    res.room.isAvailable = req.body.isAvailable;
  }
  if (req.body.images != null) {
    res.room.images = req.body.images;
  }
  if (req.body.description != null) {
    res.room.description = req.body.description;
  }
  res.room.updatedAt = Date.now();

  try {
    const updatedRoom = await res.room.save();
    res.json(updatedRoom);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete room
router.delete('/:id', getRoom, async (req, res) => {
  try {
    await res.room.remove();
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Middleware to get room by ID
async function getRoom(req, res, next) {
  let room;
  try {
    room = await Room.findById(req.params.id).populate('camp', 'name location');
    if (room == null) {
      return res.status(404).json({ message: 'Cannot find room' });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.room = room;
  next();
}

module.exports = router;
