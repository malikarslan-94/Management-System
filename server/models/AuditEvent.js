const mongoose = require('mongoose')
module.exports = mongoose.model(
    'AuditEvent',
    new mongoose.Schema(
        {
            actor: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            action: { type: String, required: true },
            resource: String,
            resourceId: String,
            campId: { type: mongoose.Schema.Types.ObjectId, ref: 'Camp' },
            details: mongoose.Schema.Types.Mixed,
        },
        { timestamps: true },
    ),
)
