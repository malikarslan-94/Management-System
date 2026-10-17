/**
 * Shared hierarchy validation for Location → Camp → Building → Room.
 *
 * Every write path (POST, PATCH, bulk) goes through these helpers so the
 * invariants can only be expressed once. The camp/building mismatch bug came
 * from POST and PATCH each carrying their own copy of the rules.
 */

const Location = require('../models/Location')
const Camp = require('../models/Camp')
const Building = require('../models/Building')
const Room = require('../models/Room')

class HttpError extends Error {
    constructor(status, message) {
        super(message)
        this.status = status
    }
}

/**
 * Wraps an async route handler so thrown HttpErrors become responses and
 * Mongo duplicate-key errors become readable 409s instead of 500s.
 */
function handle(fn) {
    return async (req, res, next) => {
        try {
            await fn(req, res, next)
        } catch (err) {
            if (err instanceof HttpError || (err.status >= 400 && err.status < 600)) {
                return res.status(err.status).json({ message: err.message })
            }
            if (err.code === 11000) {
                return res.status(409).json({ message: describeDuplicate(err) })
            }
            if (err.name === 'ValidationError') {
                return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join('; ') })
            }
            if (err.name === 'CastError') {
                return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` })
            }
            console.error(err)
            return next(err)
        }
    }
}

function describeDuplicate(err) {
    const keys = Object.keys(err.keyPattern || {})
    if (keys.includes('roomNumber')) return 'A room with this number already exists in this building.'
    if (keys.includes('name') && keys.includes('campId')) return 'A building with this name already exists in this camp.'
    if (keys.includes('name') && keys.includes('locationId')) return 'A camp with this name already exists in this location.'
    if (keys.includes('name')) return 'A record with this name already exists.'
    return 'This record already exists.'
}

/** Location must exist before a camp can point at it. */
async function requireLocation(locationId) {
    if (!locationId) throw new HttpError(400, 'locationId is required — pick a location for this camp.')
    const location = await Location.findById(locationId)
    if (!location) throw new HttpError(404, 'Location not found')
    return location
}

async function requireCamp(campId) {
    if (!campId) throw new HttpError(400, 'campId is required')
    const camp = await Camp.findById(campId)
    if (!camp) throw new HttpError(404, 'Camp not found')
    return camp
}

/**
 * The single source of truth for where a room sits.
 *
 * Takes only buildingId + floor and derives the camp from the building, so
 * there is no code path left that can put a room in camp A while its building
 * belongs to camp B.
 *
 * @returns {{ building, campId, floor }}
 */
async function resolveRoomPlacement({ buildingId, floor }) {
    if (!buildingId) {
        throw new HttpError(400, 'buildingId is required — every room must belong to a building.')
    }

    const building = await Building.findById(buildingId)
    if (!building) throw new HttpError(404, 'Building not found')

    const requestedFloor = floor == null ? 1 : Number(floor)
    if (!Number.isInteger(requestedFloor) || requestedFloor < 1) {
        throw new HttpError(400, 'Floor must be a whole number of 1 or more.')
    }
    if (requestedFloor > building.floors) {
        throw new HttpError(
            400,
            `Floor ${requestedFloor} does not exist in "${building.name}" — it has ${building.floors} floor(s).`,
        )
    }

    return { building, campId: building.campId, floor: requestedFloor }
}

/**
 * Pre-flight room number check. The unique index is the real guard; this exists
 * so bulk generation can report every conflict up front instead of failing
 * halfway through an insert.
 */
async function findRoomNumberConflicts(buildingId, roomNumbers, excludeId = null) {
    const filter = { buildingId, roomNumber: { $in: roomNumbers } }
    if (excludeId) filter._id = { $ne: excludeId }
    const existing = await Room.find(filter).select('roomNumber')
    return existing.map((r) => r.roomNumber)
}

/** Blocks a delete while children still reference the parent. */
async function assertNoChildren(label, Model, filter, childLabel, hint) {
    const count = await Model.countDocuments(filter)
    if (count > 0) {
        throw new HttpError(400, `Cannot delete ${label}. It has ${count} ${childLabel}${count === 1 ? '' : 's'}. ${hint}`)
    }
}

module.exports = {
    HttpError,
    handle,
    requireLocation,
    requireCamp,
    resolveRoomPlacement,
    findRoomNumberConflicts,
    assertNoChildren,
}
