// For an existing database with no administrator. Preview by default; no passwords are changed.
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const mongoose = require('mongoose')
const User = require('../models/User')
const Settings = require('../models/OrganizationSettings')
const Audit = require('../models/AuditEvent')
async function main() {
    const emailIndex = process.argv.indexOf('--email')
    const email =
        emailIndex >= 0
            ? process.argv[emailIndex + 1]?.trim().toLowerCase()
            : ''
    if (!email || email.startsWith('--'))
        throw new Error(
            'Usage: node server/scripts/bootstrapAdmin.js --email existing@example.com [--apply]',
        )
    if (!process.env.MONGODB_URI)
        throw new Error('Configure MONGODB_URI in server/.env first.')
    await mongoose.connect(process.env.MONGODB_URI, {
        dbName: process.env.DB_NAME,
    })
    const user = await User.findOne({ email })
    if (!user)
        throw new Error(
            'No account matches this email. Create the account before granting access.',
        )
    if (await User.exists({ role: 'admin', active: { $ne: false } }))
        throw new Error(
            'An active administrator already exists. Use Settings & Roles to manage access.',
        )
    if (!process.argv.includes('--apply')) {
        console.log(
            `Preview: ${email} will become an active administrator. Existing sessions will end; password stays unchanged. Add --apply to perform this change.`,
        )
        return
    }
    await mongoose.connection.transaction(async (session) => {
        await Settings.findOneAndUpdate(
            { _id: 'organization' },
            { $inc: { accessRevision: 1 } },
            { upsert: true, session },
        )
        if (
            await User.exists({
                role: 'admin',
                active: { $ne: false },
            }).session(session)
        )
            throw new Error('An administrator was added. No change made.')
        const target = await User.findById(user._id).session(session)
        target.role = 'admin'
        target.active = true
        target.assignedCamps = []
        target.tokenVersion = (target.tokenVersion || 0) + 1
        await target.save({ session })
        await Audit.create(
            [
                {
                    actor: target._id,
                    action: 'bootstrap-admin',
                    resource: 'user',
                    resourceId: String(target._id),
                    details: { source: 'operator-script' },
                },
            ],
            { session },
        )
    })
    console.log(
        `Administrator access granted to ${email}. Sign in again to continue.`,
    )
}
main()
    .catch((error) => {
        console.error(error.message)
        process.exitCode = 1
    })
    .finally(() => mongoose.disconnect())
