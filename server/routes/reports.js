const router = require('express').Router()
const Camp = require('../models/Camp')
const Location = require('../models/Location')
const Building = require('../models/Building')
const Room = require('../models/Room')
const Employee = require('../models/Employee')
const Assignment = require('../models/RoomAssignment')
const Facility = require('../models/CampFacility')
const Settings = require('../models/OrganizationSettings')
const Snapshot = require('../models/ReportSnapshot')
const {
    scope,
    assertCamp,
    requirePermission,
    allowedCamp,
} = require('../lib/access')
const { handle, HttpError, idOf, text } = require('../lib/http')
const { transaction } = require('../lib/transaction')
const { dayBounds, dateKey, formatDate } = require('../lib/dates')
const columns = (pairs) => pairs.map(([key, label]) => ({ key, label }))
const config = {
    occupancy: {
        title: 'Room occupancy',
        columns: columns([
            ['camp', 'Camp'],
            ['total', 'Total rooms'],
            ['occupied', 'Occupied'],
            ['available', 'Available'],
            ['unavailable', 'Unavailable'],
            ['occupancy', 'Occupancy %'],
        ]),
    },
    residents: {
        title: 'Resident roster',
        columns: columns([
            ['employeeId', 'Employee ID'],
            ['name', 'Resident'],
            ['department', 'Department'],
            ['type', 'Type'],
            ['camp', 'Camp'],
            ['room', 'Room'],
            ['expectedCheckout', 'Expected checkout'],
        ]),
    },
    movements: {
        title: 'Check-in / Check-out',
        columns: columns([
            ['name', 'Resident'],
            ['camp', 'Camp'],
            ['room', 'Room'],
            ['event', 'Event'],
            ['timestamp', 'Recorded at'],
            ['expectedCheckout', 'Expected checkout'],
            ['status', 'Stay status'],
        ]),
    },
    facilities: {
        title: 'Facilities register',
        columns: columns([
            ['name', 'Facility'],
            ['camp', 'Camp'],
            ['type', 'Type'],
            ['capacity', 'Capacity'],
            ['hours', 'Opening hours'],
            ['status', 'Status'],
        ]),
    },
}
router.use(requirePermission('reports'))
router.post(
    '/',
    handle(async (req, res) => {
        const input = req.body,
            type = input.type
        if (!config[type]) throw new HttpError(400, 'Select a valid report.')
        for (const key of [
            'campId',
            'locationId',
            'buildingId',
            'department',
            'residentType',
            'residentStatus',
            'facilityType',
            'facilityStatus',
            'eventType',
            'from',
            'to',
        ])
            if (input[key] != null && typeof input[key] !== 'string')
                throw new HttpError(400, 'Report filters must be text.')
        if (input.campId) assertCamp(req, input.campId)
        const result = await transaction(async (session) => {
            const settings =
                await Settings.findById('organization').session(session)
            const timezone = settings?.timezone || 'Asia/Riyadh'
            const dateFormat = settings?.dateFormat || 'DD MMM YYYY'
            const campFilter = { ...scope(req, '_id') }
            if (input.locationId) campFilter.locationId = input.locationId
            const campQuery = Camp.find(campFilter).session(session)
            if (input.campId) campQuery.and([{ _id: input.campId }])
            const camps = await campQuery.sort({ name: 1 })
            const campIds = camps.map((c) => c._id),
                campMap = new Map(camps.map((c) => [idOf(c), c.name]))
            const roomFilter = { camp: { $in: campIds } }
            if (type === 'occupancy' && input.buildingId)
                roomFilter.buildingId = input.buildingId
            const location =
                input.locationId && camps.length
                    ? await Location.findById(input.locationId).session(session)
                    : null
            const building =
                type === 'occupancy' && input.buildingId
                    ? await Building.findOne({
                          _id: input.buildingId,
                          campId: { $in: campIds },
                      }).session(session)
                    : null
            const rooms = await Room.find(roomFilter).session(session)
            const roomMap = new Map(rooms.map((r) => [idOf(r), r]))
            let rows = [],
                summary = {},
                filters = {
                    camp: input.campId
                        ? campMap.get(input.campId) || 'No matching camp'
                        : 'All permitted camps',
                    location: input.locationId
                        ? location?.name || 'No matching location'
                        : '',
                    building:
                        type === 'occupancy' && input.buildingId
                            ? building?.name || 'No matching building'
                            : '',
                }
            if (type === 'occupancy') {
                rows = camps.map((c) => {
                    const list = rooms.filter((r) => idOf(r.camp) === idOf(c)),
                        total = list.length,
                        occupied = list.filter(
                            (r) => r.status === 'occupied',
                        ).length,
                        available = list.filter(
                            (r) => r.status === 'available',
                        ).length
                    return {
                        camp: c.name,
                        total,
                        occupied,
                        available,
                        unavailable: total - occupied - available,
                        occupancy: total
                            ? Math.round((occupied / total) * 1000) / 10
                            : 0,
                    }
                })
                summary = rows.reduce(
                    (a, r) => ({
                        total: a.total + r.total,
                        occupied: a.occupied + r.occupied,
                        available: a.available + r.available,
                        unavailable: a.unavailable + r.unavailable,
                    }),
                    { total: 0, occupied: 0, available: 0, unavailable: 0 },
                )
                summary.occupancy = summary.total
                    ? Math.round((summary.occupied / summary.total) * 1000) / 10
                    : 0
            } else if (type === 'residents') {
                const filter = { campId: { $in: campIds } }
                if (input.department) filter.department = text(input.department)
                if (input.residentType) filter.employeeType = input.residentType
                if (input.residentStatus) filter.status = input.residentStatus
                const people = await Employee.find(filter)
                    .sort({ firstName: 1, lastName: 1 })
                    .session(session)
                const stays = await Assignment.find({
                    occupantId: { $in: people.map((p) => p._id) },
                    status: 'active',
                    roomId: { $in: rooms.map((r) => r._id) },
                }).session(session)
                const stayMap = new Map(
                    stays.map((s) => [idOf(s.occupantId), s]),
                )
                rows = people.map((p) => ({
                    employeeId: p.employeeId,
                    name: `${p.firstName} ${p.lastName}`,
                    department: p.department || '—',
                    type: p.employeeType,
                    camp: campMap.get(idOf(p.campId)) || '—',
                    room:
                        roomMap.get(idOf(p.currentRoomId))?.roomNumber ||
                        'Unassigned',
                    expectedCheckout: formatDate(
                        stayMap.get(idOf(p))?.expectedCheckoutDate,
                        dateFormat,
                    ),
                }))
                filters = {
                    ...filters,
                    department: input.department || 'All',
                    residentType: input.residentType || 'All',
                    residentStatus: input.residentStatus || 'All',
                }
                summary = { residents: rows.length }
            } else if (type === 'movements') {
                const from = input.from || dateKey(new Date(), timezone),
                    to = input.to || from,
                    start = dayBounds(from, timezone).start,
                    end = dayBounds(to, timezone).end
                if (start >= end)
                    throw new HttpError(
                        400,
                        'End date must not precede start date.',
                    )
                const stays = await Assignment.find({
                    roomId: { $in: rooms.map((r) => r._id) },
                    $or: [
                        { checkInTime: { $gte: start, $lt: end } },
                        { checkOutTime: { $gte: start, $lt: end } },
                    ],
                }).session(session)
                const people = await Employee.find({
                    _id: { $in: stays.map((s) => s.occupantId) },
                }).session(session)
                const names = new Map(
                    people.map((p) => [
                        idOf(p),
                        `${p.firstName} ${p.lastName}`,
                    ]),
                )
                for (const stay of stays) {
                    const room = roomMap.get(idOf(stay.roomId))
                    for (const [event, time, key] of [
                        ['Check-in', stay.checkInTime, 'in'],
                        [
                            stay.status === 'cancelled'
                                ? 'Cancellation'
                                : 'Check-out',
                            stay.checkOutTime,
                            'out',
                        ],
                    ]) {
                        if (
                            !time ||
                            time < start ||
                            time >= end ||
                            (input.eventType && input.eventType !== key)
                        )
                            continue
                        rows.push({
                            name:
                                names.get(idOf(stay.occupantId)) ||
                                'Resident unavailable',
                            camp: campMap.get(idOf(room.camp)),
                            room: room.roomNumber,
                            event,
                            timestamp: `${formatDate(
                                time,
                                dateFormat,
                                timezone,
                            )} ${new Intl.DateTimeFormat('en-GB', {
                                timeZone: timezone,
                                timeStyle: 'short',
                            }).format(time)}`,
                            expectedCheckout: formatDate(
                                stay.expectedCheckoutDate,
                                dateFormat,
                            ),
                            status: stay.status,
                            sortTime: +time,
                        })
                    }
                }
                rows.sort((a, b) => b.sortTime - a.sortTime)
                rows = rows.map(({ sortTime, ...r }) => r)
                filters = {
                    ...filters,
                    from,
                    to,
                    eventType: input.eventType || 'All',
                }
                summary = { events: rows.length }
            } else {
                const filter = { campId: { $in: campIds } }
                if (input.facilityType) filter.kind = input.facilityType
                if (input.facilityStatus) filter.status = input.facilityStatus
                const facilities = await Facility.find(filter)
                    .sort({ name: 1 })
                    .session(session)
                rows = facilities.map((f) => ({
                    name: f.name,
                    camp: campMap.get(idOf(f.campId)),
                    type: f.kind.replaceAll('_', ' '),
                    capacity: f.capacity
                        ? `${f.capacity} ${
                              f.kind === 'parking' ? 'spaces' : 'people'
                          }`
                        : 'Not set',
                    hours: f.openingHours || 'Not set',
                    status: f.status,
                }))
                filters = {
                    ...filters,
                    facilityType: input.facilityType || 'All',
                    facilityStatus: input.facilityStatus || 'All',
                }
                summary = { facilities: rows.length }
            }
            if (rows.length > 20000)
                throw new HttpError(
                    400,
                    'Narrow the filters to fewer than 20,000 rows.',
                )
            const [snapshot] = await Snapshot.create(
                [
                    {
                        owner: req.user._id,
                        campIds,
                        type,
                        ...config[type],
                        organization: settings?.name || 'CampWise',
                        logoUrl: settings?.logoUrl || '',
                        timezone,
                        dateFormat: settings?.dateFormat || 'DD MMM YYYY',
                        filters,
                        rows,
                        summary,
                        expiresAt: new Date(Date.now() + 30 * 60000),
                    },
                ],
                { session },
            )
            return snapshot
        })
        res.status(201).json(result)
    }),
)
function csvCell(value) {
    let s = String(value ?? '')
    if (/^\s*[=+@\-\t\r]/.test(s)) s = "'" + s
    return '"' + s.replaceAll('"', '""') + '"'
}
router.get(
    '/:id/csv',
    requirePermission('export'),
    handle(async (req, res) => {
        const report = await Snapshot.findById(req.params.id)
        if (!report || idOf(report.owner) !== idOf(req.user))
            throw new HttpError(404, 'Report not found.')
        if (report.expiresAt <= new Date())
            throw new HttpError(
                410,
                'This preview has expired. Generate a new report.',
            )
        if (!report.campIds.every((c) => allowedCamp(req, c)))
            throw new HttpError(
                403,
                'Your camp access has changed. Generate a new report.',
            )
        const lines = [
            report.columns.map((c) => csvCell(c.label)).join(','),
            ...report.rows.map((row) =>
                report.columns.map((c) => csvCell(row[c.key])).join(','),
            ),
        ]
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="campwise-${report.type}-${report.createdAt
                .toISOString()
                .slice(0, 10)}.csv"`,
        )
        res.type('text/csv').send('\ufeff' + lines.join('\r\n'))
    }),
)
module.exports = router
