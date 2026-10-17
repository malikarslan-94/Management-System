const mongoose = require('mongoose')
module.exports = mongoose.model(
    'ReportSnapshot',
    new mongoose.Schema(
        {
            owner: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            campIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Camp' }],
            type: String,
            title: String,
            organization: String,
            logoUrl: String,
            timezone: String,
            dateFormat: String,
            filters: mongoose.Schema.Types.Mixed,
            columns: [{ key: String, label: String, _id: false }],
            rows: [mongoose.Schema.Types.Mixed],
            summary: mongoose.Schema.Types.Mixed,
            expiresAt: { type: Date, required: true, index: { expires: 0 } },
        },
        { timestamps: true },
    ),
)
