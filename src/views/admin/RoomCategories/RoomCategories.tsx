import { useState, useEffect, ReactNode, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  HiOutlineAdjustments, 
  HiOutlineArrowSmRight, 
  HiOutlineCheckCircle,
  HiOutlineHome,
  HiOutlineOfficeBuilding,
  HiOutlineUserGroup,
  HiOutlineClock,
  HiOutlineUserAdd,
  HiOutlineClipboardCheck
} from 'react-icons/hi'
import { 
  getRoomCategories, 
  type RoomCategory,
  type RoomFeature 
} from '@/services/RoomCategoryService'
import { 
  getRooms, 
  updateRoom,
  type Room 
} from '@/services/RoomService'
import { 
  assignRoom,
  type AssignRoomPayload 
} from '@/services/RoomAssignmentService'
import { useEmployees } from '@/hooks/useEmployees'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Tabs from '@/components/ui/Tabs'
import Tooltip from '@/components/ui/Tooltip'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import { FormContainer, FormItem } from '@/components/ui'
import { Select } from '@/components/ui/select'
import { Notification, toast } from '@/components/ui'
import Statistic from '@/components/shared/Statistic/Statistic'
import { 
  FaWifi, 
  FaSnowflake, 
  FaTv, 
  FaGlassWhiskey, 
  FaMountain, 
  FaBed, 
  FaUtensils, 
  FaThermometerThreeQuarters,
  FaKey
} from 'react-icons/fa'

const featureIcons: Record<string, ReactNode> = {
  wifi: <FaWifi className="text-indigo-500" />,
  ac: <FaSnowflake className="text-blue-500" />,
  tv: <FaTv className="text-purple-500" />,
  minibar: <FaGlassWhiskey className="text-amber-500" />,
  view: <FaMountain className="text-emerald-500" />,
  bed: <FaBed className="text-rose-500" />,
  kitchenette: <FaUtensils className="text-orange-500" />,
  access: <FaKey className="text-gray-500" />,
  default: <FaThermometerThreeQuarters className="text-gray-400" />
}

const RoomCategories = () => {
  const [categories, setCategories] = useState<RoomCategory[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
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
  
  // Fetch employees and visitors for assignment
  const { employees: allEmployees, fetchEmployees } = useEmployees()
  const employees = useMemo(() => 
    allEmployees.filter(emp => emp.status === 'Active'),
    [allEmployees]
  )
  const visitors = useMemo(() => 
    employees.filter(emp => emp.employeeType === 'Visitor'),
    [employees]
  )

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesData, roomsData] = await Promise.all([
          getRoomCategories(),
          getRooms(),
        ])
        setCategories(categoriesData)
        setRooms(roomsData)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
    fetchEmployees()
  }, [fetchEmployees])
  
  // Check URL params to open assign room modal
  useEffect(() => {
    const action = searchParams.get('action')
    
    if (action === 'assign' && rooms.length > 0 && !isAssignModalOpen) {
      // Find first available room
      const availableRoom = rooms.find(room => room.status === 'available')
      
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
    }
  }, [searchParams, rooms, isAssignModalOpen, setSearchParams])

  const filteredCategories = categories.filter(cat => 
    activeTab === 'all' || cat.status === 'active'
  )

  // Calculate statistics from actual rooms data
  const totalRooms = rooms.length
  const availableRooms = rooms.filter(r => r.status === 'available').length
  const occupiedRooms = rooms.filter(r => r.status === 'occupied').length
  const maintenanceRooms = rooms.filter(r => r.status === 'maintenance').length

  const getFeatureIcon = (iconName: string) => {
    return featureIcons[iconName] || featureIcons.default
  }

  const renderFeature = (feature: RoomFeature) => (
    <Tooltip key={feature.id} title={feature.name}>
      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 mx-1">
        {getFeatureIcon(feature.icon)}
      </div>
    </Tooltip>
  )

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
    setAssignFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (assignErrors[name]) {
      setAssignErrors(prev => {
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
    } else if (assignFormData.startDate && assignFormData.expectedCheckoutDate) {
      const start = new Date(assignFormData.startDate)
      const checkout = new Date(assignFormData.expectedCheckoutDate)
      if (checkout <= start) {
        errors.expectedCheckoutDate = 'Checkout date must be after start date'
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
      const updatedRoom = await updateRoom(selectedRoom.id, { status: 'occupied' })
      
      // Update local rooms state
      setRooms(prev => prev.map(room => 
        room.id === selectedRoom.id ? updatedRoom : room
      ))
      
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
          Room {selectedRoom.roomNumber} has been assigned successfully.
        </Notification>,
      )
    } catch (error: any) {
      toast.push(
        <Notification title="Error" type="danger">
          {error.message || 'Failed to assign room. Please try again.'}
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
        .filter(emp => emp.employeeType !== 'Visitor')
        .map(emp => ({
          value: emp._id || '',
          label: `${emp.firstName} ${emp.lastName}${emp.department ? ` - ${emp.department}` : ''}`,
        }))
    } else {
      return visitors.map(visitor => ({
        value: visitor._id || '',
        label: `${visitor.firstName} ${visitor.lastName}${visitor.department ? ` - ${visitor.department}` : ''}`,
      }))
    }
  }

  const renderCategoryCard = (category: RoomCategory) => {
    const categoryRooms = rooms.filter(r => r.type === category.roomType)
    const roomCount = categoryRooms.length
    const availableCount = categoryRooms.filter(r => r.status === 'available').length
    
    return (
    <Card key={category.id} className="h-full flex flex-col">
      <div className="relative h-40 bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden">
        <img 
          src={category.image} 
          alt={category.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = '/img/others/img-1.jpg' // Fallback image
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
        <div className="absolute bottom-0 left-0 p-4 w-full">
          <h3 className="text-white font-semibold text-lg">{category.name}</h3>
          <Badge 
            content={category.status === 'active' ? 'Available' : 'Inactive'} 
            className={category.status === 'active' ? 'bg-emerald-500/20 text-emerald-100' : 'bg-gray-500/20 text-gray-200'}
          />
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {availableCount} of {roomCount} rooms available
          </span>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 flex-1">
          {category.description}
        </p>
        
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-4">
          <div 
            className="bg-indigo-600 h-2 rounded-full" 
            style={{ width: `${roomCount > 0 ? (availableCount / roomCount) * 100 : 0}%` }}
          />
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-auto">
          <div className="flex flex-wrap justify-center gap-1 mb-3">
            {category.features.slice(0, 5).map(renderFeature)}
            {category.features.length > 5 && (
              <Tooltip 
                title={
                  <div className="p-2">
                    <div className="font-medium mb-2">All Features:</div>
                    <ul className="space-y-1">
                      {category.features.map(f => (
                        <li key={f.id} className="flex items-center">
                          <HiOutlineCheckCircle className="text-emerald-500 mr-2" />
                          {f.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                }
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-pointer">
                  +{category.features.length - 5}
                </div>
              </Tooltip>
            )}
          </div>
          
          <div className="flex justify-between items-center mt-2 gap-2">
            <Button
              variant="plain"
              size="xs"
              icon={<HiOutlineAdjustments />}
              onClick={() => navigate(`/rooms/category/${category.id}/edit`)}
            >
              Configure
            </Button>
            {availableCount > 0 && (
              <Button
                variant="solid"
                size="xs"
                icon={<HiOutlineUserAdd />}
                onClick={(e) => {
                  e.stopPropagation()
                  // Find first available room in this category
                  const categoryRooms = rooms.filter(
                    r => r.type === category.roomType && r.status === 'available'
                  )
                  if (categoryRooms.length > 0) {
                    handleOpenAssignModal(categoryRooms[0])
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Assign
              </Button>
            )}
            <Button
              variant="solid"
              size="xs"
              icon={<HiOutlineArrowSmRight />}
              onClick={() => navigate(`/rooms/list?category=${category.id}`)}
            >
              View Rooms
            </Button>
          </div>
        </div>
      </div>
    </Card>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 p-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-t-lg"></div>
            <div className="p-4 space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-4"></div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Statistic
          title="Total Categories"
          value={categories.length}
          icon={<HiOutlineHome className="text-2xl" />}
          color="indigo"
        />
        <Statistic
          title="Total Rooms"
          value={totalRooms}
          icon={<HiOutlineOfficeBuilding className="text-2xl" />}
          color="blue"
        />
        <Statistic
          title="Available Now"
          value={availableRooms}
          icon={<HiOutlineCheckCircle className="text-2xl" />}
          color="emerald"
        />
        <Statistic
          title="Under Maintenance"
          value={maintenanceRooms}
          icon={<HiOutlineClock className="text-2xl" />}
          color="amber"
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Room Categories</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Manage room types and their configurations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.TabList>
              <Tabs.TabNav value="all">All Categories</Tabs.TabNav>
              <Tabs.TabNav value="active">Active Only</Tabs.TabNav>
            </Tabs.TabList>
          </Tabs>
          <Button
            variant="solid"
            icon={<HiOutlineClipboardCheck />}
            onClick={() => navigate('/room-assignments')}
          >
            Room Assignments
          </Button>
          <Button
            variant="solid"
            icon={<HiOutlineAdjustments />}
            onClick={() => navigate('/rooms/category/new')}
          >
            Add Category
          </Button>
        </div>
      </div>

      {filteredCategories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {filteredCategories.map(renderCategoryCard)}
        </div>
      ) : (
        <Card className="text-center p-8">
          <div className="text-5xl mb-4">🏨</div>
          <h3 className="text-lg font-medium mb-2">No Room Categories Found</h3>
          <p className="text-gray-500 mb-4">
            Get started by creating your first room category
          </p>
          <Button
            variant="solid"
            icon={<HiOutlineAdjustments />}
            onClick={() => navigate('/rooms/category/new')}
          >
            Create Category
          </Button>
        </Card>
      )}

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
                      <div className="text-xs text-gray-500 dark:text-gray-400">Room Number</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {selectedRoom.roomNumber}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Type</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {selectedRoom.type}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Capacity</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {selectedRoom.capacity} {selectedRoom.capacity === 1 ? 'person' : 'people'}
                      </div>
                    </div>
                  </div>
                  {selectedRoom.amenities.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Amenities</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedRoom.amenities.map((amenity, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-200"
                          >
                            {amenity}
                          </span>
                        ))}
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
                        handleAssignInputChange('occupantType', selected?.value || 'Employee')
                      }
                      options={[
                        { value: 'Employee', label: 'Employee' },
                        { value: 'Temporary Visitor', label: 'Temporary Visitor' },
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
                        opt => opt.value === assignFormData.occupantId
                      ) || null}
                      onChange={(selected) =>
                        handleAssignInputChange('occupantId', selected?.value || '')
                      }
                      options={getAvailableOccupants()}
                      placeholder={`Select ${assignFormData.occupantType.toLowerCase()}`}
                      classNamePrefix="react-select"
                      isSearchable
                      isClearable
                    />
                    {getAvailableOccupants().length === 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        No {assignFormData.occupantType === 'Employee' ? 'employees' : 'visitors'} available
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
                        onChange={(e) => handleAssignInputChange('startDate', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className={assignErrors.startDate ? 'border-red-500' : ''}
                      />
                    </FormItem>

                    <FormItem
                      label="Expected Check-out Date"
                      required
                      invalid={!!assignErrors.expectedCheckoutDate}
                      errorMessage={assignErrors.expectedCheckoutDate}
                    >
                      <Input
                        type="date"
                        value={assignFormData.expectedCheckoutDate}
                        onChange={(e) => handleAssignInputChange('expectedCheckoutDate', e.target.value)}
                        min={assignFormData.startDate || new Date().toISOString().split('T')[0]}
                        className={assignErrors.expectedCheckoutDate ? 'border-red-500' : ''}
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
                  startDate: new Date().toISOString().split('T')[0],
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
              disabled={isAssigning || getAvailableOccupants().length === 0}
            >
              Assign Room
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default RoomCategories
