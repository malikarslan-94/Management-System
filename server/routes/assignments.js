const express = require('express')
const router = express.Router()
const RoomAssignment = require('../models/RoomAssignment')
const Room = require('../models/Room')
const Employee = require('../models/Employee')

// Middleware to get assignment by ID
async function getAssignment(req, res, next) {
    let assignment
    try {
        assignment = await RoomAssignment.findById(req.params.id)
            .populate({
                path: 'roomId',
                select: 'roomNumber type capacity price amenities camp',
                populate: {
                    path: 'camp',
                    select: 'name location',
                },
            })

        if (assignment == null) {
            return res
                .status(404)
                .json({ message: 'Cannot find room assignment' })
        }
    } catch (err) {
        return res.status(500).json({ message: err.message })
    }

    res.assignment = assignment
    next()
}

// Get all assignments with optional filters
router.get('/', async (req, res) => {
    try {
        const { roomId, occupantId, status, page = 1, limit = 10 } = req.query

        // Build query filter
        const filter = {}
        if (roomId) filter.roomId = roomId
        if (occupantId) filter.occupantId = occupantId
        if (status) filter.status = status

        // Pagination
        const pageNum = parseInt(page)
        const limitNum = parseInt(limit)
        const skip = (pageNum - 1) * limitNum

        const assignments = await RoomAssignment.find(filter)
            .populate({
                path: 'roomId',
                select: 'roomNumber type capacity price amenities camp',
                populate: {
                    path: 'camp',
                    select: 'name location',
                },
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean()

        // Fetch employee details for each assignment
        const assignmentsWithDetails = await Promise.all(
            assignments.map(async (assignment) => {
                if (assignment.occupantType === 'Employee') {
                    try {
                        const employee = await Employee.findById(
                            assignment.occupantId,
                        ).select('firstName lastName email phone department designation')
                        return {
                            ...assignment,
                            occupantDetails: employee || null,
                        }
                    } catch (err) {
                        return {
                            ...assignment,
                            occupantDetails: null,
                        }
                    }
                }
                return {
                    ...assignment,
                    occupantDetails: null,
                }
            }),
        )

        const total = await RoomAssignment.countDocuments(filter)

        res.json({
            data: assignmentsWithDetails,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

// Get single assignment by ID
router.get('/:id', getAssignment, (req, res) => {
    res.json(res.assignment)
})

// Create new assignment
router.post('/', async (req, res) => {
    try {
        const {
            roomId,
            occupantId,
            occupantType,
            startDate,
            expectedCheckoutDate,
        } = req.body

        // Validate required fields
        if (!roomId || !occupantId || !occupantType || !startDate || !expectedCheckoutDate) {
            return res.status(400).json({
                message: 'Missing required fields: roomId, occupantId, occupantType, startDate, expectedCheckoutDate',
            })
        }

        // Validate room exists and is available
        const room = await Room.findById(roomId)
        if (!room) {
            return res.status(404).json({ message: 'Room not found' })
        }

        if (room.status !== 'available') {
            return res
                .status(400)
                .json({ message: `Room is ${room.status} and cannot be assigned.` })
        }

        // Check if room already has active assignment
        const existingActiveAssignment = await RoomAssignment.findOne({
            roomId,
            status: 'active',
        })

        if (existingActiveAssignment) {
            return res.status(400).json({
                message: 'Room already has an active assignment',
            })
        }

        // If occupant is an employee, validate employee exists
        if (occupantType === 'Employee') {
            const employee = await Employee.findById(occupantId)
            if (!employee) {
                return res.status(404).json({ message: 'Employee not found' })
            }

            // Update employee's currentRoomId
            employee.currentRoomId = roomId
            await employee.save()

            // Add to employee's room assignment history
            if (!employee.roomAssignmentHistory) {
                employee.roomAssignmentHistory = []
            }
            employee.roomAssignmentHistory.push({
                roomId: roomId,
                startDate: new Date(startDate),
                endDate: null,
            })
            await employee.save()
        }

        // Create assignment
        const assignment = new RoomAssignment({
            roomId,
            occupantId,
            occupantType,
            startDate: new Date(startDate),
            expectedCheckoutDate: new Date(expectedCheckoutDate),
            checkInTime: new Date(),
            status: 'active',
        })

        const newAssignment = await assignment.save()

        // Update room availability
        room.status = 'occupied'
        await room.save()

        // Populate before returning
        await newAssignment.populate({
            path: 'roomId',
            select: 'roomNumber type capacity price amenities camp',
            populate: {
                path: 'camp',
                select: 'name location',
            },
        })

        // Get occupant details
        let occupantDetails = null
        if (occupantType === 'Employee') {
            occupantDetails = await Employee.findById(occupantId).select(
                'firstName lastName email phone department designation',
            )
        }

        res.status(201).json({
            ...newAssignment.toObject(),
            occupantDetails,
        })
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: err.message })
        }
        res.status(500).json({ message: err.message })
    }
})

// Update assignment (for checkout or status changes)
router.put('/:id', getAssignment, async (req, res) => {
    try {
        const assignment = res.assignment
        const { checkOutTime, status } = req.body

        if (checkOutTime !== undefined) {
            assignment.checkOutTime = new Date(checkOutTime)
        }

        if (status !== undefined) {
            assignment.status = status
        }

        // If completing assignment, update room availability
        if (status === 'completed' || status === 'cancelled') {
            const room = await Room.findById(assignment.roomId)
            // Only an occupied room frees up — a room pulled out for
            // maintenance while assigned must not be flipped back to available.
            if (room && room.status === 'occupied') {
                room.status = 'available'
                await room.save()
            }

            // Update employee's currentRoomId if it matches
            if (assignment.occupantType === 'Employee') {
                const employee = await Employee.findById(assignment.occupantId)
                if (employee && employee.currentRoomId?.toString() === assignment.roomId.toString()) {
                    employee.currentRoomId = null

                    // Update assignment history end date
                    if (employee.roomAssignmentHistory) {
                        const historyItem = employee.roomAssignmentHistory.find(
                            (item) =>
                                item.roomId?.toString() === assignment.roomId.toString() &&
                                !item.endDate,
                        )
                        if (historyItem) {
                            historyItem.endDate = new Date(checkOutTime || Date.now())
                        }
                    }

                    await employee.save()
                }
            }
        }

        const updatedAssignment = await assignment.save()

        // Populate before returning
        await updatedAssignment.populate({
            path: 'roomId',
            select: 'roomNumber type capacity price amenities camp',
            populate: {
                path: 'camp',
                select: 'name location',
            },
        })

        // Get occupant details
        let occupantDetails = null
        if (updatedAssignment.occupantType === 'Employee') {
            occupantDetails = await Employee.findById(updatedAssignment.occupantId).select(
                'firstName lastName email phone department designation',
            )
        }

        res.json({
            ...updatedAssignment.toObject(),
            occupantDetails,
        })
    } catch (err) {
        res.status(400).json({ message: err.message })
    }
})

// Delete assignment (soft delete by setting status to cancelled)
router.delete('/:id', getAssignment, async (req, res) => {
    try {
        const assignment = res.assignment

        // Mark as cancelled instead of deleting
        assignment.status = 'cancelled'
        assignment.checkOutTime = new Date()

        // Update room availability
        const room = await Room.findById(assignment.roomId)
        if (room && room.status === 'occupied') {
            room.status = 'available'
            await room.save()
        }

        // Update employee's currentRoomId if it matches
        if (assignment.occupantType === 'Employee') {
            const employee = await Employee.findById(assignment.occupantId)
            if (employee && employee.currentRoomId?.toString() === assignment.roomId.toString()) {
                employee.currentRoomId = null

                // Update assignment history end date
                if (employee.roomAssignmentHistory) {
                    const historyItem = employee.roomAssignmentHistory.find(
                        (item) =>
                            item.roomId?.toString() === assignment.roomId.toString() &&
                            !item.endDate,
                    )
                    if (historyItem) {
                        historyItem.endDate = new Date()
                    }
                }

                await employee.save()
            }
        }

        await assignment.save()

        res.json({ message: 'Assignment cancelled successfully' })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

module.exports = router

