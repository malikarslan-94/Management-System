const mongoose = require('mongoose')

const buildingSchema = new mongoose.Schema(
    {
        campId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Camp',
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['residential', 'admin', 'medical', 'storage', 'other'],
            default: 'residential',
        },
        floors: {
            type: Number,
            default: 1,
            min: 1,
        },
        description: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'maintenance'],
            default: 'active',
        },
        // totalRooms removed: routes/buildings.js already returns a live
        // roomCount, so a stored copy could only ever disagree with it.
    },
    {
        timestamps: true,
    },
)

buildingSchema.index({ campId: 1 })
buildingSchema.index({ campId: 1, status: 1 })
// Two "Block A"s in one camp make room numbers ambiguous.
buildingSchema.index({ campId: 1, name: 1 }, { unique: true })

module.exports = mongoose.model('Building', buildingSchema)
