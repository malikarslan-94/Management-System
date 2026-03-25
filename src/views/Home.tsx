import { AdaptableCard, Chart } from '@/components/shared'
import { Avatar, Badge, Button, Spinner } from '@/components/ui'
import { useCamps } from '@/hooks/useCamps'
import { useEmployees } from '@/hooks/useEmployees'
import { useRoomAssignments } from '@/hooks/useRoomAssignments'
import { useRooms } from '@/hooks/useRooms'
import { getRooms } from '@/services/RoomService'
import type { RoomAssignment } from '@/services/RoomAssignmentService'
import {
    readStoredMaintenanceRequests,
    summarizeRequestStats,
} from '@/utils/maintenanceRequestStorage'
import { type ComponentType, useEffect, useMemo, useState } from 'react'
import {
    HiOutlineClipboardList,
    HiOutlineCog,
    HiOutlineExclamationCircle,
    HiOutlineFire,
    HiOutlineHome,
    HiOutlineOfficeBuilding,
    HiOutlinePlus,
    HiOutlineUserAdd,
    HiOutlineUsers,
} from 'react-icons/hi'
import { Link, useNavigate } from 'react-router-dom'

function formatRelativeTime(iso: string | undefined): string {
    if (!iso) return '—'
    const then = new Date(iso).getTime()
    const now = Date.now()
    const diffMs = Math.max(0, now - then)
    const mins = Math.floor(diffMs / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`
    if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`
    if (mins > 0) return `${mins} min ago`
    return 'Just now'
}

function getRoomLabel(a: RoomAssignment): string {
    const r = a.roomId
    if (r && typeof r === 'object' && 'roomNumber' in r) {
        return r.roomNumber || '—'
    }
    return '—'
}

function getOccupantName(a: RoomAssignment): string {
    const d = a.occupantDetails
    if (d?.firstName || d?.lastName) {
        return [d.firstName, d.lastName].filter(Boolean).join(' ') || 'Occupant'
    }
    return a.occupantType === 'Temporary Visitor'
        ? 'Visitor'
        : 'Employee'
}

const Home = () => {
    const navigate = useNavigate()

    const employeeFilters = useMemo(
        () => ({ page: 1, limit: 1 }),
        [],
    )
    const assignmentFilters = useMemo(
        () => ({ page: 1, limit: 10 }),
        [],
    )

    const { camps, loading: campsLoading, error: campsError } = useCamps()
    const { rooms, loading: roomsLoading, error: roomsError } = useRooms()
    const {
        pagination: employeePagination,
        loading: employeesLoading,
        error: employeesError,
    } = useEmployees(employeeFilters)
    const {
        assignments,
        loading: assignmentsLoading,
        error: assignmentsError,
    } = useRoomAssignments(assignmentFilters)

    const [roomsInMaintenance, setRoomsInMaintenance] = useState(0)
    const [maintStatsVersion, setMaintStatsVersion] = useState(0)

    useEffect(() => {
        let cancelled = false
        getRooms().then((list) => {
            if (cancelled) return
            setRoomsInMaintenance(
                list.filter((r) => r.status === 'maintenance').length,
            )
        })
        return () => {
            cancelled = true
        }
    }, [rooms])

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === 'campwise_maintenance_requests_v1') {
                setMaintStatsVersion((v) => v + 1)
            }
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
    }, [])

    const maintenanceRequestStats = useMemo(() => {
        void maintStatsVersion
        return summarizeRequestStats(readStoredMaintenanceRequests())
    }, [maintStatsVersion])

    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (
            campsLoading ||
            roomsLoading ||
            employeesLoading ||
            assignmentsLoading
        ) {
            setIsLoading(true)
        } else {
            setIsLoading(false)
            setError(
                campsError ||
                    roomsError ||
                    employeesError ||
                    assignmentsError ||
                    null,
            )
        }
    }, [
        campsLoading,
        roomsLoading,
        employeesLoading,
        assignmentsLoading,
        campsError,
        roomsError,
        employeesError,
        assignmentsError,
    ])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 text-red-500">Error loading data: {error}</div>
        )
    }

    const campsArray = Array.isArray(camps) ? camps : []
    const roomsArray = Array.isArray(rooms) ? rooms : []

    const totalRoomsFromCamps = campsArray.reduce(
        (sum, camp) => sum + (camp.totalRooms || 0),
        0,
    )
    const occupiedRoomsFromCamps = campsArray.reduce(
        (sum, camp) => sum + (camp.occupiedRooms || 0),
        0,
    )

    const occupiedFromDocuments = roomsArray.filter(
        (r) => r.isAvailable === false,
    ).length
    const totalRoomsDocuments = roomsArray.length

    const occupancyRate =
        totalRoomsDocuments > 0
            ? Math.round((occupiedFromDocuments / totalRoomsDocuments) * 100)
            : totalRoomsFromCamps > 0
              ? Math.round(
                    (occupiedRoomsFromCamps / totalRoomsFromCamps) * 100,
                )
              : 0

    const stats = {
        totalCamps: campsArray.length,
        totalRooms:
            totalRoomsDocuments > 0 ? totalRoomsDocuments : totalRoomsFromCamps,
        totalEmployees: employeePagination?.total ?? 0,
        occupancyRate,
        roomsUnderRepair: roomsInMaintenance,
        maintenanceRequestsTotal: maintenanceRequestStats.total,
        urgentMaintenanceRequests: maintenanceRequestStats.urgent,
    }

    const occupancyData = {
        series: [stats.occupancyRate, 100 - stats.occupancyRate],
        options: {
            chart: { type: 'donut' as const },
            labels: ['Occupied', 'Available'],
            colors: ['#10B981', '#E5E7EB'],
            legend: { position: 'bottom' as const },
        },
    }

    const now = new Date()
    const twoDaysFromNow = new Date(now)
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)

    const upcomingCheckouts = (Array.isArray(assignments) ? assignments : [])
        .filter((a) => a.status === 'active' && a.expectedCheckoutDate)
        .filter((a) => {
            const end = new Date(a.expectedCheckoutDate)
            return end >= now && end <= twoDaysFromNow
        })
        .slice(0, 6)
        .map((a, idx) => {
            const roomNum = getRoomLabel(a)
            const name = getOccupantName(a)
            const initials = name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
            return {
                id: a._id || `co-${idx}`,
                name,
                room: roomNum,
                date: new Date(a.expectedCheckoutDate).toLocaleDateString(),
                avatar: initials || 'OC',
            }
        })

    const recentAssignments = (Array.isArray(assignments) ? assignments : [])
        .slice(0, 6)
        .map((a) => ({
            id: a._id || a.startDate,
            employee: getOccupantName(a),
            task:
                a.status === 'active'
                    ? 'Room assignment'
                    : `Assignment (${a.status})`,
            room: getRoomLabel(a),
            camp:
                typeof a.roomId === 'object' &&
                a.roomId &&
                'camp' in a.roomId &&
                a.roomId.camp &&
                typeof a.roomId.camp === 'object' &&
                'name' in a.roomId.camp
                    ? (a.roomId.camp as { name?: string }).name
                    : undefined,
            time: formatRelativeTime(a.createdAt || a.startDate),
        }))

    const StatCard = ({
        title,
        value,
        icon: Icon,
        color = 'text-blue-600',
    }: {
        title: string
        value: string | number
        icon: ComponentType<{ className?: string }>
        color?: string
    }) => (
        <AdaptableCard className="h-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-6">
            <div className="flex items-center space-x-4">
                <div className="p-3 rounded-full bg-white dark:bg-gray-700 shadow-sm">
                    <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {value}
                    </p>
                </div>
            </div>
        </AdaptableCard>
    )

    const QuickActionCard = ({
        title,
        icon: Icon,
        onClick,
        color = 'bg-blue-600',
    }: {
        title: string
        icon: ComponentType<{ className?: string }>
        onClick: () => void
        color?: string
    }) => (
        <Button
            className={`${color} hover:opacity-90 h-20 flex flex-col items-center justify-center space-y-2`}
            onClick={onClick}
        >
            <Icon className="w-6 h-6" />
            <span className="text-sm font-medium">{title}</span>
        </Button>
    )

    return (
        <div className="pb-6 px-6 space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    CampWise Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Welcome back! Here&apos;s what&apos;s happening at your camps
                    today.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                    title="Total Camps"
                    value={stats.totalCamps}
                    icon={HiOutlineHome}
                    color="text-blue-600"
                />
                <StatCard
                    title="Total Rooms"
                    value={stats.totalRooms}
                    icon={HiOutlineOfficeBuilding}
                    color="text-green-600"
                />
                <StatCard
                    title="Total Employees"
                    value={stats.totalEmployees}
                    icon={HiOutlineUsers}
                    color="text-purple-600"
                />
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Quick Actions
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Common tasks and shortcuts for efficient camp management
                    </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <QuickActionCard
                        title="Assign Room"
                        icon={HiOutlineHome}
                        onClick={() => navigate('/rooms?action=assign')}
                        color="bg-blue-600"
                    />
                    <QuickActionCard
                        title="Add Employee"
                        icon={HiOutlineUserAdd}
                        onClick={() => navigate('/employees?action=add')}
                        color="bg-green-600"
                    />
                    <QuickActionCard
                        title="Add Visitor"
                        icon={HiOutlinePlus}
                        onClick={() =>
                            navigate('/employees?action=add&type=visitor')
                        }
                        color="bg-purple-600"
                    />
                    <QuickActionCard
                        title="Locations & camps"
                        icon={HiOutlineOfficeBuilding}
                        onClick={() => navigate('/locations-camps')}
                        color="bg-cyan-600"
                    />
                    <QuickActionCard
                        title="Add camp"
                        icon={HiOutlinePlus}
                        onClick={() =>
                            navigate('/locations-camps?action=add-camp')
                        }
                        color="bg-teal-600"
                    />
                    <QuickActionCard
                        title="Maintenance"
                        icon={HiOutlineFire}
                        onClick={() =>
                            navigate('/inventory-maintenance?tab=repair')
                        }
                        color="bg-orange-600"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <AdaptableCard className="h-full border border-gray-200 dark:border-gray-700">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Current Occupancy Rate
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {totalRoomsDocuments > 0
                                    ? 'Based on room records'
                                    : 'Based on camp totals'}
                            </p>
                        </div>
                        <div className="flex items-center justify-center">
                            <Chart
                                series={occupancyData.series}
                                type="donut"
                                height={250}
                            />
                        </div>
                        <div className="text-center mt-4">
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {stats.occupancyRate}%
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Occupied
                            </p>
                        </div>
                    </AdaptableCard>
                </div>

                <div className="lg:col-span-2">
                    <AdaptableCard className="h-full border border-gray-200 dark:border-gray-700">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Upcoming check-outs
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Active assignments ending within 2 days
                            </p>
                        </div>
                        <div className="space-y-3">
                            {upcomingCheckouts.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                                    No check-outs in the next 2 days.
                                </p>
                            ) : (
                                upcomingCheckouts.map((checkout) => (
                                    <div
                                        key={checkout.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <Avatar className="bg-blue-600">
                                                {checkout.avatar}
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                                    {checkout.name}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Room {checkout.room}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {checkout.date}
                                            </p>
                                            <Badge className="bg-orange-100 text-orange-800">
                                                Check-out
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </AdaptableCard>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <AdaptableCard className="border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-6">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="p-3 rounded-full bg-white dark:bg-gray-700 shadow-sm">
                            <HiOutlineFire className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Rooms under repair
                            </h3>
                            <p className="text-2xl font-bold text-red-600">
                                {stats.roomsUnderRepair}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Rooms with maintenance status in catalog
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/rooms"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        Room management →
                    </Link>
                </AdaptableCard>

                <AdaptableCard className="border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-6">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="p-3 rounded-full bg-white dark:bg-gray-700 shadow-sm">
                            <HiOutlineExclamationCircle className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Maintenance requests
                            </h3>
                            <p className="text-2xl font-bold text-yellow-600">
                                {stats.maintenanceRequestsTotal}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Submitted on this device
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/inventory-maintenance?tab=repair"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        Open form →
                    </Link>
                </AdaptableCard>

                <AdaptableCard className="border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-6">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="p-3 rounded-full bg-white dark:bg-gray-700 shadow-sm">
                            <HiOutlineCog className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Urgent requests
                            </h3>
                            <p className="text-2xl font-bold text-blue-600">
                                {stats.urgentMaintenanceRequests}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Marked urgent (this device)
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/inventory-maintenance?tab=repair"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        View queue →
                    </Link>
                </AdaptableCard>
            </div>

            <AdaptableCard className="border border-gray-200 dark:border-gray-700">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Recent assignments
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Latest room assignments from the server
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="plain"
                        onClick={() => navigate('/room-assignments')}
                    >
                        View all
                    </Button>
                </div>
                <div className="space-y-3">
                    {recentAssignments.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                            No assignments yet. Create one from Room management
                            or Room assignments.
                        </p>
                    ) : (
                        recentAssignments.map((assignment) => (
                            <div
                                key={String(assignment.id)}
                                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg"
                            >
                                <div className="flex items-center space-x-3 min-w-0">
                                    <HiOutlineClipboardList className="w-5 h-5 text-gray-600 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {assignment.employee}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                            {assignment.task}
                                            {assignment.room
                                                ? ` · Room ${assignment.room}`
                                                : ''}
                                            {assignment.camp
                                                ? ` · ${assignment.camp}`
                                                : ''}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 shrink-0 ml-2">
                                    {assignment.time}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </AdaptableCard>
        </div>
    )
}

export default Home
