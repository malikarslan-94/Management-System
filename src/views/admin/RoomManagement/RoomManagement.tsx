import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlinePlus, 
  HiOutlineHome, 
  HiOutlineViewGrid, 
  HiOutlineViewList,
  HiOutlineSearch,
  HiOutlineAdjustments,
  HiOutlineArrowSmRight,
  HiOutlineCheckCircle,
  HiOutlineStar
} from 'react-icons/hi';
import { 
  FaWifi, 
  FaSnowflake, 
  FaTv, 
  FaGlassWhiskey, 
  FaMountain, 
  FaBed, 
  FaUtensils, 
  FaKey,
  FaDoorOpen,
  FaDoorClosed
} from 'react-icons/fa';
import { 
  getRoomCategories, 
  type RoomCategory, 
  type RoomFeature 
} from '@/services/RoomCategoryService';
import { 
  getRooms, 
  type Room, 
  type RoomStatus 
} from '@/services/RoomService';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import AdaptableCard from '@/components/shared/AdaptableCard';

type ViewMode = 'categories' | 'rooms';

const statusColor: Record<RoomStatus, string> = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100',
  occupied: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100',
  maintenance: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-100',
  cleaning: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100',
};

const featureIcons: Record<string, React.ReactNode> = {
  wifi: <FaWifi className="text-indigo-500" />,
  ac: <FaSnowflake className="text-blue-500" />,
  tv: <FaTv className="text-purple-500" />,
  minibar: <FaGlassWhiskey className="text-amber-500" />,
  view: <FaMountain className="text-emerald-500" />,
  bed: <FaBed className="text-rose-500" />,
  kitchenette: <FaUtensils className="text-orange-500" />,
  access: <FaKey className="text-gray-500" />,
  default: <FaDoorOpen className="text-gray-400" />
};

const RoomManagement = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [categoriesData, roomsData] = await Promise.all([
          getRoomCategories(),
          getRooms(),
        ]);
        setCategories(categoriesData);
        setRooms(roomsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter rooms based on search and active category
  const filteredRooms = useMemo(() => {
    let result = [...rooms];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(room => 
        room.roomNumber.toLowerCase().includes(query) ||
        room.type.toLowerCase().includes(query) ||
        room.status.toLowerCase().includes(query)
      );
    }
    
    if (activeCategory) {
      result = result.filter(room => {
        const category = categories.find(cat => cat.id === activeCategory);
        return category ? room.type === category.name.toLowerCase() : false;
      });
    }
    
    return result;
  }, [rooms, searchQuery, activeCategory, categories]);

  // Calculate statistics
  const stats = useMemo(() => ({
    totalCategories: categories.length,
    totalRooms: rooms.length,
    availableRooms: rooms.filter(room => room.status === 'available').length,
    occupiedRooms: rooms.filter(room => room.status === 'occupied').length,
    maintenanceRooms: rooms.filter(room => room.status === 'maintenance').length,
    avgPrice: Math.round(
      rooms.reduce((sum, room) => sum + room.pricePerNight, 0) / (rooms.length || 1)
    ),
  }), [categories, rooms]);

  // Render feature icon with tooltip
  const renderFeatureIcon = (feature: string) => {
    const icon = featureIcons[feature] || featureIcons.default;
    return (
      <Tooltip title={feature} key={feature}>
        <span className="text-lg mr-2">{icon}</span>
      </Tooltip>
    );
  };

  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-64" />
          ))}
        </div>
      </div>
    );
  }

  // Render category cards
  const renderCategories = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {categories.map((category) => {
        const roomCount = rooms.filter(r => r.type === category.name.toLowerCase()).length;
        const availableCount = rooms.filter(
          r => r.type === category.name.toLowerCase() && r.status === 'available'
        ).length;

        return (
          <AdaptableCard 
            key={category.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              setViewMode('rooms');
              setActiveCategory(category.id);
            }}
          >
            <div className="relative h-40 bg-gray-100 dark:bg-gray-800 overflow-hidden rounded-t-lg">
              <img
                src={category.image || '/img/others/img-1.jpg'}
                alt={category.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/img/others/img-1.jpg';
                }}
              />
              <Badge
                className="absolute top-2 right-2"
                content={`${availableCount}/${roomCount}`}
                innerClass={availableCount > 0 ? 'bg-emerald-500' : 'bg-rose-500'}
              />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{category.name}</h3>
                <span className="text-lg font-bold text-blue-500">
                  ${category.basePrice}
                  <span className="text-xs text-gray-500">/night</span>
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                {category.description}
              </p>
              <div className="flex flex-wrap gap-1 mb-4">
                {category.features.slice(0, 3).map(feature => (
                  <span
                    key={feature.id}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-200 mr-1 mb-1"
                  >
                    {feature.name}
                  </span>
                ))}
                {category.features.length > 3 && (
                  <span className="text-xs text-gray-500">+{category.features.length - 3} more</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {availableCount} of {roomCount} available
                </div>
                <Button
                  size="xs"
                  variant="solid"
                  icon={<HiOutlineArrowSmRight />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewMode('rooms');
                    setActiveCategory(category.id);
                  }}
                >
                  View Rooms
                </Button>
              </div>
            </div>
          </AdaptableCard>
        );
      })}
    </div>
  );

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
              ? `${categories.find(c => c.id === activeCategory)?.name} Rooms`
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
            <Card key={room.id} className="hover:shadow-md transition-shadow">
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
                        <span className="text-rose-500">🔧</span>
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
                    <div className="text-xs text-gray-500">Type</div>
                    <div className="capitalize">{room.type}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Capacity</div>
                    <div>{room.capacity} {room.capacity === 1 ? 'person' : 'people'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Price</div>
                    <div>${room.pricePerNight}/night</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Status</div>
                    <div className="capitalize">{room.status}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-4">
                  {room.amenities.slice(0, 4).map(renderFeatureIcon)}
                  {room.amenities.length > 4 && (
                    <span className="text-xs text-gray-500">+{room.amenities.length - 4} more</span>
                  )}
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    size="xs"
                    variant="plain"
                    onClick={() => console.log('Edit room', room.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="xs"
                    variant="solid"
                    onClick={() => console.log('View details', room.id)}
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No rooms found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery
              ? 'Try adjusting your search or filter to find what you\'re looking for.'
              : 'There are no rooms available at the moment.'}
          </p>
          <div className="mt-6">
            <Button
              variant="solid"
              icon={<HiOutlinePlus />}
              onClick={() => console.log('Add new room')}
            >
              Add New Room
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // Render statistics cards
  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
        <div className="p-3 rounded-full bg-blue-500/10 text-2xl text-blue-500">
          <HiOutlineViewGrid />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Categories</p>
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
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Rooms</p>
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
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Available</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {stats.availableRooms}
          </p>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
        <div className="p-3 rounded-full bg-amber-500/10 text-2xl text-amber-500">
          <HiOutlineStar />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Price</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            ${stats.avgPrice}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Room Management</h2>
        <div className="flex space-x-2">
          <Button
            variant={viewMode === 'categories' ? 'solid' : 'default'}
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
            variant="solid"
            icon={<HiOutlinePlus />}
            onClick={() => console.log('Add new', viewMode === 'categories' ? 'category' : 'room')}
          >
            Add {viewMode === 'categories' ? 'Category' : 'Room'}
          </Button>
        </div>
      </div>

      {renderStats()}
      
      {viewMode === 'categories' ? renderCategories() : renderRooms()}
    </div>
  );
};

export default RoomManagement;
