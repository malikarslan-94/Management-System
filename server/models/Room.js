const mongoose = require('mongoose');

const ROOM_STATUSES = ['available', 'occupied', 'maintenance', 'cleaning'];

const roomSchema = new mongoose.Schema({
  // Denormalized ancestor. Always derived server-side from buildingId — never
  // trust a client-supplied value, or camp and building can disagree.
  camp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Camp',
    required: true,
  },
  // Every room lives in a building. A camp that "is one building" still gets
  // one Building document, so this is always resolvable.
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true,
  },
  floor: {
    type: Number,
    default: 1,
    min: 1,
  },
  roomNumber: {
    type: String,
    required: true,
    trim: true,
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
    default: 0,
    min: 0
  },
  amenities: [{
    type: String
  }],
  // Replaces the old `isAvailable` boolean, which could not express
  // maintenance or cleaning — the reason the frontend kept its own status.
  status: {
    type: String,
    enum: ROOM_STATUSES,
    default: 'available',
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
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Back-compat shim for clients still reading isAvailable. Read-only: writes go
// through `status`. Remove once no consumer references it.
roomSchema.virtual('isAvailable').get(function () {
  return this.status === 'available';
});

roomSchema.index({ camp: 1 });
roomSchema.index({ buildingId: 1 });
roomSchema.index({ buildingId: 1, floor: 1 });
roomSchema.index({ status: 1 });
// Room numbers identify a room within its building.
roomSchema.index({ buildingId: 1, roomNumber: 1 }, { unique: true });

module.exports = mongoose.model('Room', roomSchema);
module.exports.ROOM_STATUSES = ROOM_STATUSES;
