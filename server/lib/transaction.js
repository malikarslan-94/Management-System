const mongoose = require('mongoose')
const AuditEvent = require('../models/AuditEvent')
const { HttpError } = require('./http')
async function transaction(work) {
    try {
        return await mongoose.connection.transaction(work)
    } catch (error) {
        if (
            error.code === 20 ||
            /Transaction numbers are only allowed/i.test(error.message)
        )
            throw new HttpError(
                503,
                'This operation requires MongoDB Atlas or a replica set. No changes were saved.',
            )
        throw error
    }
}
async function audit(req, action, resource, record, details, session) {
    await AuditEvent.create(
        [
            {
                actor: req.user._id,
                action,
                resource,
                resourceId: String(record._id),
                campId: record.campId || record.camp,
                details,
            },
        ],
        { session },
    )
}
module.exports = { transaction, audit }
