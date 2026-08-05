const mongoose = require('mongoose')

const campFacilitySchema = new mongoose.Schema(
    {
        campId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Camp',
            required: true,
        },
        kind: {
            type: String,
            enum: ['mosque', 'mess', 'playing_area', 'recreation_center', 'medical', 'laundry', 'parking', 'other'],
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        capacity: {
            type: Number,
            default: 0,
            min: 0,
        },
        description: {
            type: String,
            trim: true,
        },
        openingHours: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'maintenance'],
            default: 'active',
        },
    },
    {
        timestamps: true,
    },
)

campFacilitySchema.index({ campId: 1 })
campFacilitySchema.index({ campId: 1, kind: 1 })
campFacilitySchema.index({ status: 1 })

module.exports = mongoose.model('CampFacility', campFacilitySchema)
