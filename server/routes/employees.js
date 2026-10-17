const router = require('express').Router()
const Employee = require('../models/Employee')
const Assignment = require('../models/RoomAssignment')
const { scope } = require('../lib/access')
const {
    handle,
    HttpError,
    idOf,
    pagination,
    escapeRegex,
} = require('../lib/http')
const { transaction } = require('../lib/transaction')
const population = (req) => [
    { path: 'campId', select: 'name location' },
    {
        path: 'currentRoomId',
        select: 'roomNumber type',
        match: scope(req, 'camp'),
    },
    {
        path: 'roomAssignmentHistory.roomId',
        select: 'roomNumber type',
        match: scope(req, 'camp'),
    },
]
router.get(
    '/',
    handle(async (req, res) => {
        const filter = { ...scope(req) },
            p = pagination(req.query)
        for (const key of ['employeeType', 'department', 'campId', 'status'])
            if (req.query[key]) filter[key] = req.query[key]
        if (req.query.search) {
            const rx = new RegExp(escapeRegex(req.query.search), 'i')
            filter.$or = [
                { firstName: rx },
                { lastName: rx },
                { employeeId: rx },
            ]
        }
        if (req.query.unassigned === 'true') filter.currentRoomId = null
        const data = await Employee.find(filter)
            .populate(population(req))
            .sort({ createdAt: -1 })
            .skip(p.skip)
            .limit(p.limit)
        const total = await Employee.countDocuments(filter)
        res.json({
            data,
            total,
            page: p.page,
            limit: p.limit,
            totalPages: Math.ceil(total / p.limit),
        })
    }),
)
router.get(
    '/summary',
    handle(async (req, res) => {
        const settings =
            await require('../models/OrganizationSettings').findById(
                'organization',
            )
        const { dateKey, dayBounds } = require('../lib/dates')
        const timezone = settings?.timezone || 'Asia/Riyadh'
        const { start, end } = dayBounds(
            dateKey(new Date(), timezone),
            timezone,
        )
        const filter = scope(req)
        const [
            totalEmployees,
            visitorsToday,
            assignedRooms,
            inactiveEmployees,
        ] = await Promise.all([
            Employee.countDocuments(filter),
            Employee.countDocuments({
                ...filter,
                employeeType: 'Visitor',
                status: 'Active',
                createdAt: { $gte: start, $lt: end },
            }),
            Employee.countDocuments({
                ...filter,
                currentRoomId: { $ne: null },
            }),
            Employee.countDocuments({ ...filter, status: 'Inactive' }),
        ])
        res.json({
            totalEmployees,
            visitorsToday,
            assignedRooms,
            inactiveEmployees,
        })
    }),
)
router.get(
    '/:id',
    handle(async (req, res) => {
        const person = await Employee.findById(req.params.id).populate(
            population(req),
        )
        if (!person) throw new HttpError(404, 'Resident not found.')
        res.json(person)
    }),
)
const fields = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'iqamaNumber',
    'employeeId',
    'location',
    'project',
    'department',
    'designation',
    'employeeType',
    'campId',
    'status',
]
function pick(body) {
    return Object.fromEntries(
        fields
            .filter((k) => body[k] !== undefined)
            .map((k) => [k, k === 'campId' ? body[k] || undefined : body[k]]),
    )
}
router.post(
    '/',
    handle(async (req, res) => {
        if (req.body.currentRoomId)
            throw new HttpError(
                400,
                'Register the resident first, then use Check-In to assign a room.',
            )
        const person = await Employee.create(pick(req.body))
        await person.populate(population(req))
        res.status(201).json(person)
    }),
)
async function update(req, deactivate = false) {
    return transaction(async (session) => {
        const person = await Employee.findById(req.params.id).session(session)
        if (!person) throw new HttpError(404, 'Resident not found.')
        if (
            req.body.currentRoomId !== undefined &&
            idOf(req.body.currentRoomId) !== idOf(person.currentRoomId)
        )
            throw new HttpError(
                400,
                'Use Check-In / Check-Out to change accommodation.',
            )
        const data = deactivate ? { status: 'Inactive' } : pick(req.body)
        const active = await Assignment.exists({
            occupantId: person._id,
            status: 'active',
        }).session(session)
        if (
            active &&
            (data.status === 'Inactive' ||
                ('campId' in data &&
                    idOf(data.campId) !== idOf(person.campId)) ||
                (data.employeeType &&
                    data.employeeType !== person.employeeType))
        )
            throw new HttpError(
                409,
                'Complete the active stay before changing camp, resident type, or active status.',
            )
        Object.assign(person, data)
        await person.save({ session })
        return person
    })
}
router.patch(
    '/:id',
    handle(async (req, res) => {
        const person = await update(req)
        await person.populate(population(req))
        res.json(person)
    }),
)
router.delete(
    '/:id',
    handle(async (req, res) => {
        await update(req, true)
        res.json({ message: 'Resident deactivated.' })
    }),
)
module.exports = router
