const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const User = require('../models/User')
const Camp = require('../models/Camp')
const { HttpError, handle, idOf } = require('./http')
const ROLES = {
    admin: {
        label: 'Administrator',
        permissions: [
            'structure',
            'rooms',
            'residents',
            'stays',
            'facilities',
            'reports',
            'export',
            'users',
            'preferences',
        ],
    },
    camp_manager: {
        label: 'Camp Manager',
        permissions: [
            'rooms',
            'residents',
            'stays',
            'facilities',
            'reports',
            'export',
        ],
    },
    reception: {
        label: 'Reception',
        permissions: ['residents', 'stays', 'reports'],
    },
    viewer: { label: 'Viewer', permissions: ['reports'] },
}
const roleOf = (user) => (user.role === 'user' ? 'viewer' : user.role)
const can = (user, permission) =>
    !!ROLES[roleOf(user)]?.permissions.includes(permission)
const allowedCamp = (req, camp) =>
    roleOf(req.user) === 'admin' ||
    (req.user.assignedCamps || []).some((id) => idOf(id) === idOf(camp))
function assertCamp(req, camp) {
    if (!allowedCamp(req, camp))
        throw new HttpError(403, 'You do not have access to this camp.')
}
function scope(req, field = 'campId') {
    return roleOf(req.user) === 'admin'
        ? {}
        : { [field]: { $in: req.user.assignedCamps || [] } }
}
const requirePermission = (permission) => (req, res, next) =>
    can(req.user, permission)
        ? next()
        : next(new HttpError(403, 'Your role does not allow this action.'))
function publicUser(user) {
    return {
        id: idOf(user),
        _id: idOf(user),
        name: user.name,
        email: user.email,
        role: roleOf(user),
        assignedCamps: user.assignedCamps || [],
        active: user.active !== false,
        mustChangePassword: !!user.mustChangePassword,
        permissions: ROLES[roleOf(user)]?.permissions || [],
        createdAt: user.createdAt,
    }
}
const authenticate = handle(async (req, res, next) => {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
    if (!token) throw new HttpError(401, 'Please sign in to continue.')
    let decoded
    try {
        decoded = jwt.verify(token, req.app.locals.jwtSecret)
    } catch {
        throw new HttpError(
            401,
            'Your session has expired. Please sign in again.',
        )
    }
    const user = await User.findById(decoded.userId)
    if (
        !user ||
        user.active === false ||
        (decoded.version || 0) !== (user.tokenVersion || 0) ||
        !ROLES[roleOf(user)]
    )
        throw new HttpError(401, 'This session is no longer active.')
    req.user = user
    if (
        user.mustChangePassword &&
        !['/me', '/change-password', '/sign-out'].includes(req.path)
    )
        throw new HttpError(
            403,
            'Change your temporary password before continuing.',
        )
    next()
})
function guardCollection(collection) {
    return handle(async (req, res, next) => {
        const read = ['GET', 'HEAD'].includes(req.method)
        const permissions = {
            locations: 'structure',
            camps: 'structure',
            buildings: 'structure',
            rooms: 'rooms',
            employees: 'residents',
            assignments: 'stays',
            facilities: 'facilities',
        }
        if (!read && !can(req.user, permissions[collection]))
            throw new HttpError(403, 'Your role does not allow this action.')
        // Reject operator injection before handing query values to Mongoose.
        for (const value of Object.values(req.query))
            if (typeof value !== 'string')
                throw new HttpError(400, 'Filter values must be text.')
        const models = {
            locations: 'Location',
            camps: 'Camp',
            buildings: 'Building',
            rooms: 'Room',
            employees: 'Employee',
            assignments: 'RoomAssignment',
            facilities: 'CampFacility',
        }
        async function checkRecord(type, value) {
            if (!value) return
            if (
                typeof value !== 'string' ||
                !mongoose.isObjectIdOrHexString(value)
            )
                throw new HttpError(400, `Invalid ${type} identifier.`)
            const Model = mongoose.model(models[type])
            const record = await Model.findById(value)
            if (!record) throw new HttpError(404, 'Record not found.')
            if (type === 'locations') {
                if (
                    roleOf(req.user) !== 'admin' &&
                    !(await Camp.exists({
                        ...scope(req, '_id'),
                        locationId: record._id,
                    }))
                )
                    throw new HttpError(
                        403,
                        'You do not have access to this location.',
                    )
            } else if (type === 'assignments') {
                const room = await mongoose
                    .model('Room')
                    .findById(record.roomId)
                if (!room)
                    throw new HttpError(
                        409,
                        'The assigned room no longer exists.',
                    )
                assertCamp(req, room.camp)
            } else
                assertCamp(
                    req,
                    type === 'camps'
                        ? record._id
                        : record.campId || record.camp,
                )
        }
        const segments = req.path.split('/').filter(Boolean)
        if (segments[0] === 'camp') await checkRecord('camps', segments[1])
        else if (segments[0] === 'building')
            await checkRecord('buildings', segments[1])
        else if (segments[0] && mongoose.isObjectIdOrHexString(segments[0]))
            await checkRecord(collection, segments[0])
        for (const [key, type] of Object.entries({
            campId: 'camps',
            camp: 'camps',
            buildingId: 'buildings',
            roomId: 'rooms',
            currentRoomId: 'rooms',
            occupantId: 'employees',
            locationId: 'locations',
        })) {
            await checkRecord(type, req.query[key])
            await checkRecord(type, req.body?.[key])
        }
        if (
            !read &&
            collection === 'employees' &&
            req.method === 'POST' &&
            roleOf(req.user) !== 'admin' &&
            !req.body.campId
        )
            throw new HttpError(
                400,
                'Select an assigned camp for this resident.',
            )
        next()
    })
}
module.exports = {
    ROLES,
    roleOf,
    can,
    allowedCamp,
    assertCamp,
    scope,
    requirePermission,
    publicUser,
    authenticate,
    guardCollection,
}
