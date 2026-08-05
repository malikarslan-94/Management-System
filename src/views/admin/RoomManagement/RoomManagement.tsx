import AdaptableCard from '@/components/shared/AdaptableCard'
import RoomForm from '@/components/admin-dashboard/RoomForm'
import RoomGeneratorForm from '@/components/admin-dashboard/RoomGeneratorForm'
import { FormContainer, FormItem, Notification, toast } from '@/components/ui'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import { Select } from '@/components/ui/select'
import Tooltip from '@/components/ui/Tooltip'
import { useEmployees } from '@/hooks/useEmployees'
import { useCamps } from '@/hooks/useCamps'
import {
    assignRoom,
    type AssignRoomPayload,
} from '@/services/RoomAssignmentService'
import {
    getRoomCategories,
    type RoomCategory,
} from '@/services/RoomCategoryService'
import {
    getRooms,
    updateRoom,
    type Room,
    type RoomStatus,
} from '@/services/RoomService'
import { roomApi } from '@/services/api'
import React, { useEffect, useMemo, useState } from 'react'
import {
    FaBed,
    FaDoorClosed,
    FaDoorOpen,
    FaGlassWhiskey,
    FaKey,
    FaMountain,
    FaSnowflake,
    FaTv,
    FaUtensils,
    FaWifi,
} from 'react-icons/fa'
import {
    HiOutlineArrowSmRight,
    HiOutlineCheckCircle,
    HiOutlineDuplicate,
    HiOutlineHome,
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlineUserAdd,
    HiOutlineViewGrid,
    HiOutlineViewList
} from 'react-icons/hi'
import { useNavigate, useSearchParams } from 'react-router-dom'

type ViewMode = 'categories' | 'rooms'

const statusColor: Record<RoomStatus, string> = {
    available:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100',
    occupied:
        'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100',
    maintenance:
        'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-100',
    cleaning:
        'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100',
}

const featureIcons: Record<string, React.ReactNode> = {
    wifi: <FaWifi className="text-indigo-500" />,
    ac: <FaSnowflake className="text-blue-500" />,
    tv: <FaTv className="text-purple-500" />,
    minibar: <FaGlassWhiskey className="text-amber-500" />,
    view: <FaMountain className="text-emerald-500" />,
    bed: <FaBed className="text-rose-500" />,
    kitchenette: <FaUtensils className="text-orange-500" />,
    access: <FaKey className="text-gray-500" />,
    default: <FaDoorOpen className="text-gray-400" />,
}

const RoomManagement = () => {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const [viewMode, setViewMode] = useState<ViewMode>('categories')
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [categories, setCategories] = useState<RoomCategory[]>([])
    const [rooms, setRooms] = useState<Room[]>([])
    const [activeCategory, setActiveCategory] = useState<string | null>(null)

    // Room Assignment state
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
    const [assignFormData, setAssignFormData] = useState({
        occupantType: 'Employee' as 'Employee' | 'Temporary Visitor',
        occupantId: '',
        startDate: new Date().toISOString().split('T')[0],
        expectedCheckoutDate: '',
    })
    const [assignErrors, setAssignErrors] = useState<Record<string, string>>({})
    const [isAssigning, setIsAssigning] = useState(false)

    // Add Room state
    const { camps } = useCamps()
    const [isAddRoomOpen, setIsAddRoomOpen] = useState(false)
    const [isSubmittingRoom, setIsSubmittingRoom] = useState(false)
    const [addRoomErrors, setAddRoomErrors] = useState<Record<string, string>>({})
    const [addRoomFormData, setAddRoomFormData] = useState({
        camp: '',
        buildingId: '',
        floor: 1,
        roomNumber: '',
        type: '',
        capacity: '' as string | number,
        status: 'available' as RoomStatus,
        amenities: [] as string[],
        description: '',
        price: 0,
    })

    const resetAddRoomForm = () =>
        setAddRoomFormData({
            camp: '',
            buildingId: '',
            floor: 1,
            roomNumber: '',
            type: '',
            capacity: '',
            status: 'available',
            amenities: [],
            description: '',
            price: 0,
        })

    // Bulk room generation
    const [isGenerateOpen, setIsGenerateOpen] = useState(false)
    const [generateCampId, setGenerateCampId] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [generateValid, setGenerateValid] = useState(false)
    const generatePayloadRef = React.useRef<{
        buildingId: string
        floors: Array<{
            floor: number
            count: number
            startNumber: string
            type: string
            capacity: number
            price?: number
            amenities?: string[]
        }>
    } | null>(null)

    const handleGenerateRooms = async () => {
        const payload = generatePayloadRef.current
        if (!payload?.buildingId || payload.floors.length === 0) return

        setIsGenerating(true)
        try {
            const response = await roomApi.bulkCreate(payload)
            const refreshed = await getRooms()
            setRooms(refreshed)
            setIsGenerateOpen(false)
            setGenerateCampId('')
            toast.push(
                <Notification title="Success" type="success">
                    {response.data?.created ?? 0} rooms generated
                </Notification>,
            )
        } catch (err: any) {
            // The API reports every colliding room number and creates nothing.
            toast.push(
                <Notification title="Could not generate rooms" type="danger">
                    {err?.response?.data?.message || 'Failed to generate rooms'}
                </Notification>,
            )
        } finally {
            setIsGenerating(false)
        }
    }

    const handleRoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setAddRoomFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleRoomSelectChange = (field: string) => (e: { target: { value: any } }) => {
        const value = e.target.value
        if (field === 'camp') {
            setAddRoomFormData((prev) => ({ ...prev, camp: value, buildingId: '', floor: 1 }))
        } else if (field === 'buildingId') {
            setAddRoomFormData((prev) => ({ ...prev, buildingId: value, floor: 1 }))
        } else {
            setAddRoomFormData((prev) => ({ ...prev, [field]: value }))
        }
        if (addRoomErrors[field]) {
            setAddRoomErrors((prev) => { const n = { ...prev }; delete n[field]; return n })
        }
    }

    const handleRoomAmenityChange = (amenity: string, checked: boolean) => {
        setAddRoomFormData((prev) => ({
            ...prev,
            amenities: checked
                ? [...prev.amenities, amenity]
                : prev.amenities.filter((a) => a !== amenity),
        }))
    }

    const validateRoomField = (name: string, value: any) => {
        if (!value && ['roomNumber', 'type', 'capacity'].includes(name)) {
            setAddRoomErrors((prev) => ({ ...prev, [name]: 'This field is required' }))
        } else {
            setAddRoomErrors((prev) => { const n = { ...prev }; delete n[name]; return n })
        }
    }

    const getRoomFieldClass = (field: string) =>
        addRoomErrors[field] ? 'border-red-500' : ''

    const handleAddRoomSubmit = async () => {
        const errors: Record<string, string> = {}
        if (!addRoomFormData.camp) errors.camp = 'Camp is required'
        if (!addRoomFormData.buildingId) errors.buildingId = 'Please select a building'
        if (!addRoomFormData.roomNumber) errors.roomNumber = 'Room number is required'
        if (!addRoomFormData.type) errors.type = 'Room type is required'
        if (!addRoomFormData.capacity) errors.capacity = 'Capacity is required'

        setAddRoomErrors(errors)
        if (Object.keys(errors).length > 0) return

        setIsSubmittingRoom(true)
        try {
            // `camp` is intentionally not sent — the API derives it from the
            // building, so the two can never disagree.
            await roomApi.create({
                buildingId: addRoomFormData.buildingId,
                floor: addRoomFormData.floor || 1,
                roomNumber: addRoomFormData.roomNumber,
                type: addRoomFormData.type,
                capacity: Number(addRoomFormData.capacity),
                price: Number(addRoomFormData.price) || 0,
                amenities: addRoomFormData.amenities,
                status: addRoomFormData.status,
                description: addRoomFormData.description,
            })
            const refreshed = await getRooms()
            setRooms(refreshed)
            setIsAddRoomOpen(false)
            resetAddRoomForm()
            setAddRoomErrors({})
            toast.push(
                <Notification title="Success" type="success">
                    Room added successfully
                </Notification>,
            )
        } catch (err: any) {
            toast.push(
                <Notification title="Error" type="danger">
                    {err?.response?.data?.message || 'Failed to add room'}
                </Notification>,
            )
        } finally {
            setIsSubmittingRoom(false)
        }
    }

    // Fetch employees and visitors for assignment
    const { employees: allEmployees, fetchEmployees } = useEmployees()
    const employees = useMemo(
        () => allEmployees.filter((emp) => emp.status === 'Active'),
        [allEmployees],
    )
    const visitors = useMemo(
        () => employees.filter((emp) => emp.employeeType === 'Visitor'),
        [employees],
    )

    // Fetch data on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true)
                console.log('Fetching room data...')
                const [categoriesData, roomsData] = await Promise.all([
                    getRoomCategories(),
                    getRooms(),
                ])
                console.log('Categories data:', categoriesData)
                console.log('Rooms data:', roomsData)
                console.log('Number of rooms received:', roomsData?.length || 0)
                console.log('Rooms breakdown:', {
                    total: roomsData?.length || 0,
                    available: roomsData?.filter((r: Room) => r.status === 'available').length || 0,
                    occupied: roomsData?.filter((r: Room) => r.status === 'occupied').length || 0,
                    maintenance: roomsData?.filter((r: Room) => r.status === 'maintenance').length || 0,
                    cleaning: roomsData?.filter((r: Room) => r.status === 'cleaning').length || 0,
                })
                setCategories(categoriesData || [])
                setRooms(roomsData || [])
            } catch (error) {
                console.error('Error fetching data:', error)
                // Set empty arrays on error to prevent crashes
                setCategories([])
                setRooms([])
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
        fetchEmployees()
    }, [fetchEmployees])

    // Reset occupant when occupant type changes
    useEffect(() => {
        if (isAssignModalOpen) {
            setAssignFormData((prev) => ({ ...prev, occupantId: '' }))
        }
    }, [assignFormData.occupantType, isAssignModalOpen])

    // Check URL params to open assign room modal
    useEffect(() => {
        const action = searchParams.get('action')

        // Skip if no action param or already processing
        if (action !== 'assign' || isAssignModalOpen) {
            return
        }

        // Wait for data to load
        if (isLoading || rooms.length === 0) {
            return
        }

        // Find first available room
        const availableRoom = rooms.find((room) => room.status === 'available')

        if (availableRoom) {
            setSelectedRoom(availableRoom)
            setAssignFormData({
                occupantType: 'Employee',
                occupantId: '',
                startDate: new Date().toISOString().split('T')[0],
                expectedCheckoutDate: '',
            })
            setAssignErrors({})
            setIsAssignModalOpen(true)
            // Switch to rooms view to show the room being assigned
            setViewMode('rooms')
            // Clear the URL params after opening the modal
            setSearchParams({}, { replace: true })
        } else {
            // No available rooms - show message and clear params
            toast.push(
                <Notification title="No Available Rooms" type="warning">
                    There are no available rooms to assign at the moment.
                </Notification>,
            )
            setSearchParams({}, { replace: true })
        }
    }, [
        searchParams,
        rooms.length,
        isAssignModalOpen,
        isLoading,
        setSearchParams,
    ])

    // Filter rooms based on search, active category, camp, and type filters
    const filteredRooms = useMemo(() => {
        let result = [...rooms]

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            result = result.filter(
                (room) =>
                    room.roomNumber.toLowerCase().includes(query) ||
                    room.type.toLowerCase().includes(query) ||
                    room.status.toLowerCase().includes(query),
            )
        }

        // Category filter (when viewing from category view)
        if (activeCategory) {
            result = result.filter((room) => {
                const category = categories.find(
                    (cat) => cat.id === activeCategory,
                )
                // Use roomType mapping instead of name matching
                return category
                    ? room.type === category.roomType
                    : false
            })
        }

        return result
    }, [rooms, searchQuery, activeCategory, categories])

    // Calculate statistics from actual Room documents
    const stats = useMemo(() => {
        const roomsArray = Array.isArray(rooms) ? rooms : []
        const categoriesArray = Array.isArray(categories) ? categories : []
        
        const totalRooms = roomsArray.length
        const availableRooms = roomsArray.filter(
            (room) => room.status === 'available'
        ).length
        const occupiedRooms = roomsArray.filter(
            (room) => room.status === 'occupied'
        ).length
        const maintenanceRooms = roomsArray.filter(
            (room) => room.status === 'maintenance'
        ).length
        const cleaningRooms = roomsArray.filter(
            (room) => room.status === 'cleaning'
        ).length
        
        const statsResult = {
            totalCategories: categoriesArray.length,
            totalRooms,
            availableRooms,
            occupiedRooms,
            maintenanceRooms,
            cleaningRooms,
        }
        
        // Log stats for verification
        console.log('RoomManagement Stats:', {
            totalCategories: statsResult.totalCategories,
            totalRooms: statsResult.totalRooms,
            availableRooms: statsResult.availableRooms,
            occupiedRooms: statsResult.occupiedRooms,
            maintenanceRooms: statsResult.maintenanceRooms,
            cleaningRooms: statsResult.cleaningRooms,
            occupancyRate: totalRooms > 0 
                ? Math.round((occupiedRooms / totalRooms) * 100) 
                : 0,
        })
        
        return statsResult
    }, [categories, rooms])

    // Render feature icon with tooltip
    const renderFeatureIcon = (feature: string) => {
        const icon = featureIcons[feature] || featureIcons.default
        return (
            <Tooltip title={feature} key={feature}>
                <span className="text-lg mr-2">{icon}</span>
            </Tooltip>
        )
    }

    // Handle open assign modal
    const handleOpenAssignModal = (room: Room) => {
        if (room.status !== 'available') {
            toast.push(
                <Notification title="Cannot Assign" type="warning">
                    Only available rooms can be assigned.
                </Notification>,
            )
            return
        }
        setSelectedRoom(room)
        setAssignFormData({
            occupantType: 'Employee',
            occupantId: '',
            startDate: new Date().toISOString().split('T')[0],
            expectedCheckoutDate: '',
        })
        setAssignErrors({})
        setIsAssignModalOpen(true)
    }

    // Handle assign form input change
    const handleAssignInputChange = (name: string, value: any) => {
        setAssignFormData((prev) => ({ ...prev, [name]: value }))
        // Clear error when user starts typing
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
        if (!validateAssignForm() || !selectedRoom) return

        setIsAssigning(true)
        try {
            const payload: AssignRoomPayload = {
                roomId: selectedRoom.id,
                occupantId: assignFormData.occupantId,
                occupantType: assignFormData.occupantType,
                startDate: assignFormData.startDate,
                expectedCheckoutDate: assignFormData.expectedCheckoutDate,
            }

            await assignRoom(payload)

            // Update room status to occupied
            const updatedRoom = await updateRoom(selectedRoom.id, {
                status: 'occupied',
            })

            // Update local rooms state
            if (updatedRoom) {
                setRooms((prev) =>
                    prev.map((room) =>
                        room.id === selectedRoom.id ? updatedRoom : room,
                    ),
                )
            }

            // Refresh rooms list to ensure data is in sync
            const refreshedRooms = await getRooms()
            setRooms(refreshedRooms)

            // Close modal and reset form
            setIsAssignModalOpen(false)
            setSelectedRoom(null)
            setAssignFormData({
                occupantType: 'Employee',
                occupantId: '',
                startDate: new Date().toISOString().split('T')[0],
                expectedCheckoutDate: '',
            })

            // Show success notification
            toast.push(
                <Notification title="Success" type="success">
                    Room {selectedRoom.roomNumber} has been assigned
                    successfully.
                </Notification>,
            )
        } catch (error: any) {
            toast.push(
                <Notification title="Error" type="danger">
                    {error.message ||
                        'Failed to assign room. Please try again.'}
                </Notification>,
            )
        } finally {
            setIsAssigning(false)
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
            return visitors.map((visitor) => ({
                value: visitor._id || '',
                label: `${visitor.firstName} ${visitor.lastName}${
                    visitor.department ? ` - ${visitor.department}` : ''
                }`,
            }))
        }
    }

    // Render loading skeleton
    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-32"
                        />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-64"
                        />
                    ))}
                </div>
            </div>
        )
    }

    // Render category cards
    const renderCategories = () => {
        if (categories.length === 0) {
            return (
                <Card className="text-center p-8">
                    <div className="text-5xl mb-4">🏨</div>
                    <h3 className="text-lg font-medium mb-2">No Room Categories Found</h3>
                    <p className="text-gray-500 mb-4">
                        Categories are loading or not available. Check console for errors.
                    </p>
                    <p className="text-xs text-gray-400">
                        Categories: {categories.length}, Rooms: {rooms.length}
                    </p>
                </Card>
            )
        }
        
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categories.map((category) => {
                const roomCount = rooms.filter(
                    (r) => r.type === category.roomType,
                ).length
                const availableCount = rooms.filter(
                    (r) =>
                        r.type === category.roomType &&
                        r.status === 'available',
                ).length

                return (
                    <AdaptableCard
                        key={category.id}
                        className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => {
                            setViewMode('rooms')
                            setActiveCategory(category.id)
                        }}
                    >
                        <div className="relative h-40 bg-gray-100 dark:bg-gray-800 overflow-hidden rounded-t-lg">
                            <img
                                src={category.image || '/img/others/img-1.jpg'}
                                alt={category.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = '/img/others/img-1.jpg'
                                }}
                            />
                            <Badge
                                className="absolute top-2 right-2"
                                content={`${availableCount}/${roomCount}`}
                                innerClass={
                                    availableCount > 0
                                        ? 'bg-emerald-500'
                                        : 'bg-rose-500'
                                }
                            />
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-lg">
                                    {category.name}
                                </h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                                {category.description}
                            </p>
                            <div className="flex flex-wrap gap-1 mb-4">
                                {category.features
                                    .slice(0, 3)
                                    .map((feature) => (
                                        <span
                                            key={feature.id}
                                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-200 mr-1 mb-1"
                                        >
                                            {feature.name}
                                        </span>
                                    ))}
                                {category.features.length > 3 && (
                                    <span className="text-xs text-gray-500">
                                        +{category.features.length - 3} more
                                    </span>
                                )}
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-500">
                                    {availableCount} of {roomCount} available
                                </div>
                                <div className="flex gap-2">
                                    {availableCount > 0 && (
                                        <Button
                                            size="xs"
                                            variant="solid"
                                            icon={<HiOutlineUserAdd />}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                // Find first available room in this category
                                                const categoryRooms =
                                                    rooms.filter(
                                                        (r) =>
                                                            r.type ===
                                                                category.roomType &&
                                                            r.status ===
                                                                'available',
                                                    )
                                                if (categoryRooms.length > 0) {
                                                    handleOpenAssignModal(
                                                        categoryRooms[0],
                                                    )
                                                } else {
                                                    // Switch to rooms view if no available found
                                                    setViewMode('rooms')
                                                    setActiveCategory(
                                                        category.id,
                                                    )
                                                }
                                            }}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            Assign
                                        </Button>
                                    )}
                                    <Button
                                        size="xs"
                                        variant="solid"
                                        icon={<HiOutlineArrowSmRight />}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setViewMode('rooms')
                                            setActiveCategory(category.id)
                                        }}
                                    >
                                        View Rooms
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </AdaptableCard>
                )
            })}
            </div>
        )
    }

    // Render rooms list
    const renderRooms = () => (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <Button
                        icon={<HiOutlineArrowSmRight className="rotate-180" />}
                        variant="plain"
                        onClick={() => setViewMode('categories')}
                    />
                    <h3 className="text-lg font-semibold">
                        {activeCategory
                            ? `${categories.find((c) => c.id === activeCategory)
                                  ?.name} Rooms`
                            : 'All Rooms'}
                    </h3>
                </div>
                <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <HiOutlineSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                        type="text"
                        className="pl-10 w-full"
                        placeholder="Search rooms..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {filteredRooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRooms.map((room) => (
                        <Card
                            key={room.id}
                            className="hover:shadow-md transition-shadow"
                        >
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-lg">
                                        Room {room.roomNumber}
                                        {room.status === 'occupied' && (
                                            <FaDoorClosed className="inline-block ml-2 text-amber-500" />
                                        )}
                                        {room.status === 'available' && (
                                            <FaDoorOpen className="inline-block ml-2 text-emerald-500" />
                                        )}
                                        {room.status === 'maintenance' && (
                                            <Tooltip title="Under Maintenance">
                                                <span className="text-rose-500">
                                                    🔧
                                                </span>
                                            </Tooltip>
                                        )}
                                    </h3>
                                    <Badge
                                        content={room.status}
                                        innerClass={statusColor[room.status]}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                                    <div>
                                        <div className="text-xs text-gray-500">
                                            Type
                                        </div>
                                        <div className="capitalize">
                                            {room.type}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">
                                            Capacity
                                        </div>
                                        <div>
                                            {room.capacity}{' '}
                                            {room.capacity === 1
                                                ? 'person'
                                                : 'people'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">
                                            Status
                                        </div>
                                        <div className="capitalize">
                                            {room.status}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-4">
                                    {room.amenities
                                        .slice(0, 4)
                                        .map(renderFeatureIcon)}
                                    {room.amenities.length > 4 && (
                                        <span className="text-xs text-gray-500">
                                            +{room.amenities.length - 4} more
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-end space-x-2 flex-wrap gap-2">
                                    {room.status === 'available' ? (
                                        <Button
                                            size="xs"
                                            variant="solid"
                                            icon={<HiOutlineUserAdd />}
                                            onClick={() =>
                                                handleOpenAssignModal(room)
                                            }
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            Assign
                                        </Button>
                                    ) : (
                                        <Tooltip
                                            title={`Room is ${room.status}. Only available rooms can be assigned.`}
                                        >
                                            <span>
                                                <Button
                                                    size="xs"
                                                    variant="plain"
                                                    icon={<HiOutlineUserAdd />}
                                                    disabled
                                                    className="opacity-50 cursor-not-allowed"
                                                >
                                                    Assign
                                                </Button>
                                            </span>
                                        </Tooltip>
                                    )}
                                    <Button
                                        size="xs"
                                        variant="plain"
                                        onClick={() =>
                                            console.log('Edit room', room.id)
                                        }
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        size="xs"
                                        variant="solid"
                                        onClick={() =>
                                            console.log('View details', room.id)
                                        }
                                    >
                                        Details
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <div className="text-gray-400 mb-2">
                        <HiOutlineHome className="mx-auto h-12 w-12" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        No rooms found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {searchQuery
                            ? "Try adjusting your search or filter to find what you're looking for."
                            : 'There are no rooms available at the moment.'}
                    </p>
                    <div className="mt-6">
                        <Button
                            variant="solid"
                            icon={<HiOutlinePlus />}
                            onClick={() => setIsAddRoomOpen(true)}
                        >
                            Add New Room
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )

    // Render statistics cards
    const renderStats = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
                <div className="p-3 rounded-full bg-blue-500/10 text-2xl text-blue-500">
                    <HiOutlineViewGrid />
                </div>
                <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Categories
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.totalCategories}
                    </p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
                <div className="p-3 rounded-full bg-emerald-500/10 text-2xl text-emerald-500">
                    <HiOutlineViewList />
                </div>
                <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Total Rooms
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.totalRooms}
                    </p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
                <div className="p-3 rounded-full bg-green-500/10 text-2xl text-green-500">
                    <HiOutlineCheckCircle />
                </div>
                <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Available
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.availableRooms}
                    </p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
                <div className="p-3 rounded-full bg-amber-500/10 text-2xl text-amber-500">
                    <HiOutlineHome />
                </div>
                <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Occupied
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.occupiedRooms}
                    </p>
                </div>
            </div>
        </div>
    )

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Room Management</h2>
                <div className="flex space-x-2">
                    <Button
                        variant={
                            viewMode === 'categories' ? 'solid' : 'default'
                        }
                        icon={<HiOutlineViewGrid />}
                        onClick={() => setViewMode('categories')}
                    >
                        Categories
                    </Button>
                    <Button
                        variant={viewMode === 'rooms' ? 'solid' : 'default'}
                        icon={<HiOutlineViewList />}
                        onClick={() => setViewMode('rooms')}
                    >
                        All Rooms
                    </Button>
                    <Button
                        icon={<HiOutlineDuplicate />}
                        onClick={() => setIsGenerateOpen(true)}
                    >
                        Generate Rooms
                    </Button>
                    <Button
                        variant="solid"
                        icon={<HiOutlinePlus />}
                        onClick={() => setIsAddRoomOpen(true)}
                    >
                        Add {viewMode === 'categories' ? 'Category' : 'Room'}
                    </Button>
                </div>
            </div>

            {renderStats()}

            {viewMode === 'categories' ? renderCategories() : renderRooms()}

            {/* Add Room Dialog */}
            <Dialog
                isOpen={isAddRoomOpen}
                onClose={() => {
                    setIsAddRoomOpen(false)
                    resetAddRoomForm()
                    setAddRoomErrors({})
                }}
                width={600}
            >
                <div className="flex flex-col max-h-[90vh]">
                    <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            Add New Room
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        <RoomForm
                            formData={addRoomFormData}
                            errors={addRoomErrors}
                            camps={camps}
                            handleInputChange={handleRoomInputChange}
                            handleSelectChange={handleRoomSelectChange}
                            handleAmenityChange={handleRoomAmenityChange}
                            validateField={validateRoomField}
                            getClass={getRoomFieldClass}
                        />
                    </div>
                    <div className="flex-shrink-0 flex justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <Button
                            variant="plain"
                            onClick={() => {
                                setIsAddRoomOpen(false)
                                resetAddRoomForm()
                                setAddRoomErrors({})
                            }}
                            disabled={isSubmittingRoom}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="solid"
                            onClick={handleAddRoomSubmit}
                            loading={isSubmittingRoom}
                        >
                            Add Room
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Generate Rooms Dialog — fills whole floors in one request */}
            <Dialog
                isOpen={isGenerateOpen}
                onClose={() => {
                    setIsGenerateOpen(false)
                    setGenerateCampId('')
                }}
                width={720}
            >
                <div className="flex flex-col max-h-[90vh]">
                    <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            Generate Rooms
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Create every room on a floor at once. Nothing is saved if any room
                            number is already taken.
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        <RoomGeneratorForm
                            camps={camps}
                            campId={generateCampId}
                            onCampChange={setGenerateCampId}
                            onValidChange={setGenerateValid}
                            formRef={generatePayloadRef}
                        />
                    </div>
                    <div className="flex-shrink-0 flex justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <Button
                            variant="plain"
                            onClick={() => {
                                setIsGenerateOpen(false)
                                setGenerateCampId('')
                            }}
                            disabled={isGenerating}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="solid"
                            onClick={handleGenerateRooms}
                            loading={isGenerating}
                            disabled={!generateValid}
                        >
                            Generate
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Assign Room Modal */}
            <Dialog
                isOpen={isAssignModalOpen}
                onClose={() => {
                    setIsAssignModalOpen(false)
                    setSelectedRoom(null)
                    setAssignFormData({
                        occupantType: 'Employee',
                        occupantId: '',
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
                            Assign Room {selectedRoom?.roomNumber}
                        </h3>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {selectedRoom && (
                            <>
                                {/* Read-only Room Info */}
                                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                                        Room Information
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Room Number
                                            </div>
                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                                {selectedRoom.roomNumber}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Type
                                            </div>
                                            <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                                                {selectedRoom.type}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Capacity
                                            </div>
                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                                {selectedRoom.capacity}{' '}
                                                {selectedRoom.capacity === 1
                                                    ? 'person'
                                                    : 'people'}
                                            </div>
                                        </div>
                                    </div>
                                    {selectedRoom.amenities.length > 0 && (
                                        <div className="mt-3">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                Amenities
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {selectedRoom.amenities.map(
                                                    (amenity, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-200"
                                                        >
                                                            {amenity}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Assignment Form */}
                                <FormContainer layout="vertical" size="sm">
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
                                                    selected?.value ||
                                                        'Employee',
                                                )
                                            }
                                            options={[
                                                {
                                                    value: 'Employee',
                                                    label: 'Employee',
                                                },
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
                                            value={
                                                getAvailableOccupants().find(
                                                    (opt) =>
                                                        opt.value ===
                                                        assignFormData.occupantId,
                                                ) || null
                                            }
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
                                        {getAvailableOccupants().length ===
                                            0 && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                No{' '}
                                                {assignFormData.occupantType ===
                                                'Employee'
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
                                            errorMessage={
                                                assignErrors.startDate
                                            }
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
                                                min={
                                                    new Date()
                                                        .toISOString()
                                                        .split('T')[0]
                                                }
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
                            </>
                        )}
                    </div>

                    {/* Fixed Footer with Buttons */}
                    <div className="flex-shrink-0 flex justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <Button
                            variant="plain"
                            onClick={() => {
                                setIsAssignModalOpen(false)
                                setSelectedRoom(null)
                                setAssignFormData({
                                    occupantType: 'Employee',
                                    occupantId: '',
                                    startDate: new Date()
                                        .toISOString()
                                        .split('T')[0],
                                    expectedCheckoutDate: '',
                                })
                                setAssignErrors({})
                            }}
                            disabled={isAssigning}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="solid"
                            onClick={handleAssignRoom}
                            loading={isAssigning}
                            disabled={
                                isAssigning ||
                                getAvailableOccupants().length === 0
                            }
                        >
                            Assign Room
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default RoomManagement
