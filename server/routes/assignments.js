const router = require('express').Router()
const Assignment = require('../models/RoomAssignment')
const Room = require('../models/Room')
const Employee = require('../models/Employee')
const Settings = require('../models/OrganizationSettings')
const {
    handle,
    HttpError,
    pagination,
    escapeRegex,
    date,
} = require('../lib/http')
const { scope } = require('../lib/access')
const {
    population,
    withResidents,
    createStay,
    finishStay,
} = require('../lib/stays')
const { dayBounds, dateKey } = require('../lib/dates')
async function filterFor(req) {
    const rooms = await Room.find({
        ...scope(req, 'camp'),
        ...(req.query.campId ? { camp: req.query.campId } : {}),
    }).select('_id')
    const filter = { roomId: { $in: rooms.map((r) => r._id) } }
    if (req.query.roomId) filter.$and = [{ roomId: req.query.roomId }]
    if (req.query.occupantId) filter.occupantId = req.query.occupantId
    if (req.query.status) filter.status = req.query.status
    if (req.query.search) {
        const rx = new RegExp(escapeRegex(req.query.search), 'i')
        const people = await Employee.find({
            ...scope(req),
            $or: [{ firstName: rx }, { lastName: rx }, { employeeId: rx }],
        }).select('_id')
        const matchingRooms = await Room.find({
            ...scope(req, 'camp'),
            roomNumber: rx,
        }).select('_id')
        filter.$or = [
            { occupantId: { $in: people.map((p) => p._id) } },
            { roomId: { $in: matchingRooms.map((r) => r._id) } },
        ]
    }
    if (req.query.expectedCheckoutFrom || req.query.expectedCheckoutTo) {
        const range = {}
        if (req.query.expectedCheckoutFrom)
            range.$gte = date(req.query.expectedCheckoutFrom, 'checkout start')
        if (req.query.expectedCheckoutTo)
            range.$lte = date(req.query.expectedCheckoutTo, 'checkout end')
        if (range.$gte && range.$lte && range.$gte > range.$lte)
            throw new HttpError(400, 'Checkout date range is reversed.')
        filter.expectedCheckoutDate = range
    }
    return filter
}
router.get(
    '/operations',
    handle(async (req, res) => {
        const settings = await Settings.findById('organization').lean()
        const timezone = settings?.timezone || 'Asia/Riyadh'
        const day = req.query.date || dateKey(new Date(), timezone)
        const { start, end } = dayBounds(day, timezone)
        // Expected checkout is stored as a calendar date by the existing forms.
        const expectedStart = new Date(day + 'T00:00:00Z'),
            expectedEnd = new Date(+expectedStart + 86400000)
        const base = await filterFor(req)
        const predicates = {
            due: {
                status: 'active',
                expectedCheckoutDate: { $lt: expectedEnd },
            },
            checked_in: { checkInTime: { $gte: start, $lt: end } },
            history: {
                status: { $in: ['completed', 'cancelled'] },
                checkOutTime: { $gte: start, $lt: end },
            },
        }
        const tab = req.query.tab || 'due'
        if (!predicates[tab])
            throw new HttpError(400, 'Invalid operations tab.')
        const p = pagination(req.query)
        const filter = { $and: [base, predicates[tab]] }
        const records = await Assignment.find(filter)
            .populate(population)
            .sort({ expectedCheckoutDate: 1, _id: 1 })
            .skip(p.skip)
            .limit(p.limit)
        const [total, checkedIn, due, overdue, checkedOut] = await Promise.all([
            Assignment.countDocuments(filter),
            Assignment.countDocuments({ $and: [base, predicates.checked_in] }),
            Assignment.countDocuments({
                $and: [
                    base,
                    {
                        status: 'active',
                        expectedCheckoutDate: {
                            $gte: expectedStart,
                            $lt: expectedEnd,
                        },
                    },
                ],
            }),
            Assignment.countDocuments({
                $and: [
                    base,
                    {
                        status: 'active',
                        expectedCheckoutDate: { $lt: expectedStart },
                    },
                ],
            }),
            Assignment.countDocuments({
                $and: [
                    base,
                    {
                        status: 'completed',
                        checkOutTime: { $gte: start, $lt: end },
                    },
                ],
            }),
        ])
        res.json({
            data: await withResidents(records),
            total,
            page: p.page,
            totalPages: Math.ceil(total / p.limit),
            summary: { checkedIn, due, overdue, checkedOut },
            timezone,
            date: day,
        })
    }),
)
router.get(
    '/',
    handle(async (req, res) => {
        const p = pagination(req.query),
            filter = await filterFor(req)
        const records = await Assignment.find(filter)
            .populate(population)
            .sort(
                req.query.sortBy === 'expectedCheckoutDate'
                    ? { expectedCheckoutDate: 1, _id: 1 }
                    : { createdAt: -1 },
            )
            .skip(p.skip)
            .limit(p.limit)
        const total = await Assignment.countDocuments(filter)
        res.json({
            data: await withResidents(records),
            total,
            page: p.page,
            limit: p.limit,
            totalPages: Math.ceil(total / p.limit),
        })
    }),
)
router.get(
    '/:id',
    handle(async (req, res) => {
        const record = await Assignment.findById(req.params.id).populate(
            population,
        )
        if (!record) throw new HttpError(404, 'Stay not found.')
        res.json((await withResidents([record]))[0])
    }),
)
router.post(
    '/',
    handle(async (req, res) => res.status(201).json(await createStay(req))),
)
router.put(
    '/:id',
    handle(async (req, res) =>
        res.json(await finishStay(req, req.body.status)),
    ),
)
router.delete(
    '/:id',
    handle(async (req, res) => res.json(await finishStay(req, 'cancelled'))),
)
module.exports = router
