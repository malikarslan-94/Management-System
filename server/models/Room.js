const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  camp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Camp',
    required: true
  },
  roomNumber: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['single', 'double', 'suite', 'family'],
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  amenities: [{
    type: String
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  images: [{
    type: String
  }],
  description: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Room', roomSchema);
