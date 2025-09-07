import { useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  HiOutlineAdjustments, 
  HiOutlineArrowSmRight, 
  HiOutlineCheckCircle,
  HiOutlineHome,
  HiOutlineOfficeBuilding,
  HiOutlineUserGroup,
  HiOutlineClock
} from 'react-icons/hi'
import { 
  getRoomCategories, 
  type RoomCategory,
  type RoomFeature 
} from '@/services/RoomCategoryService'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Tabs from '@/components/ui/Tabs'
import Tooltip from '@/components/ui/Tooltip'
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
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getRoomCategories()
        setCategories(data)
      } catch (error) {
        console.error('Failed to load room categories:', error)
      } finally {
        setLoading(false)
      }
    }
    loadCategories()
  }, [])

  const filteredCategories = categories.filter(cat => 
    activeTab === 'all' || cat.status === 'active'
  )

  // Calculate statistics
  const totalRooms = categories.reduce((sum, cat) => sum + cat.roomCount, 0)
  const availableRooms = categories.reduce((sum, cat) => sum + cat.availableCount, 0)
  const occupiedRooms = totalRooms - availableRooms
  const maintenanceRooms = Math.floor(totalRooms * 0.1) // 10% for demo

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

  const renderCategoryCard = (category: RoomCategory) => (
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
            {category.availableCount} of {category.roomCount} rooms available
          </span>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 flex-1">
          {category.description}
        </p>
        
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-4">
          <div 
            className="bg-indigo-600 h-2 rounded-full" 
            style={{ width: `${(category.availableCount / category.roomCount) * 100}%` }}
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
          
          <div className="flex justify-between items-center mt-2">
            <Button
              variant="plain"
              size="xs"
              icon={<HiOutlineAdjustments />}
              onClick={() => navigate(`/rooms/category/${category.id}/edit`)}
            >
              Configure
            </Button>
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
    </div>
  )
}

export default RoomCategories
