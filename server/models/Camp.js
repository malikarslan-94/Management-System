const mongoose = require('mongoose');

const campSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  // Every camp belongs to exactly one location.
  // Run server/scripts/migrateToNewStructure.js before deploying this constraint.
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true,
  },
  // Deprecated denormalized label. Kept only so older clients keep rendering;
  // never read it to resolve the parent location — use locationId.
  location: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  image: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  }
  // totalRooms / occupiedRooms removed: they were written once at creation and
  // never maintained. Both are computed per request in routes/camps.js.
});

// A location cannot hold two camps with the same name — otherwise the camp
// picker in the room form shows two indistinguishable entries.
campSchema.index({ locationId: 1, name: 1 }, { unique: true });
campSchema.index({ status: 1 });

module.exports = mongoose.model('Camp', campSchema);
