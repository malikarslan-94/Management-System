import EmployeeForm from '@/components/admin-dashboard/EmployeeForm'
import DataTable from '@/components/shared/DataTable'
import Statistic from '@/components/shared/Statistic/Statistic'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import Drawer from '@/components/ui/Drawer'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/select'
import { useCamps } from '@/hooks/useCamps'
import { useEmployees } from '@/hooks/useEmployees'
import { useRooms } from '@/hooks/useRooms'
import type { Employee } from '@/services/EmployeeService'
import { ColumnDef } from '@tanstack/react-table'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    HiOutlineCalendar,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineEye,
    HiOutlineHome,
    HiOutlinePencil,
    HiOutlineSearch,
    HiOutlineTrash,
    HiOutlineUserAdd,
    HiOutlineUsers,
    HiOutlineX,
} from 'react-icons/hi'

type TabType = 'all' | 'visitors'

const EmployeeManagement = () => {
    const [activeTab, setActiveTab] = useState<TabType>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [filters, setFilters] = useState({
        employeeType: '' as '' | 'Permanent' | 'Temporary' | 'Visitor',
        campId: '',
        department: '',
        status: '' as '' | 'Active' | 'Inactive',
    })
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
        null,
    )
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState<any>({})
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [pageIndex, setPageIndex] = useState(0)
    const [pageSize, setPageSize] = useState(10)

    // Memoize the employee filters to prevent unnecessary re-renders
    const employeeFilters = useMemo(() => ({
        employeeType: activeTab === 'visitors' ? 'Visitor' : filters.employeeType || undefined,
        campId: filters.campId || undefined,
        department: filters.department || undefined,
        status: filters.status || undefined,
        page: pageIndex + 1,
        limit: pageSize,
    }), [
        activeTab, 
        filters.employeeType, 
        filters.campId, 
        filters.department, 
        filters.status, 
        pageIndex, 
        pageSize
    ])

    const {
        employees = [],
        loading,
        pagination,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        fetchEmployees,
    } = useEmployees(employeeFilters)

    const { camps, fetchCamps } = useCamps()
    const { rooms, fetchRooms } = useRooms()

    // Initial data fetch
    useEffect(() => {
        fetchCamps()
        fetchRooms()
        fetchEmployees()
    }, [fetchCamps, fetchRooms, fetchEmployees])

    // State for stats data - fetch separately
    const [statsData, setStatsData] = useState({
        totalEmployees: 0,
        visitorsToday: 0,
        assignedRooms: 0,
        inactiveEmployees: 0,
    })

    // Fetch stats separately
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { employeeApi } = await import('@/services/api')
                // Fetch all employees for stats (no filters, limit to reasonable number)
                const response = await employeeApi.getAll({
                    page: 1,
                    limit: 1000,
                })
                const allEmployees = response?.data?.data || []

                const visitors = allEmployees.filter(
                    (e: Employee) => e.employeeType === 'Visitor',
                )
                const assignedRooms = allEmployees.filter(
                    (e: Employee) => e.currentRoomId,
                ).length
                const inactiveEmployees = allEmployees.filter(
                    (e: Employee) => e.status === 'Inactive',
                ).length

                // Visitors today
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const visitorsToday = visitors.filter((visitor: Employee) => {
                    if (visitor.status !== 'Active') return false
                    const visitorDate = visitor.createdAt
                        ? new Date(visitor.createdAt)
                        : null
                    if (!visitorDate) return false
                    visitorDate.setHours(0, 0, 0, 0)
                    return visitorDate.getTime() === today.getTime()
                }).length

                setStatsData({
                    totalEmployees: allEmployees.length,
                    visitorsToday,
                    assignedRooms,
                    inactiveEmployees,
                })
            } catch (err) {
                console.error('Error fetching stats:', err)
            }
        }
        fetchStats()
        // Refresh stats periodically or when employees change
        const interval = setInterval(fetchStats, 30000) // Every 30 seconds
        return () => clearInterval(interval)
    }, [employees]) // Re-fetch when employees list changes

    const stats = statsData

    // Update filters when tab changes
    useEffect(() => {
        if (activeTab === 'visitors') {
            setFilters((prev) => ({ ...prev, employeeType: 'Visitor' }))
        } else {
            setFilters((prev) => ({ ...prev, employeeType: '' }))
        }
        // Reset to first page when filters change
        setPageIndex(0)
    }, [activeTab])

    // Filter and search employees - Note: Most filtering is done server-side via API
    const filteredEmployees = useMemo(() => {
        let result = [...(employees || [])]

        // Apply search query (client-side since API doesn't have search param yet)
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            result = result.filter(
                (emp) =>
                    emp.firstName?.toLowerCase().includes(query) ||
                    emp.lastName?.toLowerCase().includes(query) ||
                    emp.email?.toLowerCase().includes(query) ||
                    emp.phone?.toLowerCase().includes(query),
            )
        }

        return result
    }, [employees, searchQuery])

    // Table columns
    const columns = useMemo<ColumnDef<Employee>[]>(
        () => [
            {
                header: 'Name',
                accessorKey: 'name',
                cell: ({ row }) => {
                    const emp = row.original
                    return (
                        <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mr-3">
                                <span className="text-blue-600 dark:text-blue-300 font-medium text-sm">
                                    {emp.firstName?.charAt(0).toUpperCase() ||
                                        'E'}
                                    {emp.lastName?.charAt(0).toUpperCase() ||
                                        ''}
                                </span>
                            </div>
                            <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {emp.firstName} {emp.lastName}
                                </div>
                                {emp.designation && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {emp.designation}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                },
            },
            {
                header: 'Type',
                accessorKey: 'employeeType',
                cell: ({ row }) => {
                    const type = row.original.employeeType || 'Permanent'
                    const colorMap = {
                        Permanent:
                            'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
                        Temporary:
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300',
                        Visitor:
                            'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300',
                    }
                    return (
                        <Badge className={colorMap[type] || colorMap.Permanent}>
                            {type}
                        </Badge>
                    )
                },
            },
            {
                header: 'Department',
                accessorKey: 'department',
                cell: ({ row }) => (
                    <span className="text-gray-900 dark:text-gray-100">
                        {row.original.department || '-'}
                    </span>
                ),
            },
            {
                header: 'Designation',
                accessorKey: 'designation',
                cell: ({ row }) => (
                    <span className="text-gray-900 dark:text-gray-100">
                        {row.original.designation || '-'}
                    </span>
                ),
            },
            {
                header: 'Camp',
                accessorKey: 'campId',
                cell: ({ row }) => {
                    const emp = row.original
                    const campName =
                        typeof emp.campId === 'object' && emp.campId
                            ? emp.campId.name
                            : emp.campId_details?.name ||
                              (typeof emp.campId === 'string'
                                  ? emp.campId
                                  : '-')
                    return (
                        <span className="text-gray-900 dark:text-gray-100">
                            {campName}
                        </span>
                    )
                },
            },
            {
                header: 'Room',
                accessorKey: 'currentRoomId',
                cell: ({ row }) => {
                    const emp = row.original
                    const roomNumber =
                        typeof emp.currentRoomId === 'object' &&
                        emp.currentRoomId
                            ? emp.currentRoomId.roomNumber
                            : emp.currentRoomId_details?.roomNumber ||
                              (typeof emp.currentRoomId === 'string'
                                  ? emp.currentRoomId
                                  : '-')
                    return (
                        <span className="text-gray-900 dark:text-gray-100">
                            {roomNumber}
                        </span>
                    )
                },
            },
            {
                header: 'Status',
                accessorKey: 'status',
                cell: ({ row }) => {
                    const status = row.original.status || 'Inactive'
                    const colorMap = {
                        Active: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300',
                        Inactive:
                            'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300',
                    }
                    return (
                        <Badge
                            className={colorMap[status] || colorMap.Inactive}
                        >
                            {status}
                        </Badge>
                    )
                },
            },
            {
                header: 'Actions',
                accessorKey: 'actions',
                cell: ({ row }) => {
                    const emp = row.original
                    return (
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="plain"
                                icon={<HiOutlineEye />}
                                onClick={() => {
                                    setSelectedEmployee(emp)
                                    setIsDrawerOpen(true)
                                }}
                            />
                            <Button
                                size="sm"
                                variant="plain"
                                icon={<HiOutlinePencil />}
                                onClick={() => handleEdit(emp)}
                            />
                            <Button
                                size="sm"
                                variant="plain"
                                icon={<HiOutlineTrash />}
                                onClick={() => handleDelete(emp._id!)}
                                color="red-600"
                            />
                        </div>
                    )
                },
            },
        ],
        [],
    )

    const handleEdit = (employee: Employee) => {
        // Extract IDs from populated objects
        const campIdValue =
            typeof employee.campId === 'object' && employee.campId
                ? employee.campId._id || employee.campId
                : employee.campId || ''
        const currentRoomIdValue =
            typeof employee.currentRoomId === 'object' && employee.currentRoomId
                ? employee.currentRoomId._id || employee.currentRoomId
                : employee.currentRoomId || null

        setFormData({
            ...employee,
            campId: campIdValue,
            currentRoomId: currentRoomIdValue,
            id: employee._id,
        })
        setIsEditing(true)
        setIsModalOpen(true)
        setErrors({})
    }

    const handleAdd = () => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            department: '',
            designation: '',
            employeeType: 'Permanent',
            campId: '',
            currentRoomId: null,
            status: 'Active',
        })
        setIsEditing(false)
        setIsModalOpen(true)
        setErrors({})
    }

    const handleDelete = async (id: string) => {
        if (
            !window.confirm(
                'Are you sure you want to deactivate this employee? The employee will be marked as Inactive.',
            )
        )
            return

        try {
            await deleteEmployee(id)
        } catch (err) {
            console.error('Error deleting employee:', err)
        }
    }

    const validateField = useCallback(
        (name: string, value: any) => {
            const errs = { ...errors }
            switch (name) {
                case 'firstName':
                case 'lastName':
                case 'email':
                case 'phone':
                case 'employeeType':
                    if (!value?.toString().trim()) errs[name] = 'Required'
                    else if (
                        name === 'email' &&
                        value &&
                        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                    ) {
                        errs[name] = 'Invalid email format'
                    } else delete errs[name]
                    break
                default:
                    break
            }
            setErrors(errs)
            return Object.keys(errs).length === 0
        },
        [errors],
    )

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev: any) => ({ ...prev, [name]: value }))
        validateField(name, value)
    }

    const handleSelectChange = (name: string) => (e: any) => {
        const value = e?.target?.value ?? e
        setFormData((prev: any) => ({ ...prev, [name]: value }))
        validateField(name, value)
    }

    const validateForm = useCallback(() => {
        const fields = [
            'firstName',
            'lastName',
            'email',
            'phone',
            'employeeType',
        ]
        return fields.every((field) => validateField(field, formData[field]))
    }, [formData, validateField])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateForm()) {
            console.error('Validation failed', errors)
            return
        }

        try {
            // Extract ID from populated objects if they exist
            const campIdValue =
                typeof formData.campId === 'object' && formData.campId
                    ? formData.campId._id || formData.campId
                    : formData.campId?.toString().trim() || undefined
            const currentRoomIdValue =
                typeof formData.currentRoomId === 'object' &&
                formData.currentRoomId
                    ? formData.currentRoomId._id || formData.currentRoomId
                    : formData.currentRoomId?.toString().trim() || null

            const employeeData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                department: formData.department?.trim() || undefined,
                designation: formData.designation?.trim() || undefined,
                employeeType: formData.employeeType || 'Permanent',
                campId: campIdValue,
                currentRoomId: currentRoomIdValue,
                status: formData.status || 'Active',
            }

            // Remove undefined fields
            Object.keys(employeeData).forEach(
                (key) =>
                    (employeeData as any)[key] === undefined &&
                    delete (employeeData as any)[key],
            )

            if (isEditing) {
                await updateEmployee(formData._id || formData.id, employeeData)
            } else {
                await addEmployee(employeeData)
            }

            setIsModalOpen(false)
            setFormData({})
            setErrors({})
            fetchEmployees()
        } catch (error) {
            console.error('Error saving employee:', error)
        }
    }

    const getClass = (field: string) =>
        errors[field] ? 'border-red-500 focus:border-red-500' : ''

    const handleFilterChange = (name: string, value: string) => {
        setFilters((prev) => ({ ...prev, [name]: value }))
        setPageIndex(0) // Reset to first page on filter change
    }

    const handleEndVisit = async (employeeId: string) => {
        if (
            !window.confirm(
                'Are you sure you want to end this visit? The visitor will be marked as inactive.',
            )
        )
            return

        try {
            await updateEmployee(employeeId, {
                status: 'Inactive',
                currentRoomId: null,
            })
            fetchEmployees()
        } catch (error) {
            console.error('Error ending visit:', error)
        }
    }

    // Get unique departments for filter
    const departments = useMemo(() => {
        const depts = new Set<string>()
        employees?.forEach((emp) => {
            if (emp.department) depts.add(emp.department)
        })
        return Array.from(depts).sort()
    }, [employees])

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Statistic
                    title="Total Employees"
                    value={stats.totalEmployees}
                    icon={<HiOutlineUsers className="text-2xl" />}
                    color="indigo"
                />
                <Statistic
                    title="Visitors Today"
                    value={stats.visitorsToday}
                    icon={<HiOutlineCalendar className="text-2xl" />}
                    color="purple"
                />
                <Statistic
                    title="Assigned Rooms"
                    value={stats.assignedRooms}
                    icon={<HiOutlineHome className="text-2xl" />}
                    color="emerald"
                />
                <Statistic
                    title="Inactive Employees"
                    value={stats.inactiveEmployees}
                    icon={<HiOutlineClock className="text-2xl" />}
                    color="red"
                />
            </div>

            {/* Header and Actions */}
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Employee & Visitor Management
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400">
                            Manage employees and visitors across all camps
                        </p>
                    </div>
                    <Button
                        variant="solid"
                        icon={<HiOutlineUserAdd />}
                        onClick={handleAdd}
                    >
                        Add Employee
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
                            All Employees
                        </button>
                        <button
                            onClick={() => setActiveTab('visitors')}
                            className={`py-3 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'visitors'
                                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            Visitors
                        </button>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="p-4 space-y-4 border-b border-gray-200 dark:border-gray-700">
                    {/* Search */}
                    <div>
                        <Input
                            placeholder="Search by name, email, or phone..."
                            prefix={<HiOutlineSearch className="text-lg" />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Employee Type
                            </label>
                            <Select
                                value={
                                    filters.employeeType
                                        ? {
                                              value: filters.employeeType,
                                              label: filters.employeeType,
                                          }
                                        : null
                                }
                                onChange={(selected) =>
                                    handleFilterChange(
                                        'employeeType',
                                        selected?.value || '',
                                    )
                                }
                                options={[
                                    { value: '', label: 'All Types' },
                                    { value: 'Permanent', label: 'Permanent' },
                                    { value: 'Temporary', label: 'Temporary' },
                                    { value: 'Visitor', label: 'Visitor' },
                                ]}
                                placeholder="All Types"
                                classNamePrefix="react-select"
                                isClearable
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Camp
                            </label>
                            <Select
                                value={
                                    filters.campId
                                        ? camps
                                              .map((c) => ({
                                                  value: c._id,
                                                  label: c.name,
                                              }))
                                              .find(
                                                  (opt) =>
                                                      opt.value ===
                                                      filters.campId,
                                              ) || null
                                        : null
                                }
                                onChange={(selected) =>
                                    handleFilterChange(
                                        'campId',
                                        selected?.value || '',
                                    )
                                }
                                options={[
                                    { value: '', label: 'All Camps' },
                                    ...camps.map((c) => ({
                                        value: c._id,
                                        label: c.name,
                                    })),
                                ]}
                                placeholder="All Camps"
                                classNamePrefix="react-select"
                                isClearable
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Department
                            </label>
                            <Select
                                value={
                                    filters.department
                                        ? {
                                              value: filters.department,
                                              label: filters.department,
                                          }
                                        : null
                                }
                                onChange={(selected) =>
                                    handleFilterChange(
                                        'department',
                                        selected?.value || '',
                                    )
                                }
                                options={[
                                    { value: '', label: 'All Departments' },
                                    ...departments.map((dept) => ({
                                        value: dept,
                                        label: dept,
                                    })),
                                ]}
                                placeholder="All Departments"
                                classNamePrefix="react-select"
                                isClearable
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Status
                            </label>
                            <Select
                                value={
                                    filters.status
                                        ? {
                                              value: filters.status,
                                              label: filters.status,
                                          }
                                        : null
                                }
                                onChange={(selected) =>
                                    handleFilterChange(
                                        'status',
                                        selected?.value || '',
                                    )
                                }
                                options={[
                                    { value: '', label: 'All Status' },
                                    { value: 'Active', label: 'Active' },
                                    { value: 'Inactive', label: 'Inactive' },
                                ]}
                                placeholder="All Status"
                                classNamePrefix="react-select"
                                isClearable
                            />
                        </div>
                    </div>

                    {/* Clear Filters */}
                    {(filters.employeeType ||
                        filters.campId ||
                        filters.department ||
                        filters.status) && (
                        <Button
                            size="sm"
                            variant="plain"
                            icon={<HiOutlineX />}
                            onClick={() =>
                                setFilters({
                                    employeeType: '',
                                    campId: '',
                                    department: '',
                                    status: '',
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
                        data={filteredEmployees}
                        loading={loading}
                        pagingData={{
                            total: pagination.total || filteredEmployees.length,
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

            {/* Add/Edit Modal */}
            <Dialog
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setFormData({})
                    setErrors({})
                }}
                width={800}
            >
                <div className="p-6">
                    <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                        {isEditing ? 'Edit Employee' : 'Add New Employee'}
                    </h3>
                    <EmployeeForm
                        formData={formData}
                        errors={errors}
                        camps={camps}
                        rooms={rooms}
                        handleInputChange={handleInputChange}
                        handleSelectChange={handleSelectChange}
                        validateField={validateField}
                        getClass={getClass}
                    />
                    <div className="flex justify-end gap-2 mt-6">
                        <Button
                            variant="plain"
                            onClick={() => {
                                setIsModalOpen(false)
                                setFormData({})
                                setErrors({})
                            }}
                        >
                            Cancel
                        </Button>
                        <Button variant="solid" onClick={handleSubmit}>
                            {isEditing ? 'Update' : 'Create'} Employee
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Employee Detail Drawer */}
            {selectedEmployee && (
                <Drawer
                    isOpen={isDrawerOpen}
                    onClose={() => {
                        setIsDrawerOpen(false)
                        setSelectedEmployee(null)
                    }}
                    title={
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {selectedEmployee.firstName}{' '}
                                {selectedEmployee.lastName}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {selectedEmployee.designation || 'Employee'}
                            </p>
                        </div>
                    }
                    width={700}
                >
                    <div className="p-6 space-y-6">
                        {/* Employee Info */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <div className="flex items-center mb-4">
                                    <div className="flex-shrink-0 h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mr-4">
                                        <span className="text-blue-600 dark:text-blue-300 font-bold text-xl">
                                            {selectedEmployee.firstName
                                                ?.charAt(0)
                                                .toUpperCase() || 'E'}
                                            {selectedEmployee.lastName
                                                ?.charAt(0)
                                                .toUpperCase() || ''}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            Email:
                                        </span>
                                        <p className="text-sm text-gray-900 dark:text-gray-100">
                                            {selectedEmployee.email}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            Phone:
                                        </span>
                                        <p className="text-sm text-gray-900 dark:text-gray-100">
                                            {selectedEmployee.phone}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            Department:
                                        </span>
                                        <p className="text-sm text-gray-900 dark:text-gray-100">
                                            {selectedEmployee.department ||
                                                'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="space-y-4">
                                    <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-2">
                                            Employee Type:
                                        </span>
                                        <Badge
                                            className={
                                                selectedEmployee.employeeType ===
                                                'Permanent'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : selectedEmployee.employeeType ===
                                                        'Temporary'
                                                      ? 'bg-yellow-100 text-yellow-800'
                                                      : 'bg-purple-100 text-purple-800'
                                            }
                                        >
                                            {selectedEmployee.employeeType ||
                                                'Permanent'}
                                        </Badge>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-2">
                                            Status:
                                        </span>
                                        <Badge
                                            className={
                                                selectedEmployee.status ===
                                                'Active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }
                                        >
                                            {selectedEmployee.status ||
                                                'Inactive'}
                                        </Badge>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            Camp:
                                        </span>
                                        <p className="text-sm text-gray-900 dark:text-gray-100">
                                            {typeof selectedEmployee.campId ===
                                                'object' &&
                                            selectedEmployee.campId
                                                ? selectedEmployee.campId.name
                                                : selectedEmployee
                                                      .campId_details?.name ||
                                                  (typeof selectedEmployee.campId ===
                                                  'string'
                                                      ? selectedEmployee.campId
                                                      : 'Not assigned')}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            Current Room:
                                        </span>
                                        <p className="text-sm text-gray-900 dark:text-gray-100">
                                            {typeof selectedEmployee.currentRoomId ===
                                                'object' &&
                                            selectedEmployee.currentRoomId
                                                ? selectedEmployee.currentRoomId
                                                      .roomNumber
                                                : selectedEmployee
                                                      .currentRoomId_details
                                                      ?.roomNumber ||
                                                  (typeof selectedEmployee.currentRoomId ===
                                                  'string'
                                                      ? selectedEmployee.currentRoomId
                                                      : 'Not assigned')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Room Assignment History */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                Room Assignment History
                            </h3>
                            {!selectedEmployee.roomAssignmentHistory ||
                            selectedEmployee.roomAssignmentHistory.length ===
                                0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No room assignment history available.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {selectedEmployee.roomAssignmentHistory.map(
                                        (assignment: any, index: number) => {
                                            const isActive = !assignment.endDate
                                            const roomInfo =
                                                assignment.roomId_details ||
                                                assignment.roomId

                                            return (
                                                <div
                                                    key={
                                                        assignment._id || index
                                                    }
                                                    className={`p-3 rounded-lg border ${
                                                        isActive
                                                            ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
                                                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                                {typeof roomInfo ===
                                                                'object'
                                                                    ? roomInfo?.roomNumber ||
                                                                      'N/A'
                                                                    : roomInfo ||
                                                                      'N/A'}
                                                            </p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                {new Date(
                                                                    assignment.startDate,
                                                                ).toLocaleDateString()}{' '}
                                                                -{' '}
                                                                {assignment.endDate
                                                                    ? new Date(
                                                                          assignment.endDate,
                                                                      ).toLocaleDateString()
                                                                    : 'Current'}
                                                            </p>
                                                        </div>
                                                        <Badge
                                                            className={
                                                                isActive
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-gray-100 text-gray-800'
                                                            }
                                                        >
                                                            {isActive
                                                                ? 'Active'
                                                                : 'Completed'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )
                                        },
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Visitor-specific actions */}
                        {selectedEmployee.employeeType === 'Visitor' &&
                            selectedEmployee.status === 'Active' && (
                                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <Button
                                        variant="solid"
                                        color="red-600"
                                        icon={<HiOutlineCheckCircle />}
                                        onClick={() => {
                                            handleEndVisit(
                                                selectedEmployee._id!,
                                            )
                                            setIsDrawerOpen(false)
                                            setSelectedEmployee(null)
                                        }}
                                        className="w-full"
                                    >
                                        End Visit
                                    </Button>
                                </div>
                            )}
                    </div>
                </Drawer>
            )}
        </div>
    )
}

export default EmployeeManagement
