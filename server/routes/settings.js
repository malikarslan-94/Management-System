const router = require('express').Router()
const Settings = require('../models/OrganizationSettings')
const Audit = require('../models/AuditEvent')
const { handle, HttpError, text } = require('../lib/http')
const { requirePermission } = require('../lib/access')
const { transaction, audit } = require('../lib/transaction')
router.get(
    '/',
    handle(async (req, res) =>
        res.json(
            (await Settings.findById('organization').lean()) || {
                name: 'CampWise',
                logoUrl: '',
                timezone: 'Asia/Riyadh',
                dateFormat: 'DD MMM YYYY',
            },
        ),
    ),
)
router.get(
    '/activity',
    requirePermission('users'),
    handle(async (req, res) =>
        res.json(
            await Audit.find({ resource: { $in: ['user', 'settings'] } })
                .populate('actor', 'name')
                .sort({ createdAt: -1 })
                .limit(100),
        ),
    ),
)
router.patch(
    '/',
    requirePermission('preferences'),
    handle(async (req, res) => {
        const name = text(req.body.name, 120),
            timezone = text(req.body.timezone),
            dateFormat = req.body.dateFormat,
            logoUrl = text(req.body.logoUrl, 2000)
        if (
            !name ||
            !['DD MMM YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].includes(dateFormat)
        )
            throw new HttpError(
                400,
                'Enter an organization name and valid date format.',
            )
        try {
            new Intl.DateTimeFormat('en', { timeZone: timezone }).format()
        } catch {
            throw new HttpError(400, 'Invalid timezone.')
        }
        if (
            logoUrl &&
            !/^https:\/\//.test(logoUrl) &&
            !/^\/img\/[\w./-]+$/.test(logoUrl)
        )
            throw new HttpError(
                400,
                'Logo must be an HTTPS URL or a local /img/ path.',
            )
        const settings = await transaction(async (session) => {
            const record = await Settings.findOneAndUpdate(
                { _id: 'organization' },
                { $set: { name, timezone, dateFormat, logoUrl } },
                { upsert: true, new: true, runValidators: true, session },
            )
            await audit(
                req,
                'update-preferences',
                'settings',
                record,
                { name, timezone, dateFormat, logoUrl },
                session,
            )
            return record
        })
        res.json(settings)
    }),
)
module.exports = router
