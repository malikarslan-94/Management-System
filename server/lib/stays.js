const Settings = require('../models/OrganizationSettings')
const { dateKey } = require('./dates')
const Assignment = require('../models/RoomAssignment')
const Room = require('../models/Room')
const Employee = require('../models/Employee')
const { HttpError, idOf, text, date } = require('./http')
const { assertCamp } = require('./access')
const { transaction, audit } = require('./transaction')
const population = [
    {
        path: 'roomId',
        populate: [
            { path: 'camp', select: 'name location locationId' },
            { path: 'buildingId', select: 'name' },
        ],
    },
]
async function withResidents(records) {
    const people = await Employee.find({
        _id: { $in: records.map((a) => a.occupantId) },
    }).select(
        'firstName lastName employeeId department designation employeeType',
    )
    const map = new Map(people.map((p) => [idOf(p), p]))
    return records.map((a) => ({
        ...(a.toObject ? a.toObject() : a),
        occupantDetails: map.get(idOf(a.occupantId)) || null,
    }))
}
async function createStay(req) {
    const input = req.body
    const start = date(input.startDate, 'check-in date'),
        expected = date(input.expectedCheckoutDate, 'expected checkout')
    if (expected <= start)
        throw new HttpError(400, 'Expected checkout must be after check-in.')
    const settings = await Settings.findById('organization')
    const timezone = settings?.timezone || 'Asia/Riyadh'
    if (start.toISOString().slice(0, 10) > dateKey(new Date(), timezone))
        throw new HttpError(
            400,
            'Future reservations are not supported. Check in when the resident arrives.',
        )
    const assignment = await transaction(async (session) => {
        const room = await Room.findById(input.roomId).session(session)
        const person = await Employee.findById(input.occupantId).session(
            session,
        )
        if (!room || !person)
            throw new HttpError(404, 'Room or resident not found.')
        assertCamp(req, room.camp)
        assertCamp(req, person.campId)
        if (person.status !== 'Active')
            throw new HttpError(409, 'This resident is inactive.')
        if (person.campId && idOf(person.campId) !== idOf(room.camp))
            throw new HttpError(
                400,
                'Resident and room must belong to the same camp. Update the resident camp first.',
            )
        if (room.status !== 'available')
            throw new HttpError(409, 'This room is no longer available.')
        if (
            await Assignment.exists({
                status: 'active',
                $or: [{ roomId: room._id }, { occupantId: person._id }],
            }).session(session)
        )
            throw new HttpError(
                409,
                'The room or resident already has an active stay.',
            )
        if (person.currentRoomId)
            throw new HttpError(
                409,
                'This resident already has a room. Complete their existing stay first.',
            )
        const [created] = await Assignment.create(
            [
                {
                    roomId: room._id,
                    occupantId: person._id,
                    occupantType:
                        person.employeeType === 'Visitor'
                            ? 'Temporary Visitor'
                            : 'Employee',
                    startDate: start,
                    expectedCheckoutDate: expected,
                    checkInTime: new Date(),
                    notes: text(input.notes, 2000),
                    createdBy: req.user._id,
                },
            ],
            { session },
        )
        room.status = 'occupied'
        await room.save({ session })
        person.currentRoomId = room._id
        person.campId = room.camp
        person.roomAssignmentHistory.push({
            roomId: room._id,
            startDate: start,
            endDate: null,
        })
        await person.save({ session })
        await audit(
            req,
            'check-in',
            'assignment',
            { _id: created._id, campId: room.camp },
            { roomId: room._id, occupantId: person._id },
            session,
        )
        return created
    })
    await assignment.populate(population)
    return (await withResidents([assignment]))[0]
}
async function finishStay(req, status = 'completed') {
    if (!['completed', 'cancelled'].includes(status))
        throw new HttpError(400, 'A stay can only be completed or cancelled.')
    const result = await transaction(async (session) => {
        const assignment = await Assignment.findById(req.params.id).session(
            session,
        )
        if (!assignment) throw new HttpError(404, 'Stay not found.')
        if (assignment.status !== 'active')
            throw new HttpError(
                409,
                'This stay has already ended. Refresh the list.',
            )
        const room = await Room.findById(assignment.roomId).session(session)
        if (!room)
            throw new HttpError(409, 'The assigned room no longer exists.')
        assertCamp(req, room.camp)
        const nextStatus = req.body.roomAfterCheckout || 'cleaning'
        if (!['available', 'cleaning'].includes(nextStatus))
            throw new HttpError(400, 'Choose Available or Cleaning.')
        const now = new Date()
        const settings =
            await Settings.findById('organization').session(session)
        if (
            assignment.startDate.toISOString().slice(0, 10) >
            dateKey(now, settings?.timezone || 'Asia/Riyadh')
        )
            throw new HttpError(
                409,
                'This stay has a future start date and must be reviewed.',
            )
        const person = await Employee.findById(assignment.occupantId).session(
            session,
        )
        assignment.status = status
        assignment.checkOutTime = now
        assignment.checkedOutBy = req.user._id
        assignment.checkoutNotes = text(req.body.checkoutNotes, 2000)
        room.status = room.status === 'maintenance' ? 'maintenance' : nextStatus
        assignment.roomAfterCheckout = room.status
        await assignment.save({ session })
        await room.save({ session })
        if (person) {
            if (idOf(person.currentRoomId) === idOf(room))
                person.currentRoomId = null
            for (const stay of person.roomAssignmentHistory)
                if (idOf(stay.roomId) === idOf(room) && !stay.endDate)
                    stay.endDate = now
            await person.save({ session })
        }
        await audit(
            req,
            status === 'completed' ? 'check-out' : 'cancel-stay',
            'assignment',
            { _id: assignment._id, campId: room.camp },
            { roomAfterCheckout: room.status },
            session,
        )
        return assignment
    })
    await result.populate(population)
    return (await withResidents([result]))[0]
}
module.exports = { population, withResidents, createStay, finishStay }
