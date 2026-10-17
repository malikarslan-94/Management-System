const router = require('express').Router()
const Facility = require('../models/CampFacility')
const { scope } = require('../lib/access')
const {
    handle,
    HttpError,
    text,
    pagination,
    escapeRegex,
} = require('../lib/http')
const { transaction, audit } = require('../lib/transaction')
const POPULATE = { path: 'campId', select: 'name location locationId' }
router.get(
    '/',
    handle(async (req, res) => {
        const filter = { ...scope(req) }
        if (req.query.campId) filter.campId = req.query.campId
        if (req.query.kind) filter.kind = req.query.kind
        if (req.query.status) filter.status = req.query.status
        if (req.query.search)
            filter.name = new RegExp(escapeRegex(req.query.search), 'i')
        const summaryRows = await Facility.find(filter).select('status').lean()
        const summary = {
            total: summaryRows.length,
            active: 0,
            maintenance: 0,
            inactive: 0,
        }
        for (const row of summaryRows) summary[row.status]++
        const query = Facility.find(filter).populate(POPULATE).sort({ name: 1 })
        if (req.query.page) {
            const p = pagination(req.query)
            res.json({
                data: await query.skip(p.skip).limit(p.limit),
                summary,
                total: summary.total,
                page: p.page,
                totalPages: Math.ceil(summary.total / p.limit),
            })
        } else res.json(await query)
    }),
)
router.get(
    '/:id',
    handle(async (req, res) => {
        const record = await Facility.findById(req.params.id).populate(POPULATE)
        if (!record) throw new HttpError(404, 'Facility not found.')
        res.json(record)
    }),
)
function fields(body) {
    const capacity =
        body.capacity === '' || body.capacity == null
            ? 0
            : Number(body.capacity)
    if (!text(body.name) || !Number.isInteger(capacity) || capacity < 0)
        throw new HttpError(
            400,
            'Enter a facility name and a whole-number capacity of zero or more.',
        )
    return {
        name: text(body.name),
        kind: body.kind,
        capacity,
        status: body.status || 'active',
        openingHours: text(body.openingHours),
        description: text(body.description, 2000),
    }
}
router.post(
    '/',
    handle(async (req, res) => {
        const result = await transaction(async (session) => {
            const [record] = await Facility.create(
                [{ ...fields(req.body), campId: req.body.campId }],
                { session },
            )
            await audit(
                req,
                'create-facility',
                'facility',
                record,
                { status: record.status },
                session,
            )
            return record
        })
        await result.populate(POPULATE)
        res.status(201).json(result)
    }),
)
router.patch(
    '/:id',
    handle(async (req, res) => {
        const result = await transaction(async (session) => {
            const record = await Facility.findById(req.params.id).session(
                session,
            )
            if (!record) throw new HttpError(404, 'Facility not found.')
            if (req.body.campId && String(record.campId) !== req.body.campId)
                throw new HttpError(
                    400,
                    'A facility cannot be moved to another camp.',
                )
            const before = record.status
            Object.assign(record, fields({ ...record.toObject(), ...req.body }))
            await record.save({ session })
            await audit(
                req,
                'update-facility',
                'facility',
                record,
                { previousStatus: before, status: record.status },
                session,
            )
            return record
        })
        await result.populate(POPULATE)
        res.json(result)
    }),
)
// Operational records are deactivated rather than removed from history.
router.delete(
    '/:id',
    handle(async (req, res) => {
        await transaction(async (session) => {
            const record = await Facility.findById(req.params.id).session(
                session,
            )
            if (!record) throw new HttpError(404, 'Facility not found.')
            record.status = 'inactive'
            await record.save({ session })
            await audit(
                req,
                'deactivate-facility',
                'facility',
                record,
                {},
                session,
            )
        })
        res.json({ message: 'Facility deactivated.' })
    }),
)
module.exports = router
