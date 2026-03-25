import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    HiOutlineMap,
    HiOutlineOfficeBuilding,
    HiOutlineHome,
    HiOutlineUserGroup,
    HiOutlinePlus,
    HiOutlineSearch,
} from 'react-icons/hi'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Statistic from '@/components/shared/Statistic/Statistic'
import Dialog from '@/components/ui/Dialog'
import {
    FormContainer,
    FormItem,
    Input,
    Notification,
    toast,
} from '@/components/ui'
import { useCamps } from '@/hooks/useCamps'
import { useRooms } from '@/hooks/useRooms'
import { Spinner } from '@/components/ui'
import type { LocationSummary } from '@/services/LocationService'
import {
    mergeLocationSummaries,
    readExtraLocations,
    tryAppendExtraLocation,
    type ExtraLocation,
} from '@/utils/locationSummaries'

const LocationsCamps = () => {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const {
        camps: allCamps,
        loading: campsLoading,
        error: campsError,
        addCamp,
        fetchCamps,
    } = useCamps()
    const { rooms, loading: roomsLoading, error: roomsError } = useRooms()

    const [extraLocations, setExtraLocations] = useState<ExtraLocation[]>(() =>
        readExtraLocations(),
    )

    const locations = useMemo(
        () => mergeLocationSummaries(allCamps || [], extraLocations),
        [allCamps, extraLocations],
    )

    const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const [locationModalOpen, setLocationModalOpen] = useState(false)
    const [campModalOpen, setCampModalOpen] = useState(false)
    const [locationForm, setLocationForm] = useState({ name: '', address: '' })
    const [campForm, setCampForm] = useState({
        name: '',
        location: '',
        description: '',
        price: '0',
    })
    const [locationSubmitting, setLocationSubmitting] = useState(false)
    const [campSubmitting, setCampSubmitting] = useState(false)

    useEffect(() => {
        if (!selectedLocation && locations.length > 0) {
            setSelectedLocation(locations[0].id)
        }
    }, [locations, selectedLocation])

    // Deep-link from Home / header / bookmarks: ?action=add-location | add-camp&location=...
    useEffect(() => {
        const action = searchParams.get('action')
        if (!action) return

        if (action === 'add-location') {
            setLocationForm({ name: '', address: '' })
            setLocationModalOpen(true)
        } else if (action === 'add-camp') {
            const locParam = searchParams.get('location')
            const prefill = locParam ? decodeURIComponent(locParam) : ''
            setCampForm({
                name: '',
                location: prefill,
                description: '',
                price: '0',
            })
            setCampModalOpen(true)
        }
        setSearchParams({}, { replace: true })
    }, [searchParams, setSearchParams])

    const camps = useMemo(() => {
        if (!selectedLocation || !allCamps) return []
        const locationName = locations.find((l) => l.id === selectedLocation)
            ?.name
        if (!locationName) return []
        return allCamps.filter(
            (c) =>
                c.location?.trim().toLowerCase() ===
                locationName.trim().toLowerCase(),
        )
    }, [selectedLocation, locations, allCamps])

    const filteredCamps = useMemo(() => {
        if (!Array.isArray(camps)) return []
        return camps.filter((c) =>
            c.name?.toLowerCase().includes(search.toLowerCase()),
        )
    }, [camps, search])

    const stats = useMemo(() => {
        const campsArray = Array.isArray(allCamps) ? allCamps : []
        const roomsArray = Array.isArray(rooms) ? rooms : []

        const totalRoomsFromDocuments = roomsArray.length
        const occupiedRoomsFromDocuments = roomsArray.filter(
            (room) => room.isAvailable === false,
        ).length

        const occupancyRate =
            totalRoomsFromDocuments > 0
                ? Math.round(
                      (occupiedRoomsFromDocuments / totalRoomsFromDocuments) *
                          100,
                  )
                : 0

        return {
            totalLocations: locations.length,
            totalCamps: campsArray.length,
            totalRooms: totalRoomsFromDocuments,
            occupiedRooms: occupiedRoomsFromDocuments,
            availableRooms: roomsArray.filter((r) => r.isAvailable === true)
                .length,
            occupancyRate: `${occupancyRate}%`,
        }
    }, [allCamps, locations.length, rooms])

    const navigateToAddLocation = () => {
        navigate('/locations-camps?action=add-location')
    }

    const navigateToAddCamp = () => {
        const locName = selectedLocation
            ? locations.find((l) => l.id === selectedLocation)?.name
            : ''
        const q = locName
            ? `?action=add-camp&location=${encodeURIComponent(locName)}`
            : '?action=add-camp'
        navigate(`/locations-camps${q}`)
    }

    const handleSaveLocation = async (e: React.FormEvent) => {
        e.preventDefault()
        setLocationSubmitting(true)
        try {
            const result = tryAppendExtraLocation(
                locationForm.name,
                locationForm.address,
                allCamps || [],
            )
            if (!result.ok) {
                toast.push(
                    <Notification title="Cannot add location" type="warning">
                        {result.reason}
                    </Notification>,
                )
                return
            }
            setExtraLocations(result.list)
            const added = result.list[result.list.length - 1]
            setSelectedLocation(added.id)
            setLocationModalOpen(false)
            setLocationForm({ name: '', address: '' })
            toast.push(
                <Notification title="Location added" type="success">
                    You can add camps under this location next.
                </Notification>,
            )
        } finally {
            setLocationSubmitting(false)
        }
    }

    const handleSaveCamp = async (e: React.FormEvent) => {
        e.preventDefault()
        const name = campForm.name.trim()
        const loc = campForm.location.trim()
        if (!name || !loc) {
            toast.push(
                <Notification title="Missing fields" type="warning">
                    Camp name and location are required.
                </Notification>,
            )
            return
        }

        setCampSubmitting(true)
        try {
            await addCamp({
                name,
                location: loc,
                description:
                    campForm.description.trim() || 'No description provided',
                price: Number(campForm.price) || 0,
                status: 'active',
                totalRooms: 0,
                occupiedRooms: 0,
            })
            const fresh = await fetchCamps()
            setCampModalOpen(false)
            setCampForm({
                name: '',
                location: '',
                description: '',
                price: '0',
            })
            if (Array.isArray(fresh)) {
                const merged = mergeLocationSummaries(fresh, extraLocations)
                const match = merged.find(
                    (m) => m.name.toLowerCase() === loc.toLowerCase(),
                )
                if (match) setSelectedLocation(match.id)
            }
        } catch {
            /* addCamp already toasts */
        } finally {
            setCampSubmitting(false)
        }
    }

    const renderLocationCard = (location: LocationSummary) => (
        <Card
            key={location.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedLocation === location.id
                    ? 'ring-2 ring-indigo-500'
                    : ''
            }`}
            onClick={() => setSelectedLocation(location.id)}
        >
            <div className="flex items-start">
                <div className="bg-indigo-100 dark:bg-indigo-500/20 p-3 rounded-lg mr-4">
                    <HiOutlineMap className="text-2xl text-indigo-600 dark:text-indigo-300" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {location.name}
                        </h4>
                        <Badge
                            content={location.campCount}
                            className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200 shrink-0"
                        />
                    </div>
                    {location.address ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {location.address}
                        </p>
                    ) : null}
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                        <span className="flex items-center">
                            <HiOutlineOfficeBuilding className="mr-1" />{' '}
                            {location.campCount} camps
                        </span>
                    </div>
                </div>
            </div>
        </Card>
    )

    const renderCampCard = (camp: NonNullable<typeof allCamps>[0]) => {
        const campId = camp._id || camp.id
        const campRooms = Array.isArray(rooms)
            ? rooms.filter((room) => {
                  const roomCampId =
                      typeof room.camp === 'object' && room.camp?._id
                          ? room.camp._id
                          : room.camp
                  return roomCampId === campId
              })
            : []

        const totalRooms = campRooms.length
        const occupiedRooms = campRooms.filter(
            (room) => room.isAvailable === false,
        ).length
        const occupancyPercent =
            totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

        const displayTotalRooms =
            totalRooms > 0 ? totalRooms : camp.totalRooms || 0
        const displayOccupiedRooms =
            totalRooms > 0 ? occupiedRooms : camp.occupiedRooms || 0

        return (
            <Card
                key={String(campId)}
                className="hover:shadow-md transition-shadow duration-200"
            >
                <div className="flex">
                    <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                {camp.name}
                            </h4>
                            <Badge
                                content={camp.status || 'inactive'}
                                className={
                                    camp.status === 'active'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                }
                            />
                        </div>
                        <div className="flex items-center mt-2 text-sm flex-wrap gap-x-4">
                            <div className="flex items-center text-gray-500 dark:text-gray-400">
                                <HiOutlineHome className="mr-1 shrink-0" />{' '}
                                {displayTotalRooms} rooms
                            </div>
                            <div className="flex items-center text-gray-500 dark:text-gray-400">
                                <HiOutlineUserGroup className="mr-1 shrink-0" />{' '}
                                {displayOccupiedRooms} occupied
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

    if (campsLoading || roomsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner />
            </div>
        )
    }

    if (campsError || roomsError) {
        return (
            <div className="p-4 text-red-500">
                Error loading data: {campsError || roomsError}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Locations &amp; camps
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                    Locations group camps by area. Add a location, then add camps
                    under it. Camps are stored in your database; extra locations
                    without camps yet are kept in this browser.
                </p>
            </div>

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
                <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Locations
                        </h3>
                        <Button
                            size="sm"
                            variant="solid"
                            icon={<HiOutlinePlus />}
                            onClick={navigateToAddLocation}
                        >
                            Add
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {locations.length === 0 ? (
                            <Card className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                No locations yet. Add one to get started.
                            </Card>
                        ) : (
                            locations.map(renderLocationCard)
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {selectedLocation
                                ? `${
                                      locations.find(
                                          (l) => l.id === selectedLocation,
                                      )?.name ?? 'Location'
                                  } camps`
                                : 'Select a location'}
                        </h3>

                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative flex-1 min-w-[200px]">
                                <HiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <Input
                                    className="pl-10 w-full"
                                    placeholder="Search camps..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Button
                                icon={<HiOutlinePlus />}
                                onClick={navigateToAddCamp}
                                disabled={!selectedLocation}
                            >
                                Add camp
                            </Button>
                        </div>
                    </div>

                    {selectedLocation ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredCamps.length > 0 ? (
                                filteredCamps.map(renderCampCard)
                            ) : (
                                <div className="col-span-2 py-12 text-center rounded-lg border border-dashed border-gray-200 dark:border-gray-600">
                                    <div className="text-4xl mb-2">🏕️</div>
                                    <h4 className="text-lg font-medium text-gray-700 dark:text-gray-200">
                                        No camps found
                                    </h4>
                                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                                        {search
                                            ? 'Try a different search term'
                                            : 'Create your first camp for this location'}
                                    </p>
                                    <Button
                                        className="mt-4"
                                        variant="solid"
                                        icon={<HiOutlinePlus />}
                                        onClick={navigateToAddCamp}
                                    >
                                        Add camp
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Card className="py-12 text-center border-dashed">
                            <div className="text-4xl mb-4">📍</div>
                            <h4 className="text-lg font-medium text-gray-700 dark:text-gray-200">
                                Select a location
                            </h4>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                                Choose a location to view or manage its camps
                            </p>
                        </Card>
                    )}
                </div>
            </div>

            <Dialog
                isOpen={locationModalOpen}
                onClose={() => setLocationModalOpen(false)}
                width={480}
            >
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Add location
                    </h3>
                    <form onSubmit={handleSaveLocation}>
                        <FormContainer layout="vertical" size="md">
                            <FormItem
                                label="Location name"
                                invalid={false}
                            >
                                <Input
                                    value={locationForm.name}
                                    onChange={(e) =>
                                        setLocationForm((f) => ({
                                            ...f,
                                            name: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g. North Zone"
                                />
                            </FormItem>
                            <FormItem label="Address (optional)">
                                <Input
                                    value={locationForm.address}
                                    onChange={(e) =>
                                        setLocationForm((f) => ({
                                            ...f,
                                            address: e.target.value,
                                        }))
                                    }
                                    placeholder="Short address or notes"
                                />
                            </FormItem>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="plain"
                                    onClick={() => setLocationModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="solid"
                                    loading={locationSubmitting}
                                >
                                    Save location
                                </Button>
                            </div>
                        </FormContainer>
                    </form>
                </div>
            </Dialog>

            <Dialog
                isOpen={campModalOpen}
                onClose={() => setCampModalOpen(false)}
                width={520}
            >
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Add camp
                    </h3>
                    <form onSubmit={handleSaveCamp}>
                        <FormContainer layout="vertical" size="md">
                            <FormItem label="Camp name">
                                <Input
                                    value={campForm.name}
                                    onChange={(e) =>
                                        setCampForm((f) => ({
                                            ...f,
                                            name: e.target.value,
                                        }))
                                    }
                                    placeholder="Camp display name"
                                />
                            </FormItem>
                            <FormItem label="Location area">
                                <Input
                                    value={campForm.location}
                                    onChange={(e) =>
                                        setCampForm((f) => ({
                                            ...f,
                                            location: e.target.value,
                                        }))
                                    }
                                    placeholder="Must match a location name"
                                />
                            </FormItem>
                            <FormItem label="Description">
                                <Input
                                    textArea
                                    rows={3}
                                    value={campForm.description}
                                    onChange={(e) =>
                                        setCampForm((f) => ({
                                            ...f,
                                            description: e.target.value,
                                        }))
                                    }
                                    placeholder="Short description"
                                />
                            </FormItem>
                            <FormItem label="Base price">
                                <Input
                                    type="number"
                                    min={0}
                                    value={campForm.price}
                                    onChange={(e) =>
                                        setCampForm((f) => ({
                                            ...f,
                                            price: e.target.value,
                                        }))
                                    }
                                />
                            </FormItem>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="plain"
                                    onClick={() => setCampModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="solid"
                                    loading={campSubmitting}
                                >
                                    Create camp
                                </Button>
                            </div>
                        </FormContainer>
                    </form>
                </div>
            </Dialog>
        </div>
    )
}

export default LocationsCamps
