const mongoose = require('mongoose')

const locationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        city: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        image: {
            type: String,
            default: '',
        },
        coordinates: {
            lat: { type: Number },
            lng: { type: Number },
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
    },
    {
        timestamps: true,
    },
)

// Location names are the top of the hierarchy and are shown as-is in pickers,
// so duplicates would be indistinguishable to the user.
locationSchema.index({ name: 1 }, { unique: true })
locationSchema.index({ city: 1 })
locationSchema.index({ status: 1 })

module.exports = mongoose.model('Location', locationSchema)
