import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiOutlinePlus, HiOutlineSearch, HiOutlineMap, HiOutlineOfficeBuilding, HiOutlineHome, HiOutlineUserGroup } from 'react-icons/hi'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Statistic from '@/components/shared/Statistic/Statistic'
import { getLocations, type LocationSummary } from '@/services/LocationService'
import { useCamps } from '@/hooks/useCamps'
import { useRooms } from '@/hooks/useRooms'
import { Spinner } from '@/components/ui'

const LocationsCamps = () => {
  // Use the same hooks as Home.tsx
  const { camps: allCamps, loading: campsLoading, error: campsError } = useCamps()
  const { rooms, loading: roomsLoading, error: roomsError } = useRooms()
  
  const [locations, setLocations] = useState<LocationSummary[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  // Fetch locations
  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const locs = await getLocations()
      setLocations(locs)
      setSelectedLocation(locs[0]?.id ?? null)
      setLoading(false)
    }
    fetch()
  }, [])

  // Filter camps by selected location
  const camps = useMemo(() => {
    if (!selectedLocation || !allCamps) return []
    const locationName = locations.find(l => l.id === selectedLocation)?.name
    return allCamps.filter(c => c.location === locationName)
  }, [selectedLocation, locations, allCamps])

  const filteredCamps = useMemo(() => {
    if (!Array.isArray(camps)) return []
    return camps.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()))
  }, [camps, search])

  // Calculate statistics from ACTUAL Room documents (not Camp model fields)
  const stats = useMemo(() => {
    const campsArray = Array.isArray(allCamps) ? allCamps : []
    const roomsArray = Array.isArray(rooms) ? rooms : []
    
    // Calculate from actual Room documents (useRooms returns isAvailable boolean)
    const totalRoomsFromDocuments = roomsArray.length
    const occupiedRoomsFromDocuments = roomsArray.filter(
      (room) => room.isAvailable === false
    ).length
    const availableRoomsFromDocuments = roomsArray.filter(
      (room) => room.isAvailable === true
    ).length
    
    // Also calculate from Camp model fields for comparison (legacy)
    const totalRoomsFromCamps = campsArray.reduce(
      (sum, camp) => sum + (camp.totalRooms || 0),
      0,
    )
    const occupiedRoomsFromCamps = campsArray.reduce(
      (sum, camp) => sum + (camp.occupiedRooms || 0),
      0,
    )
    
    const totalCamps = campsArray.length
    const totalLocations = locations.length
    
    // Use actual Room documents count (more accurate)
    const occupancyRate = totalRoomsFromDocuments > 0
      ? Math.round((occupiedRoomsFromDocuments / totalRoomsFromDocuments) * 100)
      : 0

    console.log('LocationsCamps Stats:', {
      totalRoomsFromDocuments,
      totalRoomsFromCamps,
      occupiedRoomsFromDocuments,
      occupiedRoomsFromCamps,
      availableRoomsFromDocuments,
      totalCamps,
      totalLocations,
      occupancyRate,
    })

    return {
      totalLocations,
      totalCamps,
      totalRooms: totalRoomsFromDocuments, // Use actual Room documents count
      occupiedRooms: occupiedRoomsFromDocuments,
      availableRooms: availableRoomsFromDocuments,
      occupancyRate: `${occupancyRate}%`,
      // Legacy fields for comparison
      totalRoomsFromCamps,
      occupiedRoomsFromCamps,
    }
  }, [allCamps, locations, rooms])

  const locationColumns = [
    { header: 'Location', accessorKey: 'name' },
    { header: 'Address', accessorKey: 'address' },
    { header: 'Camps', accessorKey: 'campCount' },
  ]

  const campColumns = [
    { header: 'Camp', accessorKey: 'name' },
    { header: 'Rooms', accessorKey: 'totalRooms' },
    { header: 'Occupied', accessorKey: 'occupiedRooms' },
    { header: 'Status', accessorKey: 'status' },
  ]

  const onSort = (_: any) => {}

  const navigate = useNavigate()

  const renderLocationCard = (location: LocationSummary) => (
    <Card 
      key={location.id}
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${selectedLocation === location.id ? 'ring-2 ring-indigo-500' : ''}`}
      onClick={() => setSelectedLocation(location.id)}
    >
      <div className="flex items-start">
        <div className="bg-indigo-100 dark:bg-indigo-500/20 p-3 rounded-lg mr-4">
          <HiOutlineMap className="text-2xl text-indigo-600 dark:text-indigo-300" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{location.name}</h4>
            <Badge content={location.campCount} className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{location.address}</p>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span className="flex items-center">
              <HiOutlineOfficeBuilding className="mr-1" /> {location.campCount} camps
            </span>
          </div>
        </div>
      </div>
    </Card>
  )

  const renderCampCard = (camp: any) => {
    // Calculate from actual Room documents for this camp
    const campId = camp._id || camp.id
    const campRooms = Array.isArray(rooms) 
      ? rooms.filter((room) => {
          const roomCampId = typeof room.camp === 'object' && room.camp?._id 
            ? room.camp._id 
            : room.camp
          return roomCampId === campId
        })
      : []
    
    const totalRooms = campRooms.length
    const occupiedRooms = campRooms.filter(
      (room) => room.isAvailable === false
    ).length
    const occupancyPercent = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0
    
    // Fallback to Camp model fields if no rooms found (for display purposes)
    const displayTotalRooms = totalRooms > 0 ? totalRooms : (camp.totalRooms || 0)
    const displayOccupiedRooms = totalRooms > 0 ? occupiedRooms : (camp.occupiedRooms || 0)
    
    return (
      <Card key={camp._id || camp.id} className="hover:shadow-md transition-shadow duration-200">
        <div className="flex">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">{camp.name}</h4>
              <Badge 
                content={camp.status || 'inactive'} 
                className={camp.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}
              />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <div className="flex items-center text-gray-500 dark:text-gray-400 mr-4">
                <HiOutlineHome className="mr-1" /> {displayTotalRooms} rooms
              </div>
              <div className="flex items-center text-gray-500 dark:text-gray-400">
                <HiOutlineUserGroup className="mr-1" /> {displayOccupiedRooms} occupied
              </div>
            </div>
            {displayTotalRooms > 0 && (
              <div className="mt-3">
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full" 
                    style={{ width: `${occupancyPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Occupancy</span>
                  <span>{occupancyPercent}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    )
  }

  // Show loading state
  if (campsLoading || roomsLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    )
  }

  // Show error state
  if (campsError || roomsError) {
    return (
      <div className="p-4 text-red-500">
        Error loading data: {campsError || roomsError}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Section - Using real data from camps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Statistic
          title="Total Locations"
          value={stats.totalLocations}
          icon={<HiOutlineMap className="text-2xl" />}
          color="indigo"
        />
        <Statistic
          title="Total Camps"
          value={stats.totalCamps}
          icon={<HiOutlineOfficeBuilding className="text-2xl" />}
          color="blue"
        />
        <Statistic
          title="Total Rooms"
          value={stats.totalRooms}
          icon={<HiOutlineHome className="text-2xl" />}
          color="emerald"
        />
        <Statistic
          title="Average Occupancy"
          value={stats.occupancyRate}
          icon={<HiOutlineUserGroup className="text-2xl" />}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Locations Section */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Locations</h3>
            <Button
              size="sm"
              variant="solid"
              icon={<HiOutlinePlus />}
              onClick={() => navigate('/locations/new')}
            >
              Add
            </Button>
          </div>
          
          <div className="space-y-3">
            {locations.map(renderLocationCard)}
          </div>
        </div>

        {/* Camps Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold">
              {selectedLocation ? 
                `${locations.find(l => l.id === selectedLocation)?.name} Camps` : 
                'Select a location'}
            </h3>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <HiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  className="pl-10 w-full sm:w-64"
                  placeholder="Search camps..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                icon={<HiOutlinePlus />}
                onClick={() => navigate('/camps/new')}
                disabled={!selectedLocation}
              >
                Add Camp
              </Button>
            </div>
          </div>

          {selectedLocation ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCamps.length > 0 ? (
                filteredCamps.map(renderCampCard)
              ) : (
                <div className="col-span-2 py-12 text-center">
                  <div className="text-4xl mb-2">🏕️</div>
                  <h4 className="text-lg font-medium text-gray-700 dark:text-gray-200">No camps found</h4>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {search ? 'Try a different search term' : 'Create your first camp for this location'}
                  </p>
                  <Button
                    className="mt-4"
                    variant="solid"
                    icon={<HiOutlinePlus />}
                    onClick={() => navigate('/camps/new')}
                  >
                    Add Camp
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Card className="py-12 text-center">
              <div className="text-4xl mb-4">📍</div>
              <h4 className="text-lg font-medium text-gray-700 dark:text-gray-200">Select a location</h4>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Choose a location to view or manage its camps
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default LocationsCamps
