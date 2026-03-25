import DataTable from '@/components/shared/DataTable'
import Statistic from '@/components/shared/Statistic/Statistic'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import Drawer from '@/components/ui/Drawer'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/select'
import { FormContainer, FormItem } from '@/components/ui'
import { useCamps } from '@/hooks/useCamps'
import { useEmployees } from '@/hooks/useEmployees'
import { useRooms } from '@/hooks/useRooms'
import { useRoomAssignments } from '@/hooks/useRoomAssignments'
import type {
    RoomAssignment,
    AssignRoomPayload,
} from '@/services/RoomAssignmentService'
import { AssignmentFilters } from '@/services/RoomAssignmentService'
import { ColumnDef } from '@tanstack/react-table'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
    HiOutlineCalendar,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineEye,
    HiOutlineHome,
    HiOutlineLogout,
    HiOutlineSearch,
    HiOutlineUserAdd,
    HiOutlineUsers,
    HiOutlineX,
} from 'react-icons/hi'

type TabType = 'all' | 'active' | 'completed'

const RoomAssignments = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()

    const [activeTab, setActiveTab] = useState<TabType>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [filters, setFilters] = useState<AssignmentFilters>({
        roomId: '',
        occupantId: '',
        status: undefined,
        page: 1,
        limit: 10,
    })
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [selectedAssignment, setSelectedAssignment] =
        useState<RoomAssignment | null>(null)
    const [assignFormData, setAssignFormData] = useState<AssignRoomPayload>({
        roomId: '',
        occupantId: '',
        occupantType: 'Employee',
        startDate: new Date().toISOString().split('T')[0],
        expectedCheckoutDate: '',
    })
    const [assignErrors, setAssignErrors] = useState<Record<string, string>>({})
    const [assignSubmitting, setAssignSubmitting] = useState(false)
    const [checkoutBusyId, setCheckoutBusyId] = useState<string | null>(null)
    const [pageIndex, setPageIndex] = useState(0)
    const [pageSize, setPageSize] = useState(10)

    // Memoize the assignment filters
    const assignmentFilters = useMemo<AssignmentFilters>(
        () => ({
            status:
                activeTab === 'active'
                    ? 'active'
                    : activeTab === 'completed'
                      ? 'completed'
                      : undefined,
            roomId: filters.roomId || undefined,
            occupantId: filters.occupantId || undefined,
            page: pageIndex + 1,
            limit: pageSize,
        }),
        [activeTab, filters.roomId, filters.occupantId, pageIndex, pageSize],
    )

    const {
        assignments = [],
        loading,
        pagination,
        assignRoom,
        checkoutRoom,
        cancelAssignment,
        fetchAssignments,
    } = useRoomAssignments(assignmentFilters)

    const { camps, fetchCamps } = useCamps()
    const { rooms, fetchRooms } = useRooms()
    const { employees: allEmployees, fetchEmployees } = useEmployees()

    // Filter employees to active ones
    const employees = useMemo(
        () => allEmployees.filter((emp) => emp.status === 'Active'),
        [allEmployees],
    )

    // Initial data fetch
    useEffect(() => {
        fetchCamps()
        fetchRooms()
        fetchEmployees()
        fetchAssignments()
    }, [fetchCamps, fetchRooms, fetchEmployees, fetchAssignments])

    // Check URL params to open assign modal
    useEffect(() => {
        const action = searchParams.get('action')
        const roomId = searchParams.get('roomId')

        if (action === 'assign' && roomId) {
            setAssignFormData({
                roomId,
                occupantId: '',
                occupantType: 'Employee',
                startDate: new Date().toISOString().split('T')[0],
                expectedCheckoutDate: '',
            })
            setAssignErrors({})
            setIsAssignModalOpen(true)
            setSearchParams({}, { replace: true })
        }
    }, [searchParams, setSearchParams])

    // Update filters when tab changes
    useEffect(() => {
        setPageIndex(0) // Reset to first page on filter change
    }, [activeTab])

    // Calculate statistics
    const stats = useMemo(() => {
        const activeAssignments = assignments.filter(
            (a) => a.status === 'active',
        )
        const completedAssignments = assignments.filter(
            (a) => a.status === 'completed',
        )
        const totalRooms = rooms.length
        const assignedRooms = activeAssignments.length
        const availableRooms = totalRooms - assignedRooms

        return {
            totalAssignments: assignments.length,
            activeAssignments: activeAssignments.length,
            completedAssignments: completedAssignments.length,
            availableRooms,
        }
    }, [assignments, rooms])

    // Filter assignments by search query
    const filteredAssignments = useMemo(() => {
        let result = [...(assignments || [])]

        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            result = result.filter((assignment) => {
                const roomDetails =
                    typeof assignment.roomId === 'object'
                        ? assignment.roomId
                        : assignment.roomId_details
                const occupantDetails = assignment.occupantDetails

                return (
                    roomDetails?.roomNumber?.toLowerCase().includes(query) ||
                    occupantDetails?.firstName
                        ?.toLowerCase()
                        .includes(query) ||
                    occupantDetails?.lastName
                        ?.toLowerCase()
                        .includes(query) ||
                    occupantDetails?.email?.toLowerCase().includes(query)
                )
            })
        }

        return result
    }, [assignments, searchQuery])

    // Get room details helper
    const getRoomDetails = (assignment: RoomAssignment) => {
        if (typeof assignment.roomId === 'object') {
            return assignment.roomId
        }
        return assignment.roomId_details || null
    }

    // Get occupant details helper
    const getOccupantDetails = (assignment: RoomAssignment) => {
        return assignment.occupantDetails || null
    }

    // Table columns
    const columns = useMemo<ColumnDef<RoomAssignment>[]>(
        () => [
            {
                header: 'Room',
                accessorKey: 'roomId',
                cell: ({ row }) => {
                    const assignment = row.original
                    const roomDetails = getRoomDetails(assignment)
                    return (
                        <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                {roomDetails?.roomNumber || 'N/A'}
                            </div>
                            {roomDetails?.type && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                    {roomDetails.type}
                                </div>
                            )}
                        </div>
                    )
                },
            },
            {
                header: 'Occupant',
                accessorKey: 'occupantId',
                cell: ({ row }) => {
                    const assignment = row.original
                    const occupant = getOccupantDetails(assignment)
                    if (!occupant) {
                        return (
                            <span className="text-gray-500 dark:text-gray-400">
                                {assignment.occupantType}
                            </span>
                        )
                    }
                    return (
                        <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                {occupant.firstName} {occupant.lastName}
                            </div>
                            {occupant.email && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {occupant.email}
                                </div>
                            )}
                        </div>
                    )
                },
            },
            {
                header: 'Type',
                accessorKey: 'occupantType',
                cell: ({ row }) => {
                    const type = row.original.occupantType
                    const colorMap = {
                        Employee:
                            'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
                        'Temporary Visitor':
                            'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300',
                    }
                    return (
                        <Badge className={colorMap[type] || colorMap.Employee}>
                            {type}
                        </Badge>
                    )
                },
            },
            {
                header: 'Check-in',
                accessorKey: 'startDate',
                cell: ({ row }) => {
                    const date = new Date(row.original.startDate)
                    return (
                        <div className="text-gray-900 dark:text-gray-100">
                            {date.toLocaleDateString()}
                        </div>
                    )
                },
            },
            {
                header: 'Expected Check-out',
                accessorKey: 'expectedCheckoutDate',
                cell: ({ row }) => {
                    const date = new Date(row.original.expectedCheckoutDate)
                    return (
                        <div className="text-gray-900 dark:text-gray-100">
                            {date.toLocaleDateString()}
                        </div>
                    )
                },
            },
            {
                header: 'Status',
                accessorKey: 'status',
                cell: ({ row }) => {
                    const status = row.original.status || 'active'
                    const colorMap = {
                        active: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300',
                        completed:
                            'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300',
                        cancelled:
                            'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300',
                    }
                    return (
                        <Badge className={colorMap[status] || colorMap.active}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                    )
                },
            },
            {
                header: 'Actions',
                accessorKey: 'actions',
                cell: ({ row }) => {
                    const assignment = row.original
                    return (
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="plain"
                                icon={<HiOutlineEye />}
                                onClick={() => {
                                    setSelectedAssignment(assignment)
                                    setIsDrawerOpen(true)
                                }}
                            />
                            {assignment.status === 'active' && (
                                <Button
                                    size="sm"
                                    variant="plain"
                                    icon={<HiOutlineLogout />}
                                    onClick={() => handleCheckout(assignment._id!)}
                                    color="green-600"
                                    title="Checkout"
                                    loading={
                                        checkoutBusyId === assignment._id
                                    }
                                    disabled={Boolean(
                                        checkoutBusyId &&
                                            checkoutBusyId !== assignment._id,
                                    )}
                                />
                            )}
                        </div>
                    )
                },
            },
        ],
        [checkoutBusyId],
    )

    // Handle assign form input change
    const handleAssignInputChange = (name: string, value: any) => {
        setAssignFormData((prev) => ({ ...prev, [name]: value }))
        if (assignErrors[name]) {
            setAssignErrors((prev) => {
                const newErrors = { ...prev }
                delete newErrors[name]
                return newErrors
            })
        }
    }

    // Validate assign form
    const validateAssignForm = (): boolean => {
        const errors: Record<string, string> = {}

        if (!assignFormData.roomId) {
            errors.roomId = 'Please select a room'
        }

        if (!assignFormData.occupantId) {
            errors.occupantId = 'Please select an occupant'
        }

        if (!assignFormData.startDate) {
            errors.startDate = 'Start date is required'
        }

        if (!assignFormData.expectedCheckoutDate) {
            errors.expectedCheckoutDate = 'Expected checkout date is required'
        } else if (
            assignFormData.startDate &&
            assignFormData.expectedCheckoutDate
        ) {
            const start = new Date(assignFormData.startDate)
            const checkout = new Date(assignFormData.expectedCheckoutDate)
            if (checkout <= start) {
                errors.expectedCheckoutDate =
                    'Checkout date must be after start date'
            }
        }

        setAssignErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Handle assign room submission
    const handleAssignRoom = async () => {
        if (!validateAssignForm()) return

        setAssignSubmitting(true)
        try {
            await assignRoom(assignFormData)
            setIsAssignModalOpen(false)
            setAssignFormData({
                roomId: '',
                occupantId: '',
                occupantType: 'Employee',
                startDate: new Date().toISOString().split('T')[0],
                expectedCheckoutDate: '',
            })
            setAssignErrors({})
            fetchAssignments()
            fetchRooms() // Refresh rooms to update availability
        } catch (error) {
            console.error('Error assigning room:', error)
        } finally {
            setAssignSubmitting(false)
        }
    }

    // Handle checkout
    const handleCheckout = async (assignmentId: string) => {
        if (
            !window.confirm(
                'Are you sure you want to checkout this room assignment?',
            )
        )
            return

        setCheckoutBusyId(assignmentId)
        try {
            await checkoutRoom({
                assignmentId,
                checkOutTime: new Date().toISOString(),
            })
            fetchAssignments()
            fetchRooms() // Refresh rooms to update availability
            if (selectedAssignment?._id === assignmentId) {
                setIsDrawerOpen(false)
                setSelectedAssignment(null)
            }
        } catch (error) {
            console.error('Error checking out room:', error)
        } finally {
            setCheckoutBusyId(null)
        }
    }

    // Get available occupants based on type
    const getAvailableOccupants = () => {
        if (assignFormData.occupantType === 'Employee') {
            return employees
                .filter((emp) => emp.employeeType !== 'Visitor')
                .map((emp) => ({
                    value: emp._id || '',
                    label: `${emp.firstName} ${emp.lastName}${
                        emp.department ? ` - ${emp.department}` : ''
                    }`,
                }))
        } else {
            return employees
                .filter((emp) => emp.employeeType === 'Visitor')
                .map((emp) => ({
                    value: emp._id || '',
                    label: `${emp.firstName} ${emp.lastName}${
                        emp.department ? ` - ${emp.department}` : ''
                    }`,
                }))
        }
    }

    // Get available rooms (not currently assigned)
    const getAvailableRooms = () => {
        const assignedRoomIds = assignments
            .filter((a) => a.status === 'active')
            .map((a) =>
                typeof a.roomId === 'object'
                    ? a.roomId._id
                    : a.roomId,
            )
            .filter(Boolean)

        return rooms
            .filter((room) => {
                const roomId = room._id || room.id
                return !assignedRoomIds.includes(roomId) && room.isAvailable !== false
            })
            .map((room) => ({
                value: room._id || room.id || '',
                label: `${room.roomNumber} (${room.type}) - Camp: ${
                    typeof room.camp === 'object' && room.camp
                        ? room.camp.name
                        : 'N/A'
                }`,
            }))
    }

    const handleFilterChange = (name: string, value: string) => {
        setFilters((prev) => ({ ...prev, [name]: value }))
        setPageIndex(0)
    }

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Statistic
                    title="Total Assignments"
                    value={stats.totalAssignments}
                    icon={<HiOutlineUsers className="text-2xl" />}
                    color="indigo"
                />
                <Statistic
                    title="Active Assignments"
                    value={stats.activeAssignments}
                    icon={<HiOutlineCheckCircle className="text-2xl" />}
                    color="emerald"
                />
                <Statistic
                    title="Completed"
                    value={stats.completedAssignments}
                    icon={<HiOutlineClock className="text-2xl" />}
                    color="gray"
                />
                <Statistic
                    title="Available Rooms"
                    value={stats.availableRooms}
                    icon={<HiOutlineHome className="text-2xl" />}
                    color="blue"
                />
            </div>

            {/* Header and Actions */}
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Room Assignments
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400">
                            Manage room assignments to employees and visitors
                        </p>
                    </div>
                    <Button
                        variant="solid"
                        icon={<HiOutlineUserAdd />}
                        onClick={() => {
                            setAssignFormData({
                                roomId: '',
                                occupantId: '',
                                occupantType: 'Employee',
                                startDate: new Date().toISOString().split('T')[0],
                                expectedCheckoutDate: '',
                            })
                            setAssignErrors({})
                            setIsAssignModalOpen(true)
                        }}
                    >
                        Assign Room
                    </Button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700 px-4">
                    <div className="flex space-x-4">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`py-3 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'all'
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            All Assignments
                        </button>
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`py-3 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'active'
                                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            className={`py-3 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'completed'
                                    ? 'border-gray-500 text-gray-600 dark:text-gray-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            Completed
                        </button>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="p-4 space-y-4 border-b border-gray-200 dark:border-gray-700">
                    {/* Search */}
                    <div>
                        <Input
                            placeholder="Search by room number, occupant name, or email..."
                            prefix={<HiOutlineSearch className="text-lg" />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Room
                            </label>
                            <Select
                                value={
                                    filters.roomId
                                        ? {
                                              value: filters.roomId,
                                              label:
                                                  rooms.find(
                                                      (r) =>
                                                          (r._id || r.id) ===
                                                          filters.roomId,
                                                  )?.roomNumber || 'Unknown',
                                          }
                                        : null
                                }
                                onChange={(selected) =>
                                    handleFilterChange(
                                        'roomId',
                                        selected?.value || '',
                                    )
                                }
                                options={[
                                    { value: '', label: 'All Rooms' },
                                    ...rooms.map((r) => ({
                                        value: r._id || r.id || '',
                                        label: r.roomNumber,
                                    })),
                                ]}
                                placeholder="All Rooms"
                                classNamePrefix="react-select"
                                isClearable
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Occupant
                            </label>
                            <Select
                                value={
                                    filters.occupantId
                                        ? {
                                              value: filters.occupantId,
                                              label:
                                                  employees
                                                      .find(
                                                          (e) =>
                                                              e._id ===
                                                              filters.occupantId,
                                                      )
                                                      ?.firstName +
                                                      ' ' +
                                                      employees.find(
                                                          (e) =>
                                                              e._id ===
                                                              filters.occupantId,
                                                      )?.lastName || 'Unknown',
                                          }
                                        : null
                                }
                                onChange={(selected) =>
                                    handleFilterChange(
                                        'occupantId',
                                        selected?.value || '',
                                    )
                                }
                                options={[
                                    { value: '', label: 'All Occupants' },
                                    ...employees.map((e) => ({
                                        value: e._id || '',
                                        label: `${e.firstName} ${e.lastName}`,
                                    })),
                                ]}
                                placeholder="All Occupants"
                                classNamePrefix="react-select"
                                isClearable
                            />
                        </div>
                    </div>

                    {/* Clear Filters */}
                    {(filters.roomId || filters.occupantId) && (
                        <Button
                            size="sm"
                            variant="plain"
                            icon={<HiOutlineX />}
                            onClick={() =>
                                setFilters({
                                    roomId: '',
                                    occupantId: '',
                                    status: undefined,
                                    page: 1,
                                    limit: 10,
                                })
                            }
                        >
                            Clear Filters
                        </Button>
                    )}
                </div>

                {/* Table */}
                <div className="p-4">
                    <DataTable
                        columns={columns}
                        data={filteredAssignments}
                        loading={loading}
                        pagingData={{
                            total: pagination.total || filteredAssignments.length,
                            pageIndex,
                            pageSize,
                        }}
                        onPaginationChange={(page) => setPageIndex(page)}
                        onSelectChange={(size) => {
                            setPageSize(size)
                            setPageIndex(0)
                        }}
                    />
                </div>
            </Card>

            {/* Assign Room Modal */}
            <Dialog
                isOpen={isAssignModalOpen}
                onClose={() => {
                    setIsAssignModalOpen(false)
                    setAssignFormData({
                        roomId: '',
                        occupantId: '',
                        occupantType: 'Employee',
                        startDate: new Date().toISOString().split('T')[0],
                        expectedCheckoutDate: '',
                    })
                    setAssignErrors({})
                }}
                width={700}
                style={{
                    content: {
                        maxHeight: '90vh',
                        height: 'auto',
                    },
                }}
            >
                <div className="flex flex-col h-full max-h-[90vh]">
                    {/* Fixed Header */}
                    <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            Assign Room
                        </h3>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <FormContainer layout="vertical" size="sm">
                            <FormItem
                                label="Select Room"
                                required
                                invalid={!!assignErrors.roomId}
                                errorMessage={assignErrors.roomId}
                            >
                                <Select
                                    value={
                                        assignFormData.roomId
                                            ? getAvailableRooms().find(
                                                  (opt) =>
                                                      opt.value ===
                                                      assignFormData.roomId,
                                              ) || null
                                            : null
                                    }
                                    onChange={(selected) =>
                                        handleAssignInputChange(
                                            'roomId',
                                            selected?.value || '',
                                        )
                                    }
                                    options={getAvailableRooms()}
                                    placeholder="Select a room"
                                    classNamePrefix="react-select"
                                    isSearchable
                                    isClearable
                                />
                                {getAvailableRooms().length === 0 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        No available rooms
                                    </div>
                                )}
                            </FormItem>

                            <FormItem
                                label="Occupant Type"
                                required
                                invalid={!!assignErrors.occupantType}
                                errorMessage={assignErrors.occupantType}
                            >
                                <Select
                                    value={{
                                        value: assignFormData.occupantType,
                                        label: assignFormData.occupantType,
                                    }}
                                    onChange={(selected) =>
                                        handleAssignInputChange(
                                            'occupantType',
                                            selected?.value || 'Employee',
                                        )
                                    }
                                    options={[
                                        { value: 'Employee', label: 'Employee' },
                                        {
                                            value: 'Temporary Visitor',
                                            label: 'Temporary Visitor',
                                        },
                                    ]}
                                    classNamePrefix="react-select"
                                />
                            </FormItem>

                            <FormItem
                                label="Select Occupant"
                                required
                                invalid={!!assignErrors.occupantId}
                                errorMessage={assignErrors.occupantId}
                            >
                                <Select
                                    value={getAvailableOccupants().find(
                                        (opt) =>
                                            opt.value ===
                                            assignFormData.occupantId,
                                    )}
                                    onChange={(selected) =>
                                        handleAssignInputChange(
                                            'occupantId',
                                            selected?.value || '',
                                        )
                                    }
                                    options={getAvailableOccupants()}
                                    placeholder={`Select ${assignFormData.occupantType.toLowerCase()}`}
                                    classNamePrefix="react-select"
                                    isSearchable
                                    isClearable
                                />
                                {getAvailableOccupants().length === 0 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        No{' '}
                                        {assignFormData.occupantType === 'Employee'
                                            ? 'employees'
                                            : 'visitors'}{' '}
                                        available
                                    </div>
                                )}
                            </FormItem>

                            <div className="grid grid-cols-2 gap-4">
                                <FormItem
                                    label="Assignment Start Date"
                                    required
                                    invalid={!!assignErrors.startDate}
                                    errorMessage={assignErrors.startDate}
                                >
                                    <Input
                                        type="date"
                                        value={assignFormData.startDate}
                                        onChange={(e) =>
                                            handleAssignInputChange(
                                                'startDate',
                                                e.target.value,
                                            )
                                        }
                                        min={new Date()
                                            .toISOString()
                                            .split('T')[0]}
                                        className={
                                            assignErrors.startDate
                                                ? 'border-red-500'
                                                : ''
                                        }
                                    />
                                </FormItem>

                                <FormItem
                                    label="Expected Check-out Date"
                                    required
                                    invalid={
                                        !!assignErrors.expectedCheckoutDate
                                    }
                                    errorMessage={
                                        assignErrors.expectedCheckoutDate
                                    }
                                >
                                    <Input
                                        type="date"
                                        value={
                                            assignFormData.expectedCheckoutDate
                                        }
                                        onChange={(e) =>
                                            handleAssignInputChange(
                                                'expectedCheckoutDate',
                                                e.target.value,
                                            )
                                        }
                                        min={
                                            assignFormData.startDate ||
                                            new Date()
                                                .toISOString()
                                                .split('T')[0]
                                        }
                                        className={
                                            assignErrors.expectedCheckoutDate
                                                ? 'border-red-500'
                                                : ''
                                        }
                                    />
                                </FormItem>
                            </div>
                        </FormContainer>
                    </div>

                    {/* Fixed Footer with Buttons */}
                    <div className="flex-shrink-0 flex justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <Button
                            variant="plain"
                            onClick={() => {
                                setIsAssignModalOpen(false)
                                setAssignFormData({
                                    roomId: '',
                                    occupantId: '',
                                    occupantType: 'Employee',
                                    startDate: new Date()
                                        .toISOString()
                                        .split('T')[0],
                                    expectedCheckoutDate: '',
                                })
                                setAssignErrors({})
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="solid"
                            onClick={handleAssignRoom}
                            loading={assignSubmitting}
                            disabled={
                                assignSubmitting ||
                                getAvailableOccupants().length === 0 ||
                                getAvailableRooms().length === 0
                            }
                        >
                            Assign Room
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Assignment Detail Drawer */}
            {selectedAssignment && (
                <Drawer
                    isOpen={isDrawerOpen}
                    onClose={() => {
                        setIsDrawerOpen(false)
                        setSelectedAssignment(null)
                    }}
                    title="Assignment Details"
                    width={700}
                >
                    <div className="p-6 space-y-6">
                        {/* Room Info */}
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                                Room Information
                            </h4>
                            {(() => {
                                const roomDetails =
                                    getRoomDetails(selectedAssignment)
                                return roomDetails ? (
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                                        <div>
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                Room Number:
                                            </span>
                                            <p className="text-sm text-gray-900 dark:text-gray-100">
                                                {roomDetails.roomNumber}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                Type:
                                            </span>
                                            <p className="text-sm text-gray-900 dark:text-gray-100 capitalize">
                                                {roomDetails.type}
                                            </p>
                                        </div>
                                        {roomDetails.capacity && (
                                            <div>
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    Capacity:
                                                </span>
                                                <p className="text-sm text-gray-900 dark:text-gray-100">
                                                    {roomDetails.capacity}{' '}
                                                    {roomDetails.capacity === 1
                                                        ? 'person'
                                                        : 'people'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Room information not available
                                    </p>
                                )
                            })()}
                        </div>

                        {/* Occupant Info */}
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                                Occupant Information
                            </h4>
                            {(() => {
                                const occupant = getOccupantDetails(
                                    selectedAssignment,
                                )
                                return occupant ? (
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                                        <div>
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                Name:
                                            </span>
                                            <p className="text-sm text-gray-900 dark:text-gray-100">
                                                {occupant.firstName}{' '}
                                                {occupant.lastName}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                Email:
                                            </span>
                                            <p className="text-sm text-gray-900 dark:text-gray-100">
                                                {occupant.email}
                                            </p>
                                        </div>
                                        {occupant.phone && (
                                            <div>
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    Phone:
                                                </span>
                                                <p className="text-sm text-gray-900 dark:text-gray-100">
                                                    {occupant.phone}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {selectedAssignment.occupantType}
                                    </p>
                                )
                            })()}
                        </div>

                        {/* Assignment Dates */}
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                                Assignment Dates
                            </h4>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Check-in:
                                    </span>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">
                                        {new Date(
                                            selectedAssignment.startDate,
                                        ).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Expected Check-out:
                                    </span>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">
                                        {new Date(
                                            selectedAssignment.expectedCheckoutDate,
                                        ).toLocaleDateString()}
                                    </p>
                                </div>
                                {selectedAssignment.checkOutTime && (
                                    <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            Actual Check-out:
                                        </span>
                                        <p className="text-sm text-gray-900 dark:text-gray-100">
                                            {new Date(
                                                selectedAssignment.checkOutTime,
                                            ).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                                Status
                            </h4>
                            <Badge
                                className={
                                    selectedAssignment.status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : selectedAssignment.status ===
                                            'completed'
                                          ? 'bg-gray-100 text-gray-800'
                                          : 'bg-red-100 text-red-800'
                                }
                            >
                                {selectedAssignment.status
                                    .charAt(0)
                                    .toUpperCase() +
                                    selectedAssignment.status.slice(1)}
                            </Badge>
                        </div>

                        {/* Actions */}
                        {selectedAssignment.status === 'active' && (
                            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                                <Button
                                    variant="solid"
                                    color="green-600"
                                    icon={<HiOutlineLogout />}
                                    onClick={() => {
                                        handleCheckout(selectedAssignment._id!)
                                    }}
                                    className="w-full"
                                >
                                    Checkout Room
                                </Button>
                            </div>
                        )}
                    </div>
                </Drawer>
            )}
        </div>
    )
}

export default RoomAssignments


