const mongoose = require('mongoose')

const employeeSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            unique: true,
            required: true,
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        iqamaNumber: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        employeeId: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        location: {
            type: String,
            trim: true,
        },
        project: {
            type: String,
            trim: true,
        },
        department: {
            type: String,
            trim: true,
        },
        designation: {
            type: String,
            trim: true,
        },
        employeeType: {
            type: String,
            enum: ['Permanent', 'Temporary', 'Visitor'],
            default: 'Permanent',
        },
        campId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Camp',
        },
        currentRoomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room',
            default: null,
        },
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active',
        },
        roomAssignmentHistory: [
            {
                roomId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Room',
                },
                startDate: {
                    type: Date,
                    default: Date.now,
                },
                endDate: {
                    type: Date,
                    default: null,
                },
            },
        ],
    },
    {
        timestamps: true,
    },
)

// Index for faster queries
// Note: email, iqamaNumber and employeeId are already indexed via `unique: true`
employeeSchema.index({ campId: 1 })
employeeSchema.index({ employeeType: 1 })
employeeSchema.index({ status: 1 })
employeeSchema.index({ location: 1 })

module.exports = mongoose.model('Employee', employeeSchema)
