import { Card, Button, Badge, Avatar } from '@/components/ui'
import { AdaptableCard, Chart } from '@/components/shared'
import { 
    HiOutlineHome, 
    HiOutlineUsers, 
    HiOutlineOfficeBuilding,
    HiOutlineChartPie,
    HiOutlineExclamationCircle,
    HiOutlineCog,
    HiOutlineClipboardList,
    HiOutlinePlus,
    HiOutlineUserAdd,
    HiOutlineFire,
    HiOutlineLogout,
    HiOutlineClock
} from 'react-icons/hi'
import { Link } from 'react-router-dom'

const Home = () => {
    // Dummy data for dashboard
    const stats = {
        totalCamps: 12,
        totalRooms: 240,
        totalEmployees: 156,
        occupancyRate: 78,
        roomsUnderRepair: 8,
        lowInventoryItems: 5,
        activeMaintenance: 12
    }

    const occupancyData = {
        series: [stats.occupancyRate, 100 - stats.occupancyRate],
        options: {
            chart: {
                type: 'donut' as const,
            },
            labels: ['Occupied', 'Available'],
            colors: ['#10B981', '#E5E7EB'],
            legend: {
                position: 'bottom' as const
            }
        }
    }

    const upcomingCheckouts = [
        { id: 1, name: 'John Smith', room: 'A-101', date: '2024-01-15', avatar: 'JS' },
        { id: 2, name: 'Sarah Johnson', room: 'B-205', date: '2024-01-15', avatar: 'SJ' },
        { id: 3, name: 'Mike Wilson', room: 'C-301', date: '2024-01-16', avatar: 'MW' },
        { id: 4, name: 'Lisa Brown', room: 'A-102', date: '2024-01-16', avatar: 'LB' }
    ]

    const recentAssignments = [
        { id: 1, employee: 'David Lee', task: 'Room Cleaning', room: 'A-105', time: '2 hours ago' },
        { id: 2, employee: 'Emma Davis', task: 'Maintenance Check', room: 'B-201', time: '4 hours ago' },
        { id: 3, employee: 'Tom Wilson', task: 'Security Round', area: 'Block C', time: '6 hours ago' }
    ]

    const StatCard = ({ title, value, icon: Icon, color = 'text-blue-600' }: {
        title: string
        value: number | string
        icon: any
        color?: string
    }) => (
        <AdaptableCard className="h-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-6">
            <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full bg-white dark:bg-gray-700 shadow-sm`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
                </div>
            </div>
        </AdaptableCard>
    )

    const QuickActionCard = ({ title, icon: Icon, onClick, color = 'bg-blue-600' }: {
        title: string
        icon: any
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
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">CampWise Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome back! Here's what's happening at your camps today.</p>
            </div>

            {/* Stats Cards */}
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

            {/* Quick Actions */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Common tasks and shortcuts for efficient camp management</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickActionCard 
                        title="Assign Room"
                        icon={HiOutlineHome}
                        onClick={() => console.log('Assign Room')}
                        color="bg-blue-600"
                    />
                    <QuickActionCard 
                        title="Add Employee"
                        icon={HiOutlineUserAdd}
                        onClick={() => console.log('Add Employee')}
                        color="bg-green-600"
                    />
                    <QuickActionCard 
                        title="Add Visitor"
                        icon={HiOutlinePlus}
                        onClick={() => console.log('Add Visitor')}
                        color="bg-purple-600"
                    />
                    <QuickActionCard 
                        title="Maintenance Request"
                        icon={HiOutlineFire}
                        onClick={() => console.log('Maintenance Request')}
                        color="bg-orange-600"
                    />
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Occupancy Rate Chart */}
                <div className="lg:col-span-1">
                    <AdaptableCard className="h-full border border-gray-200 dark:border-gray-700">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Current Occupancy Rate</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Overall camp occupancy</p>
                        </div>
                        <div className="flex items-center justify-center">
                            <Chart 
                                series={occupancyData.series}
                                type="donut"
                                height={250}
                            />
                        </div>
                        <div className="text-center mt-4">
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.occupancyRate}%</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Occupied</p>
                        </div>
                    </AdaptableCard>
                </div>

                {/* Upcoming Check-outs */}
                <div className="lg:col-span-2">
                    <AdaptableCard className="h-full border border-gray-200 dark:border-gray-700">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upcoming Check-Outs</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Next 2 days</p>
                        </div>
                        <div className="space-y-3">
                            {upcomingCheckouts.map((checkout) => (
                                <div key={checkout.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <Avatar className="bg-blue-600">{checkout.avatar}</Avatar>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{checkout.name}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Room {checkout.room}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{checkout.date}</p>
                                        <Badge className="bg-orange-100 text-orange-800">Check-out</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AdaptableCard>
                </div>
            </div>

            {/* Alert Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Rooms Under Repair */}
                <AdaptableCard className="border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-6">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="p-3 rounded-full bg-white dark:bg-gray-700 shadow-sm">
                            <HiOutlineFire className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Rooms Under Repair</h3>
                            <p className="text-2xl font-bold text-red-600">{stats.roomsUnderRepair}</p>
                        </div>
                    </div>
                    <Link to="/maintenance" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View Details →
                    </Link>
                </AdaptableCard>

                {/* Low Inventory Alerts */}
                <AdaptableCard className="border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-6">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="p-3 rounded-full bg-white dark:bg-gray-700 shadow-sm">
                            <HiOutlineExclamationCircle className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Low Inventory Alerts</h3>
                            <p className="text-2xl font-bold text-yellow-600">{stats.lowInventoryItems}</p>
                        </div>
                    </div>
                    <Link to="/inventory" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View Items →
                    </Link>
                </AdaptableCard>

                {/* Active Maintenance Tasks */}
                <AdaptableCard className="border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-6">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="p-3 rounded-full bg-white dark:bg-gray-700 shadow-sm">
                            <HiOutlineCog className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Active Maintenance</h3>
                            <p className="text-2xl font-bold text-blue-600">{stats.activeMaintenance}</p>
                        </div>
                    </div>
                    <Link to="/maintenance/active" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View Tasks →
                    </Link>
                </AdaptableCard>
            </div>

            {/* Recent Assignments */}
            <AdaptableCard className="border border-gray-200 dark:border-gray-700">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Assignments</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Latest employee assignments</p>
                </div>
                <div className="space-y-3">
                    {recentAssignments.map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <HiOutlineClipboardList className="w-5 h-5 text-gray-600" />
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{assignment.employee}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {assignment.task} - {assignment.room || assignment.area}
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">{assignment.time}</p>
                        </div>
                    ))}
                </div>
            </AdaptableCard>
        </div>
    )
}

export default Home
