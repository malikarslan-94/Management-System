const mongoose = require('mongoose')

const roomAssignmentSchema = new mongoose.Schema(
    {
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room',
            required: true,
        },
        occupantId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        occupantType: {
            type: String,
            enum: ['Employee', 'Temporary Visitor'],
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        expectedCheckoutDate: {
            type: Date,
            required: true,
        },
        checkInTime: {
            type: Date,
            default: Date.now,
        },
        checkOutTime: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'cancelled'],
            default: 'active',
        },
    },
    {
        timestamps: true,
    },
)

// Indexes for faster queries
roomAssignmentSchema.index({ roomId: 1 })
roomAssignmentSchema.index({ occupantId: 1 })
roomAssignmentSchema.index({ status: 1 })
roomAssignmentSchema.index({ startDate: 1 })
roomAssignmentSchema.index({ roomId: 1, status: 1 })

module.exports = mongoose.model('RoomAssignment', roomAssignmentSchema)


