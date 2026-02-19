const express = require('express')
const router = express.Router()
const Employee = require('../models/Employee')
const Camp = require('../models/Camp')
const Room = require('../models/Room')

// Middleware to get employee by ID
async function getEmployee(req, res, next) {
    let employee
    try {
        employee = await Employee.findById(req.params.id)
            .populate('campId', 'name location')
            .populate('currentRoomId', 'roomNumber type')
            .populate('roomAssignmentHistory.roomId', 'roomNumber type')

        if (employee == null) {
            return res.status(404).json({ message: 'Cannot find employee' })
        }
    } catch (err) {
        return res.status(500).json({ message: err.message })
    }

    res.employee = employee
    next()
}

// Helper function to update room assignment history
async function updateRoomAssignmentHistory(
    employee,
    previousRoomId,
    newRoomId,
) {
    // Close previous room assignment if exists
    if (previousRoomId) {
        const previousAssignment = employee.roomAssignmentHistory.find(
            (assignment) =>
                assignment.roomId &&
                assignment.roomId.toString() === previousRoomId.toString() &&
                !assignment.endDate,
        )

        if (previousAssignment) {
            previousAssignment.endDate = new Date()
        }
    }

    // Add new room assignment if new room is assigned
    if (newRoomId) {
        const existingAssignment = employee.roomAssignmentHistory.find(
            (assignment) =>
                assignment.roomId &&
                assignment.roomId.toString() === newRoomId.toString() &&
                !assignment.endDate,
        )

        if (!existingAssignment) {
            employee.roomAssignmentHistory.push({
                roomId: newRoomId,
                startDate: new Date(),
                endDate: null,
            })
        }
    }
}

// Get all employees with optional filters
router.get('/', async (req, res) => {
    try {
        const {
            employeeType,
            department,
            campId,
            status,
            page = 1,
            limit = 10,
        } = req.query

        // Build query filter
        const filter = {}
        if (employeeType) filter.employeeType = employeeType
        if (department) filter.department = department
        if (campId) filter.campId = campId
        if (status) filter.status = status

        // Pagination
        const pageNum = parseInt(page)
        const limitNum = parseInt(limit)
        const skip = (pageNum - 1) * limitNum

        const employees = await Employee.find(filter)
            .populate('campId', 'name location')
            .populate('currentRoomId', 'roomNumber type')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)

        const total = await Employee.countDocuments(filter)

        res.json({
            data: employees,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

// Get single employee by ID
router.get('/:id', getEmployee, (req, res) => {
    res.json(res.employee)
})

// Create new employee
router.post('/', async (req, res) => {
    console.log('Add Employee Payload:', JSON.stringify(req.body, null, 2))
    try {
        // Validate required fields
        if (
            !req.body.firstName ||
            !req.body.lastName ||
            !req.body.email ||
            !req.body.phone ||
            !req.body.iqamaNumber ||
            !req.body.employeeId
        ) {
            return res.status(400).json({
                message: 'firstName, lastName, email, phone, iqamaNumber, and employeeId are required',
            })
        }

        // Check if email already exists
        const existingEmployeeByEmail = await Employee.findOne({
            email: req.body.email,
        })
        if (existingEmployeeByEmail) {
            return res.status(400).json({ message: 'Email already exists' })
        }

        // Check if iqamaNumber already exists
        const existingEmployeeByIqama = await Employee.findOne({
            iqamaNumber: req.body.iqamaNumber,
        })
        if (existingEmployeeByIqama) {
            return res.status(400).json({ message: 'Iqama number already exists' })
        }

        // Check if employeeId already exists
        const existingEmployeeById = await Employee.findOne({
            employeeId: req.body.employeeId,
        })
        if (existingEmployeeById) {
            return res.status(400).json({ message: 'Employee ID already exists' })
        }

        // Validate campId if provided
        if (req.body.campId) {
            const camp = await Camp.findById(req.body.campId)
            if (!camp) {
                return res.status(404).json({ message: 'Camp not found' })
            }
        }

        // Validate currentRoomId if provided
        if (req.body.currentRoomId) {
            const room = await Room.findById(req.body.currentRoomId)
            if (!room) {
                return res.status(404).json({ message: 'Room not found' })
            }

            // Ensure only one active room assignment
            if (req.body.currentRoomId) {
                // This will be handled by initial history entry
            }
        }

        const employee = new Employee({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            phone: req.body.phone,
            iqamaNumber: req.body.iqamaNumber,
            employeeId: req.body.employeeId,
            location: req.body.location,
            project: req.body.project,
            department: req.body.department,
            designation: req.body.designation,
            employeeType: req.body.employeeType || 'Permanent',
            campId: req.body.campId,
            currentRoomId: req.body.currentRoomId || null,
            status: req.body.status || 'Active',
        })

        // Add initial room assignment to history if room is provided
        if (req.body.currentRoomId) {
            employee.roomAssignmentHistory.push({
                roomId: req.body.currentRoomId,
                startDate: new Date(),
                endDate: null,
            })
        }

        const newEmployee = await employee.save()

        // Populate references before returning
        await newEmployee.populate('campId', 'name location')
        await newEmployee.populate('currentRoomId', 'roomNumber type')

        res.status(201).json(newEmployee)
    } catch (err) {
        if (err.code === 11000) {
            // Duplicate key error
            const field = Object.keys(err.keyPattern)[0]
            if (field === 'email') {
                return res.status(400).json({ message: 'Email already exists' })
            } else if (field === 'iqamaNumber') {
                return res.status(400).json({ message: 'Iqama number already exists' })
            } else if (field === 'employeeId') {
                return res.status(400).json({ message: 'Employee ID already exists' })
            }
            return res.status(400).json({ message: 'Duplicate field value' })
        }
        res.status(400).json({ message: err.message })
    }
})

// Update employee
router.patch('/:id', getEmployee, async (req, res) => {
    try {
        const employee = res.employee
        // Handle both populated and non-populated currentRoomId
        const previousRoomId = employee.currentRoomId
            ? (employee.currentRoomId._id || employee.currentRoomId).toString()
            : null

        // Update fields if provided
        if (req.body.firstName != null) {
            employee.firstName = req.body.firstName
        }
        if (req.body.lastName != null) {
            employee.lastName = req.body.lastName
        }
        if (req.body.email != null) {
            // Check if email already exists (excluding current employee)
            const existingEmployee = await Employee.findOne({
                email: req.body.email,
                _id: { $ne: employee._id },
            })
            if (existingEmployee) {
                return res.status(400).json({ message: 'Email already exists' })
            }
            employee.email = req.body.email
        }
        if (req.body.phone != null) {
            employee.phone = req.body.phone
        }
        if (req.body.iqamaNumber != null) {
            // Check if iqamaNumber already exists (excluding current employee)
            const existingEmployeeByIqama = await Employee.findOne({
                iqamaNumber: req.body.iqamaNumber,
                _id: { $ne: employee._id },
            })
            if (existingEmployeeByIqama) {
                return res.status(400).json({ message: 'Iqama number already exists' })
            }
            employee.iqamaNumber = req.body.iqamaNumber
        }
        if (req.body.employeeId != null) {
            // Check if employeeId already exists (excluding current employee)
            const existingEmployeeById = await Employee.findOne({
                employeeId: req.body.employeeId,
                _id: { $ne: employee._id },
            })
            if (existingEmployeeById) {
                return res.status(400).json({ message: 'Employee ID already exists' })
            }
            employee.employeeId = req.body.employeeId
        }
        if (req.body.location != null) {
            employee.location = req.body.location
        }
        if (req.body.project != null) {
            employee.project = req.body.project
        }
        if (req.body.department != null) {
            employee.department = req.body.department
        }
        if (req.body.designation != null) {
            employee.designation = req.body.designation
        }
        if (req.body.employeeType != null) {
            employee.employeeType = req.body.employeeType
        }
        if (req.body.campId != null) {
            // Validate camp exists
            if (req.body.campId) {
                const camp = await Camp.findById(req.body.campId)
                if (!camp) {
                    return res.status(404).json({ message: 'Camp not found' })
                }
            }
            employee.campId = req.body.campId
        }
        if (req.body.currentRoomId !== undefined) {
            const newRoomId = req.body.currentRoomId

            // Validate room exists if provided
            if (newRoomId) {
                const room = await Room.findById(newRoomId)
                if (!room) {
                    return res.status(404).json({ message: 'Room not found' })
                }
            }

            // Update room assignment history if room changed
            const newRoomIdStr = newRoomId ? newRoomId.toString() : null
            if (previousRoomId !== newRoomIdStr) {
                await updateRoomAssignmentHistory(
                    employee,
                    previousRoomId,
                    newRoomId,
                )
            }

            employee.currentRoomId = newRoomId
        }
        if (req.body.status != null) {
            employee.status = req.body.status
        }

        const updatedEmployee = await employee.save()

        // Populate references before returning
        await updatedEmployee.populate('campId', 'name location')
        await updatedEmployee.populate('currentRoomId', 'roomNumber type')
        await updatedEmployee.populate(
            'roomAssignmentHistory.roomId',
            'roomNumber type',
        )

        res.json(updatedEmployee)
    } catch (err) {
        if (err.code === 11000) {
            // Duplicate key error
            const field = Object.keys(err.keyPattern)[0]
            if (field === 'email') {
                return res.status(400).json({ message: 'Email already exists' })
            } else if (field === 'iqamaNumber') {
                return res.status(400).json({ message: 'Iqama number already exists' })
            } else if (field === 'employeeId') {
                return res.status(400).json({ message: 'Employee ID already exists' })
            }
            return res.status(400).json({ message: 'Duplicate field value' })
        }
        res.status(400).json({ message: err.message })
    }
})

// Delete employee (soft delete - set status to Inactive)
router.delete('/:id', getEmployee, async (req, res) => {
    try {
        const employee = res.employee

        // Soft delete: set status to Inactive
        employee.status = 'Inactive'
        await employee.save()

        res.json({ message: 'Employee deactivated successfully' })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

module.exports = router
