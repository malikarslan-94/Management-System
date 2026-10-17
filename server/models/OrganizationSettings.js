const mongoose = require('mongoose')
module.exports = mongoose.model(
    'OrganizationSettings',
    new mongoose.Schema(
        {
            _id: { type: String, default: 'organization' },
            name: { type: String, default: 'CampWise', maxlength: 120 },
            logoUrl: { type: String, default: '' },
            timezone: { type: String, default: 'Asia/Riyadh' },
            dateFormat: {
                type: String,
                enum: ['DD MMM YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
                default: 'DD MMM YYYY',
            },
            accessRevision: { type: Number, default: 0 },
        },
        { timestamps: true },
    ),
)
