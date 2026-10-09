import { Spinner } from '@/components/ui'
import { useCamps } from '@/hooks/useCamps'
import { useEmployees } from '@/hooks/useEmployees'
import { useRoomAssignments } from '@/hooks/useRoomAssignments'
import { useRooms } from '@/hooks/useRooms'
import type { RoomAssignment } from '@/services/RoomAssignmentService'
import {
    readStoredMaintenanceRequests,
    summarizeRequestStats,
} from '@/utils/maintenanceRequestStorage'
import { useEffect, useMemo, useState } from 'react'
import type { IconType } from 'react-icons'
import {
    HiOutlineArrowRight,
    HiOutlineCalendar,
    HiOutlineCheck,
    HiOutlineClipboardDocumentList as HiOutlineClipboardList,
    HiOutlineCog,
    HiOutlineExclamationCircle,
    HiOutlineHome,
    HiOutlineBuildingOffice2 as HiOutlineOfficeBuilding,
    HiOutlinePlus,
    HiOutlineUserPlus as HiOutlineUserAdd,
    HiOutlineUsers,
    HiOutlineWrench,
} from 'react-icons/hi2'
import { Link } from 'react-router-dom'
import {
    formatCheckoutDate,
    formatRelativeTime,
    localDateKey,
    summarizeRooms,
    upcomingCheckoutFilters,
} from './dashboardData'
import './Home.css'

const quickActions = [
    {
        title: 'Assign Room',
        icon: HiOutlineHome,
        to: '/rooms?action=assign',
        primary: true,
    },
    {
        title: 'Add Employee',
        icon: HiOutlineUserAdd,
        to: '/employees?action=add',
    },
    {
        title: 'Add Visitor',
        icon: HiOutlinePlus,
        to: '/employees?action=add&type=visitor',
    },
    {
        title: 'Locations & Camps',
        icon: HiOutlineOfficeBuilding,
        to: '/locations-camps',
    },
    {
        title: 'Add Camp',
        icon: HiOutlinePlus,
        to: '/locations-camps?action=add-camp',
    },
    {
        title: 'Maintenance',
        icon: HiOutlineCog,
        to: '/inventory-maintenance?tab=repair',
    },
]

function getRoomDetails(assignment: RoomAssignment) {
    return typeof assignment.roomId === 'object' && assignment.roomId
        ? assignment.roomId
        : assignment.roomId_details
}

function getOccupantName(assignment: RoomAssignment) {
    const details = assignment.occupantDetails
    const name = [details?.firstName, details?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim()
    return (
        name ||
        (assignment.occupantType === 'Temporary Visitor'
            ? 'Visitor'
            : 'Employee')
    )
}

function initials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .map((word) => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
}

type CardProps = {
    title: string
    value: number
    icon: IconType
    tone: string
}

function StatCard({ title, value, icon: Icon, tone }: CardProps) {
    return (
        <div className="dashboard-card dashboard-stat">
            <div>
                <p className="dashboard-stat-label">{title}</p>
                <p className="dashboard-stat-value">{value.toLocaleString()}</p>
            </div>
            <span className={`dashboard-icon dashboard-icon--${tone}`}>
                <Icon aria-hidden="true" />
            </span>
        </div>
    )
}

function StatusCard({
    title,
    value,
    icon: Icon,
    tone,
    note,
    to,
    link,
}: CardProps & {
    note: string
    to: string
    link: string
}) {
    return (
        <div className="dashboard-card dashboard-status">
            <span className={`dashboard-icon dashboard-icon--${tone}`}>
                <Icon aria-hidden="true" />
            </span>
            <div className="dashboard-status-content">
                <h2>{title}</h2>
                <p
                    className={`dashboard-status-value dashboard-status-value--${tone}`}
                >
                    {value.toLocaleString()}
                </p>
                <p className="dashboard-caption">{note}</p>
                <Link className="dashboard-link" to={to}>
                    {link} <HiOutlineArrowRight aria-hidden="true" />
                </Link>
            </div>
        </div>
    )
}

function OccupancyChart({
    summary,
}: {
    summary: ReturnType<typeof summarizeRooms>
}) {
    const segments = [
        {
            label: 'Occupied',
            count: summary.occupied,
            percent: summary.occupiedPercent,
            tone: 'occupied',
        },
        {
            label: 'Available',
            count: summary.available,
            percent: summary.availablePercent,
            tone: 'available',
        },
        ...(summary.unavailable > 0
            ? [
                  {
                      label: 'Unavailable',
                      count: summary.unavailable,
                      percent: summary.unavailablePercent,
                      tone: 'unavailable',
                  },
              ]
            : []),
    ]
    return (
        <div className="dashboard-occupancy-content">
            <div
                className="dashboard-donut"
                role="img"
                aria-label={
                    summary.total > 0
                        ? segments
                              .map(
                                  (segment) =>
                                      `${
                                          segment.count
                                      } ${segment.label.toLowerCase()} rooms (${Math.round(
                                          segment.percent,
                                      )}%)`,
                              )
                              .join(', ')
                        : 'No rooms to calculate occupancy'
                }
            >
                <svg aria-hidden="true" viewBox="0 0 200 200">
                    <circle
                        className="dashboard-donut-track"
                        cx="100"
                        cy="100"
                        r="83"
                        fill="none"
                        strokeWidth="20"
                    />
                    {summary.occupied > 0 && (
                        <circle
                            className="dashboard-donut-occupied"
                            cx="100"
                            cy="100"
                            r="83"
                            fill="none"
                            strokeWidth="20"
                            pathLength="100"
                            strokeDasharray={`${summary.occupiedPercent} ${
                                100 - summary.occupiedPercent
                            }`}
                            transform="rotate(-90 100 100)"
                        />
                    )}
                    {summary.unavailable > 0 && (
                        <circle
                            className="dashboard-donut-unavailable"
                            cx="100"
                            cy="100"
                            r="83"
                            fill="none"
                            strokeWidth="20"
                            pathLength="100"
                            strokeDasharray={`${summary.unavailablePercent} ${
                                100 - summary.unavailablePercent
                            }`}
                            strokeDashoffset={
                                -(
                                    summary.occupiedPercent +
                                    summary.availablePercent
                                )
                            }
                            transform="rotate(-90 100 100)"
                        />
                    )}
                </svg>
                <div className="dashboard-donut-label" aria-hidden="true">
                    <strong>
                        {summary.total > 0
                            ? `${Math.round(summary.occupiedPercent)}%`
                            : '—'}
                    </strong>
                    <span>
                        {summary.total > 0 ? 'Occupied' : 'No rooms yet'}
                    </span>
                </div>
            </div>
            <div className="dashboard-legend">
                {segments.map((segment) => (
                    <div
                        key={segment.label}
                        className="dashboard-legend-row"
                        title={`${segment.count} rooms`}
                    >
                        <span
                            className={`dashboard-legend-dot dashboard-legend-dot--${segment.tone}`}
                        />
                        <span>{segment.label}</span>
                        <strong>{Math.round(segment.percent)}%</strong>
                    </div>
                ))}
                {summary.unavailable > 0 && (
                    <p className="dashboard-caption">
                        Unavailable rooms cannot be assigned.
                    </p>
                )}
            </div>
        </div>
    )
}

const Home = () => {
    const employeeFilters = useMemo(() => ({ page: 1, limit: 1 }), [])
    const assignmentFilters = useMemo(() => ({ page: 1, limit: 10 }), [])
    const [today, setToday] = useState(() => localDateKey(new Date()))
    const checkoutFilters = useMemo(
        () => upcomingCheckoutFilters(today),
        [today],
    )
    const {
        camps,
        loading: campsLoading,
        error: campsError,
        fetchCamps,
    } = useCamps()
    const {
        rooms,
        loading: roomsLoading,
        error: roomsError,
        fetchRooms,
    } = useRooms()
    const {
        pagination: employeePagination,
        loading: employeesLoading,
        error: employeesError,
        fetchEmployees,
    } = useEmployees(employeeFilters)
    const {
        assignments,
        loading: assignmentsLoading,
        error: assignmentsError,
        fetchAssignments,
    } = useRoomAssignments(assignmentFilters)
    const {
        assignments: upcomingCheckouts,
        loading: checkoutsLoading,
        error: checkoutsError,
        fetchAssignments: fetchCheckouts,
    } = useRoomAssignments(checkoutFilters)
    const [maintenanceRequestStats, setMaintenanceRequestStats] = useState(() =>
        summarizeRequestStats(readStoredMaintenanceRequests()),
    )

    useEffect(() => {
        const refresh = () => {
            setMaintenanceRequestStats(
                summarizeRequestStats(readStoredMaintenanceRequests()),
            )
            setToday(localDateKey(new Date()))
        }
        const onStorage = (event: StorageEvent) => {
            if (
                event.key === null ||
                event.key === 'campwise_maintenance_requests_v1'
            )
                refresh()
        }
        const timer = window.setInterval(
            () => setToday(localDateKey(new Date())),
            60000,
        )
        window.addEventListener('storage', onStorage)
        window.addEventListener('focus', refresh)
        return () => {
            window.clearInterval(timer)
            window.removeEventListener('storage', onStorage)
            window.removeEventListener('focus', refresh)
        }
    }, [])

    const isLoading =
        campsLoading || roomsLoading || employeesLoading || assignmentsLoading
    const error = campsError || roomsError || employeesError || assignmentsError
    const roomsSummary = summarizeRooms(rooms, camps)
    const recentAssignments = assignments.slice(0, 6)

    return (
        <div className="campwise-dashboard">
            <header className="dashboard-heading">
                <h1>CampWise Dashboard</h1>
                <p>
                    Welcome back! Here&apos;s what&apos;s happening at your
                    camps today.
                </p>
            </header>

            {isLoading ? (
                <div className="dashboard-card dashboard-loading" role="status">
                    <Spinner />
                    <span>Loading your dashboard…</span>
                </div>
            ) : error ? (
                <div className="dashboard-card dashboard-loading" role="alert">
                    <HiOutlineExclamationCircle
                        className="dashboard-error-icon"
                        aria-hidden="true"
                    />
                    <h2>Unable to load the dashboard</h2>
                    <p>{error}</p>
                    <button
                        className="dashboard-link"
                        type="button"
                        onClick={() => {
                            void fetchCamps()
                            void fetchRooms()
                            void fetchEmployees()
                            void fetchAssignments()
                            void fetchCheckouts()
                        }}
                    >
                        Try again <HiOutlineArrowRight aria-hidden="true" />
                    </button>
                </div>
            ) : (
                <>
                    <section
                        className="dashboard-stats"
                        aria-label="Camp overview"
                    >
                        <StatCard
                            title="Total Camps"
                            value={camps.length}
                            icon={HiOutlineHome}
                            tone="green"
                        />
                        <StatCard
                            title="Total Rooms"
                            value={roomsSummary.total}
                            icon={HiOutlineOfficeBuilding}
                            tone="blue"
                        />
                        <StatCard
                            title="Total Employees"
                            value={employeePagination.total}
                            icon={HiOutlineUsers}
                            tone="purple"
                        />
                    </section>

                    <section
                        className="dashboard-quick-actions"
                        aria-labelledby="quick-actions-title"
                    >
                        <div className="dashboard-section-heading">
                            <h2 id="quick-actions-title">Quick Actions</h2>
                            <p>Common tasks for everyday camp management</p>
                        </div>
                        <div className="dashboard-actions-grid">
                            {quickActions.map(
                                ({ title, icon: Icon, to, primary }) => (
                                    <Link
                                        key={title}
                                        className={`dashboard-action${
                                            primary
                                                ? ' dashboard-action--primary'
                                                : ''
                                        }`}
                                        to={to}
                                    >
                                        <Icon aria-hidden="true" />
                                        <span>{title}</span>
                                    </Link>
                                ),
                            )}
                        </div>
                    </section>

                    <div className="dashboard-insights">
                        <section
                            className="dashboard-card dashboard-panel"
                            aria-labelledby="occupancy-title"
                        >
                            <div className="dashboard-section-heading">
                                <h2 id="occupancy-title">Current Occupancy</h2>
                                <p>
                                    {roomsSummary.fromRecords
                                        ? 'Based on room records'
                                        : 'Based on camp totals'}
                                </p>
                            </div>
                            <OccupancyChart summary={roomsSummary} />
                        </section>

                        <section
                            className="dashboard-card dashboard-panel"
                            aria-labelledby="checkouts-title"
                        >
                            <div className="dashboard-panel-heading">
                                <div className="dashboard-section-heading">
                                    <h2 id="checkouts-title">
                                        Upcoming check-outs
                                    </h2>
                                    <p>
                                        Active assignments ending within 2 days
                                    </p>
                                </div>
                                <span className="dashboard-date-badge">
                                    <HiOutlineCalendar aria-hidden="true" />{' '}
                                    Next 2 days
                                </span>
                            </div>
                            {checkoutsLoading ? (
                                <div className="dashboard-empty" role="status">
                                    <Spinner />
                                    <p>Loading check-outs…</p>
                                </div>
                            ) : checkoutsError ? (
                                <div className="dashboard-empty" role="alert">
                                    <p>Unable to load upcoming check-outs.</p>
                                    <button
                                        className="dashboard-link"
                                        type="button"
                                        onClick={() => {
                                            void fetchCheckouts()
                                        }}
                                    >
                                        Try again
                                    </button>
                                </div>
                            ) : upcomingCheckouts.length === 0 ? (
                                <div className="dashboard-empty">
                                    <span className="dashboard-empty-icon">
                                        <HiOutlineCalendar aria-hidden="true" />
                                        <HiOutlineCheck
                                            className="dashboard-calendar-check"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <h3>No upcoming check-outs</h3>
                                    <p>No check-outs in the next 2 days.</p>
                                </div>
                            ) : (
                                <ul className="dashboard-checkout-list">
                                    {upcomingCheckouts.map((assignment) => {
                                        const name = getOccupantName(assignment)
                                        return (
                                            <li
                                                key={
                                                    assignment._id ||
                                                    `${assignment.occupantId}-${assignment.startDate}`
                                                }
                                            >
                                                <span
                                                    className="dashboard-avatar"
                                                    aria-hidden="true"
                                                >
                                                    {initials(name)}
                                                </span>
                                                <div className="dashboard-checkout-person">
                                                    <strong>{name}</strong>
                                                    <span>
                                                        Room{' '}
                                                        {getRoomDetails(
                                                            assignment,
                                                        )?.roomNumber || '—'}
                                                    </span>
                                                </div>
                                                <div className="dashboard-checkout-date">
                                                    <time
                                                        dateTime={
                                                            assignment.expectedCheckoutDate
                                                        }
                                                    >
                                                        {formatCheckoutDate(
                                                            assignment.expectedCheckoutDate,
                                                        )}
                                                    </time>
                                                    <span>Check-out</span>
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </section>
                    </div>

                    <section
                        className="dashboard-status-grid"
                        aria-label="Maintenance overview"
                    >
                        <StatusCard
                            title="Rooms under repair"
                            value={roomsSummary.maintenance}
                            icon={HiOutlineWrench}
                            tone="red"
                            note="Rooms with maintenance status"
                            to="/rooms"
                            link="Room management"
                        />
                        <StatusCard
                            title="Maintenance requests"
                            value={maintenanceRequestStats.total}
                            icon={HiOutlineClipboardList}
                            tone="amber"
                            note="Submitted on this device"
                            to="/inventory-maintenance?tab=repair"
                            link="Open form"
                        />
                        <StatusCard
                            title="Urgent requests"
                            value={maintenanceRequestStats.urgent}
                            icon={HiOutlineExclamationCircle}
                            tone="blue"
                            note="Marked urgent on this device"
                            to="/inventory-maintenance?tab=repair"
                            link="View queue"
                        />
                    </section>

                    <section
                        className="dashboard-card dashboard-panel dashboard-recent"
                        aria-labelledby="recent-title"
                    >
                        <div className="dashboard-panel-heading">
                            <div className="dashboard-section-heading">
                                <h2 id="recent-title">Recent assignments</h2>
                                <p>Latest room assignments from the server</p>
                            </div>
                            <Link
                                className="dashboard-link"
                                to="/room-assignments"
                            >
                                View all{' '}
                                <HiOutlineArrowRight aria-hidden="true" />
                            </Link>
                        </div>
                        {recentAssignments.length === 0 ? (
                            <div className="dashboard-empty dashboard-empty--compact">
                                <HiOutlineClipboardList
                                    className="dashboard-empty-list-icon"
                                    aria-hidden="true"
                                />
                                <h3>No assignments yet</h3>
                                <p>
                                    Create one from Room management or Room
                                    assignments.
                                </p>
                            </div>
                        ) : (
                            <div
                                className="dashboard-table-scroll"
                                tabIndex={0}
                                role="region"
                                aria-label="Recent room assignments"
                            >
                                <table className="dashboard-table">
                                    <thead>
                                        <tr>
                                            <th scope="col">
                                                Employee / visitor
                                            </th>
                                            <th scope="col">Room</th>
                                            <th scope="col">Camp</th>
                                            <th scope="col">Activity</th>
                                            <th scope="col">Assigned</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentAssignments.map((assignment) => {
                                            const name =
                                                getOccupantName(assignment)
                                            const room =
                                                getRoomDetails(assignment)
                                            return (
                                                <tr
                                                    key={
                                                        assignment._id ||
                                                        `${assignment.occupantId}-${assignment.startDate}`
                                                    }
                                                >
                                                    <td>
                                                        <div className="dashboard-person">
                                                            <span
                                                                className="dashboard-avatar"
                                                                aria-hidden="true"
                                                            >
                                                                {initials(name)}
                                                            </span>
                                                            <span>{name}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {room?.roomNumber
                                                            ? `Room ${room.roomNumber}`
                                                            : '—'}
                                                    </td>
                                                    <td>
                                                        {room?.camp?.name ||
                                                            '—'}
                                                    </td>
                                                    <td>
                                                        <span className="dashboard-activity">
                                                            {assignment.status ===
                                                            'active'
                                                                ? 'Room assignment'
                                                                : `Assignment (${assignment.status})`}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <time
                                                            dateTime={
                                                                assignment.createdAt ||
                                                                assignment.startDate
                                                            }
                                                        >
                                                            {formatRelativeTime(
                                                                assignment.createdAt ||
                                                                    assignment.startDate,
                                                            )}
                                                        </time>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    )
}

export default Home
